"""
簽名驗證器類型定義
包含所有支援的簽名驗證器類型枚舉
"""

from enum import StrEnum, auto


class SignatureValidatorType(StrEnum):
    """
    簽名驗證器類型枚舉
    使用 StrEnum 確保值可以直接用作字符串
    """

    GENERIC = auto()
    GITHUB = auto()
    STRIPE = auto()

    def get_strategy_info(self) -> dict[str, str]:
        """獲取策略資訊"""
        info_map = {
            self.GENERIC: {
                "source_type": self.GENERIC.value,
                "description": "通用 HMAC-SHA256 簽名驗證",
                "signature_header": "X-Webhook-Signature",
                "format": "<hmac_signature>",
                "algorithm": "HMAC-SHA256",
            },
            self.GITHUB: {
                "source_type": self.GITHUB.value,
                "description": "GitHub webhook 簽名驗證",
                "signature_header": "X-Hub-Signature-256",
                "format": "sha256=<hmac_signature>",
                "algorithm": "HMAC-SHA256",
            },
            self.STRIPE: {
                "source_type": self.STRIPE.value,
                "description": "Stripe webhook 簽名驗證",
                "signature_header": "Stripe-Signature",
                "format": "t=<timestamp>,v1=<signature>",
                "algorithm": "HMAC-SHA256 with timestamp",
            },
        }
        return info_map.get(self, info_map[self.GENERIC])

    @classmethod
    def get_all_values(cls) -> list[str]:
        """獲取所有枚舉值的列表"""
        return [validator.value for validator in cls]

    @classmethod
    def from_string(cls, value: str) -> "SignatureValidatorType":
        """從字符串創建枚舉值，不存在時返回 GENERIC"""
        try:
            return cls(value.lower())
        except ValueError:
            return cls.GENERIC
