"""
核心驗證器模組
提供通用的驗證功能，包括 name 格式驗證等
"""

import re
from typing_extensions import Annotated
from pydantic import Field, AfterValidator


def validate_name(name: str) -> str:
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
    name = name.strip()

    # 檢查是否只包含允許的字符：小寫英文、數字、連字號、底線（不包含點號）
    pattern = re.compile(r"^[a-z0-9_-]+$")
    if not pattern.match(name):
        raise ValueError("只能包含小寫英文字母、數字、連字號(-)、底線(_)")

    return name


NameType = Annotated[
    str,
    Field(
        min_length=1, max_length=255, pattern=r"^[a-z0-9_-]+$", examples=["test-name"]
    ),
    AfterValidator(validate_name),
]
