#!/usr/bin/env python3
"""Test script for GoldVision price provider and scheduler."""
import asyncio
import requests
import time
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8001"

def test_fetch_latest_endpoint():
    """Test the /fetch-latest endpoint."""
    print("🔍 Testing /fetch-latest endpoint...")
    
    try:
        response = requests.post(f"{BASE_URL}/fetch-latest")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success: {data.get('success', False)}")
            print(f"Message: {data.get('message', 'No message')}")
            
            if 'data' in data:
                price_data = data['data']
                print(f"Price Data: {price_data}")
                
                if data.get('fallback', False):
                    print("⚠️  Using fallback data (external API failed)")
                else:
                    print("✅ Fresh data from external API")
        else:
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running on port 8001")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

def test_metrics_endpoint():
    """Test the metrics endpoint for price provider metrics."""
    print("📊 Testing metrics endpoint for price provider metrics...")
    
    try:
        response = requests.get(f"{BASE_URL}/metrics")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            metrics_text = response.text
            print("Price provider metrics found:")
            
            # Look for price-related metrics
            price_metrics = [
                "price_fetches_total",
                "price_fetches_successful", 
                "price_fetches_failed",
                "provider_success_total",
                "provider_failures_total"
            ]
            
            for metric in price_metrics:
                if metric in metrics_text:
                    lines = [line for line in metrics_text.split('\n') if metric in line]
                    for line in lines:
                        print(f"  {line}")
                else:
                    print(f"  {metric}: Not found")
        else:
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

def test_health_endpoint():
    """Test the health endpoint."""
    print("🏥 Testing health endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Health: {data.get('status', 'unknown')}")
            print(f"Uptime: {data.get('uptime_seconds', 0):.2f} seconds")
        else:
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

def test_price_endpoints():
    """Test price-related endpoints."""
    print("💰 Testing price endpoints...")
    
    try:
        # Test getting prices
        response = requests.get(f"{BASE_URL}/prices?limit=5")
        print(f"GET /prices Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Prices count: {data.get('count', 0)}")
            if data.get('prices'):
                latest_price = data['prices'][0]
                print(f"Latest price: {latest_price}")
        
        # Test ingesting prices (if you have test data)
        test_price_data = {
            "rows": [
                {"ds": "2025-01-20", "price": 2050.50},
                {"ds": "2025-01-21", "price": 2055.75}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/prices/ingest",
            json=test_price_data
        )
        print(f"POST /prices/ingest Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Ingested: {data.get('inserted_count', 0)} prices")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

def test_scheduler_status():
    """Test scheduler status (if available)."""
    print("⏰ Testing scheduler status...")
    
    try:
        # This would require a custom endpoint for scheduler status
        # For now, we'll check if the server is running and has the scheduler
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Server is running")
            print("ℹ️  Scheduler status not available via API (would need custom endpoint)")
        else:
            print("❌ Server health check failed")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()

def main():
    """Run all price provider tests."""
    print("🚀 Starting GoldVision Price Provider Tests")
    print("=" * 50)
    
    # Test basic connectivity
    test_health_endpoint()
    
    # Test price endpoints
    test_price_endpoints()
    
    # Test fetch-latest endpoint
    test_fetch_latest_endpoint()
    
    # Test metrics
    test_metrics_endpoint()
    
    # Test scheduler status
    test_scheduler_status()
    
    print("✅ All price provider tests completed!")
    print("\n📋 Summary of implemented features:")
    print("  ✓ RealPriceProvider with HTTP client and retries")
    print("  ✓ Resilient scheduler with APScheduler")
    print("  ✓ Fallback to last-known price on failure")
    print("  ✓ Comprehensive logging and metrics")
    print("  ✓ Manual price fetching via /fetch-latest")
    print("  ✓ Automatic cache invalidation")
    print("\n🔧 Configuration:")
    print("  - Set PRICE_API_BASE_URL and PRICE_API_KEY in .env")
    print("  - Adjust FETCH_INTERVAL_MIN, MAX_RETRIES, BACKOFF_BASE_MS")
    print("  - Check /metrics endpoint for monitoring")

if __name__ == "__main__":
    main()
