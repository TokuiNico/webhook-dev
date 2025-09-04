import asyncio
import json
import traceback
from app.db.session import AsyncSessionLocal
from app.db.models import Source, Topic, EventLog, EventLogStatus
from app.core.security import get_webhook_body_and_signature, verify_webhook_signature
# FastStream 已整合到主應用，無需導入 worker tasks
from sqlalchemy import select

class MockRequest:
    def __init__(self, body: bytes, headers: dict):
        self.body_data = body
        self.headers = headers
        self.client = None

    async def body(self):
        return self.body_data

async def test_webhook_logic():
    """模擬 webhook 處理邏輯來找出問題"""

    source_name = "test"
    topic_name = "simple"

    # 創建測試數據
    payload = json.dumps({"test": "data", "timestamp": "2024-12-19T10:00:00Z"})
    body = payload.encode('utf-8')

    # 創建簽名
    import hmac
    import hashlib
    secret = "test_secret_123"
    signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": f"sha256={signature}"
    }

    # 創建模擬請求
    request = MockRequest(body, headers)

    print(f"開始測試 {source_name}/{topic_name}")
    print(f"Payload: {payload}")
    print(f"Signature: {signature}")
    print("=" * 50)

    try:
        async with AsyncSessionLocal() as db:
            # Step 1: 獲取 body 和簽名
            print("Step 1: 獲取請求數據...")
            body, signature_headers = await get_webhook_body_and_signature(request)
            print(f"Body length: {len(body)}")
            print(f"Signature headers: {signature_headers}")

            # Step 2: 查找 source
            print("Step 2: 查找 source...")
            source_query = select(Source).where(Source.name == source_name)
            source_result = await db.execute(source_query)
            source = source_result.scalar_one_or_none()
            print(f"Source found: {source}")

            if not source:
                print("❌ Source not found")
                return

            # Step 3: 查找 topic
            print("Step 3: 查找 topic...")
            topic_query = select(Topic).where(
                Topic.name == topic_name,
                Topic.source_id == source.id
            )
            topic_result = await db.execute(topic_query)
            topic = topic_result.scalar_one_or_none()
            print(f"Topic found: {topic}")

            if not topic:
                print("❌ Topic not found")
                return

            # Step 4: 驗證簽名
            print("Step 4: 驗證簽名...")
            signature_valid = verify_webhook_signature(
                body, signature_headers["generic"], str(source.secret), "sha256"
            )
            print(f"Signature valid: {signature_valid}")

            # Step 5: 創建 event log
            print("Step 5: 創建事件日誌...")
            event_log = EventLog(
                topic_id=topic.id,
                source_ip="127.0.0.1",
                headers=dict(headers),
                content_type="application/json",
                payload=body.decode('utf-8'),
                status=EventLogStatus.RECEIVED if signature_valid else EventLogStatus.FAILED_VALIDATION
            )

            db.add(event_log)
            await db.commit()
            await db.refresh(event_log)
            print(f"Event log created with ID: {event_log.id}")

            if signature_valid:
                # Step 6: 更新狀態
                print("Step 6: 更新狀態...")
                event_log.status = EventLogStatus.QUEUED
                await db.commit()
                print("Status updated to QUEUED")

                                # Step 7: 處理完成（FastStream 已整合）
                print("Step 7: Webhook 處理完成（使用 FastStream）...")
                print("✅ Webhook 處理成功!")
            else:
                print("❌ 簽名無效")

    except Exception as e:
        print(f"❌ 錯誤: {e}")
        print(f"錯誤類型: {type(e)}")
        print("Traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_webhook_logic())
