"""
簽名驗證器核心模組
提供簽名驗證的核心邏輯與策略管理
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Optional

from app.core.security import verify_stripe_signature, verify_webhook_signature

logger = logging.getLogger(__name__)


class SignatureStrategy(ABC):
    """簽名驗證策略基類"""

    @abstractmethod
    def get_signature_header_key(self) -> str:
        """返回該來源使用的簽名 header 鍵名"""
        pass

    @abstractmethod
    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        """驗證簽名"""
        pass


class GitHubSignatureStrategy(SignatureStrategy):
    """GitHub 簽名驗證策略"""

    def get_signature_header_key(self) -> str:
        return "github"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_webhook_signature(body, signature, secret)


class StripeSignatureStrategy(SignatureStrategy):
    """Stripe 簽名驗證策略"""

    def get_signature_header_key(self) -> str:
        return "stripe"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_stripe_signature(body, signature, secret)


class GenericSignatureStrategy(SignatureStrategy):
    """通用簽名驗證策略（預設）"""

    def get_signature_header_key(self) -> str:
        return "generic"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_webhook_signature(body, signature, secret)


class SignatureValidator:
    """簽名驗證器，支援可擴展的簽名驗證策略"""

    def __init__(self):
        # 註冊核心策略
        self._strategies: Dict[str, SignatureStrategy] = {
            "github": GitHubSignatureStrategy(),
            "stripe": StripeSignatureStrategy(),
        }
        # 預設策略
        self._default_strategy = GenericSignatureStrategy()

    def register_strategy(self, source_name: str, strategy: SignatureStrategy) -> None:
        """註冊新的簽名驗證策略

        Args:
            source_name: 來源名稱（會轉為小寫）
            strategy: 簽名驗證策略實例
        """
        self._strategies[source_name.lower()] = strategy
        logger.info(f"✅ 註冊簽名驗證策略: {source_name}")

    def get_supported_sources(self) -> list[str]:
        """獲取所有支援的來源列表"""
        return list(self._strategies.keys())

    def validate_signature(
        self,
        source_name: str,
        body: bytes,
        signature_headers: Dict[str, Optional[str]],
        secret: str,
    ) -> bool:
        """
        根據來源類型驗證簽名

        Args:
            source_name: 來源名稱
            body: 請求體
            signature_headers: 簽名頭字典
            secret: 來源密鑰

        Returns:
            bool: 簽名是否有效
        """
        source_lower = source_name.lower()

        # 選擇策略
        strategy = self._strategies.get(source_lower, self._default_strategy)

        # 獲取對應的簽名 header
        header_key = strategy.get_signature_header_key()
        signature = signature_headers.get(header_key)

        if not signature:
            logger.warning(f"❌ 缺少簽名 header: {header_key} for source: {source_name}")
            return False

        # 執行驗證
        try:
            result = strategy.verify(body, signature, secret)
            if result:
                logger.debug(f"✅ 簽名驗證成功: {source_name}")
            else:
                logger.warning(f"❌ 簽名驗證失敗: {source_name}")
            return result
        except Exception as e:
            logger.error(f"❌ 簽名驗證異常 {source_name}: {e}")
            return False
