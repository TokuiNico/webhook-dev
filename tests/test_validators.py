"""
測試核心驗證器功能
"""

import pytest
from app.core.validators import validate_name_format, validate_source_name, validate_topic_name


class TestNameFormatValidation:
    """測試基本名稱格式驗證"""

    def test_valid_names(self):
        """測試有效的名稱格式"""
        valid_names = [
            "github",
            "stripe",
            "my-service",
            "my_service",
            "service123",
            "user-service",
            "order_service",
            "a1b2c3",
            "test123",
            "push",
            "payment_succeeded",
        ]

        for name in valid_names:
            error = validate_name_format(name)
            assert error is None, f"名稱 '{name}' 應該是有效的，但得到錯誤: {error}"

    def test_invalid_names(self):
        """測試無效的名稱格式"""
        invalid_cases = [
            ("", "name 不能為空"),
            ("GitHub", "只能包含小寫英文字母"),  # 包含大寫
            ("github@stripe", "只能包含小寫英文字母"),  # 包含特殊字符
            ("github stripe", "只能包含小寫英文字母"),  # 包含空格
            ("github/stripe", "只能包含小寫英文字母"),  # 包含斜線
            ("github.stripe", "只能包含小寫英文字母"),  # 包含點號
            ("user.service", "只能包含小寫英文字母"),  # 包含點號
            ("a" * 256, "長度不能超過 255 個字符"),  # 超長
        ]

        for name, expected_error_part in invalid_cases:
            error = validate_name_format(name)
            assert error is not None, f"名稱 '{name}' 應該是無效的"
            assert expected_error_part in error, f"錯誤訊息應包含 '{expected_error_part}'，實際: {error}"

    def test_non_string_input(self):
        """測試非字符串輸入"""
        error = validate_name_format(123)
        assert error is not None
        assert "必須是字符串" in error


class TestSourceNameValidation:
    """測試來源名稱驗證"""

    def test_valid_source_names(self):
        """測試有效的來源名稱"""
        valid_names = [
            "github",
            "stripe",
            "gitlab",
            "my-service",
            "api_v1",
            "service123",
        ]

        for name in valid_names:
            error = validate_source_name(name)
            assert error is None, f"來源名稱 '{name}' 應該是有效的，但得到錯誤: {error}"

    def test_invalid_source_names(self):
        """測試無效的來源名稱"""
        invalid_names = [
            "GitHub",  # 大寫
            "github stripe",  # 空格
            ".github",  # 以點號開始
            "github.",  # 以點號結束
        ]

        for name in invalid_names:
            error = validate_source_name(name)
            assert error is not None, f"來源名稱 '{name}' 應該是無效的"
            assert "來源名稱" in error


class TestTopicNameValidation:
    """測試主題名稱驗證"""

    def test_valid_topic_names(self):
        """測試有效的主題名稱"""
        valid_names = [
            "push",
            "payment_succeeded",
            "user_created",
            "order_updated",
            "event",
            "webhook_received",
            "issues_opened",
        ]

        for name in valid_names:
            error = validate_topic_name(name)
            assert error is None, f"主題名稱 '{name}' 應該是有效的，但得到錯誤: {error}"

    def test_invalid_topic_names(self):
        """測試無效的主題名稱"""
        invalid_cases = [
            ("GitHub", "只能包含小寫英文字母"),  # 大寫
            ("github push", "只能包含小寫英文字母"),  # 空格
            ("github.push", "只能包含小寫英文字母"),  # 包含點號
            ("user@event", "只能包含小寫英文字母"),  # 特殊字符
        ]

        for name, expected_error_part in invalid_cases:
            error = validate_topic_name(name)
            assert error is not None, f"主題名稱 '{name}' 應該是無效的"
            assert expected_error_part in error, f"錯誤訊息應包含 '{expected_error_part}'，實際: {error}"


class TestSchemaIntegration:
    """測試 schema 整合"""

    def test_source_schema_validation(self):
        """測試來源 schema 驗證"""
        from app.schemas.source import SourceCreate
        from app.core.signature.types import SignatureValidatorType

        # 有效的來源
        valid_source = SourceCreate(name="github", secret="secret123", signature_validator=SignatureValidatorType.GITHUB)
        assert valid_source.name == "github"
        assert valid_source.signature_validator == SignatureValidatorType.GITHUB

        # 預設 signature_validator
        default_source = SourceCreate(name="custom", secret="secret123")
        assert default_source.signature_validator == SignatureValidatorType.GENERIC

        # 無效的來源名稱
        with pytest.raises(ValueError, match="只能包含小寫英文字母"):
            SourceCreate(name="GitHub", secret="secret123")

    def test_topic_schema_validation(self):
        """測試主題 schema 驗證"""
        from app.schemas.topic import TopicCreate, TopicUpdate

        # 有效的主題
        valid_topic = TopicCreate(name="push", source_id=1)
        assert valid_topic.name == "push"

        # 無效的主題名稱 - 包含點號
        with pytest.raises(ValueError, match="只能包含小寫英文字母"):
            TopicCreate(name="github.push", source_id=1)

        # 無效的主題名稱 - 大寫
        with pytest.raises(ValueError, match="只能包含小寫英文字母"):
            TopicCreate(name="GitHub", source_id=1)

        # 測試更新 schema
        valid_update = TopicUpdate(name="issues_opened")
        assert valid_update.name == "issues_opened"

        # 更新時的無效名稱
        with pytest.raises(ValueError, match="只能包含小寫英文字母"):
            TopicUpdate(name="GitHub")

        # 更新時 name 為 None 應該是有效的
        valid_update_none = TopicUpdate(name=None, description="test")
        assert valid_update_none.name is None
