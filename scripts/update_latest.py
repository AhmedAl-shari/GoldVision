#!/usr/bin/env python3
"""
Update Latest Data Script - Last 7 Days Merge
Updates existing datasets with the latest 7 days of data.
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

class DataUpdater:
    """Updates existing datasets with latest data."""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.fx_path = self.data_dir / "fx_yer.csv"
        self.gold_path = self.data_dir / "gold_prices.csv"
        
        # Yemen-specific constants
        self.YER_REGIONS = ["SANA", "ADEN", "TAIZ", "HODEIDAH"]
        self.GOLD_KARATS = [18, 21, 22, 24]
        self.RETAIL_PREMIUMS = {
            "buy": 0.02,   # 2% premium for buying
            "sell": -0.01  # 1% discount for selling
        }
        
        # Current USD/YER rate (in production, fetch from API)
        self.current_usd_yer_rate = 530.0
        
    def _get_usd_yer_rate(self, date: datetime) -> float:
        """Get USD/YER rate for a specific date."""
        # In production, this would fetch from a real API
        # For now, use a simple model with some volatility
        base_rate = self.current_usd_yer_rate
        volatility = np.random.normal(0, 0.02)  # 2% volatility
        return base_rate * (1 + volatility)
    
    def _calculate_karat_price(self, base_price_24k: float, karat: int) -> float:
        """Calculate price for specific karat based on 24k base price."""
        return base_price_24k * (karat / 24.0)
    
    def _calculate_retail_price(self, base_price: float, price_type: str) -> float:
        """Apply retail premiums/discounts."""
        premium = self.RETAIL_PREMIUMS.get(price_type, 0)
        return base_price * (1 + premium)
    
    def load_existing_data(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Load existing datasets."""
        try:
            fx_df = pd.read_csv(self.fx_path) if self.fx_path.exists() else pd.DataFrame()
            gold_df = pd.read_csv(self.gold_path) if self.gold_path.exists() else pd.DataFrame()
            
            logger.info(f"Loaded existing data: FX={len(fx_df)} records, Gold={len(gold_df)} records")
            return fx_df, gold_df
        except Exception as e:
            logger.error(f"Error loading existing data: {e}")
            return pd.DataFrame(), pd.DataFrame()
    
    def generate_latest_fx_rates(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Generate latest FX rates data."""
        logger.info(f"Generating latest FX rates from {start_date.date()} to {end_date.date()}")
        
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
        logger.info(f"Generated {len(df)} latest FX rate records")
        return df
    
    def generate_latest_gold_prices(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Generate latest gold prices data."""
        logger.info(f"Generating latest gold prices from {start_date.date()} to {end_date.date()}")
        
        gold_data = []
        current_date = start_date
        
        # Current gold price (in production, fetch from API)
        current_gold_price = 2000.0  # USD per ounce
        
        while current_date <= end_date:
            # Add some daily volatility
            volatility = np.random.normal(0, 0.02)  # 2% daily volatility
            base_price_24k = current_gold_price * (1 + volatility)
            
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
        logger.info(f"Generated {len(df)} latest gold price records")
        return df
    
    def merge_datasets(self, existing_df: pd.DataFrame, new_df: pd.DataFrame, 
                      key_columns: List[str]) -> pd.DataFrame:
        """Merge new data with existing data, removing duplicates."""
        if existing_df.empty:
            return new_df
        
        # Convert date columns to datetime for proper comparison
        existing_df['ds'] = pd.to_datetime(existing_df['ds'])
        new_df['ds'] = pd.to_datetime(new_df['ds'])
        
        # Remove existing records that overlap with new data
        existing_df = existing_df[~existing_df['ds'].isin(new_df['ds'])]
        
        # Combine datasets
        merged_df = pd.concat([existing_df, new_df], ignore_index=True)
        
        # Sort by date
        merged_df = merged_df.sort_values('ds')
        
        # Convert back to string format
        merged_df['ds'] = merged_df['ds'].dt.strftime('%Y-%m-%d')
        
        logger.info(f"Merged datasets: {len(merged_df)} total records")
        return merged_df
    
    def update_datasets(self) -> Tuple[str, str]:
        """Update datasets with latest data."""
        logger.info("Starting dataset update...")
        
        # Load existing data
        existing_fx, existing_gold = self.load_existing_data()
        
        # Generate latest 7 days of data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        # Generate new data
        new_fx = self.generate_latest_fx_rates(start_date, end_date)
        new_gold = self.generate_latest_gold_prices(start_date, end_date)
        
        # Merge with existing data
        updated_fx = self.merge_datasets(existing_fx, new_fx, ['ds', 'region', 'rate_type'])
        updated_gold = self.merge_datasets(existing_gold, new_gold, ['ds', 'karat', 'region', 'price_type'])
        
        # Save updated datasets
        updated_fx.to_csv(self.fx_path, index=False)
        updated_gold.to_csv(self.gold_path, index=False)
        
        logger.info(f"Updated FX rates: {len(updated_fx)} total records")
        logger.info(f"Updated gold prices: {len(updated_gold)} total records")
        
        return str(self.fx_path), str(self.gold_path)
    
    def print_update_summary(self, fx_path: str, gold_path: str):
        """Print summary of the update."""
        fx_df = pd.read_csv(fx_path)
        gold_df = pd.read_csv(gold_path)
        
        print("\n" + "="*80)
        print("DATASET UPDATE SUMMARY")
        print("="*80)
        print(f"FX Rates: {len(fx_df)} total records")
        print(f"Gold Prices: {len(gold_df)} total records")
        
        # Show latest dates
        latest_fx_date = fx_df['ds'].max()
        latest_gold_date = gold_df['ds'].max()
        
        print(f"\nLatest FX data: {latest_fx_date}")
        print(f"Latest Gold data: {latest_gold_date}")
        
        # Show recent samples
        print("\nLatest 5 FX records:")
        print(fx_df.tail(5).to_string(index=False))
        
        print("\nLatest 5 Gold records:")
        print(gold_df.tail(5).to_string(index=False))

def main():
    """Main function to update datasets."""
    logger.info("Starting dataset update...")
    
    # Initialize updater
    updater = DataUpdater()
    
    try:
        # Update datasets
        fx_path, gold_path = updater.update_datasets()
        
        # Print summary
        updater.print_update_summary(fx_path, gold_path)
        
        logger.info("Dataset update completed successfully!")
        
    except Exception as e:
        logger.error(f"Error updating datasets: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
