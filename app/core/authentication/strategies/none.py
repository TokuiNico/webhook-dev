"""
無驗證策略實作
用於開發環境或不需要驗證的場景
"""

from typing import Dict, Any
from ..base import AuthenticationStrategy
from ..types import AuthenticationType


class NoneAuthStrategy(AuthenticationStrategy):
    """無驗證策略 - 不做任何驗證，用於開發環境測試"""

    def get_auth_type(self) -> AuthenticationType:
        return AuthenticationType.NONE

    def validate(
        self,
        body: bytes,
        headers: Dict[str, str],
        source_ip: str,
        config: Dict[str, Any],
    ) -> bool:
        """
        無驗證策略 - 總是返回 True

        Args:
            body: 請求體 (不使用)
            headers: 請求 headers (不使用)
            source_ip: 來源 IP (不使用)
            config: 配置 (不使用)

        Returns:
            bool: 總是返回 True
        """
        self.logger.debug("使用無驗證策略，跳過所有驗證")
        return True

    def get_required_config(self) -> list[str]:
        """無驗證策略不需要任何配置"""
        return []

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """無驗證策略的配置總是有效"""
        return True

    def get_strategy_info(self) -> Dict[str, Any]:
        """返回策略詳細資訊"""
        info = super().get_strategy_info()
        info.update(
            {
                "warning": "此策略不提供任何安全保護，僅用於開發環境",
                "use_cases": ["本地開發", "測試環境", "內部網路"],
                "security_risk": "高風險 - 不建議在生產環境使用",
            }
        )
        return info
