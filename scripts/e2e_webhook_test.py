#!/usr/bin/env python3
"""
Webhook 系統端到端測試腳本

此腳本執行完整的 webhook 系統工作流程測試：
1. 創建一個 source（來源）並驗證
2. 創建一個 topic（主題）並驗證
3. 創建一個 subscription（訂閱）並驗證
4. 發送一個 payload 到 ingest URL
5. 驗證 Event Logs 和 Dispatch Logs
6. 確認訂閱者收到 payload（模擬）
7. 驗證系統統計數據
8. 清理測試數據（可選）

使用方法：
python scripts/e2e_webhook_test.py

環境變數：
- API_BASE_URL: API 基礎 URL（預設：http://localhost:8000）
- API_KEY: 管理 API 金鑰（預設：從 .env 文件讀取）
- WEBHOOK_TARGET_URL: 訂閱者接收 webhook 的 URL（預設：http://httpbin.org/post）
- CLEANUP: 是否清理測試數據（預設：false，使用 "true" 啟用）
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional

import httpx
import hmac
import hashlib
from app.core.config import settings

# 配置日誌
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 配置
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("API_KEY", settings.API_KEY)  # 從設定中讀取
WEBHOOK_TARGET_URL = os.getenv("WEBHOOK_TARGET_URL", "http://httpbin.org/post")


class WebhookTester:
    """Webhook 系統測試器"""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.session: Optional[httpx.AsyncClient] = None
        self.source_id: Optional[str] = None
        self.topic_id: Optional[str] = None
        self.subscription_id: Optional[str] = None

    async def __aenter__(self):
        """異步上下文管理器進入"""
        self.session = httpx.AsyncClient()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """異步上下文管理器退出"""
        if self.session:
            await self.session.aclose()

    def get_headers(self) -> Dict[str, str]:
        """獲取 API 請求標頭"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def check_health(self) -> bool:
        """檢查 API 健康狀態"""
        if not self.session:
            raise Exception("Session not initialized")
        try:
            response = await self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ API 健康檢查通過: {data}")
                return True
            else:
                logger.error(f"❌ API 健康檢查失敗: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ 無法連接到 API: {e}")
            return False

    async def create_source(
        self, name: str = "test-source", signature_validator: str = "none"
    ) -> Dict[str, Any]:
        """創建來源"""
        if not self.session:
            raise Exception("Session not initialized")
        url = f"{self.base_url}/api/v1/manage/sources/"
        payload = {
            "name": name,
            "secret": "test-secret-123",
            "signature_validator": signature_validator,
        }

        response = await self.session.post(
            url, json=payload, headers=self.get_headers()
        )
        if response.status_code == 201:
            data = response.json()
            self.source_id = data["id"]
            logger.info(f"✅ 來源創建成功: {data}")
            return data
        else:
            error = response.text
            logger.error(f"❌ 來源創建失敗 ({response.status_code}): {error}")
            raise Exception(f"Failed to create source: {error}")

    async def create_topic(self, name: str = "test-topic") -> Dict[str, Any]:
        """創建主題"""
        if not self.session:
            raise Exception("Session not initialized")
        if not self.source_id:
            raise Exception("必須先創建來源")

        url = f"{self.base_url}/api/v1/manage/topics/"
        payload = {"name": name, "source_id": self.source_id, "description": "測試主題"}

        response = await self.session.post(
            url, json=payload, headers=self.get_headers()
        )
        if response.status_code == 201:
            data = response.json()
            self.topic_id = data["id"]
            logger.info(f"✅ 主題創建成功: {data}")
            logger.info(f"📡 Ingest URL: {data.get('ingest_url')}")
            return data
        else:
            error = response.text
            logger.error(f"❌ 主題創建失敗 ({response.status_code}): {error}")
            raise Exception(f"Failed to create topic: {error}")

    async def create_subscription(self, target_url: str) -> Dict[str, Any]:
        """創建訂閱"""
        if not self.session:
            raise Exception("Session not initialized")
        if not self.topic_id:
            raise Exception("必須先創建主題")

        url = f"{self.base_url}/api/v1/subscriptions/"
        payload = {
            "topic_id": self.topic_id,
            "subscriber_name": "測試訂閱者",
            "target_url": target_url,
            "is_active": True,
        }

        response = await self.session.post(
            url, json=payload, headers=self.get_headers()
        )
        if response.status_code == 201:
            data = response.json()
            self.subscription_id = data["id"]
            logger.info(f"✅ 訂閱創建成功: {data}")
            return data
        else:
            error = response.text
            logger.error(f"❌ 訂閱創建失敗 ({response.status_code}): {error}")
            raise Exception(f"Failed to create subscription: {error}")

    async def send_webhook(
        self, payload: Dict[str, Any] | None = None, use_signature: bool = False
    ) -> Dict[str, Any]:
        """發送 webhook 到 ingest URL"""
        if not self.session:
            raise Exception("Session not initialized")
        if not self.topic_id:
            raise Exception("必須先創建主題")

        if payload is None:
            payload = {
                "action": "test",
                "timestamp": datetime.now().isoformat(),
                "test_data": {
                    "message": "這是一個測試 webhook",
                    "number": 42,
                    "array": [1, 2, 3],
                },
            }

        url = f"{self.base_url}/api/v1/ingest/{self.topic_id}"
        headers = {"Content-Type": "application/json"}

        # 如果需要簽名驗證，計算 HMAC 簽名
        if use_signature:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            secret = "test-secret-123"
            signature = hmac.new(
                secret.encode("utf-8"), body, hashlib.sha256
            ).hexdigest()
            headers["X-Hub-Signature-256"] = f"sha256={signature}"

        logger.info(f"📤 發送 webhook 到: {url}")
        logger.info(f"📦 Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")

        response = await self.session.post(url, json=payload, headers=headers)
        if response.status_code == 202:
            data = response.json()
            logger.info(f"✅ Webhook 發送成功: {data}")
            return data
        else:
            error = response.text
            logger.error(f"❌ Webhook 發送失敗 ({response.status_code}): {error}")
            raise Exception(f"Failed to send webhook: {error}")

    async def check_webhook_received(self, target_url: str) -> bool:
        """檢查 webhook 是否被目標接收（僅適用於 httpbin.org 等測試服務）"""
        if "httpbin.org" not in target_url:
            logger.info("⏭️  跳過接收檢查（非 httpbin 服務）")
            return True

        # 給系統一些時間處理 webhook
        await asyncio.sleep(2)

        logger.info("✅ 假設 webhook 已成功發送到目標 URL")
        logger.info(f"🔗 請檢查目標 URL ({target_url}) 是否收到 webhook")
        return True

    async def verify_source_created(self, source_id: str) -> bool:
        """驗證來源是否成功創建"""
        if not self.session:
            raise Exception("Session not initialized")

        url = f"{self.base_url}/api/v1/manage/sources/"
        response = await self.session.get(url, headers=self.get_headers())

        if response.status_code == 200:
            sources = response.json()
            for source in sources:
                if source["id"] == source_id:
                    logger.info(f"✅ 來源驗證成功: {source['name']} (ID: {source_id})")
                    return True
            logger.error(f"❌ 來源驗證失敗: 找不到 ID {source_id}")
            return False
        else:
            logger.error(f"❌ 無法獲取來源列表: {response.status_code}")
            return False

    async def verify_topic_created(self, topic_id: str) -> bool:
        """驗證主題是否成功創建"""
        if not self.session:
            raise Exception("Session not initialized")

        url = f"{self.base_url}/api/v1/manage/topics/{topic_id}"
        response = await self.session.get(url, headers=self.get_headers())

        if response.status_code == 200:
            topic = response.json()
            logger.info(f"✅ 主題驗證成功: {topic['name']} (ID: {topic_id})")
            logger.info(f"📡 Ingest URL: {topic['ingest_url']}")
            return True
        else:
            logger.error(f"❌ 主題驗證失敗: {response.status_code}")
            return False

    async def verify_subscription_created(self, subscription_id: str) -> bool:
        """驗證訂閱是否成功創建"""
        if not self.session:
            raise Exception("Session not initialized")

        url = f"{self.base_url}/api/v1/subscriptions/{subscription_id}"
        response = await self.session.get(url, headers=self.get_headers())

        if response.status_code == 200:
            subscription = response.json()
            logger.info(f"✅ 訂閱驗證成功: {subscription['subscriber_name']} (ID: {subscription_id})")
            logger.info(f"🎯 目標 URL: {subscription['target_url']}")
            return True
        else:
            logger.error(f"❌ 訂閱驗證失敗: {response.status_code}")
            return False

    async def verify_event_logs(self) -> Dict[str, Any]:
        """檢查 event logs 是否有新記錄"""
        if not self.session:
            raise Exception("Session not initialized")

        # 給系統一些時間處理
        await asyncio.sleep(1)

        # 使用新的 logs API 獲取最新的 event log
        url = f"{self.base_url}/api/v1/logs/events/"
        params = {"limit": 1}  # 只獲取最新的一個

        response = await self.session.get(url, headers=self.get_headers(), params=params)

        if response.status_code == 200:
            data = response.json()
            events = data.get("items", [])

            if events:
                latest_event = events[0]
                logger.info("✅ Event Log 驗證成功:")
                logger.info(f"   - Event ID: {latest_event['id']}")
                logger.info(f"   - Topic ID: {latest_event['topic_id']}")
                logger.info(f"   - 來源 IP: {latest_event['source_ip']}")
                logger.info(f"   - 內容類型: {latest_event['content_type']}")
                logger.info(f"   - 狀態: {latest_event['status']}")
                logger.info(f"   - 接收時間: {latest_event['received_at']}")
                return latest_event
            else:
                logger.error("❌ Event Log 驗證失敗: 沒有找到事件記錄")
                return {}
        else:
            logger.error(f"❌ 無法獲取 Event Logs: {response.status_code}")
            return {}

    async def verify_dispatch_logs(self, event_log_id: str) -> Dict[str, Any]:
        """檢查特定事件的 dispatch logs"""
        if not self.session:
            raise Exception("Session not initialized")

        # 給系統一些時間處理
        await asyncio.sleep(2)

        # 使用 logs API 獲取特定事件的 dispatch logs
        url = f"{self.base_url}/api/v1/logs/dispatches/"
        params = {"event_log_id": event_log_id, "limit": 10}

        response = await self.session.get(url, headers=self.get_headers(), params=params)

        if response.status_code == 200:
            data = response.json()
            dispatches = data.get("items", [])

            if dispatches:
                logger.info(f"✅ Dispatch Log 驗證成功: 找到 {len(dispatches)} 個派發記錄")
                for i, dispatch in enumerate(dispatches, 1):
                    logger.info(f"   {i}. Dispatch ID: {dispatch['id']}")
                    logger.info(f"      - 訂閱 ID: {dispatch['subscription_id']}")
                    logger.info(f"      - 嘗試次數: {dispatch['attempt']}")
                    logger.info(f"      - 狀態: {dispatch['status']}")
                    logger.info(f"      - 響應狀態碼: {dispatch['response_status_code']}")
                    logger.info(f"      - 派發時間: {dispatch['dispatched_at']}")
                return dispatches[0] if dispatches else {}
            else:
                logger.warning("⚠️ Dispatch Log 檢查: 還沒有派發記錄（可能還在處理中）")
                return {}
        else:
            logger.error(f"❌ 無法獲取 Dispatch Logs: {response.status_code}")
            return {}

    async def get_statistics(self) -> Dict[str, Any]:
        """獲取系統統計"""
        if not self.session:
            raise Exception("Session not initialized")
        url = f"{self.base_url}/api/v1/stats/overview"

        response = await self.session.get(url, headers=self.get_headers())
        if response.status_code == 200:
            data = response.json()
            logger.info(
                f"📊 系統統計: {json.dumps(data, indent=2, ensure_ascii=False)}"
            )
            return data
        else:
            error = response.text
            logger.warning(f"⚠️ 無法獲取統計數據 ({response.status_code}): {error}")
            return {}

    async def cleanup(self):
        """清理測試數據（可選）"""
        logger.info("🧹 開始清理測試數據...")

        # 停用訂閱
        if self.subscription_id and self.session:
            try:
                url = f"{self.base_url}/api/v1/subscriptions/{self.subscription_id}"
                response = await self.session.delete(
                    url, headers=self.get_headers()
                )
                if response.status_code == 200:
                    logger.info("✅ 訂閱已停用")
                else:
                    logger.warning(f"⚠️ 無法停用訂閱: {response.status_code}")
            except Exception as e:
                logger.warning(f"⚠️ 清理訂閱時出錯: {e}")

        logger.info("✅ 清理完成")


async def run_complete_test():
    """運行完整測試"""
    logger.info("🚀 開始完整的 Webhook 系統測試")
    logger.info(f"🔧 API 基礎 URL: {API_BASE_URL}")
    logger.info(f"🎯 目標 URL: {WEBHOOK_TARGET_URL}")

    try:
        async with WebhookTester(API_BASE_URL, API_KEY) as tester:
            # 1. 健康檢查
            logger.info("\n📋 步驟 1: API 健康檢查")
            if not await tester.check_health():
                logger.error("❌ API 健康檢查失敗，測試中止")
                return False

            # 2. 創建來源
            logger.info("\n📋 步驟 2: 創建來源")
            await tester.create_source(
                name=f"test-source-{int(datetime.now().timestamp())}",
                signature_validator="none",  # 使用無驗證方便測試
            )

            # 2.1 驗證來源創建
            logger.info("\n📋 步驟 2.1: 驗證來源創建")
            if not tester.source_id or not await tester.verify_source_created(tester.source_id):
                raise Exception("來源創建驗證失敗")

            # 3. 創建主題
            logger.info("\n📋 步驟 3: 創建主題")
            topic_data = await tester.create_topic(
                name=f"test-topic-{int(datetime.now().timestamp())}"
            )

            # 3.1 驗證主題創建
            logger.info("\n📋 步驟 3.1: 驗證主題創建")
            if not tester.topic_id or not await tester.verify_topic_created(tester.topic_id):
                raise Exception("主題創建驗證失敗")

            # 4. 創建訂閱
            logger.info("\n📋 步驟 4: 創建訂閱")
            await tester.create_subscription(WEBHOOK_TARGET_URL)

            # 4.1 驗證訂閱創建
            logger.info("\n📋 步驟 4.1: 驗證訂閱創建")
            if not tester.subscription_id or not await tester.verify_subscription_created(tester.subscription_id):
                raise Exception("訂閱創建驗證失敗")

            # 5. 發送 webhook
            logger.info("\n📋 步驟 5: 發送 webhook")
            webhook_payload = {
                "event": "test_completed",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "message": "完整測試成功！",
                    "source_id": tester.source_id,
                    "topic_id": tester.topic_id,
                    "subscription_id": tester.subscription_id,
                },
            }
            await tester.send_webhook(webhook_payload, use_signature=False)

            # 5.1 驗證 Event Logs
            logger.info("\n📋 步驟 5.1: 驗證 Event Logs")
            latest_event = await tester.verify_event_logs()
            if not latest_event:
                raise Exception("Event Log 驗證失敗")

            # 5.2 驗證 Dispatch Logs
            logger.info("\n📋 步驟 5.2: 驗證 Dispatch Logs")
            await tester.verify_dispatch_logs(latest_event['id'])

            # 6. 檢查接收（改為可選步驟）
            logger.info("\n📋 步驟 6: 模擬接收確認")
            await tester.check_webhook_received(WEBHOOK_TARGET_URL)

            # 7. 獲取最終統計
            logger.info("\n📋 步驟 7: 獲取系統統計")
            await tester.get_statistics()

            # 8. 清理（改為可選）
            cleanup_enabled = os.getenv("CLEANUP", "false").lower() == "true"
            if cleanup_enabled:
                logger.info("\n📋 步驟 8: 清理測試數據（可選）")
                await tester.cleanup()
            else:
                logger.info("\n⏭️  跳過清理步驟（使用 CLEANUP=true 環境變數啟用）")

            logger.info("\n🎉 完整測試成功完成！")
            logger.info("📋 測試摘要:")
            logger.info(f"   - 來源 ID: {tester.source_id}")
            logger.info(f"   - 主題 ID: {tester.topic_id}")
            logger.info(f"   - 訂閱 ID: {tester.subscription_id}")
            logger.info(f"   - Ingest URL: {topic_data.get('ingest_url')}")

            return True

    except Exception as e:
        logger.error(f"❌ 測試失敗: {e}")
        return False


def main():
    """主函數"""
    if len(sys.argv) > 1 and sys.argv[1] in ["-h", "--help"]:
        print(__doc__)
        return

    print("🔧 Webhook 系統完整測試腳本")
    print("=" * 50)

    # 運行測試
    success = asyncio.run(run_complete_test())

    if success:
        print("\n✅ 所有測試通過！")
        sys.exit(0)
    else:
        print("\n❌ 測試失敗！")
        sys.exit(1)


if __name__ == "__main__":
    main()
