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

所有管理 API 端點都需要 Bearer Token 認證，金鑰來自環境變數 `API_KEY`：

```bash
Authorization: Bearer $API_KEY
```

**認證錯誤回應：**
- `401 Unauthorized` - 無效或缺少 API Key
- `500 Internal Server Error` - API Key 未配置（`API_KEY` 未設置或為預設占位值）

---

## 📨 **Webhook 接收**

### POST `/api/v1/ingest/{topic_id}`

接收並處理 webhook 事件（以 `topic_id` 為基準）。

**參數：**
- `topic_id` - 主題 ID (ULID)

**標頭：**
- `Content-Type` - 支援 JSON, XML, form-data
- `X-Webhook-Signature` - HMAC 簽名 (GitHub 格式)
- `X-Hub-Signature-256` - HMAC 簽名 (GitHub v2 格式)

**回應：**
- `202 Accepted` - 成功接收並排隊處理
- `400/403` - 無效請求或簽名驗證失敗
- `404 Not Found` - 主題不存在

**範例：**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=abc123..." \
  -d '{"action": "push", "repository": {...}}' \
  http://127.0.0.1:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAV
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
      "topic_id": "01ARZ3NDEKTSV4RRFFQ69G5FAQ",
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
  "topic_id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
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

## 🔧 **系統資訊**

### GET `/api/v1/manage/auth-validators/`

獲取系統支援的簽名驗證器資訊。

**特色：**
- 🔄 **動態獲取**: 資訊直接從實際程式碼中的簽名策略獲取
- 🔧 **自動同步**: 當程式碼新增或移除策略時，API 回應會自動更新
- 📊 **即時反映**: 確保 API 文檔與實際系統能力一致

**回應：**
```json
{
  "supported_types": ["signature", "none"],
  "total_validators": 2,
  "validators": [
    {
      "auth_type": "signature",
      "description": "HMAC 簽名驗證",
      "required_headers": ["signature_header"],
      "required_config": ["secret"],
      "security_level": "high",
      "supported_formats": ["github", "stripe", "generic"]
    },
    {
      "auth_type": "none",
      "description": "無驗證 (開發測試用)",
      "required_headers": [],
      "required_config": [],
      "security_level": "none"
    }
  ]
}
```

**使用範例：**
```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8000/api/v1/manage/auth-validators/
```

---

## 📊 **統計數據**

### GET `/api/v1/stats/overview`

獲取系統總覽統計。

### GET `/api/v1/stats/activity`

獲取活動統計數據。

### GET `/api/v1/stats/sources`

獲取按來源分組的統計。

---

## 🏷️ **主題和來源管理**

### GET `/api/v1/manage/sources/`

列出所有 webhook 來源。

### POST `/api/v1/manage/sources/`

創建新的 webhook 來源。

**請求體：**
```json
{
  "name": "github",
  "secret": "your-webhook-secret",
  "signature_validator": "github"
}
```

**名稱格式要求：**
- 長度：1-255 字符

**簽名驗證器類型：**
- `github` - 用於 GitHub webhooks (X-Hub-Signature-256 header)
- `stripe` - 用於 Stripe webhooks (Stripe-Signature header)
- `generic` - 通用 HMAC-SHA256 驗證（預設，X-Webhook-Signature header）

**回應：**
- `201 Created` - 來源創建成功
- `400 Bad Request` - 名稱格式無效或來源已存在

### GET `/api/v1/manage/topics/`

列出所有主題。

### POST `/api/v1/manage/topics/`

創建新主題。

**請求體：**
```json
{
  "name": "push",
  "source_id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "description": "Git push events"
}
```

**名稱格式要求：**
- 只能包含小寫英文字母 (a-z)
- 數字 (0-9)
- 連字號 (-)
- 底線 (_)
- 長度：1-255 字符
- 格式建議：使用描述性名稱 (如: `push`, `payment_succeeded`, `user_created`)

**回應：**
- `201 Created` - 主題創建成功
- `400 Bad Request` - 名稱格式無效或主題已存在
- `404 Not Found` - 指定的來源不存在

### GET `/api/v1/manage/topics/{topic_id}`

獲取特定主題詳情。

---

## 🏥 **系統端點**

### GET `/health`

健康檢查端點 (無需認證)。

### GET `/`

根端點 (無需認證)。

### GET `/metrics`

Prometheus 指標（純文字輸出，無需認證）。

---

## 🛠️ **使用範例**

### 1. 創建來源和主題

```bash
# 創建 GitHub 來源
curl -X POST \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "github", "secret": "github_webhook_secret", "signature_validator": "github"}' \
  http://127.0.0.1:8000/api/v1/manage/sources/

# 創建 push 主題
curl -X POST \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "push", "source_id": "01ARZ3NDEKTSV4RRFFQ69G5FAV", "description": "Git push events"}' \
  http://127.0.0.1:8000/api/v1/manage/topics/
```

### 2. 創建訂閱

```bash
curl -X POST \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
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
  http://127.0.0.1:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAV
```

### 4. 查看統計

```bash
# 總覽統計
curl -H "Authorization: Bearer your-api-key" \
  http://127.0.0.1:8000/api/v1/stats/overview

# 活動統計
curl -H "Authorization: Bearer your-api-key" \
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
