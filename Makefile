# Webhook Gateway Makefile
# 簡化版 - 只保留核心開發指令

.PHONY: help install dev test clean build start stop logs

.DEFAULT_GOAL := help

help: ## 顯示可用指令
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

##@ 開發環境
install: ## 安裝依賴
	uv sync

dev: ## 啟動開發服務器
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

##@ 測試
test: ## 運行測試
	uv run python -m pytest -v

test-webhook: ## 測試 webhook 功能
	uv run python test_webhook.py

##@ Docker 部署
build: ## 構建並啟動所有服務
	docker compose build
	docker compose up -d

start: ## 啟動所有服務
	docker compose up -d

stop: ## 停止所有服務
	docker compose down

restart: stop start ## 重啟所有服務

logs: ## 查看服務日誌
	docker compose logs -f

status: ## 查看服務狀態
	docker compose ps

##@ 程式碼品質
lint: ## 代碼檢查
	uv run ruff check app/

format: ## 格式化代碼
	uv run ruff format app/
	uv run ruff check --fix app/

##@ 維護
clean: ## 清理本地文件
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	rm -f *.db *.sqlite *.sqlite3

clean-docker: ## 清理 Docker 資源
	docker compose down -v
	docker system prune -f

##@ 監控
health: ## 檢查服務健康狀態
	@curl -f http://localhost:8000/health || echo "服務不可用"
