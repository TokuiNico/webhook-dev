"""
Webhook 服務測試
"""

import pytest
from unittest.mock import patch
from fastapi import HTTPException

from app.services.webhook_service import WebhookService
from app.db.models import Source
from tests.factories import TestDataFactory


class TestWebhookService:
    """Webhook 服務測試類"""

    @pytest.mark.asyncio
    async def test_get_active_subscriptions(self, test_db):
        """測試獲取活躍訂閱"""
        # 準備測試資料
        source = await TestDataFactory.create_source(test_db)
        topic = await TestDataFactory.create_topic(test_db, source)

        # 創建活躍和非活躍訂閱
        active_sub = await TestDataFactory.create_subscription(test_db, topic, is_active=True)
        inactive_sub = await TestDataFactory.create_subscription(test_db, topic, is_active=False)

        # 測試服務方法
        service = WebhookService()
        subscriptions = await service.get_active_subscriptions(topic, test_db)

        # 驗證結果
        assert len(subscriptions) == 1
        assert subscriptions[0].id == active_sub.id
        assert subscriptions[0].is_active is True

    @pytest.mark.asyncio
    async def test_get_topic_by_id_success(self, test_db):
        """測試成功獲取主題"""
        # 準備測試資料
        source = await TestDataFactory.create_source(test_db)
        topic = await TestDataFactory.create_topic(test_db, source)

        # 測試服務方法
        service = WebhookService()
        result_source, result_topic = await service.get_topic_by_id(topic.id, test_db)

        # 驗證結果
        assert result_source.id == source.id
        assert result_topic.id == topic.id

    @pytest.mark.asyncio
    async def test_get_topic_by_id_not_found(self, test_db):
        """測試主題不存在的情況"""
        service = WebhookService()

        with pytest.raises(HTTPException) as exc_info:
            await service.get_topic_by_id("nonexistent-id", test_db)

        assert exc_info.value.status_code == 404
        assert "主題 ID" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_process_webhook_success(self, test_db):
        """測試成功處理 webhook"""
        # 準備測試資料
        source = await TestDataFactory.create_source(test_db)
        topic = await TestDataFactory.create_topic(test_db, source)
        await TestDataFactory.create_subscription(test_db, topic)

        # 模擬請求資料
        topic_id = topic.id
        body = b'{"test": "data"}'
        content_type = "application/json"

        # 創建有效的簽名頭部
        import hmac
        import hashlib
        signature = hmac.new(
            source.secret.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        headers = {
            "content-type": content_type,
            "X-Hub-Signature-256": f"sha256={signature}"
        }
        source_ip = "127.0.0.1"

        # Mock 任務發送來避免實際網路調用
        with patch.object(WebhookService, 'publish_webhook_event') as mock_publish:
            # 模擬任務執行成功，避免實際網路調用和任務執行
            with patch('app.taskiq.tasks.send_webhook_to_subscription') as mock_task:
                # 模擬任務函數執行成功 - 模擬任務函數返回成功結果
                async def mock_task_success(*args, **kwargs):
                    return {"status": "success", "status_code": 200, "response_body": "OK"}

                mock_task.side_effect = mock_task_success

                service = WebhookService()
                result = await service.process_webhook_by_topic_id(
                    topic_id, body, content_type, headers, source_ip, test_db
                )

        # 驗證結果
        assert result == {"message": "Webhook received and queued for processing"}
        # 驗證任務被調用
        mock_publish.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_webhook_invalid_topic(self, test_db):
        """測試無效主題的情況"""
        service = WebhookService()
        body = b'{"test": "data"}'
        content_type = "application/json"
        headers = {"content-type": content_type}
        source_ip = "127.0.0.1"

        with pytest.raises(HTTPException) as exc_info:
            await service.process_webhook_by_topic_id(
                "invalid-topic-id", body, content_type, headers, source_ip, test_db
            )

        assert exc_info.value.status_code == 404

    def test_build_auth_config_signature(self):
        """測試簽名認證配置構建"""
        service = WebhookService()

        # 測試 GitHub 來源
        source = Source(
            id="test-id",
            name="github",
            secret="test-secret",
            auth_type="signature",
            auth_config=None
        )

        config = service._build_auth_config(source)

        assert config["secret"] == "test-secret"
        assert config["format_type"] == "github"

    def test_build_auth_config_stripe(self):
        """測試 Stripe 認證配置構建"""
        service = WebhookService()

        # 測試 Stripe 來源
        source = Source(
            id="test-id",
            name="stripe",
            secret="test-secret",
            auth_type="signature",
            auth_config={"format_type": "stripe"}
        )

        config = service._build_auth_config(source)

        assert config["secret"] == "test-secret"
        assert config["format_type"] == "stripe"

    def test_build_auth_config_none(self):
        """測試無認證配置構建"""
        service = WebhookService()

        # 測試無認證來源
        source = Source(
            id="test-id",
            name="generic",
            secret="test-secret",
            auth_type="none",
            auth_config=None
        )

        config = service._build_auth_config(source)

        assert config == {}
        assert "secret" not in config
