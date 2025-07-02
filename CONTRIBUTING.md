# 貢獻指南

感謝您對 Webhook Gateway 專案的興趣！我們歡迎各種形式的貢獻。

## 🚀 開發環境設置

1. **Fork 並克隆專案**
   ```bash
   git clone https://github.com/YOUR_USERNAME/webhook-dev.git
   cd webhook-dev
   ```

2. **設置開發環境**
   ```bash
   # 安裝 uv（推薦的包管理器）
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # 安裝依賴
   uv sync --dev
   ```

3. **運行測試**
   ```bash
   python run_all_tests.py
   ```

## 📝 提交規範

我們使用 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

- `feat:` 新功能
- `fix:` 錯誤修復
- `docs:` 文檔更新
- `style:` 代碼格式調整
- `refactor:` 代碼重構
- `test:` 測試相關
- `chore:` 其他雜項

範例：
```bash
git commit -m "feat: 添加 GitHub webhook 簽名驗證"
git commit -m "fix: 修復 MySQL 連接池配置問題"
```

## 🧪 測試要求

- 所有新功能必須包含測試
- 確保測試覆蓋率不低於 85%
- 運行 `python run_all_tests.py` 確保所有測試通過

## 📋 Pull Request 流程

1. 創建功能分支：`git checkout -b feature/your-feature-name`
2. 進行開發並提交變更
3. 推送分支：`git push origin feature/your-feature-name`
4. 創建 Pull Request
5. 等待代碼審查

## 🔍 代碼風格

我們使用以下工具來維護代碼品質：

- **Black**: 代碼格式化
- **Ruff**: 代碼檢查
- **pytest**: 測試框架

運行檢查：
```bash
make lint
make format
make test
```

## 📖 文檔更新

如果您的變更影響到：
- API 端點
- 配置選項
- 使用方式

請同時更新相關文檔：
- `README.md`
- `docs/API_ENDPOINTS.md`
- `docs/IMPLEMENTATION_PLAN.md`

## 🐛 報告問題

請使用 GitHub Issues 報告錯誤，並包含：
- 環境信息（Python 版本、OS 等）
- 重現步驟
- 錯誤日誌
- 預期行為

## ❓ 需要幫助？

- 查看 [文檔](docs/)
- 創建 [Discussion](https://github.com/YOUR_REPO/discussions)
- 查看現有的 [Issues](https://github.com/YOUR_REPO/issues)

感謝您的貢獻！🎉
