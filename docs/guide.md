# Webhook Gateway 使用指南

## 📖 系統概念

### 核心組件

- **Source (來源)**: 發送 webhook 的外部服務 (如 GitHub、Stripe)
- **Topic (主題)**: 特定的事件類型 (如 `github.push`、`stripe.payment.succeeded`)
- **Subscriber (訂閱者)**: 接收事件的下游服務
- **Subscription (訂閱關係)**: 連接主題和訂閱者的配置
- **Event (事件)**: 具體的 webhook 請求記錄

### 事件流程

```
外部服務 → API Gateway → 驗證簽名 → 儲存事件 → 事件佇列 → 分發到訂閱者
```

## 🏗️ 系統架構

### 分層設計
- **API 層**: FastAPI 端點，處理 HTTP 請求
- **服務層**: 業務邏輯，事件處理和分發
- **資料層**: MySQL/SQLite 數據存儲
- **消息層**: RabbitMQ 事件隊列

### 專案結構
```
app/
├── main.py                 # FastAPI 應用入口
├── api/v1/endpoints/       # API 端點
├── core/                   # 核心配置和安全
├── db/models.py           # 資料庫模型
├── services/              # 業務邏輯服務
└── taskiq/                # TaskIQ 任務處理
```

## 🚀 快速開始

### 1. 安裝和啟動

```bash
# 克隆專案
git clone <repository-url>
cd webhook-dev

# Docker 部署 (推薦)
make build

# 或本地開發
make install
make dev
```

### 2. 基本配置

創建 `.env` 文件：
```env
# 資料庫
DATABASE_URL=mysql+aiomysql://user:pass@localhost:3306/webhook_db

# 消息隊列
RABBITMQ_URL=amqp://admin:admin@localhost:5672/

# 安全配置
API_KEY=your-api-key  # 管理端點認證
```

**API Key 說明**:
- `API_KEY`: 保護所有管理端點 (訂閱、統計、來源管理)
- Webhook 接收端點不需要 API Key，使用簽名驗證

### 3. 創建來源和主題

```bash
# 使用管理 API 創建來源
curl -X POST \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "github", "secret": "your-github-secret"}' \
  http://localhost:8000/api/v1/sources/

# 創建主題
curl -X POST \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "github.push", "source_id": 1}' \
  http://localhost:8000/api/v1/topics/
```

### 4. 管理訂閱

```bash
# 創建訂閱
curl -X POST \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": 1,
    "subscriber_name": "my-service",
    "target_url": "https://myservice.com/webhook",
    "is_active": true
  }' \
  http://localhost:8000/api/v1/subscriptions/
```

## 📡 接收 Webhook

### 端點格式
```
POST /api/v1/ingest/{source_name}/{topic_name}
```

### 支援的簽名驗證

**GitHub:**
```
X-Hub-Signature-256: sha256=<hmac_signature>
```

**Stripe:**
```
Stripe-Signature: t=<timestamp>,v1=<signature>
```

**通用:**
```
X-Webhook-Signature: <hmac_signature>
```

### 範例請求

```bash
# GitHub webhook
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"action": "push", "repository": {...}}' \
  http://localhost:8000/api/v1/ingest/github/push
```

## 🔧 開發指南

### 開發環境

```bash
# 啟動依賴服務
docker compose up -d db rabbitmq

# 本地運行 API
make dev

# 運行測試
make test
```

### 添加新的來源類型

1. 在 `app/core/security.py` 添加簽名驗證邏輯
2. 在資料庫中創建來源記錄
3. 配置相應的主題
4. 更新測試

### 模組職責

- **API 端點**: 僅處理 HTTP 請求/回應
- **服務層**: 包含所有業務邏輯
- **核心層**: 可重用工具和配置
- **資料層**: 僅處理資料庫操作

## 📊 監控和日誌

### 健康檢查
```bash
curl http://localhost:8000/health
```

### 統計數據
```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8000/api/v1/stats/overview
```

### 查看支援的簽名驗證器
```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8000/api/v1/manage/signature-validators/
```

### 查看日誌
```bash
# Docker 部署
make logs

# 特定服務
docker compose logs -f api
```

## 🐳 Docker 部署

### 服務組成
- **db**: MySQL 8.0 (端口 3306)
- **rabbitmq**: RabbitMQ 3 with Management (端口 5672/15672)
- **api**: FastAPI 應用 (端口 8000)
- **worker**: TaskIQ 任務處理器

### 常用指令
```bash
make build          # 構建並啟動
make start           # 啟動服務
make stop            # 停止服務
make logs            # 查看日誌
make status          # 服務狀態
```

### 服務端點
- API 服務: http://localhost:8000
- API 文檔: http://localhost:8000/docs
- RabbitMQ 管理: http://localhost:15672 (admin/admin)

## 🧪 測試

### 運行測試
```bash
# 完整測試套件
make test

# 特定測試
python tests/test_webhook.py
```

### 測試 Webhook 功能
```bash
# 使用內建測試腳本
python run_all_tests.py
```

## 🔒 安全配置

### 生產環境建議
- 更改所有預設密碼
- 使用強密碼生成器
- 限制對外暴露的端口
- 定期備份資料庫
- 設置監控和警報

### API 金鑰管理
- 管理端點需要 `Authorization: Bearer <token>`
- 在環境變數中設置 `API_KEY`
- 定期輪換 API 金鑰

## 📚 相關資源

- [API 端點文檔](api-endpoints.md) - 完整的 API 參考
