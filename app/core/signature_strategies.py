"""
擴展簽名驗證策略
在這裡定義新的 source 簽名驗證策略
"""

import hmac
import hashlib
import logging
from .validator import SignatureStrategy

logger = logging.getLogger(__name__)


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
