"""
認證類型定義和配置模型
支援簽名驗證和無驗證兩種方式
"""

from enum import StrEnum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class AuthenticationType(StrEnum):
    """
    認證類型枚舉
    使用 StrEnum 確保值可以直接用作字符串
    """

    NONE = "none"  # 不做任何驗證，用於開發環境測試
    SIGNATURE = "signature"  # HMAC 簽名驗證 (支援 GitHub, Stripe 等格式)

    def get_strategy_info(self) -> Dict[str, Any]:
        """獲取策略資訊"""
        info_map = {
            self.NONE: {
                "auth_type": self.NONE.value,
                "description": "無驗證 (開發測試用)",
                "required_headers": [],
                "required_config": [],
                "security_level": "none",
            },
            self.SIGNATURE: {
                "auth_type": self.SIGNATURE.value,
                "description": "HMAC 簽名驗證",
                "required_headers": ["signature_header"],
                "required_config": ["secret"],
                "security_level": "high",
                "supported_formats": ["github", "stripe", "generic"],
            },
        }
        return info_map.get(self, info_map[self.NONE])

    @classmethod
    def get_all_values(cls) -> List[str]:
        """獲取所有枚舉值的列表"""
        return [auth_type.value for auth_type in cls]

    @classmethod
    def from_string(cls, value: str) -> "AuthenticationType":
        """從字符串創建枚舉值，不存在時返回 NONE"""
        try:
            return cls(value.lower())
        except ValueError:
            return cls.NONE


class SignatureConfig(BaseModel):
    """簽名驗證配置"""
    secret: str = Field(..., description="HMAC 密鑰")
    algorithm: str = Field(default="sha256", description="雜湊算法")
    header_key: str = Field(default="X-Webhook-Signature", description="簽名 header 鍵")
    format_type: str = Field(default="generic", description="簽名格式 (github/stripe/generic)")


class AuthenticationConfig(BaseModel):
    """通用認證配置模型"""
    auth_type: AuthenticationType = Field(..., description="認證類型")

    # 簽名驗證配置
    signature_config: Optional[SignatureConfig] = None

    def get_active_config(self) -> Optional[BaseModel]:
        """根據認證類型獲取對應的配置"""
        if self.auth_type == AuthenticationType.SIGNATURE:
            return self.signature_config
        return None


# 預定義的簽名格式配置
SIGNATURE_FORMATS = {
    "github": {
        "header_key": "X-Hub-Signature-256",
        "format_pattern": r"^sha256=([a-f0-9]{64})$",
        "prefix": "sha256=",
    },
    "stripe": {
        "header_key": "Stripe-Signature",
        "format_pattern": r"^t=\d+,v1=([a-f0-9]{64})(?:,v0=([a-f0-9]{64}))?$",
        "prefix": None,  # 特殊處理
    },
    "generic": {
        "header_key": "X-Webhook-Signature",
        "format_pattern": r"^([a-f0-9]{64})$",
        "prefix": None,
    },
}
