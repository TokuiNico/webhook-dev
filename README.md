# 🚀 Webhook Gateway

一個強大且可擴展的 Webhook 網關系統，專為接收、驗證、處理和分發來自各種來源的 webhook 事件而設計。

[![Python](https://img.shields.io/badge/Python-3.10+-3776ab.svg?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1.svg?style=flat&logo=mysql&logoColor=white)](https://mysql.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://docker.com)

## ✨ 特色功能

- 🔄 **異步處理**：使用 TaskIQ 和 RabbitMQ 進行高效的異步事件處理
- 📡 **多格式支援**：支援 JSON、XML 和 form-data 格式的 webhook
- 🔒 **安全驗證**：內建 HMAC 簽名驗證機制
- 📊 **即時統計**：提供詳細的統計數據和監控功能
- 🚀 **事件流處理**：使用 TaskIQ 進行即時事件分發
- 🐳 **容器化部署**：完整的 Docker 和 Docker Compose 支援

## 🏗️ 系統架構

- **API Gateway**: FastAPI 應用程式，處理 HTTP 請求和回應
- **事件處理器**: TaskIQ 任務系統，管理事件流和分發邏輯
- **數據存儲**: MySQL 數據庫，存儲訂閱和事件日誌
- **消息佇列**: RabbitMQ，作為 TaskIQ 的後端

## 🚀 快速開始

### 環境要求

- Python 3.10+
- Docker & Docker Compose
- MySQL 8.0+
- RabbitMQ 3+

### 部署方式

#### 1. Docker 部署（推薦）

```bash
# 克隆專案
git clone <repository-url>
cd webhook-dev

# 設置環境變數
cp .env.example .env
# 編輯 .env 設置密碼等

# 啟動所有服務
make build
```

#### 2. 本地開發

```bash
# 安裝依賴
make install

# 啟動開發服務器
make dev
```

### 驗證服務

```bash
# 檢查服務狀態
curl http://localhost:8000/health

# 查看 API 文檔
open http://localhost:8000/docs
```

## 📋 API 使用

### Webhook 接收

```bash
# 接收 webhook 事件
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"action": "push", "repository": {...}}' \
  http://localhost:8000/api/v1/ingest/github/push
```

### 訂閱管理

```bash
# 創建訂閱
curl -X POST \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": 1,
    "subscriber_name": "My Service",
    "target_url": "https://myservice.com/webhook",
    "is_active": true
  }' \
  http://localhost:8000/api/v1/subscriptions/

# 查看訂閱
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8000/api/v1/subscriptions/
```

### 統計數據

```bash
# 系統總覽
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8000/api/v1/stats/overview
```

## 🔧 配置說明

### 環境變數

| 變數名 | 說明 | 預設值 |
|--------|------|--------|
| `DATABASE_URL` | MySQL 連接字串 | - |
| `RABBITMQ_URL` | RabbitMQ 連接字串 | - |
| `API_KEY` | 管理 API 金鑰 | - |

### 服務端點

- **API 服務器**: http://localhost:8000
- **API 文檔**: http://localhost:8000/docs
- **RabbitMQ 管理界面**: http://localhost:15672
- **MySQL 資料庫**: localhost:3306

## 🧪 測試

```bash
# 運行所有測試
make test

# 測試 webhook 功能
make test-webhook
```

## 🛠️ 開發指南

### 常用指令

```bash
make help           # 查看所有可用指令
make dev            # 啟動開發服務器
make build          # 構建並啟動所有服務
make logs           # 查看服務日誌
make clean          # 清理本地文件
```

### 項目結構

```
app/
├── api/v1/           # API 路由和端點
├── core/            # 核心配置和工具
├── db/              # 數據庫模型和會話
├── schemas/         # Pydantic 模式定義
├── services/        # 業務邏輯服務
└── taskiq/          # TaskIQ 任務系統和事件處理器
```

## 📚 文檔

- [使用指南](./docs/guide.md) - 完整的使用和開發指南
- [API 端點文檔](./docs/api-endpoints.md) - 完整的 API 參考

## 📄 授權條款

此專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案
