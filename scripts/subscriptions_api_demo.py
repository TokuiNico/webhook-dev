#!/usr/bin/env python3
"""
測試訂閱管理 API 的腳本
"""

import requests
import json

# 配置
BASE_URL = "http://127.0.0.1:8000"
API_KEY = "webhook-admin-key-123"  # 與 .env 中的 API_KEY 相同

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def test_health_check():
    """測試服務健康狀態"""
    print("🏥 測試健康檢查...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_create_subscription():
    """測試創建訂閱"""
    print("📝 測試創建訂閱...")

    # 先確認我們有可用的 topic_id（假設 GitHub push topic 存在）
    subscription_data = {
        "topic_id": 1,  # 假設 GitHub push topic 的 ID 是 1
        "subscriber_name": "Test Service",
        "target_url": "https://httpbin.org/post",
        "is_active": True
    }

    response = requests.post(
        f"{BASE_URL}/api/v1/subscriptions/",
        headers=headers,
        json=subscription_data
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        print(f"Created subscription: {response.json()}")
        return response.json()["id"]
    else:
        print(f"Error: {response.text}")
        return None

def test_list_subscriptions():
    """測試列出訂閱"""
    print("📋 測試列出訂閱...")

    response = requests.get(
        f"{BASE_URL}/api/v1/subscriptions/",
        headers=headers
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total subscriptions: {data['total']}")
        for item in data['items']:
            print(f"  - ID: {item['id']}, Name: {item['subscriber_name']}, Active: {item['is_active']}")
    else:
        print(f"Error: {response.text}")
    print()

def test_get_subscription(subscription_id):
    """測試獲取特定訂閱"""
    if not subscription_id:
        print("⚠️  跳過獲取訂閱測試（沒有有效的訂閱 ID）")
        return

    print(f"🔍 測試獲取訂閱 {subscription_id}...")

    response = requests.get(
        f"{BASE_URL}/api/v1/subscriptions/{subscription_id}",
        headers=headers
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Subscription details: {response.json()}")
    else:
        print(f"Error: {response.text}")
    print()

def test_update_subscription(subscription_id):
    """測試更新訂閱"""
    if not subscription_id:
        print("⚠️  跳過更新訂閱測試（沒有有效的訂閱 ID）")
        return

    print(f"✏️  測試更新訂閱 {subscription_id}...")

    update_data = {
        "subscriber_name": "Updated Test Service",
        "target_url": "https://httpbin.org/put"
    }

    response = requests.put(
        f"{BASE_URL}/api/v1/subscriptions/{subscription_id}",
        headers=headers,
        json=update_data
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Updated subscription: {response.json()}")
    else:
        print(f"Error: {response.text}")
    print()

def test_deactivate_subscription(subscription_id):
    """測試停用訂閱"""
    if not subscription_id:
        print("⚠️  跳過停用訂閱測試（沒有有效的訂閱 ID）")
        return

    print(f"🚫 測試停用訂閱 {subscription_id}...")

    response = requests.delete(
        f"{BASE_URL}/api/v1/subscriptions/{subscription_id}",
        headers=headers
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")
    print()

def test_activate_subscription(subscription_id):
    """測試重新啟用訂閱"""
    if not subscription_id:
        print("⚠️  跳過啟用訂閱測試（沒有有效的訂閱 ID）")
        return

    print(f"✅ 測試重新啟用訂閱 {subscription_id}...")

    response = requests.post(
        f"{BASE_URL}/api/v1/subscriptions/{subscription_id}/activate",
        headers=headers
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")
    print()

def test_api_key_authentication():
    """測試 API Key 認證"""
    print("🔐 測試 API Key 認證...")

    # 測試無效的 API Key
    invalid_headers = {
        "Authorization": "Bearer invalid-key",
        "Content-Type": "application/json"
    }

    response = requests.get(
        f"{BASE_URL}/api/v1/subscriptions/",
        headers=invalid_headers
    )

    print(f"使用無效 API Key - Status: {response.status_code}")
    if response.status_code == 401:
        print("✅ API Key 認證正常工作")
    else:
        print(f"❌ 預期 401，實際得到 {response.status_code}")

    # 測試沒有 API Key
    response = requests.get(f"{BASE_URL}/api/v1/subscriptions/")
    print(f"沒有 API Key - Status: {response.status_code}")
    print()

def main():
    """主測試函數"""
    print("🚀 開始測試訂閱管理 API")
    print("=" * 50)

    # 基本健康檢查
    test_health_check()

    # 測試 API Key 認證
    test_api_key_authentication()

    # 測試 CRUD 操作
    subscription_id = test_create_subscription()
    print()

    test_list_subscriptions()
    test_get_subscription(subscription_id)
    test_update_subscription(subscription_id)
    test_list_subscriptions()  # 再次列出查看更新結果
    test_deactivate_subscription(subscription_id)
    test_list_subscriptions()  # 查看停用結果
    test_activate_subscription(subscription_id)
    test_list_subscriptions()  # 查看重新啟用結果

    print("🎉 測試完成！")

if __name__ == "__main__":
    try:
        main()
    except requests.ConnectionError:
        print("❌ 無法連接到服務器，請確認服務正在運行在 http://127.0.0.1:8000")
    except Exception as e:
        print(f"❌ 測試過程中發生錯誤: {e}")
