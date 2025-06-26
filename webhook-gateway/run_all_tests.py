#!/usr/bin/env python3
"""
🧪 Webhook Gateway - 完整測試套件
統一測試所有 API 端點和功能
"""

import requests
import json
import hmac
import hashlib
from datetime import datetime

# 配置
BASE_URL = "http://127.0.0.1:8000"
API_KEY = "webhook-admin-key-123"

def get_auth_headers():
    """獲取認證標頭"""
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

def print_section(title):
    """打印測試區段標題"""
    print(f"\n{'='*60}")
    print(f"🧪 {title}")
    print(f"{'='*60}")

def print_test(name):
    """打印測試名稱"""
    print(f"\n📋 {name}")
    print("-" * 40)

def test_health_check():
    """測試系統健康檢查"""
    print_test("系統健康檢查")
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ 系統正常: {response.json()}")
        return True
    else:
        print(f"❌ 系統異常: {response.text}")
        return False

def test_authentication():
    """測試認證機制"""
    print_test("API 認證機制")
    
    # 測試無認證
    response = requests.get(f"{BASE_URL}/api/v1/subscriptions/")
    print(f"無認證: {response.status_code} (應為 401)")
    
    # 測試錯誤認證
    wrong_headers = {"Authorization": "Bearer wrong-key"}
    response = requests.get(f"{BASE_URL}/api/v1/subscriptions/", headers=wrong_headers)
    print(f"錯誤認證: {response.status_code} (應為 401)")
    
    # 測試正確認證
    response = requests.get(f"{BASE_URL}/api/v1/subscriptions/", headers=get_auth_headers())
    print(f"正確認證: {response.status_code} (應為 200)")
    
    return response.status_code == 200

def test_subscription_management():
    """測試訂閱管理 API"""
    print_test("訂閱管理 CRUD")
    
    headers = get_auth_headers()
    
    # 1. 列出訂閱
    response = requests.get(f"{BASE_URL}/api/v1/subscriptions/", headers=headers)
    print(f"列出訂閱: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  找到 {data['total']} 個訂閱")
    
    # 2. 創建訂閱
    new_subscription = {
        "topic_id": 1,
        "subscriber_name": "測試服務",
        "target_url": "https://httpbin.org/post",
        "is_active": True
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/subscriptions/", headers=headers, json=new_subscription)
    print(f"創建訂閱: {response.status_code}")
    
    subscription_id = None
    if response.status_code == 201:
        subscription_id = response.json()["id"]
        print(f"  創建成功，ID: {subscription_id}")
    
    # 3. 獲取特定訂閱
    if subscription_id:
        response = requests.get(f"{BASE_URL}/api/v1/subscriptions/{subscription_id}", headers=headers)
        print(f"獲取訂閱: {response.status_code}")
    
    # 4. 更新訂閱
    if subscription_id:
        update_data = {"subscriber_name": "更新後的測試服務"}
        response = requests.put(f"{BASE_URL}/api/v1/subscriptions/{subscription_id}", headers=headers, json=update_data)
        print(f"更新訂閱: {response.status_code}")
    
    return subscription_id

def test_statistics_api():
    """測試統計 API"""
    print_test("統計數據 API")
    
    headers = get_auth_headers()
    
    # 1. 總覽統計
    response = requests.get(f"{BASE_URL}/api/v1/stats/overview", headers=headers)
    print(f"總覽統計: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  總 webhooks: {data['total_webhooks']}")
        print(f"  今日 webhooks: {data['today_webhooks']}")
        print(f"  活躍訂閱: {data['active_subscriptions']}")
        print(f"  成功率: {data['success_rate']}%")
    
    # 2. 活動統計
    response = requests.get(f"{BASE_URL}/api/v1/stats/activity?days=7", headers=headers)
    print(f"活動統計: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"  統計期間: {data['period_days']} 天")
        print(f"  每日記錄: {len(data['daily_activity'])} 筆")
    
    # 3. 來源統計
    response = requests.get(f"{BASE_URL}/api/v1/stats/sources", headers=headers)
    print(f"來源統計: {response.status_code}")

def test_source_topic_management():
    """測試來源和主題管理"""
    print_test("來源和主題管理")
    
    headers = get_auth_headers()
    
    # 1. 列出來源
    response = requests.get(f"{BASE_URL}/api/v1/manage/sources/", headers=headers)
    print(f"列出來源: {response.status_code}")
    if response.status_code == 200:
        sources = response.json()
        print(f"  找到 {len(sources)} 個來源")
        for source in sources:
            print(f"    - {source['name']} (ID: {source['id']})")
    
    # 2. 列出主題
    response = requests.get(f"{BASE_URL}/api/v1/manage/topics/", headers=headers)
    print(f"列出主題: {response.status_code}")
    if response.status_code == 200:
        topics = response.json()
        print(f"  找到 {len(topics)} 個主題")
        for topic in topics:
            print(f"    - {topic['name']} (來源ID: {topic['source_id']})")

def test_webhook_ingestion():
    """測試 Webhook 接收"""
    print_test("Webhook 接收測試")
    
    # 準備測試數據
    test_payload = {"action": "push", "repository": {"name": "test-repo"}}
    payload_str = json.dumps(test_payload)
    
    # 計算 HMAC 簽名 (使用測試來源的密鑰)
    secret = "test_secret_123"
    signature = hmac.new(
        secret.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": f"sha256={signature}"
    }
    
    # 發送 webhook (使用測試中存在的 topic)
    response = requests.post(
        f"{BASE_URL}/api/v1/ingest/test/simple",
        headers=headers,
        data=payload_str
    )
    
    print(f"Webhook 接收: {response.status_code}")
    if response.status_code == 202:
        print("✅ Webhook 成功接收並排隊處理")
    else:
        print(f"❌ Webhook 接收失敗: {response.text}")

def run_comprehensive_tests():
    """運行完整測試套件"""
    print("🚀 Webhook Gateway 完整測試套件")
    print(f"開始時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. 健康檢查
    print_section("系統健康檢查")
    if not test_health_check():
        print("❌ 系統健康檢查失敗，停止測試")
        return
    
    # 2. 認證測試
    print_section("認證機制測試")
    if not test_authentication():
        print("❌ 認證測試失敗，停止測試")
        return
    
    # 3. 訂閱管理測試
    print_section("訂閱管理測試")
    subscription_id = test_subscription_management()
    
    # 4. 統計 API 測試
    print_section("統計 API 測試")
    test_statistics_api()
    
    # 5. 來源主題管理測試
    print_section("來源主題管理測試")
    test_source_topic_management()
    
    # 6. Webhook 接收測試
    print_section("Webhook 接收測試")
    test_webhook_ingestion()
    
    # 測試總結
    print_section("測試總結")
    print("✅ 所有測試完成！")
    print(f"結束時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    print("\n💡 使用說明:")
    print(f"curl -H 'Authorization: Bearer {API_KEY}' {BASE_URL}/api/v1/subscriptions/")
    print(f"curl -H 'Authorization: Bearer {API_KEY}' {BASE_URL}/api/v1/stats/overview")
    print(f"curl -H 'Authorization: Bearer {API_KEY}' {BASE_URL}/api/v1/manage/sources/")

if __name__ == "__main__":
    run_comprehensive_tests() 