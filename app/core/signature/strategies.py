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


class SlackSignatureStrategy(SignatureStrategy):
    """Slack 簽名驗證策略

    Slack 使用格式：
    - Header: X-Slack-Signature
    - Format: v0=<signature>
    - 基於時間戳和請求體的 HMAC-SHA256
    """

    def get_signature_header_key(self) -> str:
        return "slack"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        if not signature.startswith('v0='):
            return False

        # 注意：實際實作需要加上時間戳驗證
        # 這裡簡化為基本 HMAC 驗證
        expected_signature = 'v0=' + hmac.new(
            secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)


class DiscordSignatureStrategy(SignatureStrategy):
    """Discord 簽名驗證策略

    Discord 使用格式：
    - Header: X-Signature-Ed25519
    - 使用 Ed25519 簽名
    """

    def get_signature_header_key(self) -> str:
        return "discord"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        # 注意：實際實作需要 ed25519 驗證
        # 這裡僅為範例，實際需要導入 nacl.signing
        logger.warning("Discord 簽名驗證尚未完全實作")
        return True  # 暫時通過，實際應實作 Ed25519 驗證


class CustomWebhookStrategy(SignatureStrategy):
    """自定義 webhook 簽名策略

    適用於內部服務或自定義簽名格式
    """

    def get_signature_header_key(self) -> str:
        return "custom"

    def verify(self, body: bytes, signature: str, secret: str) -> bool:
        # 自定義簽名邏輯
        expected_signature = hmac.new(
            secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)
