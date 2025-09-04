"""
認證驗證器核心模組
提供認證驗證的核心邏輯與策略管理
"""

import logging
from typing import Dict, Any
from .base import AuthenticationStrategy, AuthenticationResult
from .types import AuthenticationType

logger = logging.getLogger(__name__)


class AuthenticationValidator:
    """認證驗證器，支援可擴展的認證策略"""

    def __init__(self):
        # 延遲載入策略，避免循環引用
        from .strategies import (
            SignatureAuthStrategy,
            NoneAuthStrategy,
        )

        # 註冊核心策略
        self._strategies: Dict[str, AuthenticationStrategy] = {
            AuthenticationType.SIGNATURE.value: SignatureAuthStrategy(),
            AuthenticationType.NONE.value: NoneAuthStrategy(),
        }
        # 預設策略
        self._default_auth_type = AuthenticationType.NONE.value

    def register_strategy(
        self, auth_type: str, strategy: AuthenticationStrategy
    ) -> None:
        """註冊新的認證策略

        Args:
            auth_type: 認證類型名稱（會轉為小寫）
            strategy: 認證策略實例
        """
        self._strategies[auth_type.lower()] = strategy
        logger.info(f"✅ 註冊認證策略: {auth_type}")

    def get_supported_types(self) -> list[str]:
        """獲取所有支援的認證類型列表"""
        return list(self._strategies.keys())

    def get_validator_info(self) -> Dict[str, Dict[str, Any]]:
        """獲取所有驗證器的詳細資訊"""
        validator_info = {}
        for auth_type, strategy in self._strategies.items():
            validator_info[auth_type] = strategy.get_strategy_info()
        return validator_info

    def validate(
        self,
        auth_type: str,
        body: bytes,
        headers: Dict[str, str],
        source_ip: str,
        config: Dict[str, Any],
    ) -> AuthenticationResult:
        """
        根據認證類型執行驗證

        Args:
            auth_type: 認證類型
            body: 請求體
            headers: 請求 headers
            source_ip: 來源 IP
            config: 認證配置

        Returns:
            AuthenticationResult: 認證結果
        """
        # 對於 none 策略或未知策略（預設為 none），直接返回成功
        if auth_type == "none" or auth_type not in self._strategies:
            if auth_type != "none":
                logger.warning(f"⚠️ 未知認證類型: {auth_type}，使用無驗證策略")
            return AuthenticationResult(
                success=True, auth_type=AuthenticationType.NONE, message="無驗證策略"
            )

        # 選擇策略
        strategy = self._strategies[auth_type]
        auth_type_enum = AuthenticationType.from_string(auth_type)

        try:
            # 執行驗證
            success = strategy.validate(body, headers, source_ip, config)

            message = f"{auth_type} 驗證{'成功' if success else '失敗'}"
            if success:
                logger.debug(f"✅ {message}")
            else:
                logger.warning(f"❌ {message}")

            return AuthenticationResult(
                success=success,
                auth_type=auth_type_enum,
                message=message,
                details={"strategy": auth_type, "config_provided": bool(config)},
            )

        except Exception as e:
            error_msg = f"{auth_type} 驗證異常: {e}"
            logger.error(f"❌ {error_msg}")
            return AuthenticationResult(
                success=False,
                auth_type=auth_type_enum,
                message=error_msg,
                details={"error": str(e), "strategy": auth_type},
            )
