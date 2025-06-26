# 🧪 Webhook Gateway 測試指南

完整的系統測試和驗證指南

## 📋 前置需求

- Python 3.11+
- uv (Python 包管理器)

## 🧪 測試腳本總覽

### 主要測試腳本
- `run_all_tests.py` - **完整測試套件** - 測試所有 API 端點和功能
- `test_setup.py` - 初始化測試環境和數據
- `test_webhook.py` - 測試 webhook 接收功能  
- `test_subscriptions_api.py` - 測試訂閱管理 API

## 🚀 快速開始測試

### 1. 安裝依賴

```bash
# 確保在 webhook-gateway 目錄中
cd webhook-gateway

# 安裝依賴
uv venv
uv pip sync
```

### 2. 初始化測試環境

```bash
# 執行測試設置腳本
uv run python test_setup.py
```

這會：
- 創建 SQLite 資料庫 (`webhook.db`)
- 創建所需的資料表
- 插入測試資料（GitHub 和 Stripe 來源、主題、訂閱）

### 3. 啟動服務

開啟 **兩個終端視窗**：

**終端 1 - API 服務:**
```bash
uv run uvicorn app.main:app --reload
```

**終端 2 - Celery Worker:**
```bash  
uv run celery -A app.worker.celery_app worker --loglevel=info
```

### 4. 運行完整測試

**推薦：使用完整測試套件**
```bash
# 在第三個終端視窗中運行完整測試
uv run python run_all_tests.py
```

**或使用個別測試腳本:**
```bash
# 測試 webhook 接收
uv run python test_webhook.py

# 測試訂閱管理 API
uv run python test_subscriptions_api.py
```

**手動測試:**
```bash
# 健康檢查
curl http://localhost:8000/health

# 測試 webhook (不含簽名驗證)
curl -X POST http://localhost:8000/api/v1/ingest/github/push \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 📊 預期結果

### 成功的測試應該顯示：

1. **API 服務啟動:**
   ```
   INFO:     Uvicorn running on http://127.0.0.1:8000
   ```

2. **Celery Worker 啟動:**
   ```
   [INFO/MainProcess] Connected to redis://localhost:6379/0
   [INFO/MainProcess] Ready to process tasks
   ```

3. **健康檢查回應:**
   ```json
   {"status": "healthy", "service": "webhook-gateway"}
   ```

4. **Webhook 接收成功:**
   ```json
   {"message": "Webhook received and queued for processing"}
   ```

## 📁 生成的檔案

測試後您會看到：
- `webhook.db` - SQLite 資料庫檔案
- 各種日誌輸出在終端中

## 🔍 檢查資料庫

如果您想檢查 SQLite 資料庫內容：

```bash
# 安裝 sqlite3 (如果沒有的話)
# 然後檢查資料庫
sqlite3 webhook.db

# 在 sqlite3 中執行：
.tables
SELECT * FROM sources;
SELECT * FROM topics;  
SELECT * FROM subscriptions;
SELECT * FROM event_logs;
```

## 🐛 常見問題

### 問題：Import 錯誤
**解決方案:** 確保已安裝所有依賴
```bash
uv pip install fakeredis requests
```

### 問題：Celery 連接錯誤
**解決方案:** 檢查是否已設定環境變數
```bash
export USE_FAKE_REDIS=true
export DEVELOPMENT=true
```

### 問題：資料庫連接錯誤
**解決方案:** 確保 SQLite 路徑正確，重新執行 `test_setup.py`

### 問題：Webhook 簽名驗證失敗
**解決方案:** 開發測試時可以跳過簽名驗證，或使用正確的 HMAC 簽名

## 🎯 下一步

成功完成基本測試後，您可以：
1. 實現完整的資料庫操作邏輯
2. 完善 Celery 任務處理
3. 添加訂閱管理 API
4. 撰寫單元測試

## 💡 開發提示

- 使用 `--reload` 參數啟動 API 服務可以自動重載程式碼變更
- Celery Worker 日誌會顯示任務處理狀態
- SQLite 檔案在專案目錄中，可以隨時刪除重新創建
- FakeRedis 在記憶體中運行，重啟服務會清空所有隊列資料 