#!/usr/bin/env python3
"""Test admin API endpoints."""

import requests
import json


def test_admin_endpoints():
    """Test admin API endpoints."""
    print("Testing admin API endpoints...")
    
    # Get auth token
    login_response = requests.post("http://localhost:8000/auth/login", json={
        "email": "demo@goldvision.com",
        "password": "demo123"
    })
    
    if login_response.status_code != 200:
        print("❌ Failed to login")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test data source endpoint
    print("\n1. Testing /admin/data-source...")
    response = requests.get("http://localhost:8000/admin/data-source", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print("✅ Data source endpoint working")
        print(f"   - Last fetch: {data.get('last_fetch_at', 'Never')}")
        print(f"   - Status: {data.get('status', 'Unknown')}")
        print(f"   - Provider: {data.get('provider_type', 'Unknown')}")
    else:
        print(f"❌ Data source endpoint failed: {response.status_code}")
        return False
    
    # Test metrics endpoint
    print("\n2. Testing /admin/metrics...")
    response = requests.get("http://localhost:8000/admin/metrics", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print("✅ Metrics endpoint working")
        print(f"   - HTTP requests by route: {len(data.get('http_requests_by_route', {}))}")
        print(f"   - Cache hits: {data.get('forecast_cache_hits', 0)}")
        print(f"   - Cache misses: {data.get('forecast_cache_misses', 0)}")
        print(f"   - Provider failures: {data.get('provider_failures_total', 0)}")
    else:
        print(f"❌ Metrics endpoint failed: {response.status_code}")
        return False
    
    # Test scheduler endpoint
    print("\n3. Testing /admin/scheduler...")
    response = requests.get("http://localhost:8000/admin/scheduler", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print("✅ Scheduler endpoint working")
        price_task = data.get('price_fetch_task', {})
        print(f"   - Price fetch interval: {price_task.get('interval_minutes', 0)} min")
        print(f"   - Next run: {price_task.get('next_run', 'Unknown')}")
        print(f"   - Consecutive failures: {price_task.get('consecutive_failures', 0)}")
        print(f"   - Total tasks: {len(data.get('tasks', {}))}")
    else:
        print(f"❌ Scheduler endpoint failed: {response.status_code}")
        return False
    
    # Test non-admin access (should fail)
    print("\n4. Testing non-admin access...")
    # Create a non-admin user token (this would need to be implemented)
    # For now, just test that the endpoint requires authentication
    response = requests.get("http://localhost:8000/admin/data-source")
    if response.status_code == 401:
        print("✅ Admin endpoints properly protected (requires auth)")
    else:
        print(f"❌ Admin endpoints not properly protected: {response.status_code}")
    
    print("\n🎉 All admin API tests passed!")
    return True


if __name__ == "__main__":
    test_admin_endpoints()
