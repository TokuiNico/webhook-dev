"""
測試核心驗證器功能
"""

import pytest
from app.core.validators import validate_name, NameType


class TestNameValidation:
    """測試名稱格式驗證"""

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
            "webhook_received",
            "issues_opened",
        ]

        for name in valid_names:
            # 驗證函數應該返回清理後的名稱（去除空格等）
            result = validate_name(name)
            assert result == name, f"名稱 '{name}' 應該返回相同值，但得到: {result}"

    def test_valid_names_with_whitespace(self):
        """測試帶有空白字符的有效名稱"""
        test_cases = [
            ("  github  ", "github"),
            ("\tstripe\t", "stripe"),
            (" my-service ", "my-service"),
        ]

        for input_name, expected in test_cases:
            result = validate_name(input_name)
            assert result == expected, f"名稱 '{input_name}' 應該返回 '{expected}'，但得到: {result}"

    def test_invalid_names(self):
        """測試無效的名稱格式"""
        invalid_cases = [
            "GitHub",  # 包含大寫
            "github@stripe",  # 包含特殊字符
            "github stripe",  # 包含空格
            "github/stripe",  # 包含斜線
            "github.stripe",  # 包含點號
            "user.service",  # 包含點號
            "github-stripe!",  # 包含驚嘆號
            "測試",  # 包含中文字符
            "user#service",  # 包含井號
            "service%20",  # 包含百分號
        ]

        for name in invalid_cases:
            with pytest.raises(ValueError, match="只能包含小寫英文字母、數字、連字號\\(-\\)、底線\\(_\\)"):
                validate_name(name)

    def test_empty_names(self):
        """測試空名稱"""
        empty_cases = [
            "",
            "   ",
            "\t",
            "\n",
        ]

        for name in empty_cases:
            # 空字符串或只有空白字符的字符串在 strip() 後會變成空字符串
            # 這會在 Pydantic Field 的 min_length=1 限制下被捕獲
            # 但我們的 validate_name 函數仍然應該處理這種情況
            with pytest.raises(ValueError):
                validate_name(name)

    def test_name_length_limits(self):
        """測試名稱長度限制"""
        # 最大長度限制會由 Pydantic Field 處理，但我們測試合理的長度
        long_name = "a" * 255
        result = validate_name(long_name)
        assert result == long_name

        # 超長名稱會由 Pydantic Field 的 max_length=255 限制處理


class TestNameTypeAnnotation:
    """測試 NameType 註解的 Pydantic 整合"""

    def test_pydantic_integration(self):
        """測試 NameType 與 Pydantic 的整合"""
        from pydantic import BaseModel

        class TestModel(BaseModel):
            name: NameType

        # 有效的名稱
        valid_cases = [
            "github",
            "my-service",
            "service_123",
            "test-name",
        ]

        for name in valid_cases:
            model = TestModel(name=name)
            assert model.name == name

    def test_pydantic_validation_errors(self):
        """測試 NameType 的 Pydantic 驗證錯誤"""
        from pydantic import BaseModel, ValidationError

        class TestModel(BaseModel):
            name: NameType

        # 無效的名稱格式
        invalid_cases = [
            "GitHub",  # 大寫
            "github.stripe",  # 包含點號
            "github stripe",  # 包含空格
            "",  # 空字符串
            "a" * 256,  # 超長
        ]

        for name in invalid_cases:
            with pytest.raises(ValidationError):
                TestModel(name=name)

    def test_field_constraints(self):
        """測試 NameType 的字段約束"""
        from pydantic import BaseModel, ValidationError

        class TestModel(BaseModel):
            name: NameType

        # 測試最小長度約束
        with pytest.raises(ValidationError, match="String should have at least 1 character"):
            TestModel(name="")

        # 測試最大長度約束
        with pytest.raises(ValidationError, match="String should have at most 255 characters"):
            TestModel(name="a" * 256)

        # 測試正則表達式約束
        with pytest.raises(ValidationError, match="String should match pattern"):
            TestModel(name="Invalid.Name")


class TestSchemaIntegration:
    """測試 schema 整合"""

    def test_source_schema_validation(self):
        """測試來源 schema 驗證"""
        from app.schemas.source import SourceCreate
        from app.core.signature.types import SignatureValidatorType

        # 有效的來源
        valid_source = SourceCreate(
            name="github",
            secret="secret123",
            signature_validator=SignatureValidatorType.GITHUB
        )
        assert valid_source.name == "github"
        assert valid_source.signature_validator == SignatureValidatorType.GITHUB

        # 預設 signature_validator
        default_source = SourceCreate(name="custom", secret="secret123")
        assert default_source.signature_validator == SignatureValidatorType.GENERIC

        # 無效的來源名稱
        with pytest.raises(ValueError):
            SourceCreate(name="GitHub", secret="secret123")

    def test_topic_schema_validation(self):
        """測試主題 schema 驗證"""
        from app.schemas.topic import TopicCreate, TopicUpdate

        # 有效的主題
        valid_topic = TopicCreate(name="push", source_id=1)
        assert valid_topic.name == "push"

        # 無效的主題名稱 - 包含點號
        with pytest.raises(ValueError):
            TopicCreate(name="github.push", source_id=1)

        # 無效的主題名稱 - 大寫
        with pytest.raises(ValueError):
            TopicCreate(name="GitHub", source_id=1)

        # 測試更新 schema
        valid_update = TopicUpdate(name="issues_opened")
        assert valid_update.name == "issues_opened"

        # 更新時的無效名稱
        with pytest.raises(ValueError):
            TopicUpdate(name="GitHub")

        # 更新時 name 為 None 應該是有效的（如果 schema 允許）
        valid_update_none = TopicUpdate(name=None, description="test")
        assert valid_update_none.name is None


class TestEdgeCases:
    """測試邊界情況"""

    def test_unicode_characters(self):
        """測試 Unicode 字符"""
        unicode_cases = [
            "café",  # 包含重音符號
            "naïve",  # 包含分音符號
            "résumé",  # 包含尖音符號
            "測試",  # 中文字符
            "🚀rocket",  # 包含 emoji
        ]

        for name in unicode_cases:
            with pytest.raises(ValueError, match="只能包含小寫英文字母、數字、連字號\\(-\\)、底線\\(_\\)"):
                validate_name(name)

    def test_special_characters(self):
        """測試特殊字符"""
        special_cases = [
            "name@domain",
            "name#hash",
            "name$dollar",
            "name%percent",
            "name^caret",
            "name&ampersand",
            "name*asterisk",
            "name+plus",
            "name=equals",
            "name|pipe",
            "name\\backslash",
            "name/slash",
            "name?question",
            "name<less",
            "name>greater",
            "name,comma",
            "name;semicolon",
            "name:colon",
            "name\"quote",
            "name'apostrophe",
            "name[bracket]",
            "name{brace}",
            "name(paren)",
        ]

        for name in special_cases:
            with pytest.raises(ValueError, match="只能包含小寫英文字母、數字、連字號\\(-\\)、底線\\(_\\)"):
                validate_name(name)
