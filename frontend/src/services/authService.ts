// 認證服務 - 處理 Bearer Token 驗證和會話管理
import { secureStorage } from './secureStorage'
import { authConfig } from '../config/env'

export interface AuthCredentials {
  apiKey: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  expiresAt?: number;
  error?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  token?: string;
  error?: string;
}

class AuthService {
  private refreshTimer: number | null = null;
  private lastAuthCall: number = 0;
  private readonly AUTH_THROTTLE_MS = 1000; // 1秒內不允許重複認證

  /**
   * 驗證 API 金鑰並獲取認證令牌
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    // 防抖檢查：防止短時間內重複認證請求
    const now = Date.now();
    if (now - this.lastAuthCall < this.AUTH_THROTTLE_MS) {
      console.log('Auth call throttled, too frequent');
      return {
        success: false,
        error: '請求過於頻繁，請稍候再試'
      };
    }
    this.lastAuthCall = now;

    try {
      // 驗證輸入格式 (臨時移除長度驗證以進行測試)
      if (!credentials.apiKey) {
        return {
          success: false,
          error: 'API 金鑰不能為空'
        };
      }

      // 檢查是否已經有相同的 token 在使用，避免重複認證
      const currentToken = this.getCurrentToken();
      if (currentToken === credentials.apiKey) {
        const expiry = this.getStoredTokenExpiry();
        if (expiry && Date.now() < expiry) {
          console.log('Using existing valid token');
          return {
            success: true,
            token: currentToken,
            expiresAt: expiry
          };
        }
      }

      // 發送測試請求到後端驗證端點 - 開發模式直接連接後端
      console.log('Authenticating with API key:', credentials.apiKey.substring(0, 10) + '...');
      const baseUrl = import.meta.env.DEV ? 'http://localhost:8000' : '';
      const response = await fetch(`${baseUrl}/api/v1/manage/auth-validators/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Auth response status:', response.status);

      if (response.ok) {
        // 驗證成功，使用 API key 作為 token (無過期時間，因為是靜態 key)
        const token = credentials.apiKey;
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 假設 30 天過期

        this.storeToken(token, expiryTime);
        this.scheduleTokenRefresh(expiryTime);

        return {
          success: true,
          token: token,
          expiresAt: expiryTime
        };
      } else if (response.status === 401) {
        return {
          success: false,
          error: '認證失敗，無效的 API 金鑰'
        };
      } else {
        // 其他錯誤，如 500 或網路問題
        return {
          success: false,
          error: '伺服器錯誤，請檢查後端服務'
        };
      }
    } catch (error) {
      console.error('認證請求失敗:', error);
      return {
        success: false,
        error: '網路連線錯誤，請檢查後端服務是否運行'
      };
    }
  }

  /**
   * 刷新認證令牌
   */
  async refreshToken(): Promise<TokenRefreshResult> {
    try {
      const currentToken = this.getStoredToken();
      if (!currentToken) {
        return {
          success: false,
          error: '沒有有效的認證令牌'
        };
      }

      // 由於使用靜態 API key，刷新只需要更新過期時間
      const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 重新設定 30 天過期
      this.storeToken(currentToken, expiryTime);
      this.scheduleTokenRefresh(expiryTime);

      return {
        success: true,
        token: currentToken
      };
    } catch (error) {
      return {
        success: false,
        error: '令牌刷新失敗'
      };
    }
  }

  /**
   * 登出並清除認證資訊
   */
  logout(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.removeStoredToken();
    secureStorage.clearSecureStorage();
  }

  /**
   * 檢查當前認證狀態
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const expiry = this.getStoredTokenExpiry();

    if (!token || !expiry) {
      return false;
    }

    // 檢查是否需要刷新令牌，但不直接在這裡刷新
    // 讓外部呼叫者決定何時刷新
    return Date.now() < expiry;
  }

  /**
   * 獲取當前認證令牌
   */
  getCurrentToken(): string | null {
    return this.getStoredToken();
  }

  /**
   * 獲取當前用戶資訊（如果適用）
   */
  getCurrentUser(): any {
    // TODO: 從令牌中解析用戶資訊
    return null;
  }

  /**
   * 檢查是否需要刷新令牌（剩餘時間少於閾值）
   */
  shouldRefreshToken(): boolean {
    const expiry = this.getStoredTokenExpiry();
    if (!expiry) return false;

    const timeUntilExpiry = expiry - Date.now();
    return timeUntilExpiry < authConfig.tokenRefreshThreshold;
  }

  /**
   * 排程令牌自動刷新
   */
  private scheduleTokenRefresh(expiryTime: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // 在令牌過期前5分鐘進行刷新
    const refreshTime = expiryTime - (5 * 60 * 1000) - Date.now();

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().catch(console.error);
      }, refreshTime);
    }
  }

  /**
   * 儲存認證令牌到安全儲存
   */
  private storeToken(token: string, expiryTime: number): void {
    try {
      secureStorage.setSecureItem(authConfig.tokenKey, token);
      localStorage.setItem(authConfig.tokenExpiryKey, expiryTime.toString());
    } catch (error) {
      console.error('儲存認證令牌失敗:', error);
    }
  }

  /**
   * 從安全儲存獲取認證令牌
   */
  private getStoredToken(): string | null {
    try {
      return secureStorage.getSecureItem(authConfig.tokenKey);
    } catch (error) {
      console.error('獲取認證令牌失敗:', error);
      return null;
    }
  }

  /**
   * 移除儲存的認證令牌
   */
  private removeStoredToken(): void {
    try {
      secureStorage.removeItem(authConfig.tokenKey);
      localStorage.removeItem(authConfig.tokenExpiryKey);
    } catch (error) {
      console.error('移除認證令牌失敗:', error);
    }
  }

  /**
   * 從本地儲存獲取令牌過期時間
   */
  private getStoredTokenExpiry(): number | null {
    try {
      const expiry = localStorage.getItem(authConfig.tokenExpiryKey);
      return expiry ? parseInt(expiry, 10) : null;
    } catch (error) {
      console.error('獲取令牌過期時間失敗:', error);
      return null;
    }
  }
}

// 匯出單例實例
export const authService = new AuthService();
