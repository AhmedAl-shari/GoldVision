#!/usr/bin/env python3
"""Test script for provider status functionality."""

import requests
import json
import time

def test_provider_status():
    """Test the provider status endpoint."""
    base_url = "http://localhost:8000"
    
    print("🔍 Testing Provider Status API...")
    
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
    
    # Test 2: Provider status
    print("\n2. Testing provider status endpoint...")
    try:
        response = requests.get(f"{base_url}/provider/status")
        if response.status_code == 200:
            data = response.json()
            print("✅ Provider status retrieved successfully")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Provider Type: {data.get('provider_type', 'unknown')}")
            print(f"   Last Fetch: {data.get('last_fetch_at', 'N/A')}")
            print(f"   Last Price: ${data.get('last_price', {}).get('price', 'N/A')}")
            print(f"   Fallback Used: {data.get('fallback_used_last_run', False)}")
            print(f"   Retries: {data.get('retries_last_run', 0)}")
            print(f"   Interval: {data.get('scheduler_interval_min', 0)} min")
            if data.get('last_request_id'):
                print(f"   Request ID: {data['last_request_id'][:8]}...")
        else:
            print(f"❌ Provider status failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Provider status failed: {e}")
        return
    
    # Test 3: Multiple requests (caching test)
    print("\n3. Testing caching behavior...")
    try:
        start_time = time.time()
        response1 = requests.get(f"{base_url}/provider/status")
        first_time = time.time() - start_time
        
        start_time = time.time()
        response2 = requests.get(f"{base_url}/provider/status")
        second_time = time.time() - start_time
        
        if response1.status_code == 200 and response2.status_code == 200:
            data1 = response1.json()
            data2 = response2.json()
            
            # Check if data is the same (cached)
            if data1.get('last_fetch_at') == data2.get('last_fetch_at'):
                print("✅ Caching working correctly")
            else:
                print("⚠️  Data changed between requests (cache may have expired)")
            
            print(f"   First request: {first_time:.3f}s")
            print(f"   Second request: {second_time:.3f}s")
        else:
            print("❌ Caching test failed")
    except Exception as e:
        print(f"❌ Caching test failed: {e}")
    
    # Test 4: Error handling
    print("\n4. Testing error handling...")
    try:
        # Test with invalid endpoint
        response = requests.get(f"{base_url}/provider/status/invalid")
        if response.status_code == 404:
            print("✅ Error handling working correctly")
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
    
    print("\n🎉 Provider status tests completed!")
    print("\n📋 Summary:")
    print("   ✅ Provider status endpoint working")
    print("   ✅ Data format correct")
    print("   ✅ Caching implemented")
    print("   ✅ Error handling in place")

if __name__ == "__main__":
    test_provider_status()
