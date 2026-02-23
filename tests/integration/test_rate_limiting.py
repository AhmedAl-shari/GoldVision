#!/usr/bin/env python3
"""Integration tests for rate limiting functionality."""

import requests
import time
import json
from typing import Dict, Any, List


class RateLimitTester:
    """Test rate limiting functionality."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
    
    def login(self) -> bool:
        """Login and get authentication token."""
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json={
                "email": "demo@goldvision.com",
                "password": "demo123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                print("✅ Login successful")
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def test_auth_login_rate_limit(self) -> Dict[str, Any]:
        """Test rate limiting on auth login endpoint."""
        print("🛡️  Testing /auth/login rate limiting (5/min)...")
        
        responses = []
        
        # Make 7 requests rapidly (should allow 5, rate limit 2)
        for i in range(7):
            start_time = time.time()
            
            try:
                response = self.session.post(f"{self.base_url}/auth/login", json={
                    "email": "demo@goldvision.com",
                    "password": "demo123"
                })
                
                duration = time.time() - start_time
                responses.append({
                    "request": i + 1,
                    "status": response.status_code,
                    "duration": duration,
                    "headers": dict(response.headers),
                    "retry_after": response.headers.get("Retry-After"),
                    "rate_limit_remaining": response.headers.get("X-RateLimit-Remaining"),
                    "rate_limit_limit": response.headers.get("X-RateLimit-Limit")
                })
                
                print(f"  Request {i+1}: {response.status_code} "
                      f"(Remaining: {response.headers.get('X-RateLimit-Remaining', 'N/A')})")
                
            except Exception as e:
                responses.append({
                    "request": i + 1,
                    "status": 0,
                    "duration": time.time() - start_time,
                    "error": str(e)
                })
                print(f"  Request {i+1}: Error - {e}")
        
        # Analyze results
        successful = [r for r in responses if r["status"] == 200]
        rate_limited = [r for r in responses if r["status"] == 429]
        
        result = {
            "endpoint": "/auth/login",
            "total_requests": len(responses),
            "successful": len(successful),
            "rate_limited": len(rate_limited),
            "expected_limit": 5,
            "rate_limiting_working": len(rate_limited) > 0,
            "responses": responses
        }
        
        print(f"  ✅ Successful: {len(successful)}")
        print(f"  🚫 Rate limited: {len(rate_limited)}")
        print(f"  📊 Rate limiting working: {result['rate_limiting_working']}")
        
        return result
    
    def test_alerts_rate_limit(self) -> Dict[str, Any]:
        """Test rate limiting on alerts endpoints."""
        if not self.auth_token:
            print("❌ Cannot test alerts rate limiting without authentication")
            return {}
        
        print("🛡️  Testing /alerts POST rate limiting (5/min)...")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        responses = []
        
        # Make 7 requests rapidly (should allow 5, rate limit 2)
        for i in range(7):
            start_time = time.time()
            
            try:
                response = self.session.post(f"{self.base_url}/alerts", 
                    json={
                        "rule_type": "price_above",
                        "threshold": 2000.0 + i,  # Different threshold each time
                        "direction": "above"
                    },
                    headers=headers
                )
                
                duration = time.time() - start_time
                responses.append({
                    "request": i + 1,
                    "status": response.status_code,
                    "duration": duration,
                    "headers": dict(response.headers),
                    "retry_after": response.headers.get("Retry-After"),
                    "rate_limit_remaining": response.headers.get("X-RateLimit-Remaining"),
                    "rate_limit_limit": response.headers.get("X-RateLimit-Limit")
                })
                
                print(f"  Request {i+1}: {response.status_code} "
                      f"(Remaining: {response.headers.get('X-RateLimit-Remaining', 'N/A')})")
                
            except Exception as e:
                responses.append({
                    "request": i + 1,
                    "status": 0,
                    "duration": time.time() - start_time,
                    "error": str(e)
                })
                print(f"  Request {i+1}: Error - {e}")
        
        # Analyze results
        successful = [r for r in responses if r["status"] == 200]
        rate_limited = [r for r in responses if r["status"] == 429]
        
        result = {
            "endpoint": "/alerts POST",
            "total_requests": len(responses),
            "successful": len(successful),
            "rate_limited": len(rate_limited),
            "expected_limit": 5,
            "rate_limiting_working": len(rate_limited) > 0,
            "responses": responses
        }
        
        print(f"  ✅ Successful: {len(successful)}")
        print(f"  🚫 Rate limited: {len(rate_limited)}")
        print(f"  📊 Rate limiting working: {result['rate_limiting_working']}")
        
        return result
    
    def test_prices_ingest_rate_limit(self) -> Dict[str, Any]:
        """Test rate limiting on prices ingest endpoint."""
        if not self.auth_token:
            print("❌ Cannot test prices ingest rate limiting without authentication")
            return {}
        
        print("🛡️  Testing /prices/ingest rate limiting (10/min)...")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        responses = []
        
        # Make 12 requests rapidly (should allow 10, rate limit 2)
        for i in range(12):
            start_time = time.time()
            
            try:
                response = self.session.post(f"{self.base_url}/prices/ingest", 
                    json={
                        "rows": [{
                            "ds": f"2025-01-{20 + i:02d}",
                            "price": 2000.0 + i
                        }]
                    },
                    headers=headers
                )
                
                duration = time.time() - start_time
                responses.append({
                    "request": i + 1,
                    "status": response.status_code,
                    "duration": duration,
                    "headers": dict(response.headers),
                    "retry_after": response.headers.get("Retry-After"),
                    "rate_limit_remaining": response.headers.get("X-RateLimit-Remaining"),
                    "rate_limit_limit": response.headers.get("X-RateLimit-Limit")
                })
                
                print(f"  Request {i+1}: {response.status_code} "
                      f"(Remaining: {response.headers.get('X-RateLimit-Remaining', 'N/A')})")
                
            except Exception as e:
                responses.append({
                    "request": i + 1,
                    "status": 0,
                    "duration": time.time() - start_time,
                    "error": str(e)
                })
                print(f"  Request {i+1}: Error - {e}")
        
        # Analyze results
        successful = [r for r in responses if r["status"] == 200]
        rate_limited = [r for r in responses if r["status"] == 429]
        
        result = {
            "endpoint": "/prices/ingest",
            "total_requests": len(responses),
            "successful": len(successful),
            "rate_limited": len(rate_limited),
            "expected_limit": 10,
            "rate_limiting_working": len(rate_limited) > 0,
            "responses": responses
        }
        
        print(f"  ✅ Successful: {len(successful)}")
        print(f"  🚫 Rate limited: {len(rate_limited)}")
        print(f"  📊 Rate limiting working: {result['rate_limiting_working']}")
        
        return result
    
    def test_retry_after_header(self) -> bool:
        """Test that rate limited responses include Retry-After header."""
        print("🛡️  Testing Retry-After header...")
        
        # Make requests until we get rate limited
        responses = []
        for i in range(10):
            try:
                response = self.session.post(f"{self.base_url}/auth/login", json={
                    "email": "demo@goldvision.com",
                    "password": "demo123"
                })
                responses.append(response)
                
                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    if retry_after:
                        print(f"  ✅ Retry-After header present: {retry_after} seconds")
                        return True
                    else:
                        print("  ❌ Retry-After header missing")
                        return False
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
                return False
        
        print("  ⚠️  Did not trigger rate limiting")
        return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all rate limiting tests."""
        print("🚀 GoldVision Rate Limiting Tests")
        print("=" * 50)
        
        # Login first
        if not self.login():
            print("❌ Cannot proceed without authentication")
            return {}
        
        results = {}
        
        # Test auth login rate limiting
        results["auth_login"] = self.test_auth_login_rate_limit()
        
        # Wait a bit between tests
        print("\n⏳ Waiting 2 seconds between tests...")
        time.sleep(2)
        
        # Test alerts rate limiting
        results["alerts_post"] = self.test_alerts_rate_limit()
        
        # Wait a bit between tests
        print("\n⏳ Waiting 2 seconds between tests...")
        time.sleep(2)
        
        # Test prices ingest rate limiting
        results["prices_ingest"] = self.test_prices_ingest_rate_limit()
        
        # Test Retry-After header
        print("\n⏳ Waiting 2 seconds before testing Retry-After...")
        time.sleep(2)
        results["retry_after"] = self.test_retry_after_header()
        
        # Print summary
        self.print_summary(results)
        
        return results
    
    def print_summary(self, results: Dict[str, Any]):
        """Print test summary."""
        print("\n" + "="*60)
        print("📊 RATE LIMITING TEST SUMMARY")
        print("="*60)
        
        total_tests = len([k for k in results.keys() if k != "retry_after"])
        passed_tests = sum(1 for k, v in results.items() 
                          if k != "retry_after" and v.get("rate_limiting_working", False))
        
        print(f"\n📈 Test Results: {passed_tests}/{total_tests} endpoints working correctly")
        
        for endpoint, result in results.items():
            if endpoint == "retry_after":
                continue
                
            print(f"\n{endpoint}:")
            print(f"  Expected limit: {result.get('expected_limit', 'N/A')}")
            print(f"  Successful: {result.get('successful', 0)}")
            print(f"  Rate limited: {result.get('rate_limited', 0)}")
            print(f"  Status: {'✅ PASS' if result.get('rate_limiting_working', False) else '❌ FAIL'}")
        
        # Retry-After header test
        if "retry_after" in results:
            print(f"\nRetry-After header: {'✅ PASS' if results['retry_after'] else '❌ FAIL'}")
        
        # Overall status
        all_passed = (passed_tests == total_tests and 
                     results.get("retry_after", False))
        
        print(f"\n🎯 Overall Status: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test GoldVision rate limiting")
    parser.add_argument("--url", default="http://localhost:8000", help="API base URL")
    
    args = parser.parse_args()
    
    tester = RateLimitTester(args.url)
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    all_passed = all(
        result.get("rate_limiting_working", False) 
        for result in results.values() 
        if isinstance(result, dict) and "rate_limiting_working" in result
    ) and results.get("retry_after", False)
    
    exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
