# 變更日誌

所有對此專案的重要變更都會記錄在此文件中。

日誌格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
此專案遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [未發布]

### 新增
- GitHub Actions CI/CD 流水線
- 前端集成架構指南
- 貢獻指南 (CONTRIBUTING.md)
- MIT 授權文件
- 完整的 .gitignore 規則

## [0.1.0] - 2025-01-XX

### 新增
- 🚀 基於 FastAPI 的 Webhook 接收 API
- 🔐 HMAC 簽名驗證（支援 GitHub/Stripe 格式）
- 📊 使用 FastStream 的異步事件處理
- 💾 支援 SQLite（開發）和 MySQL（生產）
- 🔄 智能 broker 管理（開發/生產模式自動切換）
- 📈 Prometheus 監控指標
- 🐳 Docker 和 Docker Compose 支援
- 📝 完整的 API 文檔
- 🧪 綜合測試套件
- 📋 訂閱管理 API
- 📊 統計數據 API

### 技術特色
- 多格式支援（JSON, XML, Form-data）
- 異步數據庫操作
- 指數退避重試機制
- 開發環境零依賴配置
- 現代化的 Python 包管理（uv）

### API 端點
- `POST /api/v1/ingest/{source_name}/{topic_name}` - 接收 webhook
- `GET /api/v1/subscriptions/` - 列出訂閱
- `POST /api/v1/subscriptions/` - 創建訂閱
- `DELETE /api/v1/subscriptions/{id}` - 刪除訂閱
- `GET /api/v1/stats/overview` - 系統統計
- `GET /api/v1/topics/` - 主題管理

[未發布]: https://github.com/YOUR_REPO/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YOUR_REPO/releases/tag/v0.1.0
