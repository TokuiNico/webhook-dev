"""
測試 SignatureValidatorType 枚舉功能（簡化版）
只測試 GitHub 和 None 兩種驗證器
"""

import pytest
from app.core.signature.types import SignatureValidatorType


class TestSignatureValidatorType:
    """測試 SignatureValidatorType 枚舉"""

    def test_enum_values(self):
        """測試枚舉值是否正確"""
        assert SignatureValidatorType.NONE == "none"
        assert SignatureValidatorType.GITHUB == "github"

    def test_get_all_values(self):
        """測試獲取所有枚舉值"""
        values = SignatureValidatorType.get_all_values()
        expected = ["none", "github"]
        assert sorted(values) == sorted(expected)
        assert len(values) == 2

    def test_from_string_valid(self):
        """測試從有效字符串創建枚舉"""
        assert SignatureValidatorType.from_string("github") == SignatureValidatorType.GITHUB
        assert SignatureValidatorType.from_string("none") == SignatureValidatorType.NONE

        # 測試大寫也能正確轉換
        assert SignatureValidatorType.from_string("GITHUB") == SignatureValidatorType.GITHUB
        assert SignatureValidatorType.from_string("GitHub") == SignatureValidatorType.GITHUB

    def test_from_string_invalid(self):
        """測試從無效字符串創建枚舉，應返回 NONE"""
        assert SignatureValidatorType.from_string("unknown") == SignatureValidatorType.NONE
        assert SignatureValidatorType.from_string("") == SignatureValidatorType.NONE
        assert SignatureValidatorType.from_string("stripe") == SignatureValidatorType.NONE
        assert SignatureValidatorType.from_string("generic") == SignatureValidatorType.NONE

    def test_get_strategy_info(self):
        """測試獲取策略資訊"""
        # 測試 GitHub
        github_info = SignatureValidatorType.GITHUB.get_strategy_info()
        assert github_info["validator_type"] == "github"
        assert github_info["description"] == "GitHub webhook 簽名驗證"
        assert github_info["signature_header"] == "X-Hub-Signature-256"
        assert github_info["algorithm"] == "HMAC-SHA256"

        # 測試 None
        none_info = SignatureValidatorType.NONE.get_strategy_info()
        assert none_info["validator_type"] == "none"
        assert none_info["description"] == "無驗證 (開發測試用)"
        assert none_info["signature_header"] == "None"
        assert none_info["algorithm"] == "None"

    def test_str_enum_behavior(self):
        """測試 StrEnum 的行為"""
        # 可以直接比較字符串
        assert SignatureValidatorType.GITHUB == "github"
        assert SignatureValidatorType.NONE == "none"

        # 可以用作字符串
        validator = SignatureValidatorType.GITHUB
        assert f"validator: {validator}" == "validator: github"

        # 在字典中可以作為鍵
        mapping = {
            SignatureValidatorType.GITHUB: "GitHub strategy",
            SignatureValidatorType.NONE: "None strategy",
        }
        assert mapping[SignatureValidatorType.GITHUB] == "GitHub strategy"
        assert mapping["github"] == "GitHub strategy"  # StrEnum 特性


class TestSignatureValidatorIntegration:
    """測試 SignatureValidator 與枚舉的整合"""

    def test_validator_supports_all_enum_types(self):
        """測試驗證器支援所有枚舉類型"""
        from app.core.signature.validator import SignatureValidator

        validator = SignatureValidator()
        supported_sources = validator.get_supported_sources()

        # 確保支援所有枚舉定義的類型
        for validator_type in SignatureValidatorType:
            assert validator_type.value in supported_sources

    def test_validator_info_uses_enum(self):
        """測試驗證器資訊使用枚舉"""
        from app.core.signature.validator import SignatureValidator

        validator = SignatureValidator()
        validator_info = validator.get_validator_info()

        # 檢查是否包含枚舉定義的策略
        assert SignatureValidatorType.GITHUB.value in validator_info
        assert SignatureValidatorType.NONE.value in validator_info

        # 檢查策略資訊是否正確
        github_info = validator_info[SignatureValidatorType.GITHUB.value]
        assert github_info["validator_type"] == SignatureValidatorType.GITHUB.value
