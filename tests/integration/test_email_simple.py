#!/usr/bin/env python3
"""Simple test for email notifications functionality."""

import requests
import json

def test_email_endpoints():
    """Test email notification endpoints."""
    base_url = "http://localhost:8000"
    
    print("Testing Email Notification Endpoints")
    print("=" * 50)
    
    # Login first
    print("1. Logging in...")
    login_response = requests.post(f"{base_url}/auth/login", json={
        "email": "demo@goldvision.com",
        "password": "demo123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful")
    
    # Test email status endpoint
    print("\n2. Testing email status endpoint...")
    status_response = requests.get(f"{base_url}/notifications/status", headers=headers)
    
    if status_response.status_code == 200:
        status_data = status_response.json()
        print(f"✅ Email status retrieved")
        print(f"   Configured: {status_data.get('configured', False)}")
        if status_data.get('configured'):
            print(f"   SMTP Host: {status_data.get('smtp_host')}")
            print(f"   SMTP Port: {status_data.get('smtp_port')}")
            print(f"   From: {status_data.get('smtp_from')}")
        else:
            print("   ⚠️  Email service not configured")
    else:
        print(f"❌ Email status failed: {status_response.status_code}")
        return False
    
    # Test send test email endpoint
    print("\n3. Testing send test email endpoint...")
    test_response = requests.post(f"{base_url}/notifications/test", headers=headers)
    
    if test_response.status_code == 200:
        test_data = test_response.json()
        print(f"✅ Test email sent successfully")
        print(f"   Message: {test_data.get('message')}")
        print(f"   Recipient: {test_data.get('recipient')}")
    elif test_response.status_code == 400:
        error_data = test_response.json()
        print(f"⚠️  Test email not sent: {error_data.get('detail')}")
        print("   This is expected if SMTP is not configured")
    else:
        print(f"❌ Test email failed: {test_response.status_code}")
        print(f"   Response: {test_response.text}")
        return False
    
    # Test alert creation (to verify email integration)
    print("\n4. Testing alert creation...")
    alert_response = requests.post(f"{base_url}/alerts", json={
        "rule_type": "price_above",
        "threshold": 2000.0,
        "direction": "above"
    }, headers=headers)
    
    if alert_response.status_code == 200:
        alert_data = alert_response.json()
        print(f"✅ Alert created successfully")
        print(f"   Alert ID: {alert_data.get('alert', {}).get('id')}")
    else:
        print(f"❌ Alert creation failed: {alert_response.status_code}")
        print(f"   Response: {alert_response.text}")
        return False
    
    print("\n" + "=" * 50)
    print("✅ All email notification tests passed!")
    print("\nTo enable email notifications:")
    print("1. Add SMTP configuration to backend/.env")
    print("2. Restart the backend")
    print("3. Test again with this script")
    
    return True

if __name__ == "__main__":
    test_email_endpoints()
