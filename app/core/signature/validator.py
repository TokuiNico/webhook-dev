"""
簽名驗證器核心模組
提供簽名驗證的核心邏輯與策略管理
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict
from .types import SignatureValidatorType


logger = logging.getLogger(__name__)


class SignatureStrategy(ABC):
    """簽名驗證策略基類"""

    @abstractmethod
    def get_signature_header_key(self) -> SignatureValidatorType:
        """返回該來源使用的簽名 header 鍵名"""
        pass

    @abstractmethod
    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        """驗證簽名"""
        pass

    def get_strategy_info(self) -> Dict[str, str]:
        """返回策略的詳細資訊，子類可以覆寫此方法提供更多資訊"""
        return {
            "validator_type": self.get_signature_header_key(),
            "description": f"{self.get_signature_header_key()} 簽名驗證",
            "signature_header": f"X-{self.get_signature_header_key().title()}-Signature",
        }


class SignatureValidator:
    """簽名驗證器，支援可擴展的簽名驗證策略"""

    def __init__(self):
        # 延遲載入策略，避免循環引用
        from .strategies import (
            GitHubSignatureStrategy,
            StripeSignatureStrategy,
            GenericSignatureStrategy,
        )
        from .types import SignatureValidatorType

        # 註冊核心策略
        self._strategies: Dict[SignatureValidatorType, SignatureStrategy] = {
            SignatureValidatorType.GITHUB: GitHubSignatureStrategy(),
            SignatureValidatorType.STRIPE: StripeSignatureStrategy(),
            SignatureValidatorType.GENERIC: GenericSignatureStrategy(),
        }
        # 預設策略
        self._default_validator_type = SignatureValidatorType.GENERIC

    def register_strategy(self, source_name: str, strategy: SignatureStrategy) -> None:
        """註冊新的簽名驗證策略

        Args:
            source_name: 來源名稱（會轉為小寫）
            strategy: 簽名驗證策略實例
        """
        self._strategies[SignatureValidatorType(source_name.lower())] = strategy
        logger.info(f"✅ 註冊簽名驗證策略: {source_name}")

    def get_supported_sources(self) -> list[str]:
        """獲取所有支援的來源列表"""
        return list(self._strategies.keys())

    def get_validator_info(self) -> Dict[str, Dict[str, str]]:
        """獲取所有驗證器的詳細資訊"""
        validator_info = {}
        for source_name, strategy in self._strategies.items():
            validator_info[source_name] = strategy.get_strategy_info()
        return validator_info

    def validate_signature(
        self,
        validator_type: SignatureValidatorType,
        body: bytes,
        headers: Dict[str, str],
        secret: str,
    ) -> bool:
        """
        根據來源類型驗證簽名

        Args:
            validator_type: 驗證類型
            body: 請求體
            headers: Request Header
            secret: 來源密鑰

        Returns:
            bool: 簽名是否有效
        """

        # 選擇策略
        strategy = self._strategies.get(
            validator_type, self._strategies[self._default_validator_type]
        )

        # 獲取對應的簽名 header
        header_key = strategy.get_signature_header_key()
        signature = headers.get(header_key)

        if not signature:
            logger.warning(
                f"❌ 缺少簽名 header: {header_key} for source: {validator_type}"
            )
            return False

        # 執行驗證
        try:
            result = strategy.verify(body, signature, secret)
            if result:
                logger.debug(f"✅ 簽名驗證成功: {validator_type}")
            else:
                logger.warning(f"❌ 簽名驗證失敗: {validator_type}")
            return result
        except Exception as e:
            logger.error(f"❌ 簽名驗證異常 {validator_type}: {e}")
            return False
