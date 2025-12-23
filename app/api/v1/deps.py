"""
API 依賴項
統一管理所有 API 端點的共用依賴項，避免重複代碼
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_db
from app.core.config import settings

# HTTP Bearer Security
security = HTTPBearer()


def get_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    驗證管理 API 金鑰

    Args:
        credentials: HTTP Bearer 認證憑證

    Returns:
        str: 驗證通過的 API 金鑰

    Raises:
        HTTPException: 當 API 金鑰無效或未配置時
    """
    expected_key = settings.API_KEY

    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"expected_key: {expected_key}")
    logger.info(f"credentials.credentials: {credentials.credentials}")

    # 檢查 API 金鑰是否已配置
    if not settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="管理 API 金鑰尚未配置，請檢查環境變數 API_KEY",
        )

    # 驗證 API 金鑰
    if credentials.credentials != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無效的 API 金鑰",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return credentials.credentials


def get_current_user_id() -> str:
    """
    獲取當前用戶 ID (未來可擴展為真實的用戶認證)

    Returns:
        str: 用戶 ID
    """
    # 未來可以從 JWT token 中解析用戶信息
    return "system"


# 組合依賴項，用於需要數據庫和認證的端點
async def get_authenticated_db(
    db: AsyncSession = Depends(get_async_db), api_key: str = Depends(get_api_key)
) -> AsyncSession:
    """
    獲取已認證的數據庫會話
    組合依賴項，同時進行 API 金鑰驗證和數據庫會話獲取

    Args:
        db: 數據庫會話
        api_key: 驗證通過的 API 金鑰

    Returns:
        AsyncSession: 數據庫會話
    """
    return db
