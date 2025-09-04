#!/usr/bin/env python3
"""
簡單的 webhook 測試腳本
"""
import requests
import json
import hmac
import hashlib

def create_github_signature(payload: str, secret: str) -> str:
    """創建 GitHub 風格的 HMAC 簽名"""
    signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return f"sha256={signature}"

def test_webhook(base_url: str = "http://localhost:8000"):
    """測試 webhook 端點"""
    print("🚀 開始測試 Webhook Gateway")
    print("=" * 40)

    # 測試資料
    test_payload = {
        "ref": "refs/heads/main",
        "repository": {
            "name": "test-repo",
            "full_name": "user/test-repo"
        },
        "pusher": {
            "name": "test-user"
        },
        "commits": [
            {
                "id": "abc123",
                "message": "Test commit",
                "author": {
                    "name": "Test User"
                }
            }
        ]
    }

    payload_str = json.dumps(test_payload)
    secret = "github_test_secret_123"  # 與測試資料中的秘鑰匹配

    # 創建簽名
    signature = create_github_signature(payload_str, secret)

    # 測試端點
    url = f"{base_url}/api/v1/ingest/github/push"
    headers = {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": signature,
        "User-Agent": "GitHub-Hookshot/test"
    }

    print(f"📡 發送測試 webhook 到: {url}")
    print(f"🔐 使用簽名: {signature}")

    try:
        response = requests.post(url, data=payload_str, headers=headers, timeout=10)

        print(f"\n📊 回應結果:")
        print(f"   狀態碼: {response.status_code}")
        print(f"   回應內容: {response.text}")

        if response.status_code == 202:
            print("✅ Webhook 接收成功！")
        else:
            print("❌ Webhook 接收失敗")

    except requests.exceptions.ConnectionError:
        print("❌ 連接失敗 - 請確認 API 服務已啟動")
    except Exception as e:
        print(f"❌ 測試失敗: {e}")

def test_health_check(base_url: str = "http://localhost:8000"):
    """測試健康檢查端點"""
    print("\n🏥 測試健康檢查...")

    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"   狀態: {response.status_code}")
        print(f"   回應: {response.json()}")

        if response.status_code == 200:
            print("✅ 健康檢查通過")
        else:
            print("❌ 健康檢查失敗")

    except requests.exceptions.ConnectionError:
        print("❌ 連接失敗 - 請確認 API 服務已啟動")
    except Exception as e:
        print(f"❌ 健康檢查失敗: {e}")

if __name__ == "__main__":
    print("🧪 Webhook Gateway 功能測試")
    print("=" * 50)

    # 測試健康檢查
    test_health_check()

    # 測試 webhook
    test_webhook()

    print("\n🎉 測試完成！")
    print("\n💡 提示:")
    print("   - 如果測試失敗，請確認 API 服務已啟動")
    print("   - FastStream 已整合到主應用，會自動處理事件")
    print("   - 查看服務日誌以獲取更多資訊")
