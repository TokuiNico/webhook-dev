"""
簽名驗證策略實作
支援 GitHub, Stripe, 通用 HMAC 等多種簽名格式
"""

import hmac
import hashlib
from typing import Dict, Any
from ..base import AuthenticationStrategy
from ..types import AuthenticationType, SIGNATURE_FORMATS


class SignatureAuthStrategy(AuthenticationStrategy):
    """HMAC 簽名驗證策略"""

    def get_auth_type(self) -> AuthenticationType:
        return AuthenticationType.SIGNATURE

    def validate(
        self,
        body: bytes,
        headers: Dict[str, str],
        source_ip: str,
        config: Dict[str, Any],
    ) -> bool:
        """
        驗證 HMAC 簽名

        Args:
            body: 請求體
            headers: 請求 headers
            source_ip: 來源 IP (此策略不使用)
            config: 包含 secret, format_type, header_key 等配置

        Returns:
            bool: 簽名是否有效
        """
        if not self.validate_config(config):
            return False

        secret = config.get("secret", "")
        format_type = config.get("format_type", "generic")
        algorithm = config.get("algorithm", "sha256")

        # 獲取簽名格式配置
        format_config = SIGNATURE_FORMATS.get(format_type, SIGNATURE_FORMATS["generic"])
        header_key = config.get("header_key", format_config["header_key"])

        # 從 headers 中獲取簽名
        signature = self._get_signature_from_headers(headers, header_key)
        if not signature:
            self.logger.warning(f"❌ 缺少簽名 header: {header_key}")
            return False

        # 根據格式類型進行驗證
        try:
            if format_type == "stripe":
                return self._verify_stripe_signature(body, signature, secret)
            else:
                return self._verify_generic_signature(
                    body, signature, secret, algorithm, format_config
                )
        except Exception as e:
            self.logger.error(f"❌ 簽名驗證異常: {e}")
            return False

    def _get_signature_from_headers(
        self, headers: Dict[str, str], header_key: str
    ) -> str:
        """從 headers 中獲取簽名，支援大小寫不敏感查找"""
        # 標準化 headers 為小寫鍵
        normalized_headers = {k.lower(): v for k, v in headers.items()}
        return normalized_headers.get(header_key.lower(), "")

    def _verify_generic_signature(
        self,
        body: bytes,
        signature: str,
        secret: str,
        algorithm: str,
        format_config: Dict[str, Any],
    ) -> bool:
        """驗證通用 HMAC 簽名（GitHub 格式等）"""
        # 創建預期簽名
        expected_signature = hmac.new(
            secret.encode("utf-8"), body, getattr(hashlib, algorithm)
        ).hexdigest()

        # 處理不同的簽名格式
        prefix = format_config.get("prefix")
        if prefix and signature.startswith(prefix):
            provided_signature = signature[len(prefix) :]
        else:
            provided_signature = signature

        # 使用常數時間比較防止時序攻擊
        return hmac.compare_digest(expected_signature, provided_signature)

    def _verify_stripe_signature(
        self, body: bytes, signature: str, secret: str
    ) -> bool:
        """驗證 Stripe 簽名格式"""
        # Stripe 簽名格式: t=timestamp,v1=signature[,v0=old_signature]
        elements = {}
        for element in signature.split(","):
            key, value = element.split("=", 1)
            elements[key] = value

        if "t" not in elements or "v1" not in elements:
            self.logger.warning("❌ Stripe 簽名格式無效")
            return False

        timestamp = elements["t"]
        signature_hash = elements["v1"]

        # 創建待簽名字串
        payload = f"{timestamp}.{body.decode('utf-8')}"

        # 計算預期簽名
        expected_signature = hmac.new(
            secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature_hash)

    def get_required_config(self) -> list[str]:
        """返回必要的配置項"""
        return ["secret"]

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """驗證簽名策略配置"""
        if not super().validate_config(config):
            return False

        # 檢查算法是否支援
        algorithm = config.get("algorithm", "sha256")
        if not hasattr(hashlib, algorithm):
            self.logger.error(f"❌ 不支援的雜湊算法: {algorithm}")
            return False

        # 檢查格式類型是否支援
        format_type = config.get("format_type", "generic")
        if format_type not in SIGNATURE_FORMATS:
            self.logger.error(f"❌ 不支援的簽名格式: {format_type}")
            return False

        return True
