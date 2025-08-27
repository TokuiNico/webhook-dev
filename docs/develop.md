# Webhook Gateway 開發指南（develop.md）

本文件整合整個專案的程式碼與文件，提供從架構到落地細節的完整開發說明。請先理解核心概念（Topic, Source, Subscriber, Subscription, Event），並遵循 `docs/PLAN.md` 與 `docs/IMPLEMENTATION_PLAN.md` 的結構與命名規範。

---

## 1. 核心概念（Core Concepts）

- Topic（主題）: 一個邏輯事件通道（範例：`github.push`, `stripe.payment.succeeded`）。
- Source（來源）: 發送 webhook 的外/內部服務（如 GitHub、Stripe、內部服務）。
- Subscriber（訂閱者）: 希望接收特定 Topic 事件的下游服務。
- Subscription（訂閱關係）: 定義某訂閱者接收哪個 Topic，並指定 `target_url`。
- Event（事件）: 一次具體的 webhook 請求（包含原始 payload、headers、IP、Content-Type）。

參考：`docs/PLAN.md`, `docs/CONCEPTS.md`

---

## 2. 系統架構與事件流程

### 2.1 高階架構

- API 層（FastAPI）：接收 `/api/v1/ingest/{source}/{topic}` 請求，驗證簽名並寫入資料庫後回應 202。
- 事件流（FastStream）：將事件發佈到 `webhook.received`，再 fan-out 到每個訂閱者（`webhook.dispatch`）。
- 資料庫（SQLite 開發 / MySQL 生產）：存放 `sources`, `topics`, `subscriptions`, `event_logs`, `dispatch_logs`。
- 監控（Prometheus 指標，健康檢查端點）。

參考：`app/main.py`, `app/stream/handlers.py`, `app/services/webhook_service.py`, `docs/IMPLEMENTATION_PLAN.md`

### 2.2 事件處理序列

1) Ingest：`POST /api/v1/ingest/{source}/{topic}`
- 取得 raw body 與簽名 headers
- 驗證來源與主題
- 寫入 `event_logs`（保存原始 payload 與 headers、content_type、source_ip）
- 依來源策略驗證簽名（GitHub/Stripe/Generic）
- 發佈 `WebhookEvent` 到 `webhook.received`

2) Dispatch：`@broker.subscriber("webhook.received")`
- 針對每個啟用中的 `Subscription`，發佈分發任務到 `webhook.dispatch`

3) Delivery：`@broker.subscriber("webhook.dispatch")`
- 以 `httpx.AsyncClient` 將原始 `payload` 與 `content_type` POST 到 `target_url`
- 寫入 `dispatch_logs`（狀態、HTTP 狀態碼、回應體）

---

## 3. 專案結構（重要目錄與模組）

```
app/
  api/v1/           # FastAPI 路由與端點
    endpoints/
      ingest.py     # 接收 webhook
      subscriptions.py  # 訂閱 CRUD
      stats.py      # 統計 API
      topics.py     # 來源/主題管理 API
    deps.py         # 認證與 DB 依賴
  core/
    config.py       # 環境變數設定（Pydantic Settings）
    security.py     # HMAC 簽名驗證與 API Key 驗證工具
  db/
    base.py         # SQLAlchemy Base
    models.py       # ORM 模型（Sources/Topics/Subscriptions/EventLogs/DispatchLogs）
    session.py      # 非同步/同步連線管理
  monitoring/
    metrics.py      # Prometheus 指標（尚未掛載端點）
  middleware/
    security.py     # 速率限制與重放攻擊防護（尚未掛載）
  schemas/
    subscription.py # Pydantic Schemas（訂閱）
    topic.py        # Pydantic Schemas（主題與來源）
    source.py       # 注意：目前與 topic schema 有重疊（見 improvement.md）
  services/
    webhook_service.py      # Webhook 收/驗/記/發 核心流程
    subscription_service.py # 訂閱 CRUD
    topic_service.py        # 來源/主題 CRUD
    stats_service.py        # 統計計算
  stream/
    broker_manager.py # FastStream broker 管理（dev 使用 TestRabbitBroker）
    handlers.py       # 事件處理（received/dispatch）
    retry_handler.py  # 重試工具（尚未整合到 handlers）

app/main.py         # FastAPI app（生命週期：建表、啟停 broker）
```

---

## 4. 資料模型（Database Models）

檔案：`app/db/models.py`

- `Source(id, name[unique], secret, created_at, updated_at)`
- `Topic(id, name[unique], source_id, description, created_at, updated_at)`
- `Subscription(id, topic_id, subscriber_name, target_url, is_active, created_at, updated_at)`
- `EventLog(id, topic_id, source_ip, headers[JSON], content_type, payload[Text], status[Enum], received_at)`
- `DispatchLog(id, event_log_id, subscription_id, attempt, status[Enum], response_status_code, response_body, dispatched_at)`

命名建議：
- 建議以 `{source}.{event}[.{sub_event}]` 作為 `Topic.name`；請避免僅使用 `push`、`payment.succeeded` 等無來源前綴的名稱。

---

## 5. API 端點（Quick Reference）

- Ingest：`POST /api/v1/ingest/{source_name}/{topic_name}`（不需 API Key，使用 HMAC 簽名）
- 訂閱管理：`/api/v1/subscriptions/`（需要管理 API Key）
- 統計：`/api/v1/stats/`（需要管理 API Key）
- 來源/主題管理：`/api/v1/manage/`（需要管理 API Key）
- 系統：`GET /health`, `GET /`

完整請參考：`docs/API_ENDPOINTS.md`

---

## 6. 設定與環境變數（Configuration）

檔案：`app/core/config.py`

- `DATABASE_URL`：預設 `sqlite+aiosqlite:///./webhook.db`（開發）
- `RABBITMQ_URL`：生產模式連線（dev 預設不啟動 broker）
- `DEVELOPMENT`, `DISABLE_BROKER`：開發模式會使用 FastStream 測試 broker
- `MANAGEMENT_API_KEY`：保護管理類端點（headers: `Authorization: Bearer <KEY>`）

Docker Compose（MySQL + RabbitMQ）：`docker-compose.yml`

---

## 7. 本地開發（Local Development）

### 7.1 先決條件
- Python 3.10+
- uv（套件管理）、可選 Docker & Docker Compose

### 7.2 以 uv 啟動

```bash
# 安裝依賴
uv sync

# 設置測試資料（建表 + 種子）
uv run python test_setup.py

# 啟動開發伺服器
uv run uvicorn app.main:app --reload

# 或使用 Makefile 快速開始
make quick-start
make dev
```

瀏覽：
- 健康檢查：`http://localhost:8000/health`
- OpenAPI：`http://localhost:8000/docs`

### 7.3 以 Docker Compose（開發）

```bash
# 啟動（dev profile）
docker compose --profile dev up -d

# 查看日誌
docker compose logs -f api-dev
```

---

## 8. 測試（Testing）

- 單次腳本：`test_webhook.py`, `test_subscriptions_api.py`
- 完整腳本：`run_all_tests.py`
- Makefile：`make test`, `make test-coverage`, `make test-setup`

注意：測試中的 API Key 須與環境相符（例如 `MANAGEMENT_API_KEY`）。

---

## 9. 模組職責地圖（Where to change what）

- 新增來源/主題：`app/services/topic_service.py` + `app/api/v1/endpoints/topics.py`
- 新增/調整訂閱：`app/services/subscription_service.py` + `app/api/v1/endpoints/subscriptions.py`
- 調整簽名驗證：`app/core/security.py`（`verify_*_signature`）
- 調整事件流：`app/services/webhook_service.py`（發佈）與 `app/stream/handlers.py`（分發）
- 統計報表：`app/services/stats_service.py`（查詢與彙整）
- Broker 行為：`app/stream/broker_manager.py`（dev/prod 切換、發佈策略）
- 安全中介軟體與指標：`app/middleware/security.py`, `app/monitoring/metrics.py`

---

## 10. 安全與可觀測性

- HMAC 簽名：支援 GitHub (`X-Hub-Signature-256`)、Stripe（`Stripe-Signature`）、Generic（`X-Webhook-Signature`）。
- 速率限制與重放保護：`app/middleware/security.py`（建議在 `main.py` 中掛載，中長期規劃見 improvement）。
- 指標：`app/monitoring/metrics.py` 已提供指標，`/metrics` 端點已暴露，請於部署環境收集。

---

## 11. 命名規範與一致性建議

- Topic 名稱採 `{source}.{event}[.{sub_event}]`，避免僅使用無來源前綴的名稱。
- Schemas 請集中於 `app/schemas/` 並由端點引用，避免於端點內重複定義。
- 文件以 `docs/PLAN.md` 與 `docs/IMPLEMENTATION_PLAN.md` 為準，避免 README 與實作不一致（詳見 improvement.md）。

---

## 12. 已知差異與注意事項（跨文件）

- README/文件中對佇列（Redis/Celery vs FastStream/RabbitMQ）的描述有歷史殘留；實作以 FastStream + RabbitMQ 為準。
- `app/monitoring/metrics.py` 與 `app/middleware/security.py` 已接線。
- 重試機制已整合至 `handlers`；如需調整策略，見 `retry_handler.py`。

---

最後，請搭配 `docs/improvement.md` 的建議落實修正，以提升正確性與一致性。
