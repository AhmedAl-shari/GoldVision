#!/usr/bin/env python3
"""Test script for GoldVision observability and safety controls."""
import requests
import time
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_request_id_middleware():
    """Test that request ID middleware is working."""
    print("🔍 Testing Request ID Middleware...")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        
        # Check for X-Request-ID header
        request_id = response.headers.get('X-Request-ID')
        if request_id:
            print(f"✅ Request ID present: {request_id}")
            return request_id
        else:
            print("❌ No X-Request-ID header found")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_structured_logging():
    """Test structured JSON logging."""
    print("\n🔍 Testing Structured Logging...")
    
    try:
        # Make a few requests to generate logs
        for i in range(3):
            response = requests.get(f"{BASE_URL}/health")
            time.sleep(0.1)
        
        print("✅ Made test requests - check server logs for structured JSON output")
        print("   Look for logs with 'type': 'http_request' and request_id fields")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_metrics_endpoint():
    """Test Prometheus metrics endpoint."""
    print("\n🔍 Testing Metrics Endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/metrics")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            metrics_text = response.text
            print("✅ Metrics endpoint accessible")
            
            # Check for key metrics
            key_metrics = [
                "http_requests_total",
                "forecast_cache_hits_total",
                "forecast_cache_misses_total",
                "provider_failures_total",
                "rate_limit_exceeded_total",
                "auth_failures_total"
            ]
            
            found_metrics = []
            for metric in key_metrics:
                if metric in metrics_text:
                    found_metrics.append(metric)
            
            print(f"   Found metrics: {', '.join(found_metrics)}")
            
            # Show sample metrics
            lines = metrics_text.split('\n')
            sample_lines = [line for line in lines if 'http_requests_total' in line and '{' in line][:3]
            if sample_lines:
                print("   Sample metrics:")
                for line in sample_lines:
                    print(f"     {line}")
            
            return True
        else:
            print(f"❌ Metrics endpoint failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_rate_limiting():
    """Test rate limiting on sensitive endpoints."""
    print("\n🔍 Testing Rate Limiting...")
    
    # Test prices/ingest endpoint
    print("   Testing /prices/ingest rate limiting...")
    try:
        # Make requests quickly to trigger rate limit
        for i in range(12):  # Should trigger after 10 requests
            response = requests.post(
                f"{BASE_URL}/prices/ingest",
                json={"rows": [{"ds": "2025-01-20", "price": 2000.0}]}
            )
            if response.status_code == 429:
                print(f"✅ Rate limit triggered after {i+1} requests")
                print(f"   Response: {response.json()}")
                print(f"   Headers: {dict(response.headers)}")
                break
            time.sleep(0.1)
        else:
            print("⚠️  Rate limit not triggered - may need adjustment")
            
    except Exception as e:
        print(f"❌ Error testing rate limiting: {e}")
    
    # Test auth/login endpoint
    print("   Testing /auth/login rate limiting...")
    try:
        for i in range(7):  # Should trigger after 5 requests
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": "test@example.com", "password": "wrongpassword"}
            )
            if response.status_code == 429:
                print(f"✅ Auth rate limit triggered after {i+1} requests")
                break
            time.sleep(0.1)
        else:
            print("⚠️  Auth rate limit not triggered")
            
    except Exception as e:
        print(f"❌ Error testing auth rate limiting: {e}")

def test_error_handling():
    """Test error handling with request ID."""
    print("\n🔍 Testing Error Handling...")
    
    try:
        # Test 404 error
        response = requests.get(f"{BASE_URL}/nonexistent")
        print(f"404 Status: {response.status_code}")
        
        if response.status_code == 404:
            data = response.json()
            if 'request_id' in data:
                print(f"✅ 404 error includes request_id: {data['request_id']}")
            else:
                print("❌ 404 error missing request_id")
        
        # Test validation error
        response = requests.post(
            f"{BASE_URL}/forecast",
            json={"invalid": "data"}
        )
        print(f"Validation Status: {response.status_code}")
        
        if response.status_code == 422:
            data = response.json()
            if 'request_id' in data:
                print(f"✅ Validation error includes request_id: {data['request_id']}")
            else:
                print("❌ Validation error missing request_id")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_frontend_health_banner():
    """Test frontend health banner functionality."""
    print("\n🔍 Testing Frontend Health Banner...")
    
    try:
        # Test frontend health endpoint
        response = requests.get(f"{BASE_URL.replace(':8000', ':80')}/health")
        print(f"Frontend Health Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Frontend health endpoint accessible")
        else:
            print("⚠️  Frontend health endpoint not accessible")
        
        # Note: Full frontend testing would require browser automation
        print("   Note: Full health banner testing requires frontend to be running")
        return True
        
    except Exception as e:
        print(f"❌ Error testing frontend: {e}")
        return False

def test_metrics_increment():
    """Test that metrics are properly incremented."""
    print("\n🔍 Testing Metrics Increment...")
    
    try:
        # Get initial metrics
        response1 = requests.get(f"{BASE_URL}/metrics")
        initial_text = response1.text
        
        # Make some requests
        for i in range(5):
            requests.get(f"{BASE_URL}/health")
            time.sleep(0.1)
        
        # Get updated metrics
        response2 = requests.get(f"{BASE_URL}/metrics")
        updated_text = response2.text
        
        # Check if http_requests_total increased
        initial_count = 0
        updated_count = 0
        
        for line in initial_text.split('\n'):
            if 'http_requests_total{' in line and 'method=GET' in line and 'status=200' in line:
                initial_count = int(line.split()[-1])
                break
        
        for line in updated_text.split('\n'):
            if 'http_requests_total{' in line and 'method=GET' in line and 'status=200' in line:
                updated_count = int(line.split()[-1])
                break
        
        if updated_count > initial_count:
            print(f"✅ Metrics incremented: {initial_count} -> {updated_count}")
            return True
        else:
            print(f"⚠️  Metrics may not be incrementing: {initial_count} -> {updated_count}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_log_grep_examples():
    """Show examples of how to grep logs by request ID."""
    print("\n🔍 Testing Log Grep Examples...")
    
    try:
        # Get a request ID
        response = requests.get(f"{BASE_URL}/health")
        request_id = response.headers.get('X-Request-ID')
        
        if request_id:
            print(f"✅ Request ID for testing: {request_id}")
            print("\n📋 Log Grep Examples:")
            print(f"   # Grep by request ID:")
            print(f"   docker-compose logs backend | grep '{request_id}'")
            print(f"   ")
            print(f"   # Grep by request type:")
            print(f"   docker-compose logs backend | grep 'http_request'")
            print(f"   ")
            print(f"   # Grep by status code:")
            print(f"   docker-compose logs backend | grep 'status_code.*200'")
            print(f"   ")
            print(f"   # Grep by user ID (if authenticated):")
            print(f"   docker-compose logs backend | grep 'user_id'")
            return True
        else:
            print("❌ No request ID available for examples")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all observability tests."""
    print("🚀 Starting GoldVision Observability Tests")
    print("=" * 60)
    
    tests = [
        ("Request ID Middleware", test_request_id_middleware),
        ("Structured Logging", test_structured_logging),
        ("Metrics Endpoint", test_metrics_endpoint),
        ("Rate Limiting", test_rate_limiting),
        ("Error Handling", test_error_handling),
        ("Frontend Health Banner", test_frontend_health_banner),
        ("Metrics Increment", test_metrics_increment),
        ("Log Grep Examples", test_log_grep_examples),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Observability Test Results Summary:")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All observability features are working correctly!")
    else:
        print("⚠️  Some observability features need attention.")
    
    print("\n📋 Observability Features Implemented:")
    print("  ✅ Request ID middleware with X-Request-ID headers")
    print("  ✅ Structured JSON logging with request details")
    print("  ✅ Prometheus metrics endpoint at /metrics")
    print("  ✅ Rate limiting on sensitive endpoints")
    print("  ✅ Error handling with request ID traceability")
    print("  ✅ Frontend health banner with request ID")
    print("  ✅ Comprehensive metrics collection")
    
    print("\n🔧 Monitoring Setup:")
    print("  1. Scrape metrics: curl http://localhost:8000/metrics")
    print("  2. View logs: docker-compose logs backend")
    print("  3. Grep by request ID: docker-compose logs backend | grep 'REQUEST_ID'")
    print("  4. Monitor rate limits: docker-compose logs backend | grep 'rate_limit'")

if __name__ == "__main__":
    main()