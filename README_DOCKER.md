# Webhook Gateway Docker 部署指南

## 快速開始

### 一鍵啟動所有服務

```bash
make start-all
```

這個指令會：
1. 設置配置目錄和檔案
2. 構建 Docker 映像
3. 啟動所有服務（MySQL、RabbitMQ、API Server、FastStream Worker）

### 服務端點

- **API 服務器**: http://localhost:8000
- **API 文檔**: http://localhost:8000/docs
- **RabbitMQ 管理界面**: http://localhost:15672 (admin/admin)
- **MySQL 資料庫**: localhost:3306

## 服務架構

### 服務組成

1. **MySQL Database** (`db`)
   - 端口: 3306
   - 資料庫: webhook_db
   - 用戶: webhook_user

2. **RabbitMQ Message Broker** (`rabbitmq`)
   - AMQP 端口: 5672
   - 管理界面: 15672
   - 用戶: admin/admin

3. **API Server** (`api`)
   - 端口: 8000
   - 工作者: 2
   - 功能: 接收 webhook、管理訂閱

4. **FastStream Worker** (`faststream`)
   - 功能: 處理消息隊列、分發 webhook
   - 工作者: 2

### 網路配置

所有服務都在 `webhook-network` 網路中運行，確保服務間的安全通信。

## 環境配置

### 環境變數

創建 `.env` 檔案設置環境變數：

```bash
# 複製範例檔案
cp .env.example .env

# 編輯配置
vim .env
```

### 主要配置項

```env
# 資料庫配置
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=webhook_db
MYSQL_USER=webhook_user
MYSQL_PASSWORD=your_db_password

# RabbitMQ 配置
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=your_rabbitmq_password
RABBITMQ_ERLANG_COOKIE=your_unique_cookie

# 安全配置
SECRET_KEY=your-secret-key-change-in-production
API_KEY=your-api-key-for-management-endpoints
MANAGEMENT_API_KEY=your-management-api-key
```

## 常用指令

### 基本操作

```bash
# 啟動所有服務
make start-all

# 停止所有服務
make stop-all

# 重啟所有服務
make restart-all

# 查看服務狀態
make status

# 查看日誌
make logs
```

### 開發模式

```bash
# 啟動開發環境 (僅 API，使用熱重載)
make compose-dev

# 停止開發環境
make compose-down
```

### 監控與健康檢查

```bash
# 檢查服務健康狀態
make health

# 查看特定服務的日誌
docker compose logs -f api
docker compose logs -f faststream
docker compose logs -f rabbitmq
docker compose logs -f db
```

## 故障排除

### 常見問題

1. **端口衝突**
   ```bash
   # 檢查端口使用情況
   lsof -i :8000
   lsof -i :3306
   lsof -i :5672
   lsof -i :15672
   ```

2. **權限問題**
   ```bash
   # 確保配置目錄權限正確
   chmod -R 755 config/
   chmod -R 755 logs/
   ```

3. **資料庫連接問題**
   ```bash
   # 檢查資料庫健康狀態
   docker compose exec db mysqladmin ping -h localhost -u root -p
   ```

4. **RabbitMQ 連接問題**
   ```bash
   # 檢查 RabbitMQ 狀態
   docker compose exec rabbitmq rabbitmq-diagnostics ping
   ```

### 重置環境

```bash
# 完全清理並重新開始
make clean-all
make start-all
```

## 生產環境建議

### 安全配置

1. **更改預設密碼**
   - 修改 `.env` 中的所有預設密碼
   - 使用強密碼生成器

2. **網路安全**
   - 限制對外暴露的端口
   - 使用防火牆規則
   - 考慮使用 reverse proxy

3. **資料持久化**
   - 確保 volumes 正確掛載
   - 定期備份資料庫

### 效能優化

1. **資源限制**
   ```yaml
   # 在 docker-compose.yml 中添加
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: "0.5"
   ```

2. **監控**
   - 設置日誌輪轉
   - 監控系統資源使用
   - 設置健康檢查和警報

## 開發指南

### 本地開發

1. **使用開發模式**
   ```bash
   # 僅啟動資料庫和消息隊列
   docker compose --profile dev up -d db rabbitmq

   # 本地運行 API
   make dev
   ```

2. **調試模式**
   ```bash
   # 查看詳細日誌
   docker compose logs -f --tail=100

   # 進入容器調試
   docker compose exec api bash
   docker compose exec faststream bash
   ```

### 測試

```bash
# 運行測試套件
make test

# 測試 webhook 功能
make test-webhook

# 健康檢查
curl http://localhost:8000/health
```
