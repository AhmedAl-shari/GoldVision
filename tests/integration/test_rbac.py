#!/usr/bin/env python3
"""Test RBAC (Role-Based Access Control) functionality."""

import requests
import json
import time
from typing import Dict, Any


class RBACTester:
    """Test RBAC functionality."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
    
    def create_test_user(self) -> bool:
        """Create a test user for RBAC testing."""
        try:
            response = self.session.post(f"{self.base_url}/auth/signup", json={
                "email": "testuser@example.com",
                "password": "testpass123",
                "locale": "en"
            })
            
            if response.status_code == 201:
                print("✅ Test user created successfully")
                return True
            else:
                print(f"⚠️  Test user creation: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error creating test user: {e}")
            return False
    
    def login_admin(self) -> bool:
        """Login as admin user."""
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json={
                "email": "demo@goldvision.com",
                "password": "demo123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                print("✅ Admin login successful")
                return True
            else:
                print(f"❌ Admin login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Admin login error: {e}")
            return False
    
    def login_user(self) -> bool:
        """Login as regular user."""
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json={
                "email": "testuser@example.com",
                "password": "testpass123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.user_token = data["access_token"]
                print("✅ User login successful")
                return True
            else:
                print(f"❌ User login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ User login error: {e}")
            return False
    
    def test_admin_endpoints(self) -> Dict[str, Any]:
        """Test admin-only endpoints."""
        print("\n🛡️  Testing Admin-Only Endpoints")
        print("-" * 40)
        
        results = {}
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
        user_headers = {"Authorization": f"Bearer {self.user_token}"} if self.user_token else {}
        
        # Test /prices/ingest
        print("\n1. Testing /prices/ingest")
        
        # Admin should succeed
        admin_response = self.session.post(
            f"{self.base_url}/prices/ingest",
            json={"rows": [{"ds": "2025-01-20", "price": 2050.0}]},
            headers=admin_headers
        )
        
        # User should get 403
        user_response = self.session.post(
            f"{self.base_url}/prices/ingest",
            json={"rows": [{"ds": "2025-01-21", "price": 2055.0}]},
            headers=user_headers
        )
        
        results["prices_ingest"] = {
            "admin_status": admin_response.status_code,
            "user_status": user_response.status_code,
            "admin_success": admin_response.status_code == 200,
            "user_blocked": user_response.status_code == 403,
            "rbac_working": admin_response.status_code == 200 and user_response.status_code == 403
        }
        
        print(f"  Admin (200 expected): {admin_response.status_code}")
        print(f"  User (403 expected): {user_response.status_code}")
        
        # Test /fetch-latest
        print("\n2. Testing /fetch-latest")
        
        # Admin should succeed
        admin_response = self.session.post(
            f"{self.base_url}/fetch-latest",
            headers=admin_headers
        )
        
        # User should get 403
        user_response = self.session.post(
            f"{self.base_url}/fetch-latest",
            headers=user_headers
        )
        
        results["fetch_latest"] = {
            "admin_status": admin_response.status_code,
            "user_status": user_response.status_code,
            "admin_success": admin_response.status_code == 200,
            "user_blocked": user_response.status_code == 403,
            "rbac_working": admin_response.status_code == 200 and user_response.status_code == 403
        }
        
        print(f"  Admin (200 expected): {admin_response.status_code}")
        print(f"  User (403 expected): {user_response.status_code}")
        
        # Test admin endpoints
        admin_endpoints = [
            "/admin/data-source",
            "/admin/metrics", 
            "/admin/scheduler",
            "/notifications/status",
            "/notifications/test"
        ]
        
        for endpoint in admin_endpoints:
            print(f"\n3. Testing {endpoint}")
            
            # Admin should succeed
            admin_response = self.session.get(
                f"{self.base_url}{endpoint}",
                headers=admin_headers
            )
            
            # User should get 403
            user_response = self.session.get(
                f"{self.base_url}{endpoint}",
                headers=user_headers
            )
            
            results[endpoint] = {
                "admin_status": admin_response.status_code,
                "user_status": user_response.status_code,
                "admin_success": admin_response.status_code == 200,
                "user_blocked": user_response.status_code == 403,
                "rbac_working": admin_response.status_code == 200 and user_response.status_code == 403
            }
            
            print(f"  Admin (200 expected): {admin_response.status_code}")
            print(f"  User (403 expected): {user_response.status_code}")
        
        return results
    
    def test_user_alert_isolation(self) -> Dict[str, Any]:
        """Test that users can only see/modify their own alerts."""
        print("\n🔒 Testing User Alert Isolation")
        print("-" * 40)
        
        results = {}
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
        user_headers = {"Authorization": f"Bearer {self.user_token}"} if self.user_token else {}
        
        # Create alerts for both users
        print("\n1. Creating alerts for both users")
        
        # Admin creates alert
        admin_alert_response = self.session.post(
            f"{self.base_url}/alerts",
            json={"rule_type": "price_above", "threshold": 2000.0, "direction": "above"},
            headers=admin_headers
        )
        
        # User creates alert
        user_alert_response = self.session.post(
            f"{self.base_url}/alerts",
            json={"rule_type": "price_below", "threshold": 1900.0, "direction": "below"},
            headers=user_headers
        )
        
        admin_alert_id = None
        user_alert_id = None
        
        if admin_alert_response.status_code == 200:
            admin_alert_id = admin_alert_response.json()["alert"]["id"]
            print(f"  ✅ Admin alert created (ID: {admin_alert_id})")
        
        if user_alert_response.status_code == 200:
            user_alert_id = user_alert_response.json()["alert"]["id"]
            print(f"  ✅ User alert created (ID: {user_alert_id})")
        
        # Test alert visibility
        print("\n2. Testing alert visibility")
        
        # Admin gets their alerts
        admin_alerts_response = self.session.get(
            f"{self.base_url}/alerts",
            headers=admin_headers
        )
        
        # User gets their alerts
        user_alerts_response = self.session.get(
            f"{self.base_url}/alerts",
            headers=user_headers
        )
        
        admin_alerts = []
        user_alerts = []
        
        if admin_alerts_response.status_code == 200:
            admin_alerts = admin_alerts_response.json()["alerts"]
            print(f"  Admin sees {len(admin_alerts)} alerts")
        
        if user_alerts_response.status_code == 200:
            user_alerts = user_alerts_response.json()["alerts"]
            print(f"  User sees {len(user_alerts)} alerts")
        
        # Check isolation
        admin_alert_ids = [alert["id"] for alert in admin_alerts]
        user_alert_ids = [alert["id"] for alert in user_alerts]
        
        # Users should not see each other's alerts
        isolation_working = (
            admin_alert_id not in user_alert_ids and
            user_alert_id not in admin_alert_ids
        )
        
        results["alert_isolation"] = {
            "admin_alerts_count": len(admin_alerts),
            "user_alerts_count": len(user_alerts),
            "admin_alert_id": admin_alert_id,
            "user_alert_id": user_alert_id,
            "isolation_working": isolation_working
        }
        
        print(f"  ✅ Alert isolation working: {isolation_working}")
        
        # Test alert deletion
        print("\n3. Testing alert deletion permissions")
        
        if admin_alert_id and user_alert_id:
            # User tries to delete admin's alert (should fail)
            user_delete_admin_response = self.session.delete(
                f"{self.base_url}/alerts/{admin_alert_id}",
                headers=user_headers
            )
            
            # Admin tries to delete user's alert (should fail)
            admin_delete_user_response = self.session.delete(
                f"{self.base_url}/alerts/{user_alert_id}",
                headers=admin_headers
            )
            
            # User deletes their own alert (should succeed)
            user_delete_own_response = self.session.delete(
                f"{self.base_url}/alerts/{user_alert_id}",
                headers=user_headers
            )
            
            results["alert_deletion"] = {
                "user_cannot_delete_admin_alert": user_delete_admin_response.status_code == 404,
                "admin_cannot_delete_user_alert": admin_delete_user_response.status_code == 404,
                "user_can_delete_own_alert": user_delete_own_response.status_code == 200,
                "deletion_permissions_working": (
                    user_delete_admin_response.status_code == 404 and
                    admin_delete_user_response.status_code == 404 and
                    user_delete_own_response.status_code == 200
                )
            }
            
            print(f"  User cannot delete admin alert (404 expected): {user_delete_admin_response.status_code}")
            print(f"  Admin cannot delete user alert (404 expected): {admin_delete_user_response.status_code}")
            print(f"  User can delete own alert (200 expected): {user_delete_own_response.status_code}")
        
        return results
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all RBAC tests."""
        print("🚀 GoldVision RBAC Tests")
        print("=" * 50)
        
        # Create test user
        self.create_test_user()
        
        # Login as both users
        if not self.login_admin():
            print("❌ Cannot proceed without admin login")
            return {}
        
        if not self.login_user():
            print("❌ Cannot proceed without user login")
            return {}
        
        # Run tests
        admin_results = self.test_admin_endpoints()
        isolation_results = self.test_user_alert_isolation()
        
        # Combine results
        all_results = {
            "admin_endpoints": admin_results,
            "alert_isolation": isolation_results
        }
        
        # Print summary
        self.print_summary(all_results)
        
        return all_results
    
    def print_summary(self, results: Dict[str, Any]):
        """Print test summary."""
        print("\n" + "="*60)
        print("📊 RBAC TEST SUMMARY")
        print("="*60)
        
        # Admin endpoints summary
        admin_results = results.get("admin_endpoints", {})
        admin_tests_passed = sum(1 for result in admin_results.values() 
                               if isinstance(result, dict) and result.get("rbac_working", False))
        admin_total_tests = len(admin_results)
        
        print(f"\n🛡️  Admin Endpoints: {admin_tests_passed}/{admin_total_tests} working correctly")
        
        for endpoint, result in admin_results.items():
            if isinstance(result, dict):
                status = "✅ PASS" if result.get("rbac_working", False) else "❌ FAIL"
                print(f"  {endpoint}: {status}")
        
        # Alert isolation summary
        isolation_results = results.get("alert_isolation", {})
        isolation_working = isolation_results.get("isolation_working", False)
        deletion_working = isolation_results.get("alert_deletion", {}).get("deletion_permissions_working", False)
        
        print(f"\n🔒 Alert Isolation: {'✅ PASS' if isolation_working else '❌ FAIL'}")
        print(f"🔒 Deletion Permissions: {'✅ PASS' if deletion_working else '❌ FAIL'}")
        
        # Overall status
        overall_success = (
            admin_tests_passed == admin_total_tests and
            isolation_working and
            deletion_working
        )
        
        print(f"\n🎯 Overall RBAC Status: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
        
        if overall_success:
            print("\n✅ RBAC is properly implemented:")
            print("  - Admin-only endpoints are protected")
            print("  - Users can only access their own alerts")
            print("  - Alert deletion permissions are enforced")
        else:
            print("\n❌ RBAC issues detected:")
            if admin_tests_passed < admin_total_tests:
                print("  - Some admin endpoints are not properly protected")
            if not isolation_working:
                print("  - Alert isolation is not working")
            if not deletion_working:
                print("  - Alert deletion permissions are not enforced")


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test GoldVision RBAC")
    parser.add_argument("--url", default="http://localhost:8000", help="API base URL")
    
    args = parser.parse_args()
    
    tester = RBACTester(args.url)
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    admin_results = results.get("admin_endpoints", {})
    admin_tests_passed = sum(1 for result in admin_results.values() 
                           if isinstance(result, dict) and result.get("rbac_working", False))
    admin_total_tests = len(admin_results)
    
    isolation_working = results.get("alert_isolation", {}).get("isolation_working", False)
    deletion_working = results.get("alert_isolation", {}).get("alert_deletion", {}).get("deletion_permissions_working", False)
    
    all_passed = (
        admin_tests_passed == admin_total_tests and
        isolation_working and
        deletion_working
    )
    
    exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
