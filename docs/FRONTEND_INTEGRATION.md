# 前端集成架構指南

## 🏗️ 推薦架構：分離式前後端

```
webhook-dev/
├── backend/                 # 重命名 app/ 為 backend/
│   ├── app/
│   ├── tests/
│   ├── docs/
│   ├── docker-compose.yml
│   └── README.backend.md
├── frontend/                # 新增前端目錄
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/       # API 調用
│   │   └── utils/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts      # 或 next.config.js
│   └── README.frontend.md
├── shared/                  # 共享型別定義
│   ├── types/
│   └── schemas/
├── deployment/              # 部署配置
│   ├── docker-compose.full.yml
│   ├── k8s/
│   └── nginx/
└── README.md               # 根目錄總覽

```

## 🎨 前端技術棧建議

### 選項 1：React + TypeScript + Ant Design（推薦）
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "antd": "^5.0.0",
    "react-router-dom": "^6.0.0",
    "react-query": "^4.0.0",
    "axios": "^1.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

### 選項 2：Next.js + TypeScript
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "@nextui-org/react": "^2.0.0",
    "swr": "^2.0.0"
  }
}
```

## 🔌 API 整合設計

### 1. API 客戶端配置
```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加認證攔截器
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('apiKey');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. TypeScript 型別定義
```typescript
// shared/types/webhook.ts
export interface Subscription {
  id: number;
  topic_id: number;
  subscriber_name: string;
  target_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: number;
  name: string;
  source_id: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EventLog {
  id: number;
  topic_id: number;
  source_ip: string;
  headers: Record<string, string>;
  content_type: string;
  payload: string;
  status: 'received' | 'queued' | 'failed_validation';
  received_at: string;
}
```

## 📊 前端功能模組

### 1. 儀表板（Dashboard）
- 系統總覽統計
- 即時事件流
- 活躍訂閱數量
- 錯誤率圖表

### 2. 訂閱管理（Subscription Management）
- 創建新訂閱
- 編輯現有訂閱
- 啟用/停用訂閱
- 訂閱測試功能

### 3. 事件監控（Event Monitoring）
- 事件歷史查詢
- 事件詳情檢視
- 失敗事件重放
- 事件過濾和搜索

### 4. 系統管理（System Management）
- Topic 管理
- Source 管理
- 用戶權限管理
- 系統配置

## 🔄 開發工作流程

### 1. 本地開發
```bash
# 啟動後端
cd backend
docker-compose up -d

# 啟動前端
cd frontend
npm run dev
```

### 2. 生產部署
```yaml
# deployment/docker-compose.full.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./deployment/nginx/nginx.conf:/etc/nginx/nginx.conf
```

## 🔐 安全考量

### 1. API 認證
- JWT Token 或 API Key
- 角色基礎權限控制（RBAC）
- CORS 配置

### 2. 前端安全
- 環境變數保護
- XSS 防護
- CSRF 防護

## 🚀 部署策略

### 選項 1：靜態網站託管
- 前端：Vercel, Netlify, GitHub Pages
- 後端：自建伺服器或雲端服務

### 選項 2：容器化部署
- Docker + Kubernetes
- 使用 Nginx 作為反向代理

### 選項 3：無伺服器部署
- 前端：Vercel Functions
- 後端：AWS Lambda + API Gateway

## 📱 響應式設計

```typescript
// 支援多種裝置
const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
};
```

## 🧪 測試策略

### 前端測試
```json
{
  "devDependencies": {
    "@testing-library/react": "^13.0.0",
    "@testing-library/jest-dom": "^5.0.0",
    "jest": "^29.0.0",
    "cypress": "^12.0.0"
  }
}
```

### E2E 測試
- 用戶登入流程
- 訂閱創建流程
- 事件監控功能
- 響應式設計測試

這種分離式架構的優點：
1. **技術獨立**：前後端可以使用不同技術棧
2. **開發並行**：前後端團隊可以並行開發
3. **部署靈活**：可以獨立部署和擴展
4. **維護性高**：職責分離清晰
5. **擴展性好**：未來容易添加手機 App
