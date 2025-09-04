"""
簽名驗證器類型定義
只支援 GitHub 簽名驗證和空驗證（用於開發測試）
"""

from enum import StrEnum, auto


class SignatureValidatorType(StrEnum):
    """
    簽名驗證器類型枚舉
    使用 StrEnum 確保值可以直接用作字符串
    """

    NONE = "none"  # 不做任何驗證，用於開發環境測試
    GITHUB = "github"  # GitHub webhook 簽名驗證

    def get_strategy_info(self) -> dict[str, str]:
        """獲取策略資訊"""
        info_map = {
            self.NONE: {
                "validator_type": self.NONE.value,
                "description": "無驗證 (開發測試用)",
                "signature_header": "None",
                "format": "不需要簽名",
                "algorithm": "None",
            },
            self.GITHUB: {
                "validator_type": self.GITHUB.value,
                "description": "GitHub webhook 簽名驗證",
                "signature_header": "X-Hub-Signature-256",
                "format": "sha256=<hmac_signature>",
                "algorithm": "HMAC-SHA256",
            },
        }
        return info_map.get(self, info_map[self.NONE])

    @classmethod
    def get_all_values(cls) -> list[str]:
        """獲取所有枚舉值的列表"""
        return [validator.value for validator in cls]

    @classmethod
    def from_string(cls, value: str) -> "SignatureValidatorType":
        """從字符串創建枚舉值，不存在時返回 NONE"""
        try:
            return cls(value.lower())
        except ValueError:
            return cls.NONE
