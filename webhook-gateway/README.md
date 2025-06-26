# Webhook Gateway

一個基於 FastAPI + Celery + Redis + MySQL 的 Webhook 閘道服務，用於統一接收、驗證、路由與分發 webhooks。

## 功能特色

- 🚀 **統一 Webhook 接收**: 單一端點接收來自多個來源的 webhooks
- 🔐 **簽名驗證**: 支援 GitHub、Stripe 等平台的 HMAC 簽名驗證
- 📦 **多格式支援**: 支援 JSON、XML、form-data 等多種 payload 格式
- ⚡ **異步處理**: 使用 Celery 進行背景任務處理
- 🔄 **重試機制**: 自動重試失敗的 webhook 分發
- 📊 **完整日誌**: 記錄所有事件和分發狀態

## 快速開始

### 1. 環境需求

- Python 3.11+
- Docker & Docker Compose
- uv (Python 包管理器)

### 2. 設置環境

```bash
# 克隆項目
cd webhook-gateway

# 創建 .env 文件
cp .env.example .env

# 編輯 .env 文件，設置您的配置
```

### 3. 環境變數配置

創建 `.env` 文件：

```env
# Database Configuration
DATABASE_URL=mysql+aiomysql://webhook_user:webhook_password@localhost:3306/webhook_db
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=webhook_db
MYSQL_USER=webhook_user
MYSQL_PASSWORD=webhook_password

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Security Configuration
SECRET_KEY=your-secret-key-change-in-production
API_KEY=your-api-key-for-management-endpoints

# Application Configuration
DEBUG=true
```

### 4. 使用 Docker 運行

```bash
# 啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down
```

### 5. 本地開發

```bash
# 安裝依賴
uv venv
uv pip sync

# 啟動 API 服務
uv run uvicorn app.main:app --reload

# 啟動 Celery Worker (另一個終端)
uv run celery -A app.worker.celery_app worker --loglevel=info
```

## API 端點

### Webhook 接收
```http
POST /api/v1/ingest/{source_name}/{topic_name}
```

### 健康檢查
```http
GET /health
GET /api/v1/health
```

## 使用範例

### 1. 創建來源和主題

首先需要在資料庫中創建來源（Source）和主題（Topic）：

```sql
-- 創建 GitHub 來源
INSERT INTO sources (name, secret) VALUES ('github', 'your-github-webhook-secret');

-- 創建主題
INSERT INTO topics (name, source_id, description) 
VALUES ('push', 1, 'GitHub push events');
```

### 2. 創建訂閱

```sql
-- 創建訂閱
INSERT INTO subscriptions (topic_id, subscriber_name, target_url, is_active)
VALUES (1, 'My Service', 'https://myservice.com/webhook/github-push', true);
```

### 3. 接收 Webhook

向以下端點發送 webhook：
```
POST http://localhost:8000/api/v1/ingest/github/push
```

## 架構概覽

```
外部服務 → API Gateway → 驗證 → Redis 隊列 → Celery Worker → 分發到內部服務
```

## 開發狀態

- ✅ 基礎架構和 Docker 配置
- ✅ 資料庫模型和 schemas
- ✅ Webhook 接收端點
- ✅ HMAC 簽名驗證
- ✅ Celery 任務框架
- 🚧 完整的分發邏輯實現
- 🚧 訂閱管理 API
- 🚧 測試套件

## 貢獻

1. Fork 專案
2. 創建功能分支
3. 提交更改
4. 推送到分支
5. 創建 Pull Request

## 許可證

MIT License 