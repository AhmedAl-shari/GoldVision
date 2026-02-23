#!/usr/bin/env python3
"""Test script for GoldVision deployment verification."""
import requests
import time
import json
from typing import Dict, Any

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:80"

def test_backend_health():
    """Test backend health endpoint."""
    print("🔍 Testing backend health...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend healthy: {data.get('status', 'unknown')}")
            print(f"   Uptime: {data.get('uptime_seconds', 0):.2f} seconds")
            return True
        else:
            print(f"❌ Backend unhealthy: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Backend not responding - check if service is running")
        return False
    except Exception as e:
        print(f"❌ Backend error: {e}")
        return False

def test_frontend_health():
    """Test frontend health endpoint."""
    print("\n🔍 Testing frontend health...")
    
    try:
        response = requests.get(f"{FRONTEND_URL}/health", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Frontend healthy")
            return True
        else:
            print(f"❌ Frontend unhealthy: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Frontend not responding - check if service is running")
        return False
    except Exception as e:
        print(f"❌ Frontend error: {e}")
        return False

def test_forecast_generation():
    """Test forecast generation."""
    print("\n🔍 Testing forecast generation...")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/forecast",
            json={"horizon_days": 14, "include_history": True},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            forecast = data.get('forecast', [])
            print(f"✅ Forecast generated: {len(forecast)} data points")
            
            if forecast:
                latest = forecast[0]
                print(f"   Latest: {latest.get('ds')} - ${latest.get('yhat', 0):.2f}")
            
            return True
        else:
            print(f"❌ Forecast failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Forecast error: {e}")
        return False

def test_metrics_endpoint():
    """Test metrics endpoint."""
    print("\n🔍 Testing metrics endpoint...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/metrics", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            metrics_text = response.text
            print("✅ Metrics available")
            
            # Check for key metrics
            key_metrics = [
                "http_requests_total",
                "forecast_cache_hits_total",
                "forecast_cache_misses_total"
            ]
            
            found_metrics = []
            for metric in key_metrics:
                if metric in metrics_text:
                    found_metrics.append(metric)
            
            print(f"   Found metrics: {', '.join(found_metrics)}")
            return True
        else:
            print(f"❌ Metrics failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Metrics error: {e}")
        return False

def test_backtest_endpoint():
    """Test backtest endpoint."""
    print("\n🔍 Testing backtest endpoint...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/backtest?max_cutoffs=5", timeout=60)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            rows = data.get('rows', [])
            summary = data.get('summary', {})
            
            print(f"✅ Backtest completed: {len(rows)} cutoffs")
            print(f"   Average MAE: ${summary.get('avg_mae', 0):.2f}")
            print(f"   Average MAPE: {summary.get('avg_mape', 0):.2f}%")
            return True
        else:
            print(f"❌ Backtest failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Backtest error: {e}")
        return False

def test_docker_containers():
    """Test Docker container status."""
    print("\n🔍 Testing Docker containers...")
    
    try:
        import subprocess
        result = subprocess.run(
            ["docker", "ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("✅ Docker containers:")
            print(result.stdout)
            return True
        else:
            print(f"❌ Docker error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Docker check error: {e}")
        return False

def main():
    """Run all deployment tests."""
    print("🚀 Starting GoldVision Deployment Tests")
    print("=" * 50)
    
    tests = [
        ("Backend Health", test_backend_health),
        ("Frontend Health", test_frontend_health),
        ("Forecast Generation", test_forecast_generation),
        ("Metrics Endpoint", test_metrics_endpoint),
        ("Backtest Endpoint", test_backtest_endpoint),
        ("Docker Containers", test_docker_containers),
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
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Deployment is healthy.")
    else:
        print("⚠️  Some tests failed. Check the logs above.")
    
    print("\n🔧 Next Steps:")
    print("1. Set up external monitoring (UptimeRobot/Pingdom)")
    print("2. Configure SSL/TLS if using custom domain")
    print("3. Set up log rotation and backup procedures")
    print("4. Monitor metrics at http://localhost:8000/metrics")

if __name__ == "__main__":
    main()
