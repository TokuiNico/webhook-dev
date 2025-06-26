# Webhook Gateway: Implementation Plan & TODO

**Project:** Webhook Gateway Service
**Stack:** Python, FastAPI, Pydantic, Celery, Redis, MySQL, uv, uvicorn
**Note:** This plan is designed to handle multiple payload formats including JSON, XML, and x-www-form-urlencoded.

---

## 1. Project Directory Structure

```
webhook-gateway/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point, run with uvicorn
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── ingest.py       # Endpoint for receiving webhooks
│   │   │   │   └── subscriptions.py # API for managing subscriptions
│   │   │   └── deps.py             # FastAPI dependencies (e.g., DB session, security)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # Pydantic settings management
│   │   └── security.py           # Security functions (e.g., HMAC verification)
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py               # Base for SQLAlchemy models
│   │   ├── models.py             # SQLAlchemy ORM models
│   │   └── session.py            # Database session management
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── subscription.py       # Pydantic schemas for subscriptions
│   │   └── topic.py              # Pydantic schemas for topics
│   └── worker/
│       ├── __init__.py
│       ├── celery_app.py         # Celery application instance
│       └── tasks.py              # Celery task definitions (e.g., dispatching)
│
├── tests/                      # Unit and integration tests
│   ├── __init__.py
│   ├── api/
│   └── worker/
│
├── .env                        # Environment variables (for local development)
├── .gitignore
├── docker-compose.yml          # Docker Compose for all services
├── Dockerfile                  # Dockerfile for the FastAPI/Celery app
└── pyproject.toml              # Python project metadata and dependencies (for uv)
```

## 2. Database Schema (MySQL)

We will use SQLAlchemy as the ORM. The primary tables are:

1.  **`sources`**: Stores information about trusted webhook sources and their secrets for verification.
    *   `id` (PK)
    *   `name` (VARCHAR, UNIQUE): e.g., "github", "stripe"
    *   `secret` (VARCHAR): The secret key for HMAC signature validation.
    *   `created_at`, `updated_at`

2.  **`topics`**: Defines the event channels.
    *   `id` (PK)
    *   `name` (VARCHAR, UNIQUE): e.g., "github.push", "stripe.payment.succeeded"
    *   `source_id` (FK to `sources.id`)
    *   `description` (TEXT)
    *   `created_at`, `updated_at`

3.  **`subscriptions`**: Links subscribers to topics.
    *   `id` (PK)
    *   `topic_id` (FK to `topics.id`)
    *   `subscriber_name` (VARCHAR): A human-readable name for the subscriber service.
    *   `target_url` (VARCHAR): The URL to which the webhook should be sent.
    *   `is_active` (BOOLEAN)
    *   `created_at`, `updated_at`

4.  **`event_logs`**: Logs every incoming event for traceability. **(Modified for multi-format support)**
    *   `id` (PK)
    *   `topic_id` (FK to `topics.id`)
    *   `source_ip` (VARCHAR)
    *   `headers` (JSON)
    *   `content_type` (VARCHAR): **New field to store the original Content-Type header.**
    *   `payload` (LONGTEXT): **Changed from JSON to LONGTEXT to store the raw request body.**
    *   `status` (ENUM: "received", "queued", "failed_validation")
    *   `received_at`

5.  **`dispatch_logs`**: Logs every dispatch attempt for a subscription.
    *   `id` (PK)
    *   `event_log_id` (FK to `event_logs.id`)
    *   `subscription_id` (FK to `subscriptions.id`)
    *   `attempt` (INTEGER)
    *   `status` (ENUM: "success", "failed", "retrying")
    *   `response_status_code` (INTEGER)
    *   `response_body` (TEXT)
    *   `dispatched_at`

## 3. Core Components Implementation

### a. FastAPI Application (`app/main.py` served by Uvicorn)
-   Initializes the FastAPI app.
-   Mounts the API routers from `app/api/v1/endpoints`.
-   Handles application lifecycle events (startup/shutdown), like creating an initial DB connection pool.
-   The application will be started using `uvicorn app.main:app`.

### b. Ingestion Endpoint (`app/api/v1/endpoints/ingest.py`)
-   **Endpoint**: `POST /ingest/{source_name}/{topic_name}`
-   **Logic (Modified for multi-format support)**:
    1.  Accepts a raw HTTP `Request` object to access headers and the raw body.
    2.  Reads the raw request body using `await request.body()`.
    3.  Reads the `Content-Type` header from `request.headers`.
    4.  Uses a dependency to verify the source and topic exist in the DB.
    5.  Uses another dependency from `app/core/security.py` to perform HMAC signature validation on the **raw request body**.
    6.  If validation is successful:
        -   Logs the incoming event to the `event_logs` table, storing the **raw payload**, **content_type**, and headers.
        -   Creates a Celery task, sending the `event_log.id`.
        -   Returns an immediate `202 Accepted` response.
    7.  If validation fails, logs the event and returns a `403 Forbidden`.

### c. Subscription API (`app/api/v1/endpoints/subscriptions.py`)
-   Standard CRUD operations for subscriptions.
-   `POST /subscriptions/`: Creates a new subscription.
-   `GET /subscriptions/`: Lists all subscriptions, with filtering.
-   `DELETE /subscriptions/{sub_id}`: Deactivates a subscription.
-   All endpoints should be protected by an internal API key.

### d. Celery Worker (`app/worker/tasks.py`)
-   **Task**: `dispatch_webhooks(event_log_id: int)`
-   **Logic**:
    1.  Receives `event_log_id`.
    2.  Retrieves the full event log from the database, including the **raw payload** and **content_type**.
    3.  Finds all active subscriptions for that topic.
    4.  For each subscription, launch a sub-task `send_to_subscriber(subscription_id, event_log)`.
-   **Sub-Task**: `send_to_subscriber(subscription_id: int, event_log: dict)`
-   **Logic (Modified for multi-format support)**:
    1.  Constructs an HTTP POST request to the `target_url`.
    2.  **Crucially, sets the `Content-Type` header of the outgoing request to the `content_type` from the `event_log`.**
    3.  **Uses the raw `payload` string from the `event_log` as the request body.**
    4.  Implements retry logic using Celery's built-in mechanisms.
    5.  Logs the outcome of each attempt to the `dispatch_logs` table.

## 4. Environment & Deployment (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: webhook_db
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    container_name: webhook_redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  api:
    build: .
    container_name: webhook_api
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    env_file:
      - .env

  worker:
    build: .
    container_name: webhook_worker
    command: celery -A app.worker.celery_app worker --loglevel=info
    volumes:
      - .:/app
    depends_on:
      - db
      - redis
    env_file:
      - .env

volumes:
  mysql_data:
  redis_data:
```

## 5. TODO List

### Phase 1: Core Setup & Database
- [x] Initialize project directory structure.
- [x] Create `pyproject.toml` and define dependencies.
- [x] Use `uv` to create a virtual environment and install dependencies (`uv venv` & `uv pip sync`).
- [x] **Dependencies**: `fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `mysqlclient`, `celery`, `redis`, `alembic`, `python-multipart`, `lxml`, `fakeredis`.
- [x] Create `Dockerfile` and `docker-compose.yml`.
- [x] Implement Pydantic settings in `app/core/config.py`.
- [x] **Define SQLAlchemy models in `app/db/models.py` (ensure `event_logs` has `content_type` and `payload` as LONGTEXT).**
- [x] Set up database session management (`app/db/session.py`) and initialize Alembic for migrations.
- [x] Configure Celery application in `app/worker/celery_app.py`.
- [x] Create basic Celery tasks structure in `app/worker/tasks.py`.
- [x] **Add fakeredis support for development environment.**
- [x] **Create Redis client management module.**
- [x] **Update docker-compose.yml with development and production profiles.**

### Phase 2: Ingestion Logic
- [x] **Implement the `POST /ingest/{source}/{topic}` endpoint to handle raw bodies and content types.**
- [x] Implement HMAC signature verification logic in `app/core/security.py` to work with the raw body.
- [x] Create a FastAPI dependency to perform the verification.
- [x] Implement logging of incoming events to the modified `event_logs` table.
- [x] Update main application with API routers.
- [x] Create Pydantic schemas for API responses.

### Phase 3: Background Worker & Dispatching
- [x] Configure Celery application in `app/worker/celery_app.py`.
- [x] Create the `dispatch_webhooks` Celery task.
- [x] **Create the `send_to_subscriber` sub-task, ensuring it forwards the original `Content-Type` and raw payload.**
- [x] Implement logging to the `dispatch_logs` table from the Celery task.
- [x] Test the full flow with JSON, form-data, and XML payloads.
- [x] **Configure Celery eager mode for development environment.**
- [x] **Implement complete async HTTP dispatch with httpx.**

### Phase 4: Management API
- [x] Implement CRUD endpoints for Subscriptions in `app/api/v1/endpoints/subscriptions.py`.
- [x] Implement Pydantic schemas for the subscription API.
- [x] Add API key authentication for management endpoints.
- [x] **Implement Statistics API endpoints (`/api/v1/stats/`).**
- [x] **Implement Source and Topic management API (`/api/v1/manage/`).**
- [x] **Create centralized API router structure.**
- [x] **Complete API documentation with examples.**

### Phase 5: Testing & Documentation
- [x] Write unit tests for security functions and business logic.
- [x] Write integration tests for the API endpoints with various content types.
- [x] Write integration tests for the Celery worker flow.
- [x] Document API endpoints using OpenAPI/Swagger (auto-generated by FastAPI).
- [x] Create a `README.md` with setup and usage instructions.
- [x] **Create comprehensive API documentation (`API_ENDPOINTS.md`).**
- [x] **Implement complete testing suite with multiple scenarios.**
- [x] **Test authentication and authorization mechanisms.**

---

## 6. **🎯 專案狀態總結 (2024-12-19 更新)**

### **完成度評估: 95% ✅**

#### **✅ 已完成的核心功能:**
1. **完整的後端 API 系統**
   - Webhook 接收和驗證 (`/api/v1/ingest/`)
   - 訂閱管理 CRUD (`/api/v1/subscriptions/`)
   - 統計數據 API (`/api/v1/stats/`)
   - 來源和主題管理 (`/api/v1/manage/`)

2. **強健的資料庫架構**
   - SQLite 開發環境 + MySQL 生產環境
   - 完整的資料模型 (Sources, Topics, Subscriptions, EventLogs, DispatchLogs)
   - 異步 SQLAlchemy 支援

3. **完善的背景任務系統**
   - Celery + Redis/FakeRedis 配置
   - 異步 webhook 分發機制
   - 完整的重試和錯誤處理
   - Eager mode 開發環境支援

4. **安全認證系統**
   - HMAC 簽名驗證 (GitHub/Stripe 格式)
   - Bearer Token API 認證
   - 防時序攻擊保護

5. **開發友好環境**
   - FakeRedis 零依賴開發
   - SQLite 快速測試
   - 完整的測試套件
   - Docker 容器化支援

6. **完整文檔和測試**
   - API_ENDPOINTS.md 詳細文檔
   - 多場景測試腳本
   - README 和 TESTING 指南

#### **🚧 待完成項目:**
1. **前端管理介面** (Phase 6)
   - React + TypeScript + Ant Design
   - 儀表板、訂閱管理、事件日誌
   - 實時統計和監控

2. **進階事件日誌 API** (可選)
   - 事件詳情查看
   - 進階搜尋和篩選
   - 匯出功能

#### **🔧 技術棧現狀:**
- **後端**: FastAPI + Pydantic + SQLAlchemy + Celery ✅
- **資料庫**: SQLite (開發) / MySQL (生產) ✅
- **任務隊列**: Celery + Redis/FakeRedis ✅
- **HTTP 客戶端**: httpx (異步) ✅
- **容器化**: Docker + Docker Compose ✅
- **包管理**: uv ✅
- **前端**: 待實作 🚧

#### **🎯 下一步行動:**
1. 開始前端開發 (Phase 6A-6D)
2. 部署到生產環境
3. 實作實時監控功能
4. 效能優化和擴展

**💡 專案已準備好投入生產使用，核心功能完整且穩定！**

---

## 7. Frontend Implementation Plan

**Framework:** React 18 + TypeScript + Vite
**UI Library:** Ant Design 5
**State Management:** React Query (TanStack Query) + Zustand
**Routing:** React Router v6
**Build Tool:** Vite 5

### Frontend Project Structure

```
webhook-admin/                    # Frontend root directory (parallel to webhook-gateway/)
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── common/
│   │   │   ├── Layout.tsx       # Main application layout
│   │   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   │   ├── Header.tsx       # Top header with user info
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── subscription/
│   │   │   ├── SubscriptionList.tsx      # List view with filters
│   │   │   ├── SubscriptionForm.tsx      # Create/Edit form
│   │   │   ├── SubscriptionCard.tsx      # Individual subscription card
│   │   │   └── SubscriptionModal.tsx     # Modal for quick actions
│   │   ├── webhook/
│   │   │   ├── WebhookLogTable.tsx       # Event logs table
│   │   │   ├── WebhookLogDetail.tsx      # Detailed log view
│   │   │   ├── WebhookLogFilters.tsx     # Search and filter controls
│   │   │   └── PayloadViewer.tsx         # JSON/XML payload viewer
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx            # Overview statistics
│   │   │   ├── ActivityChart.tsx         # Real-time activity chart
│   │   │   ├── RecentEvents.tsx          # Recent webhook events
│   │   │   └── SystemStatus.tsx          # System health indicators
│   │   └── settings/
│   │       ├── ApiKeyManager.tsx         # API key management
│   │       ├── SourceManager.tsx         # Webhook sources management
│   │       └── TopicManager.tsx          # Topics management
│   ├── pages/                   # Page components
│   │   ├── Dashboard.tsx        # Main dashboard page
│   │   ├── Subscriptions.tsx    # Subscription management page
│   │   ├── WebhookLogs.tsx      # Event logs page
│   │   ├── Settings.tsx         # Settings page
│   │   ├── Login.tsx            # Authentication page
│   │   └── NotFound.tsx         # 404 page
│   ├── services/                # API and external services
│   │   ├── api.ts              # Main API client configuration
│   │   ├── webhookAPI.ts       # Webhook-related API calls
│   │   ├── subscriptionAPI.ts  # Subscription CRUD operations
│   │   ├── authAPI.ts          # Authentication services
│   │   └── websocket.ts        # Real-time updates (optional)
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts          # Authentication state management
│   │   ├── useSubscriptions.ts # Subscription data management
│   │   ├── useWebhookLogs.ts   # Event logs data management
│   │   ├── useStats.ts         # Dashboard statistics
│   │   └── useLocalStorage.ts  # Local storage utilities
│   ├── store/                   # Global state management
│   │   ├── authStore.ts        # Authentication state (Zustand)
│   │   ├── settingsStore.ts    # Application settings
│   │   └── notificationStore.ts # Toast notifications
│   ├── types/                   # TypeScript type definitions
│   │   ├── api.ts              # API response types
│   │   ├── subscription.ts     # Subscription-related types
│   │   ├── webhook.ts          # Webhook and event types
│   │   ├── user.ts             # User and auth types
│   │   └── common.ts           # Common utility types
│   ├── utils/                   # Utility functions
│   │   ├── formatters.ts       # Date, number, text formatters
│   │   ├── validators.ts       # Form validation helpers
│   │   ├── constants.ts        # Application constants
│   │   ├── helpers.ts          # General helper functions
│   │   └── apiHelpers.ts       # API-related utilities
│   ├── styles/                  # Global styles and themes
│   │   ├── globals.css         # Global CSS styles
│   │   ├── variables.css       # CSS custom properties
│   │   └── antd-overrides.css  # Ant Design customizations
│   ├── App.tsx                 # Root application component
│   ├── main.tsx                # Application entry point
│   └── vite-env.d.ts          # Vite type declarations
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
├── tailwind.config.js         # Tailwind CSS configuration (optional)
├── .env.development           # Development environment variables
├── .env.production            # Production environment variables
└── README.md                  # Frontend documentation
```

### Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "typescript": "^5.3.0",
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.0",
    "axios": "^1.6.0",
    "@tanstack/react-query": "^5.8.0",
    "zustand": "^4.4.0",
    "dayjs": "^1.11.0",
    "recharts": "^2.8.0",
    "react-json-view": "^1.21.0",
    "prismjs": "^1.29.0",
    "react-syntax-highlighter": "^15.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "prettier": "^3.1.0"
  }
}
```

### Key Features Implementation Plan

#### 1. **Authentication & Authorization**
- **Login System**: API key-based authentication
- **Route Protection**: Private routes requiring authentication
- **Permission Management**: Role-based access control (future enhancement)

#### 2. **Dashboard Page**
- **Real-time Statistics**: 
  - Total webhooks received (today/week/month)
  - Success/failure rates
  - Active subscriptions count
  - System health status
- **Activity Charts**: 
  - Webhook volume over time (using Recharts)
  - Success rate trends
  - Top sources and topics
- **Recent Activity**: 
  - Latest webhook events
  - Recent subscription changes
  - System alerts

#### 3. **Subscription Management**
- **CRUD Operations**: 
  - Create new subscriptions with form validation
  - Edit existing subscriptions
  - Enable/disable subscriptions
  - Delete subscriptions with confirmation
- **Advanced Features**:
  - Bulk operations (enable/disable multiple)
  - Import/export subscriptions (JSON/CSV)
  - Subscription templates for common patterns
  - URL validation and testing
- **Search & Filtering**:
  - Filter by topic, status, subscriber name
  - Search across all fields
  - Saved filter presets

#### 4. **Webhook Event Logs**
- **Event Table**: 
  - Paginated table with virtual scrolling
  - Sortable columns (timestamp, source, topic, status)
  - Color-coded status indicators
- **Detailed View**:
  - Full payload viewer with syntax highlighting
  - Headers inspection
  - Dispatch logs and retry attempts
  - Related subscription information
- **Advanced Search**:
  - Date range filtering
  - Source and topic filtering
  - Status filtering (received/queued/failed)
  - Payload content search
- **Export Features**:
  - Export filtered results to CSV/JSON
  - Webhook replay functionality

#### 5. **Settings & Configuration**
- **API Key Management**: 
  - Generate new API keys
  - Revoke existing keys
  - Key usage statistics
- **Source Management**: 
  - Add/edit webhook sources
  - Manage HMAC secrets
  - Source-specific settings
- **Topic Management**: 
  - Create and organize topics
  - Topic descriptions and metadata
  - Topic usage statistics
- **System Settings**: 
  - Notification preferences
  - UI theme selection
  - Data retention policies

#### 6. **Real-time Features** (Optional Phase)
- **WebSocket Integration**: 
  - Real-time webhook event updates
  - Live dashboard statistics
  - System status notifications
- **Push Notifications**: 
  - Browser notifications for critical events
  - Email alerts configuration

### Development Phases

#### **Phase 6A: Frontend Foundation** (Week 1)
- [ ] Set up Vite + React + TypeScript project
- [ ] Configure Ant Design and basic theming
- [ ] Implement routing with React Router
- [ ] Create basic layout components (Header, Sidebar, Layout)
- [ ] Set up API client with Axios
- [ ] Implement authentication system
- [ ] Add CORS support to backend

#### **Phase 6B: Core Pages** (Week 2)
- [ ] Implement Dashboard page with basic statistics
- [ ] Create Subscription management pages (List, Create, Edit)
- [ ] Build Webhook logs page with table view
- [ ] Add basic search and filtering
- [ ] Implement CRUD operations for subscriptions

#### **Phase 6C: Advanced Features** (Week 3)
- [ ] Add detailed webhook log viewer
- [ ] Implement advanced filtering and search
- [ ] Create settings pages (API keys, sources, topics)
- [ ] Add data visualization with charts
- [ ] Implement export functionality

#### **Phase 6D: Polish & Optimization** (Week 4)
- [ ] Add loading states and error handling
- [ ] Implement responsive design
- [ ] Add form validation and user feedback
- [ ] Performance optimization
- [ ] Testing and bug fixes
- [ ] Documentation and deployment

### Backend API Extensions Needed

#### **Additional Endpoints for Frontend**:

```typescript
// Statistics and Dashboard ✅ IMPLEMENTED
GET /api/v1/stats/overview          // Dashboard statistics
GET /api/v1/stats/activity          // Activity over time
GET /api/v1/stats/sources           // Source statistics

// Event Logs with Advanced Filtering 🚧 PLANNED
GET /api/v1/events/                 // Enhanced event logs endpoint
GET /api/v1/events/{id}             // Individual event details
POST /api/v1/events/search          // Advanced search
POST /api/v1/events/export          // Export functionality

// Source and Topic Management ✅ IMPLEMENTED
GET /api/v1/manage/sources/         // List sources
POST /api/v1/manage/sources/        // Create source
GET /api/v1/manage/topics/          // List topics
POST /api/v1/manage/topics/         // Create topic
GET /api/v1/manage/topics/{id}      // Get topic details

// System Health ✅ AVAILABLE
GET /health                         // Basic health check
GET /                              // Service status
```

### Environment Configuration

#### **Development Environment** (`.env.development`):
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_URL=ws://127.0.0.1:8000/ws
VITE_APP_TITLE=Webhook Gateway Admin
VITE_ENABLE_MOCK_API=false
```

#### **Production Environment** (`.env.production`):
```env
VITE_API_BASE_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com/ws
VITE_APP_TITLE=Webhook Gateway
VITE_ENABLE_MOCK_API=false
```

This comprehensive plan provides a solid foundation for building a modern, feature-rich admin interface for your Webhook Gateway system.
