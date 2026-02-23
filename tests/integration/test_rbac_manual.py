#!/usr/bin/env python3
"""Manual test script for RBAC functionality."""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_rbac():
    print("Testing RBAC functionality...")
    
    # Wait for server to be ready
    print("Waiting for server to be ready...")
    for i in range(10):
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                print("Server is ready!")
                break
        except:
            time.sleep(1)
    else:
        print("Server not ready after 10 seconds")
        return
    
    # Test 1: Login as demo user (should be admin after migration)
    print("\n1. Testing admin login...")
    login_response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "demo@goldvision.com",
        "password": "demo123"
    })
    
    if login_response.status_code == 200:
        admin_token = login_response.json()["access_token"]
        print("✅ Admin login successful")
        
        # Test admin can access admin endpoints
        print("\n2. Testing admin access to admin endpoints...")
        
        # Test price ingestion
        ingest_response = requests.post(
            f"{BASE_URL}/prices/ingest",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "rows": [
                    {"ds": "2025-01-01T00:00:00", "price": 2000.0},
                    {"ds": "2025-01-02T00:00:00", "price": 2010.0}
                ]
            }
        )
        
        if ingest_response.status_code == 200:
            print("✅ Admin can ingest prices")
        else:
            print(f"❌ Admin cannot ingest prices: {ingest_response.status_code}")
            print(ingest_response.text)
        
        # Test fetch latest
        fetch_response = requests.post(
            f"{BASE_URL}/fetch-latest",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if fetch_response.status_code != 403:
            print("✅ Admin can fetch latest (may fail due to no API key, but not 403)")
        else:
            print("❌ Admin cannot fetch latest: 403 Forbidden")
    else:
        print(f"❌ Admin login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    # Test 2: Create a regular user
    print("\n3. Testing regular user creation...")
    register_response = requests.post(f"{BASE_URL}/auth/register", json={
        "email": "testuser@example.com",
        "password": "password123"
    })
    
    if register_response.status_code == 200:
        print("✅ Regular user created")
        
        # Login as regular user
        user_login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "testuser@example.com",
            "password": "password123"
        })
        
        if user_login_response.status_code == 200:
            user_token = user_login_response.json()["access_token"]
            print("✅ Regular user login successful")
            
            # Test regular user cannot access admin endpoints
            print("\n4. Testing regular user access to admin endpoints...")
            
            # Test price ingestion - should be forbidden
            user_ingest_response = requests.post(
                f"{BASE_URL}/prices/ingest",
                headers={"Authorization": f"Bearer {user_token}"},
                json={
                    "rows": [
                        {"ds": "2025-01-03T00:00:00", "price": 2020.0}
                    ]
                }
            )
            
            if user_ingest_response.status_code == 403:
                print("✅ Regular user correctly denied access to price ingestion")
            else:
                print(f"❌ Regular user should be denied: {user_ingest_response.status_code}")
                print(user_ingest_response.text)
            
            # Test fetch latest - should be forbidden
            user_fetch_response = requests.post(
                f"{BASE_URL}/fetch-latest",
                headers={"Authorization": f"Bearer {user_token}"}
            )
            
            if user_fetch_response.status_code == 403:
                print("✅ Regular user correctly denied access to fetch latest")
            else:
                print(f"❌ Regular user should be denied: {user_fetch_response.status_code}")
                print(user_fetch_response.text)
            
            # Test regular user can access regular endpoints
            print("\n5. Testing regular user access to regular endpoints...")
            
            # Test alerts endpoint
            alerts_response = requests.get(
                f"{BASE_URL}/alerts",
                headers={"Authorization": f"Bearer {user_token}"}
            )
            
            if alerts_response.status_code == 200:
                print("✅ Regular user can access alerts")
            else:
                print(f"❌ Regular user cannot access alerts: {alerts_response.status_code}")
                print(alerts_response.text)
        else:
            print(f"❌ Regular user login failed: {user_login_response.status_code}")
            print(user_login_response.text)
    else:
        print(f"❌ Regular user creation failed: {register_response.status_code}")
        print(register_response.text)
    
    print("\nRBAC testing completed!")

if __name__ == "__main__":
    test_rbac()
