"""
核心驗證器模組
提供通用的驗證功能，包括 name 格式驗證等
"""

import re
from typing import Optional


def validate_name_format(name: str, field_name: str = "name") -> Optional[str]:
    """
    驗證 name 格式是否符合規範

    允許的字符：
    - 小寫英文字母 (a-z)
    - 數字 (0-9)
    - 連字號 (-)
    - 底線 (_)

    Args:
        name: 要驗證的名稱
        field_name: 字段名稱，用於錯誤訊息

    Returns:
        Optional[str]: 如果驗證失敗返回錯誤訊息，成功返回 None
    """
    if not name:
        return f"{field_name} 不能為空"

    if not isinstance(name, str):
        return f"{field_name} 必須是字符串"

    # 檢查名稱長度（最少 1 字符，最多 255 字符）
    if len(name) < 1:
        return f"{field_name} 長度不能少於 1 個字符"

    if len(name) > 255:
        return f"{field_name} 長度不能超過 255 個字符"

    # 檢查是否只包含允許的字符：小寫英文、數字、連字號、底線（不包含點號）
    pattern = re.compile(r'^[a-z0-9_-]+$')
    if not pattern.match(name):
        return f"{field_name} 只能包含小寫英文字母、數字、連字號(-)、底線(_)"

    return None


def validate_source_name(name: str) -> Optional[str]:
    """
    驗證 source name 格式

    Args:
        name: source 名稱

    Returns:
        Optional[str]: 如果驗證失敗返回錯誤訊息，成功返回 None
    """
    return validate_name_format(name, "來源名稱")


def validate_topic_name(name: str) -> Optional[str]:
    """
    驗證 topic name 格式

    Args:
        name: topic 名稱

    Returns:
        Optional[str]: 如果驗證失敗返回錯誤訊息，成功返回 None
    """
    return validate_name_format(name, "主題名稱")
