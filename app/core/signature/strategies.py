"""
簽名驗證策略實作
包含所有支援的 source 簽名驗證策略
"""

import logging
from .validator import SignatureStrategy
from .types import SignatureValidatorType
from app.core.security import verify_stripe_signature, verify_webhook_signature

logger = logging.getLogger(__name__)


class GitHubSignatureStrategy(SignatureStrategy):
    """GitHub 簽名驗證策略"""

    def get_signature_header_key(self) -> SignatureValidatorType:
        return SignatureValidatorType.GITHUB

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_webhook_signature(body, signature, secret)

    def get_strategy_info(self) -> dict[str, str]:
        return SignatureValidatorType.GITHUB.get_strategy_info()


class StripeSignatureStrategy(SignatureStrategy):
    """Stripe 簽名驗證策略"""

    def get_signature_header_key(self) -> SignatureValidatorType:
        return SignatureValidatorType.STRIPE

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_stripe_signature(body, signature, secret)

    def get_strategy_info(self) -> dict[str, str]:
        return SignatureValidatorType.STRIPE.get_strategy_info()


class GenericSignatureStrategy(SignatureStrategy):
    """通用簽名驗證策略（預設）"""

    def get_signature_header_key(self) -> SignatureValidatorType:
        return SignatureValidatorType.GENERIC

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_webhook_signature(body, signature, secret)

    def get_strategy_info(self) -> dict[str, str]:
        return SignatureValidatorType.GENERIC.get_strategy_info()
