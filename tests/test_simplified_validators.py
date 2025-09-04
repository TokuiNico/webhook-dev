"""
測試簡化後的簽名驗證器
只測試 GitHub 和 None 兩種驗證器
"""

import pytest
from unittest.mock import patch

from app.core.signature.validator import SignatureValidator
from app.core.signature.strategies import GitHubSignatureStrategy, NoneSignatureStrategy
from app.core.signature.types import SignatureValidatorType


class TestSimplifiedSignatureValidator:
    """測試簡化後的簽名驗證器"""

    @pytest.fixture
    def validator(self):
        """創建驗證器實例"""
        return SignatureValidator()

    def test_validator_initialization(self, validator):
        """測試驗證器初始化"""
        # 檢查只有兩個策略
        assert len(validator._strategies) == 2
        assert "github" in validator._strategies
        assert "none" in validator._strategies

        # 檢查預設策略是 none
        assert validator._default_validator_type == "none"

    def test_supported_sources(self, validator):
        """測試支援的來源列表"""
        sources = validator.get_supported_sources()
        assert len(sources) == 2
        assert "github" in sources
        assert "none" in sources

    def test_validator_info(self, validator):
        """測試驗證器資訊"""
        info = validator.get_validator_info()

        # 檢查 GitHub 驗證器資訊
        github_info = info["github"]
        assert github_info["validator_type"] == "github"
        assert github_info["description"] == "GitHub webhook 簽名驗證"
        assert github_info["signature_header"] == "X-Hub-Signature-256"
        assert github_info["algorithm"] == "HMAC-SHA256"

        # 檢查 None 驗證器資訊
        none_info = info["none"]
        assert none_info["validator_type"] == "none"
        assert none_info["description"] == "無驗證 (開發測試用)"
        assert none_info["signature_header"] == "None"
        assert none_info["algorithm"] == "None"

    def test_none_validation_always_true(self, validator):
        """測試無驗證策略總是返回 True"""
        # 任何參數組合都應該返回 True
        assert validator.validate_signature(
            validator_type="none",
            body=b"any content",
            headers={},
            secret="any secret"
        )

        assert validator.validate_signature(
            validator_type="none",
            body=b"",
            headers={"some": "header"},
            secret=""
        )

    @patch('app.core.signature.strategies.verify_webhook_signature')
    def test_github_validation_with_valid_signature(self, mock_verify, validator):
        """測試 GitHub 驗證策略使用有效簽名"""
        mock_verify.return_value = True

        result = validator.validate_signature(
            validator_type="github",
            body=b'{"test": "payload"}',
            headers={"X-Hub-Signature-256": "sha256=valid_signature"},
            secret="test_secret"
        )

        assert result is True
        mock_verify.assert_called_once_with(
            b'{"test": "payload"}',
            "sha256=valid_signature",
            "test_secret"
        )

    @patch('app.core.security.verify_webhook_signature')
    def test_github_validation_with_invalid_signature(self, mock_verify, validator):
        """測試 GitHub 驗證策略使用無效簽名"""
        mock_verify.return_value = False

        result = validator.validate_signature(
            validator_type="github",
            body=b'{"test": "payload"}',
            headers={"X-Hub-Signature-256": "sha256=invalid_signature"},
            secret="test_secret"
        )

        assert result is False

    def test_github_validation_missing_header(self, validator):
        """測試 GitHub 驗證策略缺少必要的 header"""
        result = validator.validate_signature(
            validator_type="github",
            body=b'{"test": "payload"}',
            headers={},  # 缺少 X-Hub-Signature-256
            secret="test_secret"
        )

        assert result is False

    def test_unknown_validator_type_defaults_to_none(self, validator):
        """測試未知的驗證器類型預設使用 none 策略"""
        result = validator.validate_signature(
            validator_type="unknown_type",
            body=b"any content",
            headers={},
            secret="any secret"
        )

        # 應該預設使用 none 策略，總是返回 True
        assert result is True

    @patch('app.core.signature.strategies.verify_webhook_signature')
    def test_github_validation_exception_handling(self, mock_verify, validator):
        """測試 GitHub 驗證策略異常處理"""
        mock_verify.side_effect = Exception("Verification error")

        result = validator.validate_signature(
            validator_type="github",
            body=b'{"test": "payload"}',
            headers={"X-Hub-Signature-256": "sha256=signature"},
            secret="test_secret"
        )

        assert result is False


class TestGitHubSignatureStrategy:
    """測試 GitHub 簽名策略"""

    @pytest.fixture
    def strategy(self):
        """創建 GitHub 策略實例"""
        return GitHubSignatureStrategy()

    def test_signature_header_key(self, strategy):
        """測試簽名 header 鍵名"""
        assert strategy.get_signature_header_key() == "X-Hub-Signature-256"

    def test_strategy_info(self, strategy):
        """測試策略資訊"""
        info = strategy.get_strategy_info()
        assert info["validator_type"] == "github"
        assert info["signature_header"] == "X-Hub-Signature-256"
        assert info["format"] == "sha256=<hmac_signature>"

    @patch('app.core.signature.strategies.verify_webhook_signature')
    def test_verify_method(self, mock_verify, strategy):
        """測試驗證方法"""
        mock_verify.return_value = True

        result = strategy.verify(
            body=b'{"test": "data"}',
            signature="sha256=test_signature",
            secret="test_secret"
        )

        assert result is True
        mock_verify.assert_called_once_with(
            b'{"test": "data"}',
            "sha256=test_signature",
            "test_secret"
        )


class TestNoneSignatureStrategy:
    """測試無簽名策略"""

    @pytest.fixture
    def strategy(self):
        """創建無策略實例"""
        return NoneSignatureStrategy()

    def test_signature_header_key(self, strategy):
        """測試簽名 header 鍵名"""
        assert strategy.get_signature_header_key() == "X-No-Signature"

    def test_strategy_info(self, strategy):
        """測試策略資訊"""
        info = strategy.get_strategy_info()
        assert info["validator_type"] == "none"
        assert info["description"] == "無驗證 (開發測試用)"
        assert info["signature_header"] == "None"
        assert info["algorithm"] == "None"

    def test_verify_always_true(self, strategy):
        """測試驗證方法總是返回 True"""
        # 任何參數組合都應該返回 True
        assert strategy.verify(b"any body", "any signature", "any secret") is True
        assert strategy.verify(b"", "", "") is True
        assert strategy.verify(b'{"complex": "json"}', "invalid_sig", "wrong_secret") is True


class TestSignatureValidatorTypes:
    """測試簽名驗證器類型枚舉"""

    def test_enum_values(self):
        """測試枚舉值"""
        assert SignatureValidatorType.NONE.value == "none"
        assert SignatureValidatorType.GITHUB.value == "github"

    def test_get_all_values(self):
        """測試獲取所有枚舉值"""
        values = SignatureValidatorType.get_all_values()
        assert len(values) == 2
        assert "none" in values
        assert "github" in values

    def test_from_string_valid(self):
        """測試從有效字符串創建枚舉"""
        assert SignatureValidatorType.from_string("github") == SignatureValidatorType.GITHUB
        assert SignatureValidatorType.from_string("none") == SignatureValidatorType.NONE
        assert SignatureValidatorType.from_string("GITHUB") == SignatureValidatorType.GITHUB

    def test_from_string_invalid_defaults_to_none(self):
        """測試從無效字符串創建枚舉預設為 NONE"""
        assert SignatureValidatorType.from_string("stripe") == SignatureValidatorType.NONE
        assert SignatureValidatorType.from_string("generic") == SignatureValidatorType.NONE
        assert SignatureValidatorType.from_string("unknown") == SignatureValidatorType.NONE

    def test_get_strategy_info(self):
        """測試獲取策略資訊"""
        github_info = SignatureValidatorType.GITHUB.get_strategy_info()
        assert github_info["validator_type"] == "github"

        none_info = SignatureValidatorType.NONE.get_strategy_info()
        assert none_info["validator_type"] == "none"
