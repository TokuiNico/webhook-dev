import requests
import json
import hashlib
import hmac

def test_webhook():
    url = "http://127.0.0.1:8000/api/v1/ingest/test/simple"
    payload = {"test": "data", "timestamp": "2024-12-19T10:00:00Z"}
    payload_str = json.dumps(payload)
    
    # 獲取正確的 secret
    secret = "test_secret_123"
    
    # 創建正確的 HMAC 簽名
    signature = hmac.new(
        secret.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": f"sha256={signature}"
    }
    
    print(f"測試 URL: {url}")
    print(f"Payload: {payload_str}")
    print(f"Secret: {secret}")
    print(f"Signature: {signature}")
    print(f"Headers: {headers}")
    print("=" * 50)
    
    try:
        response = requests.post(url, data=payload_str, headers=headers)
        print(f"狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        
        if response.status_code >= 400:
            print("❌ 請求失敗")
        else:
            print("✅ 請求成功")
            
    except Exception as e:
        print(f"❌ 請求異常: {e}")

if __name__ == "__main__":
    test_webhook() 