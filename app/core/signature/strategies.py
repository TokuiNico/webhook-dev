"""
簽名驗證策略實作
包含所有支援的 source 簽名驗證策略
"""

import hmac
import hashlib
import logging
from .validator import SignatureStrategy
from app.core.security import verify_stripe_signature, verify_webhook_signature

logger = logging.getLogger(__name__)


class GitHubSignatureStrategy(SignatureStrategy):
    """GitHub 簽名驗證策略"""

    def get_signature_header_key(self) -> str:
        return "github"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_webhook_signature(body, signature, secret)

    def get_strategy_info(self) -> dict[str, str]:
        return {
            "source_type": "github",
            "description": "GitHub webhook 簽名驗證",
            "signature_header": "X-Hub-Signature-256",
            "format": "sha256=<hmac_signature>",
            "algorithm": "HMAC-SHA256"
        }


class StripeSignatureStrategy(SignatureStrategy):
    """Stripe 簽名驗證策略"""

    def get_signature_header_key(self) -> str:
        return "stripe"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_stripe_signature(body, signature, secret)

    def get_strategy_info(self) -> dict[str, str]:
        return {
            "source_type": "stripe",
            "description": "Stripe webhook 簽名驗證",
            "signature_header": "Stripe-Signature",
            "format": "t=<timestamp>,v1=<signature>",
            "algorithm": "HMAC-SHA256 with timestamp"
        }


class GenericSignatureStrategy(SignatureStrategy):
    """通用簽名驗證策略（預設）"""

    def get_signature_header_key(self) -> str:
        return "generic"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        return verify_webhook_signature(body, signature, secret)

    def get_strategy_info(self) -> dict[str, str]:
        return {
            "source_type": "generic",
            "description": "通用 HMAC-SHA256 簽名驗證",
            "signature_header": "X-Webhook-Signature",
            "format": "<hmac_signature>",
            "algorithm": "HMAC-SHA256"
        }
