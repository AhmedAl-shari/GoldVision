#!/usr/bin/env python3
"""Test script for backtest functionality."""

import requests
import json
import time

def test_backtest_api():
    """Test the backtest API endpoint."""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Backtest API...")
    
    # Test 1: Health check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    # Test 2: Run backtest
    print("\n2. Running backtest...")
    try:
        response = requests.get(f"{base_url}/backtest?horizon=14&step=7&min_train=60&max_cutoffs=5")
        if response.status_code == 200:
            data = response.json()
            print("✅ Backtest completed successfully")
            print(f"   Cutoffs evaluated: {len(data.get('rows', []))}")
            if 'avg' in data:
                avg = data['avg']
                print(f"   Average MAE: ${avg.get('avg_mae', 0):.2f}")
                print(f"   Average MAPE: {avg.get('avg_mape', 0):.2f}%")
        else:
            print(f"❌ Backtest failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Backtest failed: {e}")
        return
    
    # Test 3: Download CSV
    print("\n3. Testing CSV download...")
    try:
        response = requests.get(f"{base_url}/backtest/download")
        if response.status_code == 200:
            print("✅ CSV download successful")
            print(f"   Content-Type: {response.headers.get('content-type')}")
            print(f"   Content-Length: {len(response.content)} bytes")
        else:
            print(f"❌ CSV download failed: {response.status_code}")
    except Exception as e:
        print(f"❌ CSV download failed: {e}")
    
    print("\n🎉 Backtest API tests completed!")

if __name__ == "__main__":
    test_backtest_api()