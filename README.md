# 🚀 Webhook Gateway

一個強大且可擴展的 Webhook 網關系統，專為接收、驗證、處理和分發來自各種來源的 webhook 事件而設計。

[![Python](https://img.shields.io/badge/Python-3.10+-3776ab.svg?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Redis](https://img.shields.io/badge/Redis-DC382D.svg?style=flat&logo=redis&logoColor=white)](https://redis.io)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1.svg?style=flat&logo=mysql&logoColor=white)](https://mysql.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://docker.com)

## ✨ 特色功能

- 🔄 **異步處理**：使用 FastStream 和 Redis 進行高效的異步事件處理
- 📡 **多格式支援**：支援 JSON、XML 和 form-data 格式的 webhook
- 🔒 **安全驗證**：內建 HMAC 簽名驗證機制
- 📊 **即時統計**：提供詳細的統計數據和監控功能
- 🏗️ **模組化架構**：基於 FastAPI 的現代化 RESTful API 設計
- 🚀 **事件流處理**：使用 FastStream 進行即時事件分發
- 🐳 **容器化部署**：完整的 Docker 和 Docker Compose 支援
- 🧪 **測試友好**：內建 fakeredis 支援，便於開發和測試

## 🏗️ 系統架構

```mermaid
graph TB
    A[外部服務] -->|Webhook 事件| B[Webhook Gateway API]
    B --> C[事件驗證 & 解析]
    C --> D[FastStream 事件流]
    D --> E[Redis 消息佇列]
    E --> F[FastStream 處理器]
    F --> G[訂閱者分發]
    G --> H[目標服務]
    
    B --> I[數據庫<br/>開發: SQLite<br/>生產: MySQL]
    I --> J[訂閱管理]
    I --> K[統計數據]
    I --> L[事件日誌]
    
    M[管理 API] --> B
    N[統計 API] --> B
```

### 核心組件

- **API Gateway**: FastAPI 應用程式，處理 HTTP 請求和回應
- **事件處理器**: FastStream 應用程式，管理事件流和分發邏輯
- **數據存儲**: 開發環境使用 SQLite，生產環境使用 MySQL
- **消息佇列**: Redis，作為 FastStream 的後端（開發環境可使用 FakeRedis）

## 🚀 快速開始

### 環境要求

- Python 3.10+
- Docker & Docker Compose（可選）
- SQLite（開發環境）或 MySQL 8.0+（生產環境）
- Redis 7+（或使用內建的 FakeRedis）

### 安裝與運行

1. **克隆專案**
   ```bash
   git clone https://github.com/TokuiNico/webhook-dev.git
   cd webhook-dev/webhook-gateway
   ```

2. **環境配置**
   ```bash
   # 複製環境變數範本
   cp .env.example .env
   
   # 編輯環境變數
   vim .env
   ```

3. **開發環境啟動**
   ```bash
   # 方式一：使用 Docker（推薦）
   docker-compose --profile dev up -d
   
   # 方式二：本地運行（僅需要安裝 Python 依賴）
   uv sync
   uv run uvicorn app.main:app --reload
   ```

4. **生產環境部署**
   ```bash
   # 啟動生產環境（使用真實 Redis）
   docker-compose --profile production up -d
   ```

5. **驗證服務**
   ```bash
   # 檢查服務狀態
   curl http://localhost:8000/health
   
   # 查看 API 文檔
   open http://localhost:8000/docs
   ```

## 📋 API 使用指南

### Webhook 接收

接收來自外部服務的 webhook：

```bash
# GitHub push 事件範例
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"action": "push", "repository": {...}}' \
  http://localhost:8000/api/v1/ingest/github/push
```

### 訂閱管理

管理 webhook 訂閱者：

```bash
# 創建訂閱
curl -X POST \
  -H "Authorization: Bearer your-api-key-for-management-endpoints" \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": 1,
    "subscriber_name": "My Service",
    "target_url": "https://myservice.com/webhook",
    "is_active": true
  }' \
  http://localhost:8000/api/v1/subscriptions/

 # 列出所有訂閱
 curl -H "Authorization: Bearer your-api-key-for-management-endpoints" \
   http://localhost:8000/api/v1/subscriptions/
```

### 統計數據

獲取系統統計信息：

```bash
 # 系統總覽
 curl -H "Authorization: Bearer your-api-key-for-management-endpoints" \
   http://localhost:8000/api/v1/stats/overview

 # 活動統計
 curl -H "Authorization: Bearer your-api-key-for-management-endpoints" \
   http://localhost:8000/api/v1/stats/activity?days=7
```

## 🔧 配置說明

### 環境變數

| 變數名 | 說明 | 預設值 |
|--------|------|--------|
| `DATABASE_URL` | 數據庫連接字串 | `sqlite+aiosqlite:///./webhook.db` |
| `REDIS_URL` | Redis 連接字串 | `redis://localhost:6379/0` |
| `API_KEY` | 管理 API 金鑰 | `your-api-key-for-management-endpoints` |
| `USE_FAKE_REDIS` | 開發模式使用 fakeredis | `true` |
| `USE_SQLITE` | 使用 SQLite 數據庫 | `true` |
| `DEVELOPMENT` | 開發模式標記 | `true` |

### Docker 配置檔

提供了完整的 Docker Compose 配置，支援：

- **開發環境** (`--profile dev`): 使用 SQLite + FakeRedis，支援熱重載
- **生產環境** (`--profile production`): 使用 MySQL + Redis，優化效能

## 🧪 測試

執行測試套件：

```bash
# 安裝開發依賴
uv sync --dev

# 運行所有測試
python run_all_tests.py

# 運行特定測試
pytest tests/api/ -v

# 測試 webhook 功能
python test_webhook.py
```

## 📊 監控與日誌

### 健康檢查端點

- `GET /health` - 服務健康狀態
- `GET /` - 基本狀態確認

### 日誌查看

```bash
# 查看 API 日誌（包含 FastStream 處理器日誌）
docker-compose logs -f api-dev

# 查看數據庫日誌
docker-compose logs -f db

# 查看所有服務日誌
docker-compose logs -f
```

## 🛠️ 開發指南

### 項目結構

```
webhook-gateway/
├── app/
│   ├── api/v1/          # API 路由和端點
│   ├── core/            # 核心配置和工具
│   ├── db/              # 數據庫模型和會話
│   ├── schemas/         # Pydantic 模式定義
│   ├── stream/          # FastStream 應用程式和事件處理器
│   └── worker/          # （舊版本，現已使用 FastStream 替代）
├── tests/               # 測試套件
├── docker-compose.yml   # Docker 編排配置
├── Dockerfile          # 容器映像定義
└── pyproject.toml      # 專案依賴和配置
```

### 添加新的 Webhook 來源

1. 在數據庫中創建新的來源記錄
2. 實作來源特定的驗證邏輯
3. 添加相應的事件處理器
4. 更新測試套件

### 貢獻指南

1. Fork 此專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📚 文檔

- [API 端點文檔](./API_ENDPOINTS.md) - 完整的 API 參考
- [測試指南](./TESTING.md) - 測試執行和編寫指南
- [實作計畫](./IMPLEMENTATION_PLAN.md) - 專案開發計畫

## 📄 授權條款

此專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 🤝 支援

如果您遇到問題或有建議，請：

1. 查看 [Issues](https://github.com/TokuiNico/webhook-dev/issues) 中的常見問題
2. 創建新的 Issue 描述您的問題
3. 加入我們的討論區分享想法

---

**由 ❤️ 製作** | 適用於現代化的 Webhook 處理需求 