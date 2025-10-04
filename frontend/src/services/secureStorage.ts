// 安全儲存服務 - 提供加密的本地儲存機制
class SecureStorage {
  private readonly ENCRYPTION_KEY = 'webhook_encryption_key_v1'

  /**
   * 安全地儲存敏感資料到本地儲存
   */
  setSecureItem(key: string, value: string): void {
    try {
      const encryptedValue = this.encrypt(value)
      localStorage.setItem(key, encryptedValue)
    } catch (error) {
      console.error('安全儲存失敗:', error)
      throw new Error('無法安全儲存資料')
    }
  }

  /**
   * 從本地儲存安全地獲取資料
   */
  getSecureItem(key: string): string | null {
    try {
      const encryptedValue = localStorage.getItem(key)
      if (!encryptedValue) {
        return null
      }

      return this.decrypt(encryptedValue)
    } catch (error) {
      console.error('安全讀取失敗:', error)
      // 如果解密失敗，清除可能損壞的資料
      this.removeItem(key)
      return null
    }
  }

  /**
   * 從本地儲存移除項目
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('移除儲存項目失敗:', error)
    }
  }

  /**
   * 清除所有安全儲存的資料
   */
  clearSecureStorage(): void {
    try {
      // 只清除我們設定的安全儲存項目
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.startsWith('webhook_') && key !== this.ENCRYPTION_KEY
      )

      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.error('清除安全儲存失敗:', error)
    }
  }

  /**
   * 檢查儲存配額是否充足
   */
  checkStorageQuota(): boolean {
    try {
      // 嘗試儲存一個測試項目來檢查配額
      const testKey = 'webhook_quota_test'
      const testValue = 'test'

      this.setSecureItem(testKey, testValue)
      this.removeItem(testKey)

      return true
    } catch (error) {
      console.error('儲存配額檢查失敗:', error)
      return false
    }
  }

  /**
   * 簡單的加密函數（僅用於示範，生產環境應使用更強的加密）
   */
  private encrypt(value: string): string {
    try {
      // 使用簡單的 XOR 加密作為示範
      // 生產環境應使用 Web Crypto API 或其他強加密演算法
      const key = this.ENCRYPTION_KEY
      let result = ''

      for (let i = 0; i < value.length; i++) {
        const charCode = value.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        result += String.fromCharCode(charCode)
      }

      // 將結果轉換為 base64 以便儲存
      return btoa(result)
    } catch (error) {
      throw new Error('加密失敗')
    }
  }

  /**
   * 簡單的解密函數
   */
  private decrypt(encryptedValue: string): string {
    try {
      // 將 base64 轉換回原始字串
      const value = atob(encryptedValue)

      // 使用相同的 XOR 演算法解密
      const key = this.ENCRYPTION_KEY
      let result = ''

      for (let i = 0; i < value.length; i++) {
        const charCode = value.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        result += String.fromCharCode(charCode)
      }

      return result
    } catch (error) {
      throw new Error('解密失敗')
    }
  }
}

// 匯出單例實例
export const secureStorage = new SecureStorage()
