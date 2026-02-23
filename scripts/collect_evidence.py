#!/usr/bin/env python3
"""
Enhanced evidence collection script for GoldVision API testing.
Creates artifacts with API responses, RBAC tests, and performance data.
"""

import os
import sys
import json
import subprocess
import shutil
from datetime import datetime
from pathlib import Path
import requests
import time

def run_command(cmd, capture_output=True):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=capture_output, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def create_artifacts_dir():
    """Create artifacts directory with ISO date."""
    iso_date = datetime.now().strftime("%Y-%m-%d")
    artifacts_dir = Path(f"artifacts/{iso_date}")
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    return artifacts_dir

def collect_api_evidence(artifacts_dir):
    """Collect API evidence using curl commands."""
    base_url = "http://127.0.0.1:8000"
    
    endpoints = [
        ("/health", "health.json"),
        ("/openapi.json", "openapi.json"),
        ("/provider/status", "provider_status.json"),
        ("/backtest?horizon=14&step=7&min_train=60", "backtest.json"),
    ]
    
    print("📊 Collecting API evidence...")
    
    for endpoint, filename in endpoints:
        url = f"{base_url}{endpoint}"
        output_file = artifacts_dir / filename
        
        if endpoint == "/openapi.json":
            # Special handling for OpenAPI spec
            success, stdout, stderr = run_command(f"curl -fsS '{url}'")
            if success:
                with open(output_file, 'w') as f:
                    f.write(stdout)
                print(f"  ✅ {filename}")
            else:
                print(f"  ❌ {filename} - {stderr}")
        else:
            success, stdout, stderr = run_command(f"curl -fsS '{url}' > '{output_file}'")
            if success:
                print(f"  ✅ {filename}")
            else:
                print(f"  ❌ {filename} - {stderr}")
    
    # Collect metrics (first 50 lines)
    success, stdout, stderr = run_command(f"curl -fsS '{base_url}/metrics' | head -50 > '{artifacts_dir}/metrics.txt'")
    if success:
        print(f"  ✅ metrics.txt")
    else:
        print(f"  ❌ metrics.txt - {stderr}")
    
    # Copy backtest results if exists
    backtest_csv = Path("backtest_results.csv")
    if backtest_csv.exists():
        shutil.copy2(backtest_csv, artifacts_dir / "backtest_results.csv")
        print(f"  ✅ backtest_results.csv")
    
    # Validate provider status and check fallback usage
    validate_provider_status(artifacts_dir, base_url)

def validate_provider_status(artifacts_dir, base_url):
    """Validate provider status and check fallback usage."""
    print("\n🔍 Validating provider status...")
    
    try:
        # Get provider status
        response = requests.get(f"{base_url}/provider/status", timeout=10)
        
        if response.status_code == 200:
            status_data = response.json()
            
            # Check if fallback was used
            fallback_used = status_data.get("fallback_used_last_run", True)
            last_fetch = status_data.get("last_fetch_at")
            
            print(f"  📊 Provider Status:")
            print(f"    - Last fetch: {last_fetch}")
            print(f"    - Fallback used: {fallback_used}")
            
            # If fallback was used, try to trigger a fresh fetch
            if fallback_used:
                print("  ⚠️  Fallback was used, attempting fresh fetch...")
                
                # Try to trigger a fresh fetch (if endpoint exists)
                fetch_response = requests.post(f"{base_url}/fetch-latest", timeout=30)
                if fetch_response.status_code == 200:
                    print("  ✅ Fresh fetch triggered successfully")
                    
                    # Wait a moment and check status again
                    time.sleep(5)
                    retry_response = requests.get(f"{base_url}/provider/status", timeout=10)
                    if retry_response.status_code == 200:
                        retry_data = retry_response.json()
                        new_fallback = retry_data.get("fallback_used_last_run", True)
                        print(f"    - New fallback status: {new_fallback}")
                        
                        # Update the provider status file with fresh data
                        with open(artifacts_dir / "provider_status.json", 'w') as f:
                            json.dump(retry_data, f, indent=2)
                else:
                    print(f"  ❌ Fresh fetch failed: {fetch_response.status_code}")
            
            # Create a summary for the README
            with open(artifacts_dir / "provider_status_summary.txt", 'w') as f:
                f.write("Provider Status Summary\n")
                f.write("======================\n\n")
                f.write(f"Last fetch: {last_fetch}\n")
                f.write(f"Fallback used: {fallback_used}\n")
                f.write(f"Status: {'HEALTHY' if not fallback_used else 'DEGRADED'}\n")
                f.write(f"Timestamp: {datetime.now().isoformat()}\n")
            
            print(f"  ✅ Provider status validation complete")
            
        else:
            print(f"  ❌ Provider status check failed: {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ Provider status validation failed: {e}")

def test_rbac(artifacts_dir):
    """Test RBAC (Role-Based Access Control)."""
    print("\n🔐 Testing RBAC...")
    
    base_url = "http://127.0.0.1:8000"
    
    try:
        # Login as demo user (admin role)
        demo_login_data = {
            "email": "demo@goldvision.com", 
            "password": "demo123"
        }
        
        login_response = requests.post(f"{base_url}/auth/login", json=demo_login_data)
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test admin access (should work)
            ingest_response = requests.post(
                f"{base_url}/prices/ingest",
                json={"rows": [{"ds": "2025-01-01", "price": 2000}]},
                headers=headers
            )
            
            with open(artifacts_dir / "rbac_admin_ok.txt", "w") as f:
                f.write(f"Status: {ingest_response.status_code}\n")
                f.write(f"Headers: {dict(ingest_response.headers)}\n")
                f.write(f"Response: {ingest_response.text}\n")
            
            print(f"    ✅ Admin access test - Status: {ingest_response.status_code}")
            
            # Test without token (should fail)
            no_auth_response = requests.post(
                f"{base_url}/prices/ingest",
                json={"rows": [{"ds": "2025-01-01", "price": 2000}]}
            )
            
            with open(artifacts_dir / "rbac_user_forbidden.txt", "w") as f:
                f.write(f"Status: {no_auth_response.status_code}\n")
                f.write(f"Headers: {dict(no_auth_response.headers)}\n")
                f.write(f"Response: {no_auth_response.text}\n")
            
            print(f"    ✅ No auth test - Status: {no_auth_response.status_code}")
            
    except Exception as e:
        print(f"    ❌ RBAC test failed: {e}")

def run_performance_test(artifacts_dir):
    """Run performance test and save results."""
    print("\n⚡ Running performance test...")
    
    # Check if perf script exists
    perf_script = Path("test_performance_simple.py")
    if perf_script.exists():
        success, stdout, stderr = run_command(f"python3 {perf_script} --requests 50 --output {artifacts_dir}/perf_summary.txt")
        if success:
            print("  ✅ Performance test completed")
        else:
            print(f"  ❌ Performance test failed: {stderr}")
    else:
        # Create a simple performance test
        with open(artifacts_dir / "perf_summary.txt", "w") as f:
            f.write("Performance test not available\n")
        print("  ⚠️  Performance test script not found, created placeholder")
    
    # Run cold/warm performance test
    print("\n🔥 Running cold/warm performance test...")
    success, stdout, stderr = run_command("make perf-cold-warm")
    if success:
        print("  ✅ Cold/warm performance test completed")
        # Copy the generated perf summary
        perf_cold_warm_file = Path("artifacts/perf_cold_warm_summary.txt")
        if perf_cold_warm_file.exists():
            import shutil
            shutil.copy2(perf_cold_warm_file, artifacts_dir / "perf_cold_warm_summary.txt")
    else:
        print(f"  ❌ Cold/warm performance test failed: {stderr}")

def test_forecast_integration(artifacts_dir):
    """Test forecast integration with Prophet service."""
    print("\n🔮 Testing forecast integration...")
    
    base_url = "http://127.0.0.1:8000"
    
    try:
        # Test forecast endpoint
        forecast_response = requests.post(
            f"{base_url}/forecast",
            json={"horizon_days": 30},
            timeout=30
        )
        
        if forecast_response.status_code == 200:
            forecast_data = forecast_response.json()
            forecast_count = len(forecast_data.get("forecast", []))
            
            with open(artifacts_dir / "forecast_test.txt", "w") as f:
                f.write(f"Status: {forecast_response.status_code}\n")
                f.write(f"Forecast points: {forecast_count}\n")
                f.write(f"Horizon days: {forecast_data.get('horizon_days', 'N/A')}\n")
                f.write(f"Generated at: {forecast_data.get('generated_at', 'N/A')}\n")
            
            print(f"    ✅ Forecast test - {forecast_count} points generated")
        else:
            print(f"    ❌ Forecast test failed - Status: {forecast_response.status_code}")
            
    except Exception as e:
        print(f"    ❌ Forecast test failed: {e}")

def test_web_push(artifacts_dir):
    """Test Web Push functionality."""
    print("\n📱 Testing Web Push...")
    
    base_url = "http://127.0.0.1:8000"
    
    try:
        # Login first
        login_response = requests.post(f"{base_url}/auth/login", json={
            "email": "demo@goldvision.com",
            "password": "demo123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test push subscription
            subscription_data = {
                "endpoint": "https://fcm.googleapis.com/fcm/send/test",
                "keys": {
                    "p256dh": "test-p256dh-key",
                    "auth": "test-auth-key"
                }
            }
            
            subscribe_response = requests.post(
                f"{base_url}/push/subscribe",
                json=subscription_data,
                headers=headers
            )
            
            with open(artifacts_dir / "web_push_test.txt", "w") as f:
                f.write(f"Subscribe Status: {subscribe_response.status_code}\n")
                f.write(f"Subscribe Response: {subscribe_response.text}\n")
            
            print(f"    ✅ Web Push subscription test - Status: {subscribe_response.status_code}")
            
    except Exception as e:
        print(f"    ❌ Web Push test failed: {e}")

def test_error_responses(artifacts_dir):
    """Test RFC 7807 error responses."""
    print("\n🚨 Testing error responses...")

    error_types = ["400", "401", "403", "404", "409", "422", "429"]

    for error_type in error_types:
        try:
            response = requests.get(
                f"http://localhost:8000/_demo/errors?type={error_type}",
                timeout=5
            )
            
            if response.status_code == int(error_type):
                print(f"  ✅ Error {error_type} response correct")
                
                # Save error response
                error_data = response.json()
                with open(artifacts_dir / f"errors_{error_type}.json", "w") as f:
                    json.dump(error_data, f, indent=2)
            else:
                print(f"  ❌ Error {error_type} returned {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Error {error_type} test failed: {e}")

def create_latest_zip(artifacts_dir):
    """Create latest.zip from the artifacts directory."""
    try:
        import zipfile
        
        # Get the date folder name
        date_folder = artifacts_dir.name
        latest_zip = artifacts_dir.parent / "latest.zip"
        
        print(f"\n📦 Creating latest.zip from {date_folder}...")
        
        with zipfile.ZipFile(latest_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(artifacts_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, artifacts_dir.parent)
                    zipf.write(file_path, arcname)
        
        zip_size = latest_zip.stat().st_size
        print(f"✅ Created latest.zip ({zip_size:,} bytes)")
        return True
    except Exception as e:
        print(f"❌ Error creating latest.zip: {e}")
        return False

def print_summary(artifacts_dir):
    """Print summary table."""
    print(f"\n📋 Evidence Collection Summary")
    print(f"{'='*50}")
    print(f"Artifacts directory: {artifacts_dir}")
    print(f"Collection time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # List collected files
    files = list(artifacts_dir.glob("*"))
    print(f"\nCollected files ({len(files)}):")
    for file in sorted(files):
        size = file.stat().st_size if file.is_file() else 0
        print(f"  📄 {file.name} ({size} bytes)")
    
    # Check if latest.zip was created
    latest_zip = artifacts_dir.parent / "latest.zip"
    if latest_zip.exists():
        zip_size = latest_zip.stat().st_size
        print(f"\n📦 Latest zip: {latest_zip} ({zip_size:,} bytes)")
    
    print(f"\n✅ Evidence collection complete!")

def main():
    """Main evidence collection function."""
    print("🔍 GoldVision Evidence Collection")
    print("=" * 40)
    
    # Create artifacts directory
    artifacts_dir = create_artifacts_dir()
    print(f"📁 Created artifacts directory: {artifacts_dir}")
    
    # Collect evidence
    collect_api_evidence(artifacts_dir)
    test_rbac(artifacts_dir)
    test_forecast_integration(artifacts_dir)
    test_web_push(artifacts_dir)
    test_error_responses(artifacts_dir)
    run_performance_test(artifacts_dir)
    
    # Create latest.zip
    create_latest_zip(artifacts_dir)
    
    print_summary(artifacts_dir)

if __name__ == "__main__":
    main()
