#!/usr/bin/env python3
"""
Data Pipeline Tests
Comprehensive tests for FX rates, gold prices, and Google Sheets upload.
"""

import os
import sys
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

# Import modules to test
from scripts.generate_datasets import DatasetGenerator
from scripts.update_latest import DataUpdater

# Import Google Sheets uploader only if available
try:
    from scripts.upload_to_sheets import SheetsUploader
    GOOGLE_SHEETS_AVAILABLE = True
except ImportError:
    GOOGLE_SHEETS_AVAILABLE = False
    SheetsUploader = None

class TestDatasetGenerator:
    """Test cases for DatasetGenerator."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.generator = DatasetGenerator(output_dir="test_data")
        self.start_date = datetime(2024, 1, 1)
        self.end_date = datetime(2024, 1, 7)
    
    def test_usd_yer_rate_generation(self):
        """Test USD/YER rate generation."""
        rate = self.generator._get_usd_yer_rate(self.start_date)
        assert isinstance(rate, float)
        assert rate > 0
        assert rate >= 100  # Floor check
    
    def test_karat_price_calculation(self):
        """Test karat price calculations."""
        base_price_24k = 1000.0
        
        # Test 24k (should be same as base)
        price_24k = self.generator._calculate_karat_price(base_price_24k, 24)
        assert price_24k == base_price_24k
        
        # Test 18k (should be 75% of base)
        price_18k = self.generator._calculate_karat_price(base_price_24k, 18)
        assert price_18k == 750.0
        
        # Test 21k (should be 87.5% of base)
        price_21k = self.generator._calculate_karat_price(base_price_24k, 21)
        assert price_21k == 875.0
    
    def test_retail_price_calculation(self):
        """Test retail price calculations."""
        base_price = 1000.0
        
        # Test buy premium
        buy_price = self.generator._calculate_retail_price(base_price, "buy")
        assert buy_price == 1020.0  # 2% premium
        
        # Test sell discount
        sell_price = self.generator._calculate_retail_price(base_price, "sell")
        assert sell_price == 990.0  # 1% discount
        
        # Test spot (no change)
        spot_price = self.generator._calculate_retail_price(base_price, "spot")
        assert spot_price == 1000.0
    
    def test_fx_rates_generation(self):
        """Test FX rates dataset generation."""
        fx_df = self.generator.generate_fx_rates(self.start_date, self.end_date)
        
        # Check structure
        expected_columns = ["ds", "base", "quote", "region", "rate", "source", "rate_type", "side"]
        assert list(fx_df.columns) == expected_columns
        
        # Check data types
        assert fx_df["rate"].dtype == "float64"
        assert fx_df["ds"].dtype == "object"
        
        # Check date range
        dates = pd.to_datetime(fx_df["ds"])
        assert dates.min().date() == self.start_date.date()
        assert dates.max().date() == self.end_date.date()
        
        # Check regions
        assert set(fx_df["region"].unique()) == set(self.generator.YER_REGIONS)
        
        # Check rate types
        assert set(fx_df["rate_type"].unique()) == {"mid", "buy", "sell"}
        
        # Check rates are positive
        assert (fx_df["rate"] > 0).all()
        
        # Check expected number of records
        expected_records = 7 * len(self.generator.YER_REGIONS) * 3  # 7 days * 4 regions * 3 rate types
        assert len(fx_df) == expected_records
    
    def test_gold_prices_generation(self):
        """Test gold prices dataset generation."""
        gold_df = self.generator.generate_gold_prices(self.start_date, self.end_date)
        
        # Check structure
        expected_columns = ["ds", "unit", "karat", "price_usd", "price_yer", "price_type", "region", "source"]
        assert list(gold_df.columns) == expected_columns
        
        # Check data types
        assert gold_df["price_usd"].dtype == "float64"
        assert gold_df["price_yer"].dtype == "float64"
        assert gold_df["karat"].dtype == "int64"
        
        # Check date range
        dates = pd.to_datetime(gold_df["ds"])
        assert dates.min().date() == self.start_date.date()
        assert dates.max().date() == self.end_date.date()
        
        # Check karats
        assert set(gold_df["karat"].unique()) == set(self.generator.GOLD_KARATS)
        
        # Check regions
        assert set(gold_df["region"].unique()) == set(self.generator.YER_REGIONS)
        
        # Check price types
        assert set(gold_df["price_type"].unique()) == {"spot", "buy", "sell"}
        
        # Check prices are positive
        assert (gold_df["price_usd"] > 0).all()
        assert (gold_df["price_yer"] > 0).all()
        
        # Check expected number of records
        expected_records = 7 * len(self.generator.GOLD_KARATS) * len(self.generator.YER_REGIONS) * 3
        assert len(gold_df) == expected_records
    
    def test_dataset_save_and_load(self):
        """Test dataset saving and loading."""
        # Generate test data
        fx_df = self.generator.generate_fx_rates(self.start_date, self.end_date)
        gold_df = self.generator.generate_gold_prices(self.start_date, self.end_date)
        
        # Save datasets
        fx_path, gold_path = self.generator.save_datasets(fx_df, gold_df)
        
        # Verify files exist
        assert Path(fx_path).exists()
        assert Path(gold_path).exists()
        
        # Load and verify data
        loaded_fx = pd.read_csv(fx_path)
        loaded_gold = pd.read_csv(gold_path)
        
        assert len(loaded_fx) == len(fx_df)
        assert len(loaded_gold) == len(gold_df)
        
        # Clean up
        Path(fx_path).unlink()
        Path(gold_path).unlink()

class TestDataUpdater:
    """Test cases for DataUpdater."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.updater = DataUpdater(data_dir="test_data")
        self.start_date = datetime(2024, 1, 1)
        self.end_date = datetime(2024, 1, 7)
    
    def test_karat_price_calculation(self):
        """Test karat price calculations."""
        base_price_24k = 1000.0
        
        # Test 24k
        price_24k = self.updater._calculate_karat_price(base_price_24k, 24)
        assert price_24k == base_price_24k
        
        # Test 18k
        price_18k = self.updater._calculate_karat_price(base_price_24k, 18)
        assert price_18k == 750.0
    
    def test_retail_price_calculation(self):
        """Test retail price calculations."""
        base_price = 1000.0
        
        # Test buy premium
        buy_price = self.updater._calculate_retail_price(base_price, "buy")
        assert buy_price == 1020.0
        
        # Test sell discount
        sell_price = self.updater._calculate_retail_price(base_price, "sell")
        assert sell_price == 990.0
    
    def test_latest_fx_rates_generation(self):
        """Test latest FX rates generation."""
        fx_df = self.updater.generate_latest_fx_rates(self.start_date, self.end_date)
        
        # Check structure
        expected_columns = ["ds", "base", "quote", "region", "rate", "source", "rate_type", "side"]
        assert list(fx_df.columns) == expected_columns
        
        # Check date range
        dates = pd.to_datetime(fx_df["ds"])
        assert dates.min().date() == self.start_date.date()
        assert dates.max().date() == self.end_date.date()
        
        # Check rates are positive
        assert (fx_df["rate"] > 0).all()
    
    def test_latest_gold_prices_generation(self):
        """Test latest gold prices generation."""
        gold_df = self.updater.generate_latest_gold_prices(self.start_date, self.end_date)
        
        # Check structure
        expected_columns = ["ds", "unit", "karat", "price_usd", "price_yer", "price_type", "region", "source"]
        assert list(gold_df.columns) == expected_columns
        
        # Check date range
        dates = pd.to_datetime(gold_df["ds"])
        assert dates.min().date() == self.start_date.date()
        assert dates.max().date() == self.end_date.date()
        
        # Check prices are positive
        assert (gold_df["price_usd"] > 0).all()
        assert (gold_df["price_yer"] > 0).all()
    
    def test_dataset_merge(self):
        """Test dataset merging functionality."""
        # Create existing data
        existing_data = pd.DataFrame({
            "ds": ["2024-01-01", "2024-01-02"],
            "region": ["SANA", "SANA"],
            "rate": [500.0, 501.0]
        })
        
        # Create new data
        new_data = pd.DataFrame({
            "ds": ["2024-01-02", "2024-01-03"],  # Overlap with existing
            "region": ["SANA", "SANA"],
            "rate": [502.0, 503.0]
        })
        
        # Merge datasets
        merged = self.updater.merge_datasets(existing_data, new_data, ["ds", "region"])
        
        # Check that duplicates are removed
        assert len(merged) == 3  # 2 existing + 1 new (duplicate removed)
        
        # Check that new data takes precedence
        assert merged[merged["ds"] == "2024-01-02"]["rate"].iloc[0] == 502.0

@pytest.mark.skipif(not GOOGLE_SHEETS_AVAILABLE, reason="Google Sheets API not available")
class TestSheetsUploader:
    """Test cases for SheetsUploader."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.credentials_path = "test_credentials.json"
        self.spreadsheet_id = "test_spreadsheet_id"
        self.data_dir = Path("test_data")
        self.data_dir.mkdir(exist_ok=True)
        
        # Create test data files
        self.fx_path = self.data_dir / "fx_yer.csv"
        self.gold_path = self.data_dir / "gold_prices.csv"
        
        # Create sample data
        fx_data = pd.DataFrame({
            "ds": ["2024-01-01", "2024-01-02"],
            "base": ["USD", "USD"],
            "quote": ["YER", "YER"],
            "region": ["SANA", "SANA"],
            "rate": [500.0, 501.0],
            "source": ["test", "test"],
            "rate_type": ["mid", "mid"],
            "side": ["both", "both"]
        })
        
        gold_data = pd.DataFrame({
            "ds": ["2024-01-01", "2024-01-02"],
            "unit": ["gram", "gram"],
            "karat": [24, 24],
            "price_usd": [100.0, 101.0],
            "price_yer": [50000.0, 50500.0],
            "price_type": ["spot", "spot"],
            "region": ["SANA", "SANA"],
            "source": ["test", "test"]
        })
        
        fx_data.to_csv(self.fx_path, index=False)
        gold_data.to_csv(self.gold_path, index=False)
    
    def teardown_method(self):
        """Clean up test fixtures."""
        if self.fx_path.exists():
            self.fx_path.unlink()
        if self.gold_path.exists():
            self.gold_path.unlink()
        if self.data_dir.exists():
            self.data_dir.rmdir()
    
    @patch('scripts.upload_to_sheets.Credentials')
    @patch('scripts.upload_to_sheets.build')
    def test_service_initialization(self, mock_build, mock_credentials):
        """Test Google Sheets service initialization."""
        # Mock credentials
        mock_creds = Mock()
        mock_credentials.from_service_account_file.return_value = mock_creds
        
        # Mock service
        mock_service = Mock()
        mock_build.return_value = mock_service
        
        # Test initialization
        uploader = SheetsUploader(self.credentials_path, self.spreadsheet_id, str(self.data_dir))
        
        assert uploader.service == mock_service
        mock_credentials.from_service_account_file.assert_called_once()
        mock_build.assert_called_once()
    
    def test_load_dataset(self):
        """Test dataset loading."""
        uploader = SheetsUploader(self.credentials_path, self.spreadsheet_id, str(self.data_dir))
        
        # Test loading FX data
        fx_df = uploader._load_dataset(self.fx_path)
        assert len(fx_df) == 2
        assert list(fx_df.columns) == ["ds", "base", "quote", "region", "rate", "source", "rate_type", "side"]
        
        # Test loading gold data
        gold_df = uploader._load_dataset(self.gold_path)
        assert len(gold_df) == 2
        assert list(gold_df.columns) == ["ds", "unit", "karat", "price_usd", "price_yer", "price_type", "region", "source"]
    
    def test_prepare_data_for_sheets(self):
        """Test data preparation for Google Sheets."""
        uploader = SheetsUploader(self.credentials_path, self.spreadsheet_id, str(self.data_dir))
        
        # Load test data
        fx_df = uploader._load_dataset(self.fx_path)
        
        # Prepare data
        prepared_data = uploader._prepare_data_for_sheets(fx_df)
        
        # Check structure
        assert len(prepared_data) == 3  # Header + 2 data rows
        assert prepared_data[0] == list(fx_df.columns)  # Header row
        assert prepared_data[1] == list(fx_df.iloc[0])  # First data row
        assert prepared_data[2] == list(fx_df.iloc[1])  # Second data row

class TestIntegration:
    """Integration tests for the complete pipeline."""
    
    def test_end_to_end_pipeline(self):
        """Test complete end-to-end pipeline."""
        # This would test the complete pipeline from data generation to Google Sheets upload
        # For now, we'll test the data generation and update components
        
        # Test data generation
        generator = DatasetGenerator(output_dir="test_data")
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 1, 3)
        
        fx_df = generator.generate_fx_rates(start_date, end_date)
        gold_df = generator.generate_gold_prices(start_date, end_date)
        
        # Verify data quality
        assert len(fx_df) > 0
        assert len(gold_df) > 0
        assert (fx_df["rate"] > 0).all()
        assert (gold_df["price_usd"] > 0).all()
        assert (gold_df["price_yer"] > 0).all()
        
        # Test data update
        updater = DataUpdater(data_dir="test_data")
        new_start = datetime(2024, 1, 4)
        new_end = datetime(2024, 1, 5)
        
        new_fx = updater.generate_latest_fx_rates(new_start, new_end)
        new_gold = updater.generate_latest_gold_prices(new_start, new_end)
        
        # Test merging
        merged_fx = updater.merge_datasets(fx_df, new_fx, ["ds", "region", "rate_type"])
        merged_gold = updater.merge_datasets(gold_df, new_gold, ["ds", "karat", "region", "price_type"])
        
        # Verify merge results
        assert len(merged_fx) == len(fx_df) + len(new_fx)
        assert len(merged_gold) == len(gold_df) + len(new_gold)
        
        # Clean up
        import shutil
        if Path("test_data").exists():
            shutil.rmtree("test_data")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
