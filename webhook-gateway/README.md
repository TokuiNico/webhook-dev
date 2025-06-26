# Webhook Gateway

一個基於 FastAPI + Celery + Redis + MySQL 的 Webhook 閘道服務，用於統一接收、驗證、路由與分發 webhooks。

## 功能特色

- 🚀 **統一 Webhook 接收**: 單一端點接收來自多個來源的 webhooks
- 🔐 **簽名驗證**: 支援 GitHub、Stripe 等平台的 HMAC 簽名驗證
- 📦 **多格式支援**: 支援 JSON、XML、form-data 等多種 payload 格式
- ⚡ **異步處理**: 使用 Celery 進行背景任務處理
- 🔄 **重試機制**: 自動重試失敗的 webhook 分發
- 📊 **完整日誌**: 記錄所有事件和分發狀態
- 🧪 **開發友好**: 使用 [fakeredis](https://pypi.org/project/fakeredis/) 簡化開發環境

## 快速開始

### 1. 環境需求

- Python 3.11+
- Docker & Docker Compose (可選)  
- uv (Python 包管理器)

### 2. 開發模式 (推薦) - 使用 FakeRedis

使用 fakeredis 進行開發，無需啟動真實的 Redis 服務：

```bash
# 安裝依賴
uv venv
uv pip sync

# 創建 .env 文件
cat > .env << EOF
# Database Configuration
DATABASE_URL=mysql+aiomysql://webhook_user:webhook_password@localhost:3306/webhook_db
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=webhook_db
MYSQL_USER=webhook_user
MYSQL_PASSWORD=webhook_password

# Development Configuration  
DEVELOPMENT=true
USE_FAKE_REDIS=true

# Security Configuration
SECRET_KEY=your-secret-key-change-in-production
API_KEY=your-api-key-for-management-endpoints
EOF

# 啟動開發環境 (僅 MySQL，使用 fakeredis)
docker-compose up db -d

# 啟動 API 服務
uv run uvicorn app.main:app --reload

# 啟動 Celery Worker (另一個終端)
uv run celery -A app.worker.celery_app worker --loglevel=info
```

### 3. Docker 開發模式

```bash
# 啟動開發環境 (使用 fakeredis)
docker-compose --profile dev up -d

# 查看日誌
docker-compose logs -f api-dev worker-dev

# 停止服務
docker-compose --profile dev down
```

### 4. 生產模式 (使用真實 Redis)

```bash
# 啟動生產環境 (包含 Redis)
docker-compose --profile production up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose --profile production down
```

## 開發模式 vs 生產模式

| 功能 | 開發模式 | 生產模式 |
|------|----------|----------|
| Redis | FakeRedis (記憶體) | 真實 Redis 服務 |
| 端口 | 8000 | 8001 |
| 重載 | 自動重載 | 無重載 |
| 依賴 | 僅需 MySQL | MySQL + Redis |
| 配置 | `USE_FAKE_REDIS=true` | `USE_FAKE_REDIS=false` |

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
```bash
# 開發模式
curl -X POST http://localhost:8000/api/v1/ingest/github/push \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 生產模式  
curl -X POST http://localhost:8001/api/v1/ingest/github/push \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 配置選項

### 環境變數

```env
# 開發模式設定
DEVELOPMENT=true              # 啟用開發模式
USE_FAKE_REDIS=true          # 使用 fakeredis (開發模式)

# 資料庫設定
DATABASE_URL=mysql+aiomysql://user:pass@host:port/db
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=webhook_db
MYSQL_USER=webhook_user  
MYSQL_PASSWORD=webhook_password

# Redis 設定 (生產模式)
REDIS_URL=redis://localhost:6379/0

# 安全設定
SECRET_KEY=your-secret-key
API_KEY=your-api-key
```

## 架構概覽

### 開發模式
```
外部服務 → FastAPI → HMAC 驗證 → MySQL → FakeRedis → Celery Worker → 分發到內部服務
```

### 生產模式  
```
外部服務 → FastAPI → HMAC 驗證 → MySQL → Redis → Celery Worker → 分發到內部服務
```

## FakeRedis 的優勢

使用 [fakeredis](https://pypi.org/project/fakeredis/) 進行開發具有以下優勢：

- ✅ **簡化環境**: 無需啟動真實 Redis 服務
- ✅ **快速啟動**: 立即可用，無需等待服務啟動
- ✅ **記憶體操作**: 所有操作都在記憶體中進行，速度更快
- ✅ **測試友好**: 每次重啟都是乾淨環境
- ✅ **開發體驗**: 減少開發環境的複雜度

## 開發狀態

- ✅ 基礎架構和 Docker 配置
- ✅ 資料庫模型和 schemas
- ✅ Webhook 接收端點
- ✅ HMAC 簽名驗證  
- ✅ Celery 任務框架
- ✅ FakeRedis 開發模式支援
- 🚧 完整的分發邏輯實現
- 🚧 訂閱管理 API
- 🚧 測試套件

## 疑難排解

### FakeRedis 相關

**問題**: `Import "fakeredis" could not be resolved`
**解決**: 確保已安裝 fakeredis：`uv pip install fakeredis`

**問題**: Celery 連接錯誤
**解決**: 確認環境變數 `USE_FAKE_REDIS=true` 和 `DEVELOPMENT=true`

### 一般問題

**問題**: 資料庫連接失敗
**解決**: 確認 MySQL 服務已啟動且連接參數正確

**問題**: 端口衝突
**解決**: 開發模式使用 8000，生產模式使用 8001

## 貢獻

1. Fork 專案
2. 創建功能分支  
3. 提交更改
4. 推送到分支
5. 創建 Pull Request

## 許可證

MIT License 