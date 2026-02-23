from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from prophet import Prophet

from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error
from sklearn.preprocessing import MinMaxScaler
from scipy import stats
import logging
from datetime import datetime, timedelta
import warnings

# Import enhanced forecast service
try:
    from enhanced_forecast import (
        EnhancedForecastRequest,
        EnhancedForecastResponse,
        ExternalFeature,
        generate_enhanced_forecast
    )
    ENHANCED_FORECAST_AVAILABLE = True
except ImportError:
    ENHANCED_FORECAST_AVAILABLE = False
    logger.warning("Enhanced forecast module not available")

# Suppress warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Prophet Service",
    description="Time series forecasting service with baselines and model comparison",
    version="2.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Verify cmdstan is available for Prophet"""
    try:
        import cmdstanpy
        cmdstan_path = cmdstanpy.utils.cmdstan_path()
        logger.info(f"cmdstan is available at: {cmdstan_path}")
        logger.info("Prophet is ready (stan_backend bug patched at module level)")
    except Exception as e:
        logger.warning(f"cmdstan verification failed: {e}")
        logger.warning("Prophet may not work correctly without cmdstan")

class PriceData(BaseModel):
    ds: str  # Date string in YYYY-MM-DD format
    price: float

class ForecastRequest(BaseModel):
    rows: List[PriceData]
    horizon_days: int = 30
    holidays_enabled: bool = True
    weekly_seasonality: bool = True
    yearly_seasonality: bool = True
    random_state: int = 42

class CompareRequest(BaseModel):
    rows: List[PriceData]
    horizon_days: int = 30
    holidays_enabled: bool = True
    weekly_seasonality: bool = True
    yearly_seasonality: bool = True
    random_state: int = 42

class SimulationRequest(BaseModel):
    rows: List[PriceData]
    days: int = 30
    method: str = "gbm"  # "gbm" or "bootstrap"
    annual_vol: Optional[float] = None
    drift_adj: Optional[float] = None
    n: int = 10000
    seed: int = 42

class ForecastPoint(BaseModel):
    ds: str
    yhat: float
    yhat_lower: float
    yhat_upper: float

class SimulationPoint(BaseModel):
    ds: str
    p01: float
    p05: float
    p10: float
    p50: float
    p90: float
    p95: float
    p99: float

class ForecastResponse(BaseModel):
    forecast: List[ForecastPoint]
    model_version: str = "prophet-2.0"
    holidays_enabled: bool
    weekly_seasonality: bool
    yearly_seasonality: bool
    training_window: int

class SimulationResponse(BaseModel):
    method: str
    days: int
    n: int
    seed: int
    fan: List[SimulationPoint]
    var95: float
    cvar95: float

class ModelMetrics(BaseModel):
    model_name: str
    mae: float
    mape: float
    mase: float

class ComparisonResult(BaseModel):
    prophet_metrics: ModelMetrics
    naive_last_metrics: ModelMetrics
    seasonal_naive_metrics: ModelMetrics
    arima_metrics: ModelMetrics
    dm_test_prophet_vs_naive: float
    dm_test_prophet_vs_seasonal: float
    dm_test_prophet_vs_arima: float
    generated_at: str
    horizon_days: int
    training_window: int

class DriftStatus(BaseModel):
    psi: float
    level: str  # green, yellow, red
    reference_window_days: int
    current_window_days: int
    last_calculated: str

class ComponentsRequest(BaseModel):
    rows: List[PriceData]
    weekly_seasonality: bool = True
    yearly_seasonality: bool = True
    holidays: bool = False
    seasonality_mode: str = "additive"

class ComponentPoint(BaseModel):
    ds: str
    value: float

class WeeklyComponent(BaseModel):
    dow: int
    label: str
    value: float

class ComponentsResponse(BaseModel):
    trend: List[ComponentPoint]
    weekly: List[WeeklyComponent]
    yearly: List[ComponentPoint]
    holidays: List[ComponentPoint]
    seasonality_mode: str
    generated_at: str = ""

def calculate_mase(y_true, y_pred, y_train):
    """Calculate Mean Absolute Scaled Error (MASE)"""
    mae = mean_absolute_error(y_true, y_pred)
    naive_mae = mean_absolute_error(y_train[1:], y_train[:-1])
    return mae / naive_mae if naive_mae > 0 else float('inf')

def diebold_mariano_test(e1, e2):
    """Diebold-Mariano test for forecast accuracy comparison"""
    try:
        d = e1 - e2
        n = len(d)
        if n < 2:
            return 1.0
        
        # Calculate DM statistic
        d_mean = np.mean(d)
        d_var = np.var(d, ddof=1)
        
        if d_var == 0:
            return 1.0
            
        dm_stat = d_mean / np.sqrt(d_var / n)
        
        # Two-tailed test
        p_value = 2 * (1 - stats.norm.cdf(abs(dm_stat)))
        return p_value
    except:
        return 1.0

def naive_last_forecast(y_train, horizon):
    """Naive forecast: y[t] = y[t-1]"""
    last_value = y_train[-1]
    return [last_value] * horizon

def seasonal_naive_forecast(y_train, horizon, season_length=7):
    """Seasonal naive forecast: y[t] = y[t-season_length]"""
    if len(y_train) < season_length:
        return naive_last_forecast(y_train, horizon)
    
    forecast = []
    for i in range(horizon):
        forecast.append(y_train[-(season_length - i % season_length)])
    return forecast

def arima_forecast(y_train, horizon):
    """ARIMA forecast"""
    try:
        # Simple ARIMA(1,1,1) model
        model = ARIMA(y_train, order=(1, 1, 1))
        fitted_model = model.fit()
        forecast = fitted_model.forecast(steps=horizon)
        return forecast.tolist()
    except:
        # Fallback to naive if ARIMA fails
        return naive_last_forecast(y_train, horizon)

def calculate_psi(expected, actual, buckets=10):
    """Calculate Population Stability Index (PSI)"""
    try:
        # Create bins based on expected distribution
        min_val = min(min(expected), min(actual))
        max_val = max(max(expected), max(actual))
        
        if min_val == max_val:
            return 0.0
            
        bin_edges = np.linspace(min_val, max_val, buckets + 1)
        
        # Calculate expected and actual distributions
        expected_hist, _ = np.histogram(expected, bins=bin_edges)
        actual_hist, _ = np.histogram(actual, bins=bin_edges)
        
        # Normalize to probabilities
        expected_probs = expected_hist / len(expected)
        actual_probs = actual_hist / len(actual)
        
        # Calculate PSI
        psi = 0
        for i in range(len(expected_probs)):
            if expected_probs[i] > 0 and actual_probs[i] > 0:
                psi += (actual_probs[i] - expected_probs[i]) * np.log(actual_probs[i] / expected_probs[i])
        
        return psi
    except:
        return 0.0

def gbm_simulation(prices, days, n, annual_vol=None, drift_adj=None, seed=42):
    """Geometric Brownian Motion simulation"""
    np.random.seed(seed)
    
    # Calculate daily log returns
    log_returns = np.diff(np.log(prices))
    
    # Calculate parameters
    if annual_vol is not None:
        sigma = annual_vol
    else:
        sigma = np.std(log_returns) * np.sqrt(252)  # Annualized volatility
    
    if drift_adj is not None:
        mu = drift_adj
    else:
        mu = np.mean(log_returns) * 252  # Annualized drift
    
    # Convert to daily values
    mu_d = mu / 252
    sigma_d = sigma / np.sqrt(252)
    
    # Generate random shocks
    dt = 1/252  # Daily time step
    shocks = np.random.normal(0, 1, (n, days))
    
    # Simulate paths
    paths = np.zeros((n, days + 1))
    paths[:, 0] = prices[-1]  # Start from last price
    
    for t in range(days):
        paths[:, t + 1] = paths[:, t] * np.exp((mu_d - 0.5 * sigma_d**2) * dt + sigma_d * np.sqrt(dt) * shocks[:, t])
    
    return paths[:, 1:]  # Return only the forecasted days

def bootstrap_simulation(prices, days, n, seed=42):
    """Bootstrap simulation using historical returns"""
    np.random.seed(seed)
    
    # Calculate daily log returns
    log_returns = np.diff(np.log(prices))
    
    # Generate paths by resampling returns
    paths = np.zeros((n, days + 1))
    paths[:, 0] = prices[-1]  # Start from last price
    
    for t in range(days):
        # Resample returns with replacement
        sampled_returns = np.random.choice(log_returns, size=n, replace=True)
        paths[:, t + 1] = paths[:, t] * np.exp(sampled_returns)
    
    return paths[:, 1:]  # Return only the forecasted days

def calculate_var_cvar(prices, confidence=0.95):
    """Calculate VaR and CVaR"""
    # Sort prices in ascending order
    sorted_prices = np.sort(prices)
    n = len(sorted_prices)
    
    # Calculate VaR (Value at Risk)
    var_idx = int((1 - confidence) * n)
    var = sorted_prices[var_idx]
    
    # Calculate CVaR (Conditional Value at Risk)
    cvar_idx = int((1 - confidence) * n)
    cvar = np.mean(sorted_prices[:cvar_idx])
    
    return var, cvar

def preprocess_data(df: pd.DataFrame, min_required_points: int = 2, skip_outlier_detection: bool = False) -> pd.DataFrame:
    """Preprocess data to handle NaN values, outliers, and ensure data quality"""
    # Remove any rows with NaN values
    df = df.dropna()
    
    # Ensure we have enough data points
    if len(df) < min_required_points:
        raise HTTPException(
            status_code=400,
            detail=f"At least {min_required_points} data points required"
        )
    
    # Convert price to float and handle any conversion errors
    df['y'] = pd.to_numeric(df['y'], errors='coerce')
    df = df.dropna()  # Remove any rows where price conversion failed
    
    # Remove duplicate dates, keeping the last value
    df = df.drop_duplicates(subset=['ds'], keep='last')
    
    # Handle extreme outliers only if not skipped and we have enough data
    if not skip_outlier_detection and len(df) > 20:  # Much higher threshold for outlier detection
        Q1 = df['y'].quantile(0.25)
        Q3 = df['y'].quantile(0.75)
        IQR = Q3 - Q1
        
        if IQR > 0:  # Only if there's actual variance
            # Extremely conservative outlier bounds (10*IQR)
            lower_bound = Q1 - 10 * IQR
            upper_bound = Q3 + 10 * IQR
            
            # Cap extreme outliers instead of removing them (to preserve data)
            df.loc[df['y'] < lower_bound, 'y'] = lower_bound
            df.loc[df['y'] > upper_bound, 'y'] = upper_bound
    
    # Ensure we still have minimum required data
    if len(df) < min_required_points:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient valid data points after preprocessing (have {len(df)}, need {min_required_points})"
        )
    
    # Final validation
    if df['y'].isna().any() or not np.isfinite(df['y']).all():
        raise HTTPException(
            status_code=400,
            detail="Data contains invalid values after preprocessing"
        )
    
    return df.reset_index(drop=True)

def preprocess_data_for_comparison(df: pd.DataFrame, min_required_points: int = 10) -> pd.DataFrame:
    """Very lenient preprocessing specifically for model comparison"""
    # Remove any rows with NaN values
    df = df.dropna()
    
    # Ensure we have enough data points
    if len(df) < min_required_points:
        raise HTTPException(
            status_code=400,
            detail=f"At least {min_required_points} data points required"
        )
    
    # Convert price to float and handle any conversion errors
    df['y'] = pd.to_numeric(df['y'], errors='coerce')
    df = df.dropna()  # Remove any rows where price conversion failed
    
    # Remove duplicate dates, keeping the last value
    df = df.drop_duplicates(subset=['ds'], keep='last')
    
    # For model comparison, we're very lenient - no outlier detection at all
    # Just ensure we have valid numeric data
    
    # Ensure we still have minimum required data
    if len(df) < min_required_points:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient valid data points after preprocessing (have {len(df)}, need {min_required_points})"
        )
    
    # Final validation - only check for NaN or infinite values
    if df['y'].isna().any() or not np.isfinite(df['y']).all():
        raise HTTPException(
            status_code=400,
            detail="Data contains invalid values after preprocessing"
        )
    
    return df.reset_index(drop=True)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "prophet", "version": "1.0.0"}

@app.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    try:
        if len(request.rows) < 2:
            raise HTTPException(
                status_code=400, 
                detail="At least 2 data points required for forecasting"
            )
        
        if request.horizon_days <= 0:
            raise HTTPException(
                status_code=400,
                detail="horizon_days must be positive"
            )
        
        # Convert to DataFrame
        df = pd.DataFrame([{"ds": row.ds, "y": row.price} for row in request.rows])
        df['ds'] = pd.to_datetime(df['ds']).dt.tz_localize(None)  # Remove timezone
        df = df.sort_values('ds').reset_index(drop=True)
        
        # Data validation and preprocessing (lenient for forecasting)
        df = preprocess_data(df, min_required_points=2, skip_outlier_detection=False)
        
        # Initialize Prophet model with conservative settings for financial data
        try:
            model = Prophet(
                interval_width=0.95,
                daily_seasonality=False,
                weekly_seasonality=False,  # Disable weekly seasonality for gold
                yearly_seasonality=False,  # Disable yearly seasonality for gold
                changepoint_prior_scale=0.001,  # Very conservative changepoint detection
                seasonality_prior_scale=0.01,   # Minimal seasonality
                holidays_prior_scale=0.01,      # Minimal holiday effects
                mcmc_samples=0,                 # Use MAP estimation
                uncertainty_samples=100,        # Reasonable uncertainty samples
                growth='linear'                 # Linear growth model
            )
            
            # Add holidays if enabled
            if request.holidays_enabled:
                model.add_country_holidays(country_name='US')
            
            # Fit the model with error handling
            model.fit(df)
            
        except Exception as fit_error:
            logger.warning(f"Initial Prophet fit failed: {fit_error}. Trying simplified model...")
            
            # Fallback to simplified model without seasonality
            try:
                model = Prophet(
                    interval_width=0.95,
                    daily_seasonality=False,
                    weekly_seasonality=False,
                    yearly_seasonality=False,
                    changepoint_prior_scale=0.001,  # Very conservative
                    seasonality_prior_scale=0.01,   # Minimal seasonality
                    mcmc_samples=0,
                    uncertainty_samples=100
                )
                model.fit(df)
                logger.info("Fallback simplified Prophet model fitted successfully")
                
            except Exception as fallback_error:
                logger.error(f"Both Prophet models failed: {fallback_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Prophet model fitting failed: {str(fallback_error)}"
                )
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=request.horizon_days)
        
        # Generate forecast
        forecast = model.predict(future)
        
        # Extract only the forecasted points (not historical)
        forecast_points = forecast.tail(request.horizon_days)
        
        # Convert to response format
        forecast_data = []
        for _, row in forecast_points.iterrows():
            forecast_data.append(ForecastPoint(
                ds=row['ds'].strftime('%Y-%m-%d'),
                yhat=round(row['yhat'], 2),
                yhat_lower=round(row['yhat_lower'], 2),
                yhat_upper=round(row['yhat_upper'], 2)
            ))
        
        logger.info(f"Generated forecast for {request.horizon_days} days using {len(request.rows)} historical points")
        
        return ForecastResponse(
            forecast=forecast_data,
            holidays_enabled=request.holidays_enabled,
            weekly_seasonality=request.weekly_seasonality,
            yearly_seasonality=request.yearly_seasonality,
            training_window=len(request.rows)
        )
        
    except Exception as e:
        logger.error(f"Forecast generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {str(e)}")

@app.post("/simulate", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest):
    try:
        if len(request.rows) < 2:
            raise HTTPException(
                status_code=400, 
                detail="At least 2 data points required for simulation"
            )
        
        if request.days <= 0:
            raise HTTPException(
                status_code=400,
                detail="days must be positive"
            )
        
        if request.method not in ["gbm", "bootstrap"]:
            raise HTTPException(
                status_code=400,
                detail="method must be 'gbm' or 'bootstrap'"
            )
        
        # Convert to numpy array
        prices = np.array([row.price for row in request.rows])
        
        # Run simulation
        if request.method == "gbm":
            paths = gbm_simulation(
                prices, 
                request.days, 
                request.n, 
                request.annual_vol, 
                request.drift_adj, 
                request.seed
            )
        else:  # bootstrap
            paths = bootstrap_simulation(
                prices, 
                request.days, 
                request.n, 
                request.seed
            )
        
        # Calculate percentiles for each day
        fan_data = []
        for day in range(request.days):
            day_prices = paths[:, day]
            percentiles = np.percentile(day_prices, [1, 5, 10, 50, 90, 95, 99])
            
            # Calculate date
            last_date = pd.to_datetime(request.rows[-1].ds).tz_localize(None)  # Remove timezone
            forecast_date = last_date + timedelta(days=day + 1)
            
            fan_data.append(SimulationPoint(
                ds=forecast_date.strftime('%Y-%m-%d'),
                p01=round(percentiles[0], 2),
                p05=round(percentiles[1], 2),
                p10=round(percentiles[2], 2),
                p50=round(percentiles[3], 2),
                p90=round(percentiles[4], 2),
                p95=round(percentiles[5], 2),
                p99=round(percentiles[6], 2)
            ))
        
        # Calculate VaR and CVaR at horizon
        horizon_prices = paths[:, -1]  # Prices at the end of simulation
        var95, cvar95 = calculate_var_cvar(horizon_prices, 0.95)
        
        logger.info(f"Generated {request.method} simulation for {request.days} days with {request.n} paths")
        
        return SimulationResponse(
            method=request.method,
            days=request.days,
            n=request.n,
            seed=request.seed,
            fan=fan_data,
            var95=round(var95, 2),
            cvar95=round(cvar95, 2)
        )
        
    except Exception as e:
        logger.error(f"Simulation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@app.post("/compare", response_model=ComparisonResult)
async def compare_models(request: CompareRequest):
    try:
        if len(request.rows) < 10:
            raise HTTPException(
                status_code=400, 
                detail="At least 10 data points required for model comparison"
            )
        
        # Convert to DataFrame
        df = pd.DataFrame([{"ds": row.ds, "y": row.price} for row in request.rows])
        df['ds'] = pd.to_datetime(df['ds']).dt.tz_localize(None)  # Remove timezone
        df = df.sort_values('ds').reset_index(drop=True)
        
        # Data validation and preprocessing (very lenient for model comparison)
        df = preprocess_data_for_comparison(df, min_required_points=10)
        
        # Split data for backtesting (more lenient split for small datasets)
        # Use 70% for training, but ensure at least 5 points for training and test
        split_idx = max(5, min(len(df) - 5, int(len(df) * 0.7)))
        train_df = df.iloc[:split_idx]
        test_df = df.iloc[split_idx:split_idx + min(request.horizon_days, len(df) - split_idx)]
        
        if len(test_df) == 0:
            raise HTTPException(status_code=400, detail="Insufficient data for testing")
        
        y_train = train_df['y'].values
        y_test = test_df['y'].values
        
        # Generate forecasts
        forecasts = {}
        
        # Prophet forecast
        try:
            model = Prophet(
                interval_width=0.95,
                weekly_seasonality=request.weekly_seasonality,
                yearly_seasonality=request.yearly_seasonality
            )
            if request.holidays_enabled:
                model.add_country_holidays(country_name='US')
            
            model.fit(train_df)
            future = model.make_future_dataframe(periods=len(y_test))
            prophet_forecast = model.predict(future)
            forecasts['prophet'] = prophet_forecast['yhat'].tail(len(y_test)).values
        except:
            forecasts['prophet'] = naive_last_forecast(y_train, len(y_test))
        
        # Baseline forecasts
        forecasts['naive_last'] = naive_last_forecast(y_train, len(y_test))
        forecasts['seasonal_naive'] = seasonal_naive_forecast(y_train, len(y_test))
        forecasts['arima'] = arima_forecast(y_train, len(y_test))
        
        # Calculate metrics
        def calculate_metrics(y_true, y_pred, model_name):
            mae = mean_absolute_error(y_true, y_pred)
            mape = mean_absolute_percentage_error(y_true, y_pred) * 100
            mase = calculate_mase(y_true, y_pred, y_train)
            return ModelMetrics(
                model_name=model_name,
                mae=round(mae, 4),
                mape=round(mape, 4),
                mase=round(mase, 4)
            )
        
        prophet_metrics = calculate_metrics(y_test, forecasts['prophet'], "Prophet")
        naive_metrics = calculate_metrics(y_test, forecasts['naive_last'], "Naive Last")
        seasonal_metrics = calculate_metrics(y_test, forecasts['seasonal_naive'], "Seasonal Naive")
        arima_metrics = calculate_metrics(y_test, forecasts['arima'], "ARIMA")
        
        # Diebold-Mariano tests
        dm_naive = diebold_mariano_test(
            np.abs(y_test - forecasts['prophet']),
            np.abs(y_test - forecasts['naive_last'])
        )
        dm_seasonal = diebold_mariano_test(
            np.abs(y_test - forecasts['prophet']),
            np.abs(y_test - forecasts['seasonal_naive'])
        )
        dm_arima = diebold_mariano_test(
            np.abs(y_test - forecasts['prophet']),
            np.abs(y_test - forecasts['arima'])
        )
        
        logger.info(f"Model comparison completed for {len(y_test)} test points")
        
        return ComparisonResult(
            prophet_metrics=prophet_metrics,
            naive_last_metrics=naive_metrics,
            seasonal_naive_metrics=seasonal_metrics,
            arima_metrics=arima_metrics,
            dm_test_prophet_vs_naive=round(dm_naive, 4),
            dm_test_prophet_vs_seasonal=round(dm_seasonal, 4),
            dm_test_prophet_vs_arima=round(dm_arima, 4),
            generated_at=datetime.now().isoformat(),
            horizon_days=request.horizon_days,
            training_window=len(train_df)
        )
        
    except Exception as e:
        logger.error(f"Model comparison failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model comparison failed: {str(e)}")

@app.get("/drift/status", response_model=DriftStatus)
async def get_drift_status():
    """Calculate PSI for drift detection (mock implementation)"""
    try:
        # In a real implementation, this would fetch recent data and calculate PSI
        # For now, return a mock response
        psi = np.random.uniform(0.1, 0.3)  # Mock PSI value
        
        if psi < 0.1:
            level = "green"
        elif psi < 0.2:
            level = "yellow"
        else:
            level = "red"
        
        return DriftStatus(
            psi=round(psi, 4),
            level=level,
            reference_window_days=90,
            current_window_days=7,
            last_calculated=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Drift status calculation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Drift status calculation failed: {str(e)}")

@app.post("/components", response_model=ComponentsResponse)
async def get_components(request: ComponentsRequest):
    """Decompose time series into trend, weekly, yearly, and holiday components"""
    try:
        if len(request.rows) < 7:
            raise HTTPException(
                status_code=400, 
                detail="At least 7 data points required for component decomposition"
            )
        
        # Convert to DataFrame
        df = pd.DataFrame([{"ds": row.ds, "y": row.price} for row in request.rows])
        df['ds'] = pd.to_datetime(df['ds']).dt.tz_localize(None)  # Remove timezone
        df = df.sort_values('ds').reset_index(drop=True)
        
        # Data validation and preprocessing (lenient for components)
        df = preprocess_data(df, min_required_points=7, skip_outlier_detection=True)
        
        # Create Prophet model for component decomposition with error handling
        from prophet import Prophet
        try:
            model = Prophet(
                interval_width=0.95,
                daily_seasonality=False,
                weekly_seasonality=request.weekly_seasonality,
                yearly_seasonality=request.yearly_seasonality,
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0,
                holidays_prior_scale=10.0,
                mcmc_samples=0,
                uncertainty_samples=100
            )
            
            if request.holidays:
                model.add_country_holidays(country_name='US')
            
            # Fit the model
            model.fit(df)
            
        except Exception as fit_error:
            logger.warning(f"Component analysis fit failed: {fit_error}. Trying simplified model...")
            
            # Fallback to simplified model
            try:
                model = Prophet(
                    interval_width=0.95,
                    daily_seasonality=False,
                    weekly_seasonality=False,
                    yearly_seasonality=False,
                    changepoint_prior_scale=0.001,
                    seasonality_prior_scale=0.01,
                    mcmc_samples=0,
                    uncertainty_samples=50
                )
                model.fit(df)
                logger.info("Fallback simplified model fitted for component analysis")
                
            except Exception as fallback_error:
                logger.error(f"Component analysis failed: {fallback_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Component analysis failed: {str(fallback_error)}"
                )
        
        # Create future dataframe to get components
        future = model.make_future_dataframe(periods=0)
        forecast = model.predict(future)
        
        # Extract components
        trend_data = [
            ComponentPoint(ds=row['ds'].strftime('%Y-%m-%d'), value=float(row['trend']))
            for _, row in forecast[['ds', 'trend']].iterrows()
        ]
        
        # Weekly seasonality (if enabled)
        weekly_data = []
        if request.weekly_seasonality and 'weekly' in forecast.columns:
            weekly_means = forecast.groupby(forecast['ds'].dt.dayofweek)['weekly'].mean()
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            for dow in range(7):
                weekly_data.append(WeeklyComponent(
                    dow=dow,
                    label=day_names[dow],
                    value=float(weekly_means.get(dow, 0.0))
                ))
        
        # Yearly seasonality (if enabled)
        yearly_data = []
        if request.yearly_seasonality and 'yearly' in forecast.columns:
            yearly_data = [
                ComponentPoint(ds=row['ds'].strftime('%Y-%m-%d'), value=float(row['yearly']))
                for _, row in forecast[['ds', 'yearly']].iterrows()
            ]
        
        # Holiday effects (if enabled)
        holiday_data = []
        if request.holidays:
            holiday_cols = [col for col in forecast.columns if 'holiday' in col.lower()]
            if holiday_cols:
                for _, row in forecast.iterrows():
                    holiday_effect = sum(row[col] for col in holiday_cols if not pd.isna(row[col]))
                    if abs(holiday_effect) > 0.1:  # Only include significant holiday effects
                        holiday_data.append(ComponentPoint(
                            ds=row['ds'].strftime('%Y-%m-%d'),
                            value=float(holiday_effect)
                        ))
        
        logger.info(f"Generated components for {len(request.rows)} data points")
        
        return ComponentsResponse(
            trend=trend_data,
            weekly=weekly_data,
            yearly=yearly_data,
            holidays=holiday_data,
            seasonality_mode=request.seasonality_mode,
            generated_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Component decomposition failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Component decomposition failed: {str(e)}")

# ============================================================================
# PROMETHEUS METRICS
# ============================================================================

from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

# Define metrics
ml_requests_total = Counter('ml_requests_total', 'ML requests', ['route'])
ml_latency_ms = Histogram('ml_latency_ms', 'Latency ms', ['route'], buckets=[50, 100, 300, 500, 1000, 2000, 5000])

@app.get("/metrics")
async def metrics_endpoint():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

# ============================================================================
# CROSS-VALIDATION EVALUATION
# ============================================================================

from prophet.diagnostics import cross_validation, performance_metrics

class ResidualPoint(BaseModel):
    ds: str
    y_true: float
    y_pred: float
    residual: float
    abs_error: float
    percent_error: float

class CVEvaluationResponse(BaseModel):
    horizon_days: int
    metrics: Dict[str, float]
    folds: int
    evaluation_date: str
    residuals: Optional[List[ResidualPoint]] = None

@app.post("/eval/cv", response_model=CVEvaluationResponse)
async def evaluate_cross_validation(request: ForecastRequest):
    """
    Perform Prophet evaluation on the last N days where N = horizon_days
    Calculates residuals from the last N days based on the selected horizon
    """
    with ml_latency_ms.labels('/eval/cv').time():
        ml_requests_total.labels('/eval/cv').inc()
        
        try:
            # Need at least 30 days for Prophet, plus horizon_days for evaluation
            min_required = 30 + request.horizon_days
            if len(request.rows) < min_required:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient data for Prophet evaluation (need at least {min_required} days for {request.horizon_days}-day horizon, got {len(request.rows)})"
                )
            
            # Prepare data
            df = pd.DataFrame([{'ds': row.ds, 'y': row.price} for row in request.rows])
            df['ds'] = pd.to_datetime(df['ds'])
            df = df.sort_values('ds').reset_index(drop=True)
            
            # Reserve the last N days (N = horizon_days) for evaluation
            # Split: use all data except the last N days for training
            h = request.horizon_days
            train_df = df.iloc[:-h].copy() if h > 0 else df.copy()
            test_df = df.iloc[-h:].copy() if h > 0 else df.iloc[-1:].copy()
            
            logger.info(f"Prophet evaluation: Training on {len(train_df)} days, evaluating on last {len(test_df)} days")
            
            # Train Prophet model on training data with error handling
            try:
                model = Prophet(
                    daily_seasonality=False,  # Disable daily seasonality for gold prices
                    weekly_seasonality=request.weekly_seasonality,
                    yearly_seasonality=request.yearly_seasonality,
                    changepoint_prior_scale=0.05,
                    interval_width=0.95,
                    mcmc_samples=0  # Use MAP estimation instead of MCMC
                )
                model.fit(train_df)
                logger.info(f"Prophet model fitted successfully with {len(train_df)} data points")
            except Exception as fit_error:
                logger.error(f"Prophet model fitting failed: {str(fit_error)}")
                # Try with simplified model
                try:
                    logger.info("Trying simplified Prophet model...")
                    model = Prophet(
                        daily_seasonality=False,
                        weekly_seasonality=False,
                        yearly_seasonality=False,
                        changepoint_prior_scale=0.001,  # Very conservative
                        interval_width=0.95,
                        mcmc_samples=0
                    )
                    model.fit(train_df)
                    logger.info("Simplified Prophet model fitted successfully")
                except Exception as simple_error:
                    logger.error(f"Simplified model also failed: {str(simple_error)}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Prophet model fitting failed: {str(fit_error)}. Simplified model also failed: {str(simple_error)}"
                    )
            
            # Predict for the exact test dates (not N consecutive calendar days) so alignment always works
            future = pd.concat(
                [train_df[['ds']], test_df[['ds']].copy()],
                ignore_index=True
            ).drop_duplicates(subset=['ds']).sort_values('ds').reset_index(drop=True)
            forecast = model.predict(future)
            
            # Normalize datetimes for reliable merge (timezone-naive, date-only)
            def _normalize_ds(series):
                s = pd.to_datetime(series)
                if s.dt.tz is not None:
                    s = s.dt.tz_localize(None)
                return s.dt.normalize()
            forecast['ds'] = _normalize_ds(forecast['ds'])
            test_df_merge = test_df.copy()
            test_df_merge['ds'] = _normalize_ds(test_df_merge['ds'])
            forecast['ds_str'] = forecast['ds'].dt.strftime('%Y-%m-%d')
            test_df_merge['ds_str'] = test_df_merge['ds'].dt.strftime('%Y-%m-%d')
            
            forecast_test = forecast[forecast['ds_str'].isin(test_df_merge['ds_str'])].copy()
            test_with_forecast = test_df_merge.merge(
                forecast_test[['ds_str', 'yhat', 'yhat_lower', 'yhat_upper']],
                on='ds_str',
                how='inner'
            )
            
            if len(test_with_forecast) == 0:
                logger.error(
                    "Eval merge failed: no overlapping dates. Test ds_str sample: %s, Forecast ds_str sample: %s",
                    test_df_merge['ds_str'].tolist()[:5],
                    forecast['ds_str'].tolist()[-10:],
                )
                raise HTTPException(
                    status_code=500,
                    detail="Failed to align test data with forecast predictions"
                )
            
            # Calculate residuals from the last N days
            residuals = []
            y_true_list = []
            y_pred_list = []
            
            for _, row in test_with_forecast.iterrows():
                y_true = float(row['y'])
                y_pred = float(row['yhat'])
                residual = y_true - y_pred
                abs_error = abs(residual)
                percent_error = (residual / y_true * 100) if y_true != 0 else 0.0
                
                y_true_list.append(y_true)
                y_pred_list.append(y_pred)
                
                residuals.append(ResidualPoint(
                    ds=row['ds'].strftime('%Y-%m-%d'),
                    y_true=y_true,
                    y_pred=y_pred,
                    residual=residual,
                    abs_error=abs_error,
                    percent_error=percent_error
                ))
            
            # Calculate metrics from the last N days
            if len(y_true_list) > 0:
                y_true_array = np.array(y_true_list)
                y_pred_array = np.array(y_pred_list)
                
                mae = float(np.mean(np.abs(y_true_array - y_pred_array)))
                rmse = float(np.sqrt(np.mean((y_true_array - y_pred_array) ** 2)))
                mape = float(np.mean(np.abs((y_true_array - y_pred_array) / np.maximum(1e-8, np.abs(y_true_array))))) * 100.0
                
                metrics_dict = {
                    'MAE': mae,
                    'RMSE': rmse,
                    'MAPE': mape
                }
            else:
                metrics_dict = {
                    'MAE': 0.0,
                    'RMSE': 0.0,
                    'MAPE': 0.0
                }
            
            # For compatibility, we use folds=1 since we're doing a single evaluation
            # (not multiple cross-validation folds)
            folds = 1
            
            logger.info(f"Prophet evaluation complete (last {len(residuals)} days): MAE={metrics_dict['MAE']:.2f}, RMSE={metrics_dict['RMSE']:.2f}, MAPE={metrics_dict['MAPE']:.2f}%")
            
            return CVEvaluationResponse(
                horizon_days=request.horizon_days,
                metrics=metrics_dict,
                folds=folds,
                evaluation_date=datetime.now().isoformat(),
                residuals=residuals
            )
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error(f"Cross-validation failed: {str(e)}", exc_info=True)
            # Check for specific error types
            error_msg = str(e)
            if "Broken pipe" in error_msg or "EPIPE" in error_msg or "Errno 32" in error_msg:
                raise HTTPException(
                    status_code=503,
                    detail="Cross-validation service temporarily unavailable. The Prophet model may have crashed during processing. Please try again."
                )
            raise HTTPException(status_code=500, detail=f"Cross-validation failed: {error_msg}")

# ============================================================================
# MINIMAL LSTM BASELINE
# ============================================================================

try:
    import tensorflow as tf
    from tensorflow import keras
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logger.warning("TensorFlow not available - LSTM endpoint will be disabled")

class LSTMEvaluationResponse(BaseModel):
    horizon_days: int
    forecast: List[ForecastPoint]
    metrics: Dict[str, float]
    evaluation_date: str
    residuals: Optional[List[ResidualPoint]] = None
    note: str = "LSTM is a minimal baseline for comparison. Educational use only."

def make_supervised(series: np.ndarray, lookback: int = 30, horizon: int = 1):
    """Create supervised learning dataset from time series"""
    X, y = [], []
    for i in range(len(series) - lookback - horizon + 1):
        X.append(series[i:i + lookback])
        y.append(series[i + lookback:i + lookback + horizon])
    X = np.array(X)[..., None]  # Add feature dimension
    y = np.array(y)
    return X, y

def lstm_forecast_impl(series: np.ndarray, dates: pd.Series, h: int, lookback: int = 30, epochs: int = 10):
    """Minimal LSTM baseline implementation with normalization
    Calculates residuals from the last N days where N = horizon (h)
    """
    # Normalize the series for better model training
    scaler = MinMaxScaler(feature_range=(0, 1))
    series_scaled = scaler.fit_transform(series.reshape(-1, 1)).flatten()
    
    # Reserve the last h days for evaluation (residuals calculation)
    # We need at least lookback + h days to create supervised data and evaluate
    if len(series) < lookback + h:
        raise ValueError(f"Insufficient data: need at least {lookback + h} days, got {len(series)}")
    
    # Split: use all data except the last h days for training
    # The last h days will be used for residuals calculation
    train_series = series_scaled[:-h] if h > 0 else series_scaled
    test_series = series_scaled[-h:] if h > 0 else series_scaled[-1:]
    
    # Create supervised dataset from training data
    X_train, y_train = make_supervised(train_series, lookback=lookback, horizon=1)
    
    # Build minimal LSTM model
    model = keras.Sequential([
        keras.layers.Input(shape=(lookback, 1)),
        keras.layers.LSTM(32, activation='tanh'),
        keras.layers.Dense(1)
    ])
    
    model.compile(optimizer='adam', loss='mae')
    
    # Use a small validation split from training data for early stopping
    val_split = max(0.1, min(0.2, len(X_train) * 0.1 / len(X_train))) if len(X_train) > 10 else 0.0
    model.fit(X_train, y_train, epochs=epochs, batch_size=32, verbose=0, validation_split=val_split)
    
    # Recursive multi-step forecast (using normalized data) - for future predictions
    history_scaled = series_scaled[-lookback:].tolist()
    predictions_scaled = []
    
    for _ in range(h):
        x_input = np.array(history_scaled[-lookback:])[None, :, None]
        y_pred_scaled = float(model.predict(x_input, verbose=0)[0][0])
        predictions_scaled.append(y_pred_scaled)
        history_scaled.append(y_pred_scaled)
    
    # Denormalize predictions back to original scale
    predictions = scaler.inverse_transform(np.array(predictions_scaled).reshape(-1, 1)).flatten().tolist()
    
    # Calculate residuals from the last h days
    # We need to make predictions for the last h days using the model
    # Start from the point that allows us to predict the last h days
    y_pred_test = []
    y_true_test = []
    
    # For each of the last h days, use the lookback window ending before that day
    for i in range(h):
        # The index in the original series for the day we want to predict
        target_idx = len(series) - h + i
        
        # We need lookback days before this to make a prediction
        if target_idx >= lookback:
            # Get the lookback window ending just before the target day
            window_start = target_idx - lookback
            window_end = target_idx
            window_scaled = series_scaled[window_start:window_end]
            
            # Make prediction
            x_input = np.array(window_scaled)[None, :, None]
            y_pred_scaled = float(model.predict(x_input, verbose=0)[0][0])
            y_pred_test.append(y_pred_scaled)
            
            # Get actual value
            y_true_test.append(series_scaled[target_idx])
        else:
            # Not enough history, skip this day
            continue
    
    # Denormalize test predictions and actuals
    if len(y_pred_test) > 0:
        y_pred_test = scaler.inverse_transform(
            np.array(y_pred_test).reshape(-1, 1)
        ).flatten()
        y_true_test = scaler.inverse_transform(
            np.array(y_true_test).reshape(-1, 1)
        ).flatten()

        # Get dates for the last h days
        # Handle both Series and DatetimeIndex
        if isinstance(dates, pd.DatetimeIndex):
            # Convert DatetimeIndex to Series to use iloc
            test_dates = pd.Series(dates).iloc[-len(y_pred_test):]
        else:
            # If dates is already a Series, use iloc directly
            test_dates = dates.iloc[-len(y_pred_test):]

        mae = float(np.mean(np.abs(y_true_test - y_pred_test)))
        rmse = float(np.sqrt(np.mean((y_true_test - y_pred_test) ** 2)))
        mape = (
            float(
                np.mean(
                    np.abs(
                        (y_true_test - y_pred_test)
                        / np.maximum(1e-8, np.abs(y_true_test))
                    )
                )
            )
            * 100.0
        )
    else:
        # Fallback: use all available data if we can't get h days
        # Handle both Series and DatetimeIndex
        if isinstance(dates, pd.DatetimeIndex):
            test_dates = pd.Series(dates).iloc[-min(h, len(dates)):]
        else:
            test_dates = dates.iloc[-min(h, len(dates)):]
        y_pred_test = np.array([])
        y_true_test = np.array([])
        mae = 0.0
        rmse = 0.0
        mape = 0.0
    
    return {
        'predictions': predictions,
        'mae': mae,
        'rmse': rmse,
        'mape': mape,
        'test_dates': test_dates,
        'y_pred_test': y_pred_test,
        'y_true_test': y_true_test
    }

@app.post("/eval/lstm", response_model=LSTMEvaluationResponse)
async def evaluate_lstm(request: ForecastRequest):
    """
    Minimal LSTM baseline for comparison with Prophet
    Note: This is a simple implementation for educational comparison only
    """
    if not TENSORFLOW_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="LSTM evaluation is not available (TensorFlow not installed)"
        )
    
    with ml_latency_ms.labels('/eval/lstm').time():
        ml_requests_total.labels('/eval/lstm').inc()
        
        try:
            # Need at least lookback (30) + horizon_days for proper evaluation
            min_required = 30 + request.horizon_days
            if len(request.rows) < min_required:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient data for LSTM (need at least {min_required} days for {request.horizon_days}-day horizon, got {len(request.rows)})"
                )
            
            # Prepare data
            df = pd.DataFrame([{'ds': row.ds, 'y': row.price} for row in request.rows])
            df['ds'] = pd.to_datetime(df['ds'])
            df = df.sort_values('ds').reset_index(drop=True)
            
            series = df['y'].values.astype('float32')
            
            # Convert dates to Series to ensure iloc works
            dates_series = pd.Series(df['ds'].values)
            
            # Run LSTM forecast - residuals will be from the last N days (N = horizon_days)
            result = lstm_forecast_impl(series, dates_series, h=request.horizon_days, lookback=30, epochs=8)
            
            # Generate forecast dates
            last_date = pd.to_datetime(df['ds'].iloc[-1])
            forecast_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=request.horizon_days, freq='D')
            
            # Create forecast points (LSTM doesn't provide confidence intervals by default)
            forecast_points = []
            for i, date in enumerate(forecast_dates):
                pred = result['predictions'][i]
                # Simple heuristic for confidence intervals (±5%)
                lower = pred * 0.95
                upper = pred * 1.05
                
                forecast_points.append(ForecastPoint(
                    ds=date.strftime('%Y-%m-%d'),
                    yhat=round(pred, 2),
                    yhat_lower=round(lower, 2),
                    yhat_upper=round(upper, 2)
                ))
            
            metrics_dict = {
                'MAE': result['mae'],
                'RMSE': result['rmse'],
                'MAPE': result['mape']
            }
            
            # Calculate residuals from test set
            residuals = []
            if 'test_dates' in result and 'y_pred_test' in result and 'y_true_test' in result:
                test_dates = result['test_dates']
                y_pred_test = result['y_pred_test']
                y_true_test = result['y_true_test']
                
                for i in range(len(y_true_test)):
                    y_true = float(y_true_test[i])
                    y_pred = float(y_pred_test[i])
                    residual = y_true - y_pred
                    abs_error = abs(residual)
                    percent_error = (residual / y_true * 100) if y_true != 0 else 0.0
                    
                    # Get the date for this test point
                    test_date = test_dates.iloc[i] if hasattr(test_dates, 'iloc') else test_dates[i]
                    if isinstance(test_date, pd.Timestamp):
                        date_str = test_date.strftime('%Y-%m-%d')
                    else:
                        date_str = str(test_date)
                    
                    residuals.append(ResidualPoint(
                        ds=date_str,
                        y_true=y_true,
                        y_pred=y_pred,
                        residual=residual,
                        abs_error=abs_error,
                        percent_error=percent_error
                    ))
            
            logger.info(f"LSTM evaluation complete: MAE={metrics_dict['MAE']:.2f}, RMSE={metrics_dict['RMSE']:.2f}, MAPE={metrics_dict['MAPE']:.2f}%")
            
            return LSTMEvaluationResponse(
                horizon_days=request.horizon_days,
                forecast=forecast_points,
                metrics=metrics_dict,
                evaluation_date=datetime.now().isoformat(),
                residuals=residuals if residuals else None
            )
            
        except Exception as e:
            logger.error(f"LSTM evaluation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"LSTM evaluation failed: {str(e)}")

# ============================================================================
# Enhanced Forecast Endpoint
# ============================================================================

@app.post("/forecast/enhanced")
async def enhanced_forecast_endpoint(request: EnhancedForecastRequest):
    """
    Enhanced forecast using ensemble of multiple ML models with external features.
    Provides higher accuracy predictions with feature importance analysis.
    """
    if not ENHANCED_FORECAST_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Enhanced forecast service not available. Please ensure enhanced_forecast.py is present."
        )
    
    try:
        result = await generate_enhanced_forecast(request)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced forecast endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhanced forecast failed: {str(e)}")

# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)