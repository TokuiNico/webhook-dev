/**
 * 前端環境設定
 * 統一管理前端的環境變數和設定
 */

// 從環境變數讀取設定，如果沒有則使用預設值
export const env = {
  // API 設定 - 開發時直接連接到後端
  API_BASE_URL: import.meta.env.DEV ? 'http://localhost:8000/api/v1' : '/api/v1',

  // 認證設定
  DEFAULT_API_KEY: import.meta.env.VITE_DEFAULT_API_KEY || 'hello',

  // 開發模式設定
  IS_DEVELOPMENT: import.meta.env.DEV || false,

  // 測試模式設定
  IS_TEST: import.meta.env.VITEST || false,
}

/**
 * 取得認證相關的設定
 */
export const authConfig = {
  // 預設 API 金鑰（用於測試和開發）
  defaultApiKey: env.DEFAULT_API_KEY,

  // Token 儲存金鑰名稱
  tokenKey: 'webhook_auth_token',
  tokenExpiryKey: 'webhook_token_expiry',

  // Token 過期時間（毫秒）
  tokenExpiryTime: 24 * 60 * 60 * 1000, // 24 小時

  // Token 刷新閾值（毫秒）
  tokenRefreshThreshold: 10 * 60 * 1000, // 10 分鐘前開始刷新
}
