#!/usr/bin/env python3
"""
Google Sheets Upload Script
Uploads FX rates and gold prices datasets to Google Sheets.
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import logging
from pathlib import Path
import json

# Google Sheets API imports
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    print("Error: Google API client not installed. Run: pip install google-api-python-client google-auth")
    sys.exit(1)

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SheetsUploader:
    """Handles uploading datasets to Google Sheets."""
    
    def __init__(self, credentials_path: str, spreadsheet_id: str, data_dir: str = "data"):
        self.credentials_path = Path(credentials_path)
        self.spreadsheet_id = spreadsheet_id
        self.data_dir = Path(data_dir)
        self.fx_path = self.data_dir / "fx_yer.csv"
        self.gold_path = self.data_dir / "gold_prices.csv"
        
        # Initialize Google Sheets service
        self.service = self._initialize_service()
        
    def _initialize_service(self):
        """Initialize Google Sheets service."""
        try:
            # Load credentials
            if not self.credentials_path.exists():
                raise FileNotFoundError(f"Credentials file not found: {self.credentials_path}")
            
            credentials = Credentials.from_service_account_file(
                str(self.credentials_path),
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            
            # Build service
            service = build('sheets', 'v4', credentials=credentials)
            logger.info("Google Sheets service initialized successfully")
            return service
            
        except Exception as e:
            logger.error(f"Error initializing Google Sheets service: {e}")
            raise
    
    def _load_dataset(self, file_path: Path) -> pd.DataFrame:
        """Load dataset from CSV file."""
        try:
            df = pd.read_csv(file_path)
            logger.info(f"Loaded {len(df)} records from {file_path}")
            return df
        except Exception as e:
            logger.error(f"Error loading dataset from {file_path}: {e}")
            raise
    
    def _prepare_data_for_sheets(self, df: pd.DataFrame) -> List[List]:
        """Prepare DataFrame for Google Sheets upload."""
        # Convert DataFrame to list of lists
        data = [df.columns.tolist()] + df.values.tolist()
        return data
    
    def _clear_sheet(self, sheet_name: str):
        """Clear existing data from a sheet."""
        try:
            # Get sheet range
            range_name = f"{sheet_name}!A:Z"
            
            # Clear the range
            self.service.spreadsheets().values().clear(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            logger.info(f"Cleared sheet: {sheet_name}")
            
        except HttpError as e:
            logger.error(f"Error clearing sheet {sheet_name}: {e}")
            raise
    
    def _update_sheet(self, sheet_name: str, data: List[List]):
        """Update a sheet with new data."""
        try:
            # Prepare range
            range_name = f"{sheet_name}!A1"
            
            # Update values
            body = {
                'values': data
            }
            
            result = self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                body=body
            ).execute()
            
            updated_cells = result.get('updatedCells', 0)
            logger.info(f"Updated {updated_cells} cells in sheet: {sheet_name}")
            
        except HttpError as e:
            logger.error(f"Error updating sheet {sheet_name}: {e}")
            raise
    
    def _format_sheet(self, sheet_name: str):
        """Apply formatting to a sheet."""
        try:
            # Get sheet ID
            spreadsheet = self.service.spreadsheets().get(
                spreadsheetId=self.spreadsheet_id
            ).execute()
            
            sheet_id = None
            for sheet in spreadsheet['sheets']:
                if sheet['properties']['title'] == sheet_name:
                    sheet_id = sheet['properties']['sheetId']
                    break
            
            if sheet_id is None:
                logger.warning(f"Sheet {sheet_name} not found for formatting")
                return
            
            # Format header row
            requests = [
                {
                    'repeatCell': {
                        'range': {
                            'sheetId': sheet_id,
                            'startRowIndex': 0,
                            'endRowIndex': 1
                        },
                        'cell': {
                            'userEnteredFormat': {
                                'backgroundColor': {
                                    'red': 0.9,
                                    'green': 0.9,
                                    'blue': 0.9
                                },
                                'textFormat': {
                                    'bold': True
                                }
                            }
                        },
                        'fields': 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                },
                {
                    'autoResizeDimensions': {
                        'dimensions': {
                            'sheetId': sheet_id,
                            'dimension': 'COLUMNS',
                            'startIndex': 0,
                            'endIndex': 10
                        }
                    }
                }
            ]
            
            # Apply formatting
            self.service.spreadsheets().batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body={'requests': requests}
            ).execute()
            
            logger.info(f"Applied formatting to sheet: {sheet_name}")
            
        except HttpError as e:
            logger.error(f"Error formatting sheet {sheet_name}: {e}")
            # Don't raise - formatting is not critical
    
    def upload_fx_rates(self):
        """Upload FX rates to Google Sheets."""
        logger.info("Uploading FX rates to Google Sheets...")
        
        # Load data
        fx_df = self._load_dataset(self.fx_path)
        
        # Prepare data
        fx_data = self._prepare_data_for_sheets(fx_df)
        
        # Clear and update sheet
        self._clear_sheet("fx_rates")
        self._update_sheet("fx_rates", fx_data)
        self._format_sheet("fx_rates")
        
        logger.info(f"Successfully uploaded {len(fx_df)} FX rate records")
    
    def upload_gold_prices(self):
        """Upload gold prices to Google Sheets."""
        logger.info("Uploading gold prices to Google Sheets...")
        
        # Load data
        gold_df = self._load_dataset(self.gold_path)
        
        # Prepare data
        gold_data = self._prepare_data_for_sheets(gold_df)
        
        # Clear and update sheet
        self._clear_sheet("gold_prices")
        self._update_sheet("gold_prices", gold_data)
        self._format_sheet("gold_prices")
        
        logger.info(f"Successfully uploaded {len(gold_df)} gold price records")
    
    def upload_all(self):
        """Upload all datasets to Google Sheets."""
        logger.info("Starting Google Sheets upload...")
        
        try:
            # Upload FX rates
            self.upload_fx_rates()
            
            # Upload gold prices
            self.upload_gold_prices()
            
            logger.info("All datasets uploaded successfully!")
            
        except Exception as e:
            logger.error(f"Error uploading datasets: {e}")
            raise
    
    def verify_upload(self):
        """Verify that data was uploaded correctly."""
        logger.info("Verifying upload...")
        
        try:
            # Check FX rates sheet
            fx_range = "fx_rates!A1:H10"
            fx_result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=fx_range
            ).execute()
            
            fx_values = fx_result.get('values', [])
            logger.info(f"FX rates sheet has {len(fx_values)} rows (first 10)")
            
            # Check gold prices sheet
            gold_range = "gold_prices!A1:H10"
            gold_result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=gold_range
            ).execute()
            
            gold_values = gold_result.get('values', [])
            logger.info(f"Gold prices sheet has {len(gold_values)} rows (first 10)")
            
            # Print sample data
            print("\n" + "="*80)
            print("GOOGLE SHEETS UPLOAD VERIFICATION")
            print("="*80)
            
            if fx_values:
                print("FX Rates Sheet (first 5 rows):")
                for i, row in enumerate(fx_values[:5]):
                    print(f"Row {i+1}: {row}")
            
            if gold_values:
                print("\nGold Prices Sheet (first 5 rows):")
                for i, row in enumerate(gold_values[:5]):
                    print(f"Row {i+1}: {row}")
            
        except Exception as e:
            logger.error(f"Error verifying upload: {e}")
            raise

def main():
    """Main function to upload datasets to Google Sheets."""
    logger.info("Starting Google Sheets upload...")
    
    # Configuration
    credentials_path = os.getenv('GOOGLE_CREDENTIALS_PATH', 'credentials.json')
    spreadsheet_id = os.getenv('GOOGLE_SPREADSHEET_ID', '')
    
    if not spreadsheet_id:
        logger.error("GOOGLE_SPREADSHEET_ID environment variable not set")
        sys.exit(1)
    
    try:
        # Initialize uploader
        uploader = SheetsUploader(credentials_path, spreadsheet_id)
        
        # Upload all datasets
        uploader.upload_all()
        
        # Verify upload
        uploader.verify_upload()
        
        logger.info("Google Sheets upload completed successfully!")
        
    except Exception as e:
        logger.error(f"Error uploading to Google Sheets: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
