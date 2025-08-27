# Webhook Gateway 改進清單（improvement.md）

本文件彙整在審視整個程式碼與文件後，發現的「錯誤 / 不一致 / 可改進」項目，並提供可執行的修正建議與優先順序。

---

## A. 事實不一致與錯誤（需修正）

- A1. README 與實作的佇列敘述不一
  - 問題：README 與部分文件仍提及 Redis/Celery 為任務佇列；目前程式碼已以 FastStream + RabbitMQ 為主，開發模式則以 `TestRabbitBroker` 內存處理。
  - 影響：新進開發者易誤解部署需求與運行方式。
  - 建議修正：
    - 更新 README 的「系統架構」與「環境需求」段落，將佇列由 Redis/Celery 統一改為 FastStream + RabbitMQ；保留「開發模式不需啟動 broker」的開發體驗描述。
    - 在 `docs/IMPLEMENTATION_PLAN.md` 補充「已移除 Celery 與 Redis 依賴」的遷移說明。

- A2. API 認證訊息與實際行為不一致
  - 問題：`docs/API_ENDPOINTS.md` 的認證區段範例以 `your-api-key-for-management-endpoints`；實際驗證在 `app/api/v1/deps.py` 使用 `MANAGEMENT_API_KEY`，且若為預設值會回傳 500（未配置），非 401。
  - 建議修正：
    - 在 API 文件中明確說明：管理端點需要 `MANAGEMENT_API_KEY`，未配置時將返回 500，無或錯誤金鑰返回 401。
    - README 增補「本地開發最小設定」段落，提醒設置 `MANAGEMENT_API_KEY`。

- A3. `EventLog.headers` 型別與寫入值不一致
  - 問題：模型 `EventLog.headers` 欄位為 JSON；`webhook_service.create_event_log` 以 `json.dumps(headers)` 寫入字串，容易造成 ORM 或查詢期望不一致。
  - 建議修正（擇一）：
    - 方案一（推薦）：將欄位型別改為 `Text`，並統一以字串存放原始 headers（保留原狀）
    - 方案二：保持 `JSON` 型別，寫入前將 header key 全部轉小寫，並確保傳入為 dict 而不是字串（移除 `json.dumps`）。

- A4. Topic 命名與唯一性策略
  - 問題：`Topic.name` 設定為全域唯一；但 `test_setup.py` 將 GitHub 的 topic 設為 `push`（未包含 source 前綴），與文件建議 `github.push` 不一致，且與多來源共用名稱時會衝突。
  - 建議修正：
    - 將範例與測試資料中的 GitHub topic 改為 `github.push`；Stripe 則為 `stripe.payment.succeeded`，並在 `ingest` 端點查找 topic 時使用完整名稱。

---

## B. 缺漏與待接線（短期可完成）

- B1. 中介軟體（RateLimit + Replay 防護）未掛載
  - 狀況：`app/middleware/security.py` 已完成，但 `app/main.py` 未掛載。
  - 建議：
    - 在 `app.main` 初始化時加入：
      ```python
      from app.middleware.security import RateLimitMiddleware, WebhookSecurityMiddleware
      app.add_middleware(RateLimitMiddleware)
      app.add_middleware(WebhookSecurityMiddleware)
      ```
    - 僅針對 `/api/v1/ingest/*` 路徑生效（該中介已內建路徑判斷）。

- B2. 指標端點未提供
  - 狀況：`app/monitoring/metrics.py` 已有指標 Collector，但沒有 `/metrics` HTTP 端點，也未在 `pyproject.toml` 加入 `prometheus_client`。
  - 建議：
    - 加依賴：`prometheus_client`。
    - 新增端點（建議 `GET /metrics`，不需認證）：
      ```python
      from app.monitoring.metrics import get_metrics
      @app.get("/metrics")
      def metrics():
          return Response(get_metrics(), media_type="text/plain")
      ```

- B3. 重試機制尚未整合
  - 狀況：`app/stream/retry_handler.py` 寫好計畫，但 `handlers.py` 未依結果與 `attempt` 進行排程重試。
  - 建議：
    - 在 `dispatch_to_subscriber` 內依 `WebhookDispatchResult` 與 `attempt` 來決定是否 `retry_handler.schedule_retry(...)`。
    - 在 `webhook.retry` 新增對應 subscriber，將 `attempt+1` 重新送出。

- B4. Schemas 重複定義
  - 狀況：`app/api/v1/endpoints/topics.py` 重新定義了 `SourceCreate/Response`, `TopicCreate/Response`，與 `app/schemas/topic.py` 與 `app/schemas/source.py` 重疊。
  - 建議：
    - 移除端點內部 Pydantic 類別，統一改為引用 `app/schemas/topic.py` 與 `app/schemas/source.py`。

---

## C. 中期改善（一致性/可維護性）

- C1. README 對部署細節調整
  - 建議：明確 FastStream/RabbitMQ 在生產的實際需求，開發模式如何「跳過 broker」、如何以 Docker Compose 搭配 RabbitMQ profile 啟動。

- C2. 指標與統計整合
  - 建議：在 `webhook_service.process_webhook` 與 `handlers.send_webhook_to_subscriber` 打點 `MetricsCollector.record_webhook_request/dispatch`，並上報錯誤類型。

- C3. 型別一致性
  - 建議：
    - `EventLog.status`/`DispatchLog.status` 皆為 Enum；`stats_service._calculate_success_rate` 以字串比較（"success"），可改為引用 Enum 成員值。

- C4. broker_manager 開發模式描述
  - 建議：在 `docs/develop.md` 與 README 明確「開發模式使用內存測試 `TestRabbitBroker`，無需 RabbitMQ」的限制與行為（例如無真正的持久化/重播）。

---

## D. 低優先級（功能強化）

- D1. 事件查詢 API
  - 新增 `/api/v1/events/` 查詢、`/api/v1/events/{id}` 詳情、搜尋/匯出（規劃已在 `docs/IMPLEMENTATION_PLAN.md`）。

- D2. Webhook 測試工具 API
  - `POST /api/v1/test/webhook/{subscription_id}`、`POST /api/v1/test/payload/`、`GET /api/v1/test/history/`。

- D3. 批次操作 API
  - 對訂閱批量啟用/停用/刪除，以及事件重播。

---

## 優先順序（建議）

1) A 類（不一致/錯誤）先修：A1, A2, A3, A4
2) B 類（待接線）：B1, B2, B3, B4
3) C 類（中期改善）：C1, C2, C3, C4
4) D 類（功能）：D1, D2, D3

---

## 快速修正指令（參考）

- 加入中介與 /metrics 端點（於 `app/main.py`）：
  ```python
  from fastapi import Response
  from app.middleware.security import RateLimitMiddleware, WebhookSecurityMiddleware
  from app.monitoring.metrics import get_metrics

  app.add_middleware(RateLimitMiddleware)
  app.add_middleware(WebhookSecurityMiddleware)

  @app.get("/metrics")
  def metrics():
      return Response(get_metrics(), media_type="text/plain")
  ```

- 更新依賴：`pyproject.toml`
  ```toml
  prometheus_client = "*"
  ```
