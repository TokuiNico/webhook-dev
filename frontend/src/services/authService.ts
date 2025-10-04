// 認證服務 - 處理 Bearer Token 驗證和會話管理
import { secureStorage } from './secureStorage'

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
  private readonly TOKEN_KEY = 'webhook_auth_token';
  private readonly TOKEN_EXPIRY_KEY = 'webhook_token_expiry';
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * 驗證 API 金鑰並獲取認證令牌
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // 驗證輸入格式
      if (!credentials.apiKey || credentials.apiKey.length < 10) {
        return {
          success: false,
          error: 'API 金鑰格式無效'
        };
      }

      // 模擬 API 呼叫（未來會替換為真實的後端 API）
      const response = await fetch('/api/v1/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: credentials.apiKey }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: '認證失敗，無效的 API 金鑰'
        };
      }

      const data = await response.json();

      // 模擬成功認證（使用從 API 返回的資料）
      const mockToken = data.token || `mock_token_${Date.now()}`;
      const expiryTime = data.expires_at || Date.now() + (24 * 60 * 60 * 1000); // 24小時後過期

      this.storeToken(mockToken, expiryTime);
      this.scheduleTokenRefresh(expiryTime);

      return {
        success: true,
        token: mockToken,
        expiresAt: expiryTime
      };
    } catch (error) {
      return {
        success: false,
        error: '認證失敗，請檢查網路連線'
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

      // 模擬刷新令牌的 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 300));

      const newToken = `refreshed_token_${Date.now()}`;
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);

      this.storeToken(newToken, expiryTime);
      this.scheduleTokenRefresh(expiryTime);

      return {
        success: true,
        token: newToken
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

    // 如果令牌即將過期（5分鐘內），嘗試刷新
    if (expiry - Date.now() < 5 * 60 * 1000) {
      this.refreshToken().catch(console.error);
    }

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
    const refreshThreshold = 10 * 60 * 1000; // 10分鐘前開始刷新

    return timeUntilExpiry < refreshThreshold;
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
      secureStorage.setSecureItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('儲存認證令牌失敗:', error);
    }
  }

  /**
   * 從安全儲存獲取認證令牌
   */
  private getStoredToken(): string | null {
    try {
      return secureStorage.getSecureItem(this.TOKEN_KEY);
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
      secureStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('移除認證令牌失敗:', error);
    }
  }

  /**
   * 從本地儲存獲取令牌過期時間
   */
  private getStoredTokenExpiry(): number | null {
    try {
      const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
      return expiry ? parseInt(expiry, 10) : null;
    } catch (error) {
      console.error('獲取令牌過期時間失敗:', error);
      return null;
    }
  }
}

// 匯出單例實例
export const authService = new AuthService();
