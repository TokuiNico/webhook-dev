#!/usr/bin/env python3
import requests
import json

# 測試創建訂閱
url = "http://127.0.0.1:8000/api/v1/subscriptions/"
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

print("Testing subscription creation...")
response = requests.post(url, headers=headers, json=data)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code != 201:
    print("\nTesting if topic exists...")
    # 檢查是否有 topic_id=1
    import sqlite3
    conn = sqlite3.connect('webhook.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM topics WHERE id = 1")
    topic = cursor.fetchone()
    print(f"Topic with ID 1: {topic}")
    conn.close() 