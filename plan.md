# Webhook Gateway 服務產品規劃 (plan.md)

**版本:** 1.0
**日期:** 2025年6月26日
**負責人:** [資深產品經理]

---

## 1. 產品願景 (Product Vision)

打造一個集中、可靠、可擴展的 Webhook 閘道服務。此服務將作為組織內所有微服務的統一入口，簡化 Webhook 的接收、驗證、路由與分發流程，從而提高開發效率、系統可靠性與可觀測性。

## 2. 解決的問題 (Problem Statement)

在微服務架構中，各服務常需訂閱來自不同第三方服務（如 GitHub, Stripe, Slack）或內部服務的事件通知 (Webhook)。這導致了以下問題：

*   **管理混亂:** 每個服務都需要自行實現接收、驗證 Webhook 的邏輯，配置分散，難以統一管理。
*   **開發重複:** 重複的驗證、重試、日誌記錄等邏輯在多個服務中被反覆實現。
*   **安全性風險:** 安全憑證（Secrets）散落在各個服務中，增加了洩漏風險與輪換難度。
*   **缺乏可觀測性:** 無法集中監控 Webhook 的流動情況，當事件丟失或延遲時，難以追蹤與除錯。
*   **系統脆弱:** 當消費服務短暫失效時，若來源方沒有重試機制，事件將會永久丟失。

## 3. 核心概念 (Core Concepts)

*   **Topic (主題):** 一個邏輯上的事件通道。所有 Webhook 都會被發布到一個指定的 Topic。例如：`github.push`, `stripe.payment.succeeded`。
*   **Source (來源):** 發送 Webhook 的外部或內部服務。系統會根據來源進行驗證。
*   **Subscriber (訂閱者):** 希望接收特定 Topic 事件通知的下游微服務。
*   **Subscription (訂閱關係):** 定義了一個 Subscriber 應該接收哪個 Topic 的事件，並送到該 Subscriber 的哪個端點 (Endpoint URL)。
*   **Event (事件):** 一次具體的 Webhook 請求，包含其 Payload、標頭等資訊。

## 4. 系統架構 (High-Level Architecture)

系統主要由以下幾個部分組成：

1.  **Ingestion API (接收層):**
    *   提供一個統一的公開端點 (e.g., `https://webhook.yourcompany.com/ingest/{topic_name}`) 來接收所有來源的 Webhook。
    *   職責：快速響應請求，對請求進行初步驗證（如來源 IP、HMAC 簽名），然後將事件推送到消息隊列。

2.  **Message Queue (消息隊列):**
    *   系統的核心，用於異步處理和緩衝事件。例如：RabbitMQ, Kafka, AWS SQS。
    *   職責：削峰填谷，確保事件不丟失，解耦接收層與分發層。

3.  **Dispatcher Worker (分發層):**
    *   一個或多個背景工作程序，從消息隊列中拉取事件。
    *   職責：
        *   查詢「訂閱關係資料庫」，找到該 Topic 的所有訂閱者。
        *   按照訂閱關係中定義的規則，將事件 POST 到訂閱者的端點。
        *   處理投遞失敗的情況，執行重試邏輯（如指數退避）。
        *   記錄每次投遞的日誌。

4.  **Registry Database (註冊資料庫):**
    *   儲存 `Topic`, `Subscription` 等配置資訊。可以是關聯式資料庫 (PostgreSQL) 或 NoSQL 資料庫。

5.  **Management API (管理層):**
    *   提供內部 API，用於管理 Topic 和 Subscription。
    *   提供儀表板 (Dashboard) UI，讓開發者可以自助註冊訂閱、查看事件歷史、調試 Webhook。

## 5. 功能規劃 (Features)

### MVP (最小可行產品)

*   **事件接收:**
    *   提供基於 Topic 的 HTTP POST 端點接收 Webhook。
    *   支持基於 HMAC-SHA256 的簽名驗證。
*   **訂閱管理:**
    *   提供內部 API 來創建、讀取、刪除 Topic 和 Subscription。
*   **異步分發:**
    *   保證「至少一次」 (At-least-once) 的事件投遞。
    *   當投遞失敗時，提供基於指數退避的自動重試機制。
*   **日誌與監控:**
    *   記錄每個事件的接收與分發狀態。
    *   提供基礎的監控指標（如：接收總數、成功分發數、失敗數）。

### V2.0 (未來規劃)

*   **開發者儀表板 (Dashboard):**
    *   提供 Web UI 讓開發者自助管理訂閱。
    *   可視化查看特定 Topic 或 Subscription 的事件流歷史。
    *   提供手動「重放 (Replay)」事件的功能，方便除錯。
*   **高級路由與過濾:**
    *   允許訂閱者根據 Webhook 的 Payload 內容進行過濾。例如，只接收 `branch` 為 `main` 的 `github.push` 事件。
*   **事件轉換 (Transformation):**
    *   在分發前，允許對事件的 Payload 進行簡單的格式轉換。
*   **更多驗證機制:**
    *   支持 OAuth 2.0 或其他驗證方式。
*   **告警系統:**
    *   當某個訂閱者的端點持續失敗時，自動發送告警給負責團隊。

## 6. 非功能性需求 (Non-Functional Requirements)

*   **可靠性 (Reliability):** 系統核心服務可用性需達到 99.95%。事件處理保證「至少一次」投遞。
*   **擴展性 (Scalability):** 接收層與分發層需要能夠水平擴展，以應對流量高峰。
*   **安全性 (Security):** 所有管理操作需要嚴格的認證與授權。傳輸中的數據需加密 (HTTPS)。
*   **延遲 (Latency):** 95% 的事件從接收到成功分發的延遲應在 500ms 以內（不含下游服務處理時間）。

## 7. 成功指標 (Success Metrics)

*   **採用率:**
    *   註冊的 Topic 數量。
    *   活躍的 Subscription 數量。
*   **系統性能:**
    *   端到端事件處理延遲 (P95 Latency)。
    *   系統吞吐量 (Events per second)。
*   **可靠性:**
    *   事件投遞成功率。
    *   系統錯誤率。
*   **開發者滿意度:**
    *   通過問卷調查等方式收集開發者對此服務的滿意度。
