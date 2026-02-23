#!/usr/bin/env python3
"""
Dataset Generation Script - Full Backfill 2015→Today
Generates FX rates and gold prices datasets with Yemen-specific calculations.
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatasetGenerator:
    """Generates FX and gold price datasets with Yemen-specific calculations."""
    
    def __init__(self, output_dir: str = "data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Yemen-specific constants
        self.YER_REGIONS = ["SANA", "ADEN", "TAIZ", "HODEIDAH"]
        self.GOLD_KARATS = [18, 21, 22, 24]
        self.RETAIL_PREMIUMS = {
            "buy": 0.02,   # 2% premium for buying
            "sell": -0.01  # 1% discount for selling
        }
        
        # Historical USD/YER rates (simplified - in production, use real data)
        self.usd_yer_rates = self._generate_historical_usd_yer()
        
    def _generate_historical_usd_yer(self) -> Dict[str, float]:
        """Generate historical USD/YER rates (simplified model)."""
        rates = {}
        start_date = datetime(2015, 1, 1)
        end_date = datetime.now()
        
        # Base rate around 530 YER/USD in 2015, trending upward
        base_rate = 530.0
        current_date = start_date
        
        while current_date <= end_date:
            # Simulate gradual depreciation of YER
            days_since_start = (current_date - start_date).days
            depreciation_factor = 1 + (days_since_start * 0.0001)  # 0.01% per day
            
            # Add some volatility
            volatility = np.random.normal(0, 0.05)
            rate = base_rate * depreciation_factor * (1 + volatility)
            
            rates[current_date.strftime('%Y-%m-%d')] = max(rate, 100)  # Floor at 100
            current_date += timedelta(days=1)
            
        return rates
    
    def _get_usd_yer_rate(self, date: datetime) -> float:
        """Get USD/YER rate for a specific date."""
        date_str = date.strftime('%Y-%m-%d')
        return self.usd_yer_rates.get(date_str, 530.0)  # Default fallback
    
    def _calculate_karat_price(self, base_price_24k: float, karat: int) -> float:
        """Calculate price for specific karat based on 24k base price."""
        return base_price_24k * (karat / 24.0)
    
    def _calculate_retail_price(self, base_price: float, price_type: str) -> float:
        """Apply retail premiums/discounts."""
        premium = self.RETAIL_PREMIUMS.get(price_type, 0)
        return base_price * (1 + premium)
    
    def generate_fx_rates(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Generate FX rates dataset."""
        logger.info(f"Generating FX rates from {start_date.date()} to {end_date.date()}")
        
        fx_data = []
        current_date = start_date
        
        while current_date <= end_date:
            usd_yer_rate = self._get_usd_yer_rate(current_date)
            
            # Generate rates for each region
            for region in self.YER_REGIONS:
                # Add regional variation (±2%)
                regional_factor = np.random.uniform(0.98, 1.02)
                regional_rate = usd_yer_rate * regional_factor
                
                # Generate different rate types
                for rate_type in ["mid", "buy", "sell"]:
                    if rate_type == "mid":
                        rate = regional_rate
                    elif rate_type == "buy":
                        rate = regional_rate * 1.005  # Slightly higher for buying USD
                    else:  # sell
                        rate = regional_rate * 0.995  # Slightly lower for selling USD
                    
                    fx_data.append({
                        "ds": current_date.strftime('%Y-%m-%d'),
                        "base": "USD",
                        "quote": "YER",
                        "region": region,
                        "rate": round(rate, 2),
                        "source": "goldvision_synthetic",
                        "rate_type": rate_type,
                        "side": "both"
                    })
            
            current_date += timedelta(days=1)
        
        df = pd.DataFrame(fx_data)
        logger.info(f"Generated {len(df)} FX rate records")
        return df
    
    def generate_gold_prices(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Generate gold prices dataset."""
        logger.info(f"Generating gold prices from {start_date.date()} to {end_date.date()}")
        
        gold_data = []
        current_date = start_date
        
        # Historical gold price trends (simplified)
        base_gold_price = 1200.0  # USD per ounce in 2015
        price_trend = 0.0001  # Daily trend
        
        while current_date <= end_date:
            days_since_start = (current_date - start_date).days
            
            # Calculate base 24k gold price with trend and volatility
            trend_factor = 1 + (days_since_start * price_trend)
            volatility = np.random.normal(0, 0.02)  # 2% daily volatility
            base_price_24k = base_gold_price * trend_factor * (1 + volatility)
            
            # Generate prices for each karat and region
            for karat in self.GOLD_KARATS:
                karat_price_usd = self._calculate_karat_price(base_price_24k, karat)
                
                for region in self.YER_REGIONS:
                    usd_yer_rate = self._get_usd_yer_rate(current_date)
                    
                    # Generate different price types
                    for price_type in ["spot", "buy", "sell"]:
                        if price_type == "spot":
                            price_usd = karat_price_usd
                        else:
                            price_usd = self._calculate_retail_price(karat_price_usd, price_type)
                        
                        price_yer = price_usd * usd_yer_rate
                        
                        gold_data.append({
                            "ds": current_date.strftime('%Y-%m-%d'),
                            "unit": "gram",
                            "karat": karat,
                            "price_usd": round(price_usd, 2),
                            "price_yer": round(price_yer, 0),
                            "price_type": price_type,
                            "region": region,
                            "source": "goldvision_synthetic"
                        })
            
            current_date += timedelta(days=1)
        
        df = pd.DataFrame(gold_data)
        logger.info(f"Generated {len(df)} gold price records")
        return df
    
    def save_datasets(self, fx_df: pd.DataFrame, gold_df: pd.DataFrame) -> Tuple[str, str]:
        """Save datasets to CSV files."""
        fx_path = self.output_dir / "fx_yer.csv"
        gold_path = self.output_dir / "gold_prices.csv"
        
        # Save with proper formatting
        fx_df.to_csv(fx_path, index=False)
        gold_df.to_csv(gold_path, index=False)
        
        logger.info(f"Saved FX rates to {fx_path}")
        logger.info(f"Saved gold prices to {gold_path}")
        
        return str(fx_path), str(gold_path)
    
    def print_sample_data(self, fx_df: pd.DataFrame, gold_df: pd.DataFrame):
        """Print head and tail samples of the datasets."""
        print("\n" + "="*80)
        print("FX RATES DATASET SAMPLE")
        print("="*80)
        print(f"Total records: {len(fx_df)}")
        print("\nFirst 10 rows:")
        print(fx_df.head(10).to_string(index=False))
        print("\nLast 10 rows:")
        print(fx_df.tail(10).to_string(index=False))
        
        print("\n" + "="*80)
        print("GOLD PRICES DATASET SAMPLE")
        print("="*80)
        print(f"Total records: {len(gold_df)}")
        print("\nFirst 10 rows:")
        print(gold_df.head(10).to_string(index=False))
        print("\nLast 10 rows:")
        print(gold_df.tail(10).to_string(index=False))
        
        # Print summary statistics
        print("\n" + "="*80)
        print("SUMMARY STATISTICS")
        print("="*80)
        print("FX Rates by Region:")
        print(fx_df.groupby('region')['rate'].agg(['count', 'mean', 'std']).round(2))
        
        print("\nGold Prices by Karat:")
        print(gold_df.groupby('karat')['price_usd'].agg(['count', 'mean', 'std']).round(2))

def main():
    """Main function to generate datasets."""
    logger.info("Starting dataset generation...")
    
    # Configuration
    start_date = datetime(2015, 1, 1)
    end_date = datetime.now()
    
    # Initialize generator
    generator = DatasetGenerator()
    
    try:
        # Generate datasets
        fx_df = generator.generate_fx_rates(start_date, end_date)
        gold_df = generator.generate_gold_prices(start_date, end_date)
        
        # Save datasets
        fx_path, gold_path = generator.save_datasets(fx_df, gold_df)
        
        # Print sample data
        generator.print_sample_data(fx_df, gold_df)
        
        logger.info("Dataset generation completed successfully!")
        logger.info(f"FX rates: {fx_path}")
        logger.info(f"Gold prices: {gold_path}")
        
    except Exception as e:
        logger.error(f"Error generating datasets: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
