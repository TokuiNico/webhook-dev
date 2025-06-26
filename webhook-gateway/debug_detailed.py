#!/usr/bin/env python3
import requests
import json

# 首先測試簡單的端點
print("1. Testing health endpoint...")
response = requests.get("http://127.0.0.1:8000/health")
print(f"Health check: {response.status_code} - {response.json()}")

print("\n2. Testing docs endpoint...")
response = requests.get("http://127.0.0.1:8000/docs")
print(f"Docs: {response.status_code}")

print("\n3. Testing subscription list (should work)...")
headers = {"Authorization": "Bearer webhook-admin-key-123"}
response = requests.get("http://127.0.0.1:8000/api/v1/subscriptions/", headers=headers)
print(f"List subscriptions: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Current subscriptions: {data['total']}")

print("\n4. Testing subscription creation...")
headers = {
    "Authorization": "Bearer webhook-admin-key-123",
    "Content-Type": "application/json"
}
data = {
    "topic_id": 1,
    "subscriber_name": "Debug Test",
    "target_url": "https://httpbin.org/post",
    "is_active": True
}

response = requests.post("http://127.0.0.1:8000/api/v1/subscriptions/", headers=headers, json=data)
print(f"Create subscription: {response.status_code}")
print(f"Response headers: {dict(response.headers)}")
print(f"Response text: {response.text}")

# 如果失敗，嘗試直接連接資料庫檢查
if response.status_code != 201:
    print("\n5. Direct database check...")
    import sqlite3
    conn = sqlite3.connect('webhook.db')
    cursor = conn.cursor()
    
    # 檢查 topics 表
    cursor.execute("SELECT id, name FROM topics")
    topics = cursor.fetchall()
    print(f"Available topics: {topics}")
    
    # 檢查 subscriptions 表
    cursor.execute("SELECT COUNT(*) FROM subscriptions")
    count = cursor.fetchone()[0]
    print(f"Current subscription count: {count}")
    
    conn.close() 