#!/usr/bin/env python3
"""
Seed script to load prices_seed.csv into the database.
"""
import sys
import os
import pandas as pd
from datetime import datetime
from pathlib import Path

# Add the backend src directory to the path
backend_src = Path(__file__).parent.parent / "backend" / "src"
sys.path.insert(0, str(backend_src))

from db.database import SessionLocal, create_tables
from db.models import GoldPrice, User


def load_csv_prices(csv_path: str):
    """Load prices from CSV file."""
    try:
        df = pd.read_csv(csv_path)
        print(f"Loaded {len(df)} price records from {csv_path}")
        return df
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return None


def seed_database(csv_path: str = None):
    """Seed the database with price data."""
    # Create tables
    create_tables()
    print("✅ Database tables created")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Demo user creation removed
        
        # Load prices from CSV if provided
        if csv_path and os.path.exists(csv_path):
            df = load_csv_prices(csv_path)
            if df is not None:
                # Insert prices
                inserted_count = 0
                for _, row in df.iterrows():
                    # Check if price already exists for this date
                    existing = db.query(GoldPrice).filter(
                        GoldPrice.ds == pd.to_datetime(row['ds'])
                    ).first()
                    
                    if not existing:
                        price = GoldPrice(
                            ds=pd.to_datetime(row['ds']),
                            price=float(row['price'])
                        )
                        db.add(price)
                        inserted_count += 1
                
                db.commit()
                print(f"✅ Inserted {inserted_count} price records from CSV")
            else:
                print("❌ Failed to load CSV data")
        else:
            # Use sample data generation
            print("📊 Generating sample data...")
            seed_sample_data(db, days=90)
            print("✅ Generated 90 days of sample data")
        
        print("🎉 Database seeding complete!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    # Get CSV path from command line or use default
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "../prices_seed.csv"
    
    print("🌱 Starting database seeding...")
    seed_database(csv_path)
