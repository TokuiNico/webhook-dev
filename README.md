# 🚀 Webhook Gateway

一個強大且可擴展的 Webhook 網關系統，專為接收、驗證、處理和分發來自各種來源的 webhook 事件而設計。

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab.svg?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791.svg?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://docker.com)

## ✨ 特色功能

- 🔄 **異步處理**：使用 TaskIQ 和 RabbitMQ 進行高效的異步事件處理
- 📡 **多格式支援**：支援 JSON、XML 和 form-data 格式的 webhook
- 🔒 **安全驗證**：內建 HMAC 簽名驗證機制 (GitHub, Stripe 等)
- 📊 **即時統計**：提供詳細的統計數據和 Prometheus 監控指標
- 🐳 **完整部署**：包含前端儀表板、後端 API、資料庫與訊息佇列的 Docker Compose 配置

## 🚀 快速開始

### 使用 Docker (推薦)

```bash
# 1. 克隆專案
git clone <repository-url>
cd webhook-dev

# 2. 啟動所有服務 (Frontend, Backend, Postgres, RabbitMQ)
docker compose up --build -d
```

### 服務位置

- **Frontend Dashboard**: http://localhost
- **API Server**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **RabbitMQ Management**: http://localhost:15672

## 📚 文檔

- [安裝與配置指南](./docs/setup.md)
- [API 使用指南](./docs/usage.md)

## 🏗️ 架構

- **Frontend**: React + Vite (Nginx 部署)
- **Backend**: FastAPI
- **Database**: PostgreSQL (替換了原有的 MySQL)
- **Queue**: RabbitMQ
- **Worker**: TaskIQ

### 系統架構圖

```mermaid
flowchart TB
    subgraph External["🌐 外部服務"]
        GH[GitHub]
        ST[Stripe]
        OT[其他 Webhook 來源]
    end

    subgraph Frontend["🖥️ 前端 (Port 80)"]
        NGINX[Nginx]
        REACT[React Dashboard]
    end

    subgraph Backend["⚙️ 後端 (Port 8000)"]
        API[FastAPI API Server]
        MW[Middleware<br/>Rate Limit / Security]
        AUTH[Authentication<br/>HMAC / Signature]
    end

    subgraph Worker["👷 Worker"]
        TASKIQ[TaskIQ Worker]
        RETRY[Smart Retry<br/>Middleware]
    end

    subgraph MessageQueue["📬 訊息佇列 (Port 5672)"]
        RABBIT[RabbitMQ]
    end

    subgraph Database["🗄️ 資料庫 (Port 5432)"]
        PG[(PostgreSQL)]
    end

    subgraph Subscribers["📡 訂閱者服務"]
        SUB1[Service A]
        SUB2[Service B]
        SUB3[Service N]
    end

    %% External to Backend
    GH & ST & OT -->|POST /api/v1/ingest/:topic_id| MW
    MW --> AUTH
    AUTH --> API

    %% Frontend connections
    REACT --> NGINX
    NGINX -->|Proxy /api/*| API

    %% Backend to Database & Queue
    API -->|記錄事件| PG
    API -->|發布任務| RABBIT

    %% Worker processing
    RABBIT -->|消費任務| TASKIQ
    TASKIQ --> RETRY
    TASKIQ -->|讀寫記錄| PG

    %% Dispatch to subscribers
    TASKIQ -->|HTTP POST| SUB1 & SUB2 & SUB3

    %% Dashboard queries
    API -->|統計查詢| PG

    classDef external fill:#e1f5fe,stroke:#01579b
    classDef frontend fill:#f3e5f5,stroke:#4a148c
    classDef backend fill:#e8f5e9,stroke:#1b5e20
    classDef worker fill:#fff3e0,stroke:#e65100
    classDef queue fill:#fce4ec,stroke:#880e4f
    classDef database fill:#e3f2fd,stroke:#0d47a1
    classDef subscriber fill:#f1f8e9,stroke:#33691e

    class GH,ST,OT external
    class NGINX,REACT frontend
    class API,MW,AUTH backend
    class TASKIQ,RETRY worker
    class RABBIT queue
    class PG database
    class SUB1,SUB2,SUB3 subscriber
```

### Webhook 處理流程

```mermaid
sequenceDiagram
    autonumber
    participant EXT as 外部服務
    participant API as FastAPI
    participant AUTH as 認證驗證器
    participant DB as PostgreSQL
    participant MQ as RabbitMQ
    participant WKR as TaskIQ Worker
    participant SUB as 訂閱者服務

    EXT->>+API: POST /api/v1/ingest/{topic_id}

    Note over API: Rate Limit & Security Check

    API->>DB: 查詢 Topic & Source
    DB-->>API: 返回配置

    API->>DB: 創建 EventLog (RECEIVED)

    API->>+AUTH: 驗證簽名/認證

    alt 驗證失敗
        AUTH-->>API: 失敗
        API->>DB: 更新狀態 (FAILED_VALIDATION)
        API-->>EXT: 403 Forbidden
    else 驗證成功
        AUTH-->>-API: 成功
        API->>DB: 更新狀態 (QUEUED)

        API->>DB: 查詢活躍訂閱者
        DB-->>API: 訂閱者列表

        loop 每個訂閱者
            API->>MQ: 發布分發任務
        end

        API-->>-EXT: 202 Accepted
    end

    MQ->>+WKR: 消費任務
    WKR->>+SUB: HTTP POST (webhook payload)

    alt 分發成功
        SUB-->>WKR: 2xx Response
        WKR->>DB: 創建 DispatchLog (SUCCESS)
    else 分發失敗
        SUB-->>-WKR: Error / Timeout
        WKR->>DB: 創建 DispatchLog (FAILED/RETRYING)
        Note over WKR: 指數退避重試 (最多3次)
    end

    deactivate WKR
```

### 資料模型關係圖

```mermaid
erDiagram
    Source ||--o{ Topic : "擁有"
    Topic ||--o{ Subscription : "被訂閱"
    Topic ||--o{ EventLog : "記錄事件"
    EventLog ||--o{ DispatchLog : "分發記錄"
    Subscription ||--o{ DispatchLog : "接收分發"

    Source {
        string id PK "ULID"
        string name "來源名稱"
        string secret "HMAC 密鑰"
        string auth_type "認證類型"
        json auth_config "認證配置"
        datetime created_at
        datetime updated_at
    }

    Topic {
        string id PK "ULID"
        string source_id FK
        string name "主題名稱"
        text description
        datetime created_at
        datetime updated_at
    }

    Subscription {
        string id PK "ULID"
        string topic_id FK
        string subscriber_name "訂閱者名稱"
        string target_url "目標 URL"
        boolean is_active "是否啟用"
        datetime created_at
        datetime updated_at
    }

    EventLog {
        string id PK "ULID"
        string topic_id FK
        string source_ip "來源 IP"
        json headers "請求標頭"
        string content_type
        text payload "原始內容"
        enum status "RECEIVED|QUEUED|FAILED"
        datetime received_at
    }

    DispatchLog {
        string id PK "ULID"
        string event_log_id FK
        string subscription_id FK
        enum status "SUCCESS|FAILED|RETRYING"
        int response_status_code
        text response_body
        datetime dispatched_at
    }
```

### 開發/生產模式對比

```mermaid
flowchart LR
    subgraph DEV["🔧 開發模式"]
        direction TB
        D_API[FastAPI]
        D_DB[(SQLite)]
        D_MQ[InMemoryBroker]
        D_API --> D_DB
        D_API --> D_MQ
    end

    subgraph PROD["🚀 生產模式"]
        direction TB
        P_API[FastAPI]
        P_DB[(PostgreSQL)]
        P_MQ[RabbitMQ]
        P_WKR[TaskIQ Worker]
        P_API --> P_DB
        P_API --> P_MQ
        P_MQ --> P_WKR
        P_WKR --> P_DB
    end

    DEV -.->|docker compose| PROD

    style DEV fill:#e3f2fd,stroke:#1565c0
    style PROD fill:#e8f5e9,stroke:#2e7d32
```

## 📄 授權

MIT License
