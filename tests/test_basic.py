"""
基礎測試
驗證測試框架和基本功能是否正常運作
"""

import pytest
from app.core.exceptions import ValidationError, NotFoundError


def test_basic_assertion():
    """基本的斷言測試"""
    assert 1 + 1 == 2
    assert "hello" in "hello world"


def test_exception_creation():
    """測試自訂異常創建"""
    # 測試驗證錯誤
    with pytest.raises(ValidationError) as exc_info:
        raise ValidationError("測試驗證錯誤", field="test_field", value="test_value")

    assert exc_info.value.message == "測試驗證錯誤"
    assert exc_info.value.field == "test_field"
    assert exc_info.value.value == "test_value"
    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "VALIDATION_ERROR"


def test_not_found_exception():
    """測試資源不存在異常"""
    with pytest.raises(NotFoundError) as exc_info:
        raise NotFoundError("用戶不存在", "User", "user-123")

    assert exc_info.value.message == "用戶不存在"
    assert exc_info.value.resource_type == "User"
    assert exc_info.value.resource_id == "user-123"
    assert exc_info.value.status_code == 404


def test_exception_to_dict():
    """測試異常轉字典格式"""
    exc = ValidationError("測試錯誤", field="test")

    result = exc.to_dict()

    assert result["error"] == "VALIDATION_ERROR"
    assert result["message"] == "測試錯誤"
    assert result["status_code"] == 400
    assert result["details"]["field"] == "test"

