# 🚀 Webhook Gateway API 端點文檔

## 📋 **目錄**

1. [認證](#認證)
2. [Webhook 接收](#webhook-接收)
3. [訂閱管理](#訂閱管理)
4. [統計數據](#統計數據)
5. [主題和來源管理](#主題和來源管理)
6. [系統端點](#系統端點)

---

## 🔐 **認證**

所有管理 API 端點都需要 Bearer Token 認證：

```bash
Authorization: Bearer your-api-key-for-management-endpoints
```

**認證錯誤回應：**
- `401 Unauthorized` - 無效或缺少 API Key
- `500 Internal Server Error` - API Key 未配置

---

## 📨 **Webhook 接收**

### POST `/api/v1/ingest/{source_name}/{topic_name}`

接收並處理 webhook 事件。

**參數：**
- `source_name` - 來源名稱 (如: github, stripe)
- `topic_name` - 主題名稱 (如: push, payment_success)

**標頭：**
- `Content-Type` - 支援 JSON, XML, form-data
- `X-Webhook-Signature` - HMAC 簽名 (GitHub 格式)
- `X-Hub-Signature-256` - HMAC 簽名 (GitHub v2 格式)

**回應：**
- `202 Accepted` - 成功接收並排隊處理
- `400 Bad Request` - 無效請求或簽名驗證失敗
- `404 Not Found` - 來源或主題不存在

**範例：**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=abc123..." \
  -d '{"action": "push", "repository": {...}}' \
  http://127.0.0.1:8000/api/v1/ingest/github/push
```

---

## 📋 **訂閱管理**

### GET `/api/v1/subscriptions/`

列出所有訂閱。

**查詢參數：**
- `topic_id` (可選) - 按主題 ID 篩選
- `is_active` (可選) - 按活躍狀態篩選
- `skip` - 跳過記錄數 (預設: 0)
- `limit` - 限制記錄數 (預設: 100)

**回應：**
```json
{
  "items": [
    {
      "id": 1,
      "topic_id": 1,
      "subscriber_name": "Test Service",
      "target_url": "https://example.com/webhook",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00"
    }
  ],
  "total": 4,
  "skip": 0,
  "limit": 100
}
```

### POST `/api/v1/subscriptions/`

創建新訂閱。

**請求體：**
```json
{
  "topic_id": 1,
  "subscriber_name": "My Service",
  "target_url": "https://myservice.com/webhook",
  "is_active": true
}
```

### GET `/api/v1/subscriptions/{subscription_id}`

獲取特定訂閱詳情。

### PUT `/api/v1/subscriptions/{subscription_id}`

更新訂閱。

### DELETE `/api/v1/subscriptions/{subscription_id}`

停用訂閱 (軟刪除)。

### POST `/api/v1/subscriptions/{subscription_id}/activate`

重新啟用訂閱。

---

## 📊 **統計數據**

### GET `/api/v1/stats/overview`

獲取系統總覽統計。

**回應：**
```json
{
  "total_webhooks": 100,
  "today_webhooks": 25,
  "week_webhooks": 150,
  "month_webhooks": 500,
  "active_subscriptions": 10,
  "total_subscriptions": 12,
  "success_rate": 95.5,
  "recent_events": [
    {
      "id": 1,
      "source": "github",
      "topic": "push",
      "status": "received",
      "received_at": "2024-01-01T12:00:00",
      "content_type": "application/json"
    }
  ],
  "system_status": "healthy"
}
```

### GET `/api/v1/stats/activity`

獲取活動統計數據。

**查詢參數：**
- `days` - 統計天數 (預設: 7)

**回應：**
```json
{
  "daily_activity": [
    {"date": "2024-01-01", "webhooks": 25},
    {"date": "2024-01-02", "webhooks": 30}
  ],
  "hourly_activity": [
    {"hour": 9, "webhooks": 5},
    {"hour": 10, "webhooks": 8}
  ],
  "period_days": 7
}
```

### GET `/api/v1/stats/sources`

獲取按來源分組的統計。

**回應：**
```json
{
  "source_stats": [
    {
      "source": "github",
      "webhook_count": 50,
      "topic_count": 3
    }
  ],
  "top_topics": [
    {
      "topic": "push",
      "source": "github", 
      "webhook_count": 30
    }
  ]
}
```

---

## 🏷️ **主題和來源管理**

### GET `/api/v1/manage/sources/`

列出所有 webhook 來源。

**回應：**
```json
[
  {
    "id": 1,
    "name": "github",
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### POST `/api/v1/manage/sources/`

創建新的 webhook 來源。

**請求體：**
```json
{
  "name": "stripe",
  "secret": "whsec_abc123..."
}
```

### GET `/api/v1/manage/topics/`

列出所有主題。

**查詢參數：**
- `source_id` (可選) - 按來源 ID 篩選

**回應：**
```json
[
  {
    "id": 1,
    "name": "push",
    "source_id": 1,
    "description": "Git push events",
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### POST `/api/v1/manage/topics/`

創建新主題。

**請求體：**
```json
{
  "name": "payment_success",
  "source_id": 2,
  "description": "Successful payment notifications"
}
```

### GET `/api/v1/manage/topics/{topic_id}`

獲取特定主題詳情。

---

## 🏥 **系統端點**

### GET `/health`

健康檢查端點 (無需認證)。

**回應：**
```json
{
  "status": "healthy",
  "service": "webhook-gateway"
}
```

### GET `/`

根端點 (無需認證)。

**回應：**
```json
{
  "status": "ok",
  "service": "webhook-gateway"
}
```

---

## 🛠️ **使用範例**

### 1. 創建來源和主題

```bash
# 創建 GitHub 來源
curl -X POST \
  -H "Authorization: Bearer your-api-key-for-management-endpoints" \
  -H "Content-Type: application/json" \
  -d '{"name": "github", "secret": "github_webhook_secret"}' \
  http://127.0.0.1:8000/api/v1/manage/sources/

# 創建 push 主題
curl -X POST \
  -H "Authorization: Bearer your-api-key-for-management-endpoints" \
  -H "Content-Type: application/json" \
  -d '{"name": "push", "source_id": 1, "description": "Git push events"}' \
  http://127.0.0.1:8000/api/v1/manage/topics/
```

### 2. 創建訂閱

```bash
curl -X POST \
  -H "Authorization: Bearer your-api-key-for-management-endpoints" \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": 1,
    "subscriber_name": "My App",
    "target_url": "https://myapp.com/webhooks/github",
    "is_active": true
  }' \
  http://127.0.0.1:8000/api/v1/subscriptions/
```

### 3. 發送 Webhook

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=calculated_signature" \
  -d '{"action": "push", "repository": {"name": "test-repo"}}' \
  http://127.0.0.1:8000/api/v1/ingest/github/push
```

### 4. 查看統計

```bash
# 總覽統計
curl -H "Authorization: Bearer your-api-key-for-management-endpoints" \
  http://127.0.0.1:8000/api/v1/stats/overview

# 活動統計
curl -H "Authorization: Bearer your-api-key-for-management-endpoints" \
  http://127.0.0.1:8000/api/v1/stats/activity?days=30
```

---

## 🚨 **錯誤代碼**

| 狀態碼 | 說明 |
|--------|------|
| 200 | 成功 |
| 201 | 創建成功 |
| 202 | 接受處理 |
| 400 | 請求錯誤 |
| 401 | 認證失敗 |
| 404 | 資源不存在 |
| 500 | 服務器錯誤 |

---

## 📝 **注意事項**

1. **認證**: 所有管理 API 都需要 Bearer Token
2. **HMAC 驗證**: Webhook 接收端點會驗證 HMAC 簽名
3. **異步處理**: Webhook 事件會異步分發到訂閱者
4. **軟刪除**: 訂閱停用而不是真正刪除
5. **分頁**: 列表端點支援 skip/limit 分頁

---

**🎯 所有 API 端點都已實作並測試通過！** 