# Webhook Gateway 核心概念說明

## 📖 概述

本文檔詳細解釋 Webhook Gateway 系統中的核心概念，幫助您快速理解系統架構和使用方式。

## 🔗 核心概念

### 1. Source (來源)

**定義：** 發送 webhook 的外部服務或系統

**用途：**
- 識別 webhook 的來源
- 儲存用於驗證的密鑰
- 組織和管理不同服務的事件

**範例：**
```json
{
  "id": 1,
  "name": "github",
  "secret": "your-github-webhook-secret",
  "created_at": "2025-01-15T10:00:00Z"
}
```

**常見來源：**
- `github` - GitHub 代碼倉庫事件
- `stripe` - Stripe 付款事件
- `slack` - Slack 機器人事件
- `shopify` - Shopify 電商事件
- `custom` - 自定義內部服務

### 2. Topic (主題)

**定義：** 特定類型的 webhook 事件，屬於某個來源

**命名規範：** `{來源}.{事件類型}.{子事件}` (使用點號分隔)

**範例：**
```json
{
  "id": 1,
  "name": "github.push",
  "source_id": 1,
  "description": "GitHub 代碼推送事件",
  "created_at": "2025-01-15T10:00:00Z"
}
```

**常見主題：**

#### GitHub 主題
- `github.push` - 代碼推送
- `github.pull_request` - Pull Request 事件
- `github.issues` - Issue 相關事件
- `github.release` - 版本發布事件

#### Stripe 主題
- `stripe.payment.succeeded` - 付款成功
- `stripe.payment.failed` - 付款失敗
- `stripe.subscription.created` - 訂閱創建
- `stripe.invoice.paid` - 發票付款

#### 自定義主題
- `user.registered` - 用戶註冊
- `order.completed` - 訂單完成
- `system.backup.finished` - 系統備份完成

### 3. Subscription (訂閱)

**定義：** 指定某個服務要接收特定主題事件的配置

**用途：**
- 定義誰要接收哪些事件
- 指定事件發送的目標 URL
- 控制訂閱的啟用/停用狀態

**範例：**
```json
{
  "id": 1,
  "topic_id": 1,
  "subscriber_name": "電商服務",
  "target_url": "https://api.mystore.com/webhooks/github-push",
  "is_active": true,
  "created_at": "2025-01-15T10:00:00Z"
}
```

**關鍵字段：**
- `topic_id`: 訂閱的主題 ID
- `subscriber_name`: 訂閱者名稱（便於識別）
- `target_url`: 接收 webhook 的端點 URL
- `is_active`: 是否啟用（停用的訂閱不會收到事件）

### 4. Event (事件)

**定義：** 一次具體的 webhook 請求，包含完整的事件數據

**生命週期：**
1. **接收** - 外部服務發送 webhook
2. **驗證** - 檢查簽名和來源
3. **記錄** - 保存到 EventLog
4. **分發** - 查找訂閱者並分發

**事件記錄範例：**
```json
{
  "id": 1,
  "topic_id": 1,
  "source_ip": "192.30.252.1",
  "headers": {
    "content-type": "application/json",
    "x-github-event": "push",
    "x-hub-signature-256": "sha256=..."
  },
  "content_type": "application/json",
  "payload": "{\"ref\":\"refs/heads/main\",\"commits\":[...]}",
  "status": "received",
  "received_at": "2025-01-15T10:30:00Z"
}
```

## 🔄 系統工作流程

### 1. 初始設置

```mermaid
graph TD
    A[創建 Source] --> B[設置驗證密鑰]
    B --> C[創建 Topics]
    C --> D[配置 Subscriptions]
    D --> E[系統準備就緒]
```

**步驟：**
1. 創建來源 (Source) 並設置驗證密鑰
2. 為該來源創建相關主題 (Topics)
3. 為需要接收事件的服務創建訂閱 (Subscriptions)
4. 在外部服務中配置 webhook URL

### 2. 事件處理流程

```mermaid
sequenceDiagram
    participant ES as 外部服務
    participant WG as Webhook Gateway
    participant DB as 數據庫
    participant MQ as 消息隊列
    participant SV as 訂閱服務

    ES->>WG: POST /ingest/{source}/{topic}
    WG->>WG: 驗證簽名
    WG->>DB: 保存事件記錄
    WG->>MQ: 發布事件到隊列
    WG->>ES: 返回 202 Accepted

    MQ->>WG: 處理排隊事件
    WG->>DB: 查詢訂閱者
    WG->>SV: 分發事件給訂閱者
    WG->>DB: 記錄分發結果
```

**詳細步驟：**

1. **接收階段**
   - 外部服務發送 webhook 到 `/ingest/{source_name}/{topic_name}`
   - 系統快速響應 202 Accepted

2. **驗證階段**
   - 驗證來源存在且有效
   - 驗證主題存在
   - 驗證 HMAC 簽名（如果有）

3. **記錄階段**
   - 保存完整的事件數據到 EventLog
   - 記錄原始 payload、headers、IP 等信息

4. **分發階段**
   - 查找該主題的所有活躍訂閱
   - 異步發送事件到每個訂閱者的 target_url
   - 記錄每次分發的結果和狀態

## 🎯 使用場景範例

### 場景 1：電商網站集成 Stripe 付款

**需求：** 當 Stripe 付款成功時，自動更新訂單狀態

**設置步驟：**

1. **創建來源**
```bash
POST /api/v1/sources/
{
  "name": "stripe",
  "secret": "whsec_your_stripe_endpoint_secret"
}
```

2. **創建主題**
```bash
POST /api/v1/topics/
{
  "name": "stripe.payment.succeeded",
  "source_id": 1,
  "description": "Stripe 付款成功事件"
}
```

3. **創建訂閱**
```bash
POST /api/v1/subscriptions/
{
  "topic_id": 1,
  "subscriber_name": "電商訂單服務",
  "target_url": "https://api.mystore.com/webhooks/payment-success",
  "is_active": true
}
```

4. **在 Stripe 中配置 webhook**
   - URL: `https://webhook-gateway.mycompany.com/api/v1/ingest/stripe/stripe.payment.succeeded`
   - 事件: `payment_intent.succeeded`

### 場景 2：DevOps 自動化部署

**需求：** 當代碼推送到 main 分支時，自動觸發部署

**設置步驟：**

1. **創建來源和主題** (同上)

2. **創建多個訂閱**
```bash
# CI/CD 服務訂閱
POST /api/v1/subscriptions/
{
  "topic_id": 2,
  "subscriber_name": "Jenkins CI",
  "target_url": "https://jenkins.mycompany.com/github-webhook",
  "is_active": true
}

# 通知服務訂閱
POST /api/v1/subscriptions/
{
  "topic_id": 2,
  "subscriber_name": "Slack 通知",
  "target_url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
  "is_active": true
}
```

## 📊 監控和調試

### 查看事件統計
```bash
GET /api/v1/stats/overview
```

### 查看活動趨勢
```bash
GET /api/v1/stats/activity?days=30
```

### 查看訂閱狀態
```bash
GET /api/v1/subscriptions/?topic_id=1
```

### 調試失敗的分發
- 檢查 `dispatch_logs` 表中的錯誤信息
- 驗證目標 URL 是否可達
- 確認訂閱仍處於活躍狀態

## 🔐 安全考量

### HMAC 簽名驗證
- 每個來源都有唯一的密鑰
- 支援 SHA256 HMAC 簽名驗證
- 防止偽造的 webhook 請求

### API 認證
- 管理 API 需要有效的 Bearer Token
- 接收端點 (`/ingest/*`) 通過簽名驗證安全性

### 數據隱私
- 完整保留原始 payload 用於調試
- 敏感信息應在來源端加密
- 支援 HTTPS 傳輸加密

## 💡 最佳實踐

1. **命名規範**
   - 來源名稱：小寫，使用底線
   - 主題名稱：`來源.事件.子事件` 格式
   - 訂閱者名稱：清晰描述用途

2. **錯誤處理**
   - 設置合理的重試機制
   - 監控分發成功率
   - 及時處理失敗的事件

3. **性能優化**
   - 定期清理舊的事件記錄
   - 監控隊列積壓情況
   - 根據流量調整工作程序數量

4. **測試策略**
   - 使用測試 webhooks 驗證配置
   - 監控關鍵事件的端到端延遲
   - 定期測試災難恢復流程
