"""
Webhook 簽名驗證模組
提供可擴展的簽名驗證策略與工具
只支援 GitHub 簽名驗證和空驗證（用於開發測試）
"""

from .validator import SignatureValidator, SignatureStrategy
from .strategies import (
    GitHubSignatureStrategy,
    NoneSignatureStrategy,
)

__all__ = [
    "SignatureValidator",
    "SignatureStrategy",
    "GitHubSignatureStrategy",
    "NoneSignatureStrategy",
]
