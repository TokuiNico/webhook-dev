# Webhook Gateway Makefile
# 提供常用的開發、構建、測試和部署指令

.PHONY: help build run test clean install dev docker-build docker-run docker-stop docker-clean compose-up compose-down compose-dev compose-prod logs lint format check

# 默認目標
.DEFAULT_GOAL := help

# 顏色定義
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# 項目變數
PROJECT_NAME := webhook-gateway
IMAGE_NAME := $(PROJECT_NAME)
COMPOSE_FILE := docker-compose.yml
PYTHON_VERSION := 3.11

help: ## 顯示可用指令
	@echo "$(BLUE)Webhook Gateway - 可用指令:$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "使用方式: make $(GREEN)<target>$(RESET)\n\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(RESET)\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ 🏗️  開發環境

install: ## 安裝項目依賴
	@echo "$(BLUE)正在安裝依賴...$(RESET)"
	uv sync --locked
	@echo "$(GREEN)✅ 依賴安裝完成$(RESET)"

dev: ## 啟動開發服務器
	@echo "$(BLUE)啟動開發服務器...$(RESET)"
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run: ## 運行應用 (生產模式)
	@echo "$(BLUE)啟動應用服務器...$(RESET)"
	uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

##@ 🧪 測試

test: ## 運行所有測試
	@echo "$(BLUE)運行測試套件...$(RESET)"
	uv run python -m pytest -v
	@echo "$(GREEN)✅ 測試完成$(RESET)"

test-coverage: ## 運行測試並生成覆蓋率報告
	@echo "$(BLUE)運行測試並生成覆蓋率報告...$(RESET)"
	uv run python -m pytest -v --cov=app --cov-report=html --cov-report=term
	@echo "$(GREEN)✅ 測試覆蓋率報告已生成$(RESET)"

test-setup: ## 設置測試環境
	@echo "$(BLUE)設置測試環境...$(RESET)"
	uv run python test_setup.py
	@echo "$(GREEN)✅ 測試環境設置完成$(RESET)"

test-webhook: ## 測試 webhook 功能
	@echo "$(BLUE)測試 webhook 功能...$(RESET)"
	uv run python test_webhook.py
	@echo "$(GREEN)✅ Webhook 測試完成$(RESET)"

##@ 🐳 Docker

docker-build: ## 構建 Docker 映像
	@echo "$(BLUE)構建 Docker 映像...$(RESET)"
	docker build -t $(IMAGE_NAME):latest .
	@echo "$(GREEN)✅ Docker 映像構建完成$(RESET)"

docker-build-dev: ## 構建開發版 Docker 映像
	@echo "$(BLUE)構建開發版 Docker 映像...$(RESET)"
	docker build -t $(IMAGE_NAME):dev .
	@echo "$(GREEN)✅ 開發版 Docker 映像構建完成$(RESET)"

docker-run: ## 運行 Docker 容器
	@echo "$(BLUE)運行 Docker 容器...$(RESET)"
	docker run -d --name $(PROJECT_NAME) -p 8000:8000 $(IMAGE_NAME):latest
	@echo "$(GREEN)✅ Docker 容器已啟動$(RESET)"

docker-stop: ## 停止 Docker 容器
	@echo "$(BLUE)停止 Docker 容器...$(RESET)"
	-docker stop $(PROJECT_NAME)
	-docker rm $(PROJECT_NAME)
	@echo "$(GREEN)✅ Docker 容器已停止$(RESET)"

docker-logs: ## 查看 Docker 容器日誌
	docker logs -f $(PROJECT_NAME)

docker-clean: ## 清理 Docker 資源
	@echo "$(BLUE)清理 Docker 資源...$(RESET)"
	-docker stop $(PROJECT_NAME)
	-docker rm $(PROJECT_NAME)
	-docker rmi $(IMAGE_NAME):latest $(IMAGE_NAME):dev
	docker system prune -f
	@echo "$(GREEN)✅ Docker 資源清理完成$(RESET)"

##@ 🐙 Docker Compose

compose-up: ## 啟動 Docker Compose (開發環境)
	@echo "$(BLUE)啟動 Docker Compose 開發環境...$(RESET)"
	docker compose --profile dev up -d
	@echo "$(GREEN)✅ 開發環境已啟動$(RESET)"

compose-down: ## 停止 Docker Compose
	@echo "$(BLUE)停止 Docker Compose...$(RESET)"
	docker compose down
	@echo "$(GREEN)✅ Docker Compose 已停止$(RESET)"

compose-dev: ## 啟動 Docker Compose 開發環境並查看日誌
	@echo "$(BLUE)啟動 Docker Compose 開發環境...$(RESET)"
	docker compose --profile dev up --build

compose-prod: ## 啟動 Docker Compose 生產環境
	@echo "$(BLUE)啟動 Docker Compose 生產環境...$(RESET)"
	docker compose --profile production up -d
	@echo "$(GREEN)✅ 生產環境已啟動$(RESET)"

compose-build: ## 重建 Docker Compose 服務
	@echo "$(BLUE)重建 Docker Compose 服務...$(RESET)"
	docker compose build --no-cache
	@echo "$(GREEN)✅ 服務重建完成$(RESET)"

compose-logs: ## 查看 Docker Compose 日誌
	docker compose logs -f

compose-clean: ## 清理 Docker Compose 資源
	@echo "$(BLUE)清理 Docker Compose 資源...$(RESET)"
	docker compose down -v --rmi all
	@echo "$(GREEN)✅ Docker Compose 資源清理完成$(RESET)"

##@ 🔧 代碼品質

lint: ## 運行代碼檢查
	@echo "$(BLUE)運行代碼檢查...$(RESET)"
	uv run ruff check app/
	@echo "$(GREEN)✅ 代碼檢查完成$(RESET)"

format: ## 格式化代碼
	@echo "$(BLUE)格式化代碼...$(RESET)"
	uv run ruff format app/
	uv run ruff check --fix app/
	@echo "$(GREEN)✅ 代碼格式化完成$(RESET)"

check: ## 運行所有檢查 (格式化 + 檢查 + 測試)
	@echo "$(BLUE)運行所有檢查...$(RESET)"
	$(MAKE) format
	$(MAKE) lint
	$(MAKE) test
	@echo "$(GREEN)✅ 所有檢查完成$(RESET)"

##@ 🔧 設置與配置

setup-config: ## 設置配置目錄和檔案
	@echo "$(BLUE)設置配置目錄...$(RESET)"
	@mkdir -p config/mysql config/rabbitmq logs
	@echo "[mysqld]" > config/mysql/my.cnf
	@echo "character-set-server=utf8mb4" >> config/mysql/my.cnf
	@echo "collation-server=utf8mb4_unicode_ci" >> config/mysql/my.cnf
	@echo "default-time-zone='+08:00'" >> config/mysql/my.cnf
	@echo "[rabbitmq_management]." > config/rabbitmq/enabled_plugins
	@echo "$(GREEN)✅ 配置目錄設置完成$(RESET)"

##@ 🧹 清理

clean: ## 清理所有生成文件和緩存
	@echo "$(BLUE)清理項目文件...$(RESET)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type f -name ".coverage" -delete
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	rm -f *.db *.sqlite *.sqlite3
	@echo "$(GREEN)✅ 清理完成$(RESET)"

clean-all: clean docker-clean compose-clean ## 清理所有文件和 Docker 資源
	@echo "$(GREEN)✅ 完全清理完成$(RESET)"

##@ 📊 監控

health: ## 檢查服務健康狀態
	@echo "$(BLUE)檢查服務健康狀態...$(RESET)"
	@curl -f http://localhost:8000/health || echo "$(RED)❌ 服務不可用$(RESET)"

logs: ## 查看應用日誌 (如果使用 Docker Compose)
	docker compose logs -f api-dev

status: ## 顯示服務狀態
	@echo "$(BLUE)Docker 容器狀態:$(RESET)"
	@docker ps --filter "name=$(PROJECT_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "無運行中的容器"
	@echo ""
	@echo "$(BLUE)Docker Compose 服務狀態:$(RESET)"
	@docker compose ps || echo "Docker Compose 未運行"

##@ 🚀 快速開始

quick-start: ## 快速開始 (安裝依賴 + 設置測試環境 + 啟動開發服務器)
	@echo "$(BLUE)🚀 快速開始 Webhook Gateway...$(RESET)"
	$(MAKE) install
	$(MAKE) test-setup
	@echo "$(GREEN)✅ 環境準備完成！現在可以運行 'make dev' 啟動開發服務器$(RESET)"

docker-quick-start: ## Docker 快速開始
	@echo "$(BLUE)🚀 Docker 快速開始...$(RESET)"
	$(MAKE) docker-build
	$(MAKE) compose-up
	@echo "$(GREEN)✅ Docker 環境已啟動！訪問 http://localhost:8000$(RESET)"

start-all: ## 一鍵啟動所有服務 (生產環境)
	@echo "$(BLUE)🚀 一鍵啟動所有服務 (生產環境)...$(RESET)"
	@echo "$(YELLOW)正在準備配置目錄...$(RESET)"
	$(MAKE) setup-config
	@echo "$(YELLOW)正在構建 Docker 映像...$(RESET)"
	docker compose build --no-cache
	@echo "$(YELLOW)正在啟動所有服務...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)✅ 所有服務已啟動！$(RESET)"
	@echo "$(BLUE)服務端點:$(RESET)"
	@echo "  API 服務器: http://localhost:8000"
	@echo "  API 文檔: http://localhost:8000/docs"
	@echo "  RabbitMQ 管理: http://localhost:15672"
	@echo "  MySQL: localhost:3306"
	@echo "$(YELLOW)使用 'make logs' 查看日誌$(RESET)"
	@echo "$(YELLOW)使用 'make stop-all' 停止所有服務$(RESET)"

stop-all: ## 停止所有服務
	@echo "$(BLUE)停止所有服務...$(RESET)"
	docker compose down
	@echo "$(GREEN)✅ 所有服務已停止$(RESET)"

restart-all: ## 重啟所有服務
	@echo "$(BLUE)重啟所有服務...$(RESET)"
	$(MAKE) stop-all
	$(MAKE) start-all

##@ ℹ️  資訊

info: ## 顯示項目資訊
	@echo "$(BLUE)項目資訊:$(RESET)"
	@echo "  項目名稱: $(PROJECT_NAME)"
	@echo "  Python 版本: $(PYTHON_VERSION)"
	@echo "  Docker 映像: $(IMAGE_NAME)"
	@echo "  Compose 文件: $(COMPOSE_FILE)"
	@echo ""
	@echo "$(BLUE)重要端點:$(RESET)"
	@echo "  健康檢查: http://localhost:8000/health"
	@echo "  API 文檔: http://localhost:8000/docs"
	@echo "  Webhook 端點: http://localhost:8000/api/v1/ingest/{source}/{topic}"
