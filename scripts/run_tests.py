#!/usr/bin/env python3
"""
測試執行腳本
運行測試套件並生成覆蓋率報告
"""

import subprocess
import sys
import os
from pathlib import Path


def run_tests():
    """運行測試套件"""
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    print("🧪 運行測試套件...")

    # 運行測試並生成覆蓋率報告
    cmd = [
        "python", "-m", "pytest",
        "--cov=app",
        "--cov-report=term-missing",
        "--cov-report=html:htmlcov",
        "--cov-report=xml",
        "--cov-fail-under=80",
        "-v"
    ]

    try:
        result = subprocess.run(cmd, check=False)

        if result.returncode == 0:
            print("✅ 所有測試通過！")
            print("📊 覆蓋率報告已生成在 htmlcov/index.html")
            return True
        else:
            print("❌ 測試失敗，請檢查輸出內容")
            return False

    except KeyboardInterrupt:
        print("\n⚠️ 測試被使用者中斷")
        return False
    except Exception as e:
        print(f"❌ 運行測試時發生錯誤: {e}")
        return False


def run_specific_tests(test_path: str = None):
    """運行特定測試"""
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    if test_path:
        print(f"🎯 運行特定測試: {test_path}")
        cmd = ["python", "-m", "pytest", test_path, "-v"]
    else:
        print("🎯 運行單元測試")
        cmd = ["python", "-m", "pytest", "tests/", "-v", "-m", "unit"]

    try:
        result = subprocess.run(cmd, check=False)

        if result.returncode == 0:
            print("✅ 指定測試通過！")
            return True
        else:
            print("❌ 指定測試失敗")
            return False

    except Exception as e:
        print(f"❌ 運行測試時發生錯誤: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_path = sys.argv[1]
        success = run_specific_tests(test_path)
    else:
        success = run_tests()

    sys.exit(0 if success else 1)

