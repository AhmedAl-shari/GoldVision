#!/usr/bin/env python3
"""Comprehensive system health test script."""

import requests
import json
import time
import subprocess
import sys
from datetime import datetime

def test_backend_health():
    """Test backend health and basic functionality."""
    print("🔍 Testing Backend Health...")
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend health check passed")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend not accessible: {e}")
        return False

def test_provider_status():
    """Test provider status endpoint."""
    print("\n📊 Testing Provider Status...")
    
    try:
        response = requests.get("http://localhost:8000/provider/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Provider status endpoint working")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Provider Type: {data.get('provider_type', 'unknown')}")
            print(f"   Last Fetch: {data.get('last_fetch_at', 'N/A')}")
            return True
        else:
            print(f"❌ Provider status failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Provider status request failed: {e}")
        return False

def test_backtest_endpoint():
    """Test backtest endpoint."""
    print("\n📈 Testing Backtest Endpoint...")
    
    try:
        response = requests.get("http://localhost:8000/backtest?max_cutoffs=1", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backtest endpoint working")
            print(f"   Cutoffs: {len(data.get('rows', []))}")
            if 'avg' in data:
                print(f"   Avg MAE: ${data['avg'].get('avg_mae', 0):.2f}")
            return True
        else:
            print(f"❌ Backtest failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backtest request failed: {e}")
        return False

def test_frontend_build():
    """Test frontend build process."""
    print("\n🌐 Testing Frontend Build...")
    
    try:
        # Check if frontend can build without errors
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd="/Users/ahmedalshari/Desktop/Gold/goldvision/frontend",
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print("✅ Frontend builds successfully")
            return True
        else:
            print("❌ Frontend build failed")
            print(f"   Error: {result.stderr[:200]}...")
            return False
    except subprocess.TimeoutExpired:
        print("❌ Frontend build timed out")
        return False
    except Exception as e:
        print(f"❌ Frontend build error: {e}")
        return False

def test_api_endpoints():
    """Test various API endpoints."""
    print("\n🔗 Testing API Endpoints...")
    
    endpoints = [
        ("/health", "Health check"),
        ("/provider/status", "Provider status"),
        ("/metrics", "Metrics endpoint"),
    ]
    
    success_count = 0
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            if response.status_code == 200:
                print(f"✅ {description}: OK")
                success_count += 1
            else:
                print(f"❌ {description}: {response.status_code}")
        except Exception as e:
            print(f"❌ {description}: {e}")
    
    return success_count == len(endpoints)

def test_metrics_functionality():
    """Test metrics functionality."""
    print("\n📊 Testing Metrics...")
    
    try:
        response = requests.get("http://localhost:8000/metrics", timeout=5)
        if response.status_code == 200:
            content = response.text
            if "http_requests_total" in content and "http_request_duration_ms" in content:
                print("✅ Metrics endpoint working with expected metrics")
                return True
            else:
                print("⚠️  Metrics endpoint working but missing expected metrics")
                return False
        else:
            print(f"❌ Metrics endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Metrics test failed: {e}")
        return False

def main():
    """Run all system health tests."""
    print("🏥 GoldVision System Health Check")
    print("=" * 40)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    tests = [
        ("Backend Health", test_backend_health),
        ("Provider Status", test_provider_status),
        ("Backtest Endpoint", test_backtest_endpoint),
        ("Frontend Build", test_frontend_build),
        ("API Endpoints", test_api_endpoints),
        ("Metrics Functionality", test_metrics_functionality),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 40)
    print("📋 Test Summary")
    print("=" * 40)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System is healthy.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
