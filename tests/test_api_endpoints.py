"""
API 端點測試
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException

from tests.factories import TestDataFactory


class TestIngestEndpoint:
    """Webhook 接收端點測試"""

    @pytest.mark.asyncio
    async def test_receive_webhook_success(self, client, test_db, test_headers):
        """測試成功接收 webhook"""
        # 準備測試資料
        source = await TestDataFactory.create_source(test_db)
        topic = await TestDataFactory.create_topic(test_db, source)
        await TestDataFactory.create_subscription(test_db, topic)

        # 準備請求資料
        topic_id = topic.id
        payload = {"test": "data"}

        # Mock 服務方法
        with patch('app.api.v1.endpoints.ingest.webhook_service') as mock_service:
            mock_service.process_webhook_by_topic_id = AsyncMock(return_value={
                "message": "Webhook received and queued for processing"
            })

            # 發送請求
            response = client.post(
                f"/api/v1/ingest/{topic_id}",
                json=payload,
                headers=test_headers
            )

        # 驗證回應
        assert response.status_code == 202
        assert response.json() == {"message": "Webhook received and queued for processing"}

    @pytest.mark.asyncio
    async def test_receive_webhook_invalid_topic(self, client, test_headers):
        """測試無效主題的情況"""
        payload = {"test": "data"}

        # Mock 服務方法拋出異常
        with patch('app.api.v1.endpoints.ingest.webhook_service') as mock_service:
            mock_service.process_webhook_by_topic_id.side_effect = HTTPException(
                status_code=404, detail="主題不存在"
            )

            # 發送請求
            response = client.post(
                "/api/v1/ingest/invalid-topic-id",
                json=payload,
                headers=test_headers
            )

        # 驗證回應
        assert response.status_code == 404
        assert "主題不存在" in response.json()["message"]

    def test_health_check(self, client):
        """測試健康檢查端點"""
        response = client.get("/api/v1/ingest/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "webhook-gateway"
        assert "version" in data


class TestLogsEndpoint:
    """日誌查詢端點測試"""

    @pytest.mark.asyncio
    async def test_get_event_logs(self, client, test_db, test_headers):
        """測試獲取事件日誌列表"""
        # 準備測試資料
        source = await TestDataFactory.create_source(test_db)
        topic = await TestDataFactory.create_topic(test_db, source)
        await TestDataFactory.create_event_log(test_db, topic)

        # 發送請求
        response = client.get(
            "/api/v1/logs/events",
            headers=test_headers
        )

        # 驗證回應
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_event_log_by_id(self, client, test_db, test_headers):
        """測試根據 ID 獲取事件日誌"""
        # 準備測試資料
        source = await TestDataFactory.create_source(test_db)
        topic = await TestDataFactory.create_topic(test_db, source)
        event_log = await TestDataFactory.create_event_log(test_db, topic)

        # 發送請求測試
        response = client.get(
            f"/api/v1/logs/events/{event_log.id}",
            headers=test_headers
        )

        # 驗證回應
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == event_log.id
        assert data["topic_id"] == topic.id
