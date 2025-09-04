"""
簽名驗證策略實作
只支援 GitHub 簽名驗證和空驗證（用於開發測試）
"""

import logging
from .validator import SignatureStrategy
from .types import SignatureValidatorType
from app.core.security import verify_webhook_signature

logger = logging.getLogger(__name__)


class GitHubSignatureStrategy(SignatureStrategy):
    """GitHub 簽名驗證策略"""

    def get_signature_header_key(self) -> str:
        return "X-Hub-Signature-256"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_webhook_signature(body, signature, secret)

    def get_strategy_info(self) -> dict[str, str]:
        return SignatureValidatorType.GITHUB.get_strategy_info()


class NoneSignatureStrategy(SignatureStrategy):
    """無驗證策略 - 不做任何驗證，用於開發環境測試"""

    def get_signature_header_key(self) -> str:
        return "X-No-Signature"  # 實際上不會使用此 header

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        # 總是返回 True，不做任何驗證
        logger.debug("使用無驗證策略，跳過簽名驗證")
        return True

    def get_strategy_info(self) -> dict[str, str]:
        return SignatureValidatorType.NONE.get_strategy_info()
