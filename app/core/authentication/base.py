"""
認證策略基礎抽象類別
定義所有認證策略必須實現的介面
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from .types import AuthenticationType

logger = logging.getLogger(__name__)


class AuthenticationStrategy(ABC):
    """認證策略基類"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化認證策略

        Args:
            config: 策略特定的配置
        """
        self.config = config or {}
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    @abstractmethod
    def get_auth_type(self) -> AuthenticationType:
        """返回認證類型"""
        pass

    @abstractmethod
    def validate(
        self,
        body: bytes,
        headers: Dict[str, str],
        source_ip: str,
        config: Dict[str, Any],
    ) -> bool:
        """
        執行認證驗證

        Args:
            body: 請求體
            headers: 請求 headers
            source_ip: 來源 IP 地址
            config: 策略特定配置

        Returns:
            bool: 驗證是否成功
        """
        pass

    def get_strategy_info(self) -> Dict[str, Any]:
        """返回策略的詳細資訊，子類可以覆寫此方法提供更多資訊"""
        auth_type = self.get_auth_type()
        return auth_type.get_strategy_info()

    def get_required_headers(self) -> list[str]:
        """返回此策略需要的 headers"""
        return self.get_strategy_info().get("required_headers", [])

    def get_required_config(self) -> list[str]:
        """返回此策略需要的配置項"""
        return self.get_strategy_info().get("required_config", [])

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """
        驗證配置是否有效

        Args:
            config: 配置字典

        Returns:
            bool: 配置是否有效
        """
        required_config = self.get_required_config()
        for key in required_config:
            if key not in config:
                self.logger.error(f"❌ 缺少必要配置項: {key}")
                return False
        return True

    def log_validation_result(self, success: bool, context: str = ""):
        """記錄驗證結果"""
        auth_type = self.get_auth_type().value
        if success:
            self.logger.debug(f"✅ {auth_type} 驗證成功 {context}")
        else:
            self.logger.warning(f"❌ {auth_type} 驗證失敗 {context}")


class AuthenticationResult:
    """認證結果類別"""

    def __init__(
        self,
        success: bool,
        auth_type: AuthenticationType,
        message: str = "",
        details: Optional[Dict[str, Any]] = None
    ):
        self.success = success
        self.auth_type = auth_type
        self.message = message
        self.details = details or {}

    def __bool__(self) -> bool:
        """支援直接使用 bool() 檢查結果"""
        return self.success

    def __str__(self) -> str:
        status = "成功" if self.success else "失敗"
        return f"{self.auth_type.value} 驗證{status}: {self.message}"
