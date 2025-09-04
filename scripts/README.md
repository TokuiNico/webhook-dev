# Scripts 資料夾

這個資料夾包含各種功能演示和測試腳本，這些腳本需要實際的伺服器運行才能執行。

## 📝 腳本說明

### 🛠️ 設置腳本

- **`setup_test_data.py`** - 初始化測試資料庫並插入範例資料
  ```bash
  make setup-test-data
  # 或
  uv run python scripts/setup_test_data.py
  ```

### 🚀 功能演示腳本

- **`webhook_demo.py`** - 演示 webhook 接收功能
  ```bash
  make demo-webhook
  # 或
  uv run python scripts/webhook_demo.py
  ```

- **`subscriptions_api_demo.py`** - 演示訂閱管理 API
  ```bash
  make demo-api
  # 或
  uv run python scripts/subscriptions_api_demo.py
  ```

### 🧪 測試腳本

- **`e2e_webhook_test.py`** - 端到端 webhook 系統測試
  ```bash
  make e2e-test
  # 或
  uv run python scripts/e2e_webhook_test.py
  ```

  此腳本執行完整的工作流程測試：
  - 創建來源 (source)
  - 創建主題 (topic)
  - 創建訂閱 (subscription)
  - 發送 webhook 到 ingest URL
  - 驗證系統統計
  - 清理測試數據

### 🔧 除錯腳本

- **`webhook_debug.py`** - 用於除錯 webhook 問題
  ```bash
  make debug-webhook
  # 或
  uv run python scripts/webhook_debug.py
  ```

## 🔄 使用流程

### 1. 啟動服務
```bash
# 終端 1: 啟動 API 服務
make dev

# 終端 2: 啟動 TaskIQ worker（生產環境）
make worker
```

### 2. 設置測試資料
```bash
make setup-test-data
```

### 3. 運行測試和演示腳本
```bash
# 端到端測試（推薦先運行）
make e2e-test

# 測試 webhook 功能
make demo-webhook

# 測試 API 管理功能
make demo-api
```

## ⚠️ 注意事項

- 所有腳本都需要 API 伺服器在 `http://localhost:8000` 運行
- 確保資料庫已初始化並有測試資料
- 如果腳本失敗，請檢查：
  1. API 伺服器是否正在運行
  2. 資料庫連接是否正常
  3. 測試資料是否已設置

## 🧪 單元測試

如果你想運行不需要伺服器的純單元測試，請使用：

```bash
# 運行所有單元測試
make test

# 或直接使用 pytest
uv run python -m pytest tests/ -v
```

單元測試位於 `tests/` 資料夾，不需要任何外部服務即可運行。
