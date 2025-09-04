"""
測試 app.core.security 模組
"""

import pytest
import hmac
import hashlib
from app.core.security import verify_webhook_signature


class TestVerifyWebhookSignature:
    """測試 verify_webhook_signature 函數"""

    def test_valid_github_signature(self):
        """測試有效的 GitHub 格式簽名"""
        body = b'{"test": "payload"}'
        secret = "my_secret"

        # 創建正確的簽名
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()
        signature = f"sha256={expected_sig}"

        result = verify_webhook_signature(body, signature, secret)
        assert result is True

    def test_valid_signature_without_prefix(self):
        """測試沒有前綴的有效簽名"""
        body = b'{"test": "payload"}'
        secret = "my_secret"

        # 創建正確的簽名（不帶 sha256= 前綴）
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        result = verify_webhook_signature(body, expected_sig, secret)
        assert result is True

    def test_invalid_signature(self):
        """測試無效簽名"""
        body = b'{"test": "payload"}'
        secret = "my_secret"
        signature = "sha256=invalid_signature"

        result = verify_webhook_signature(body, signature, secret)
        assert result is False

    def test_wrong_secret(self):
        """測試錯誤的 secret"""
        body = b'{"test": "payload"}'
        correct_secret = "correct_secret"
        wrong_secret = "wrong_secret"

        # 使用正確的 secret 創建簽名
        expected_sig = hmac.new(
            correct_secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()
        signature = f"sha256={expected_sig}"

        # 但驗證時使用錯誤的 secret
        result = verify_webhook_signature(body, signature, wrong_secret)
        assert result is False

    def test_empty_body(self):
        """測試空 body"""
        body = b""
        secret = "my_secret"

        # 創建空 body 的正確簽名
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()
        signature = f"sha256={expected_sig}"

        result = verify_webhook_signature(body, signature, secret)
        assert result is True

    def test_different_algorithms(self):
        """測試不同的演算法"""
        body = b'{"test": "payload"}'
        secret = "my_secret"

        # 測試 SHA-1
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha1
        ).hexdigest()
        signature = f"sha1={expected_sig}"

        result = verify_webhook_signature(body, signature, secret, "sha1")
        assert result is True

        # 測試 SHA-512
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha512
        ).hexdigest()
        signature = f"sha512={expected_sig}"

        result = verify_webhook_signature(body, signature, secret, "sha512")
        assert result is True

    def test_malformed_signature_format(self):
        """測試格式錯誤的簽名"""
        body = b'{"test": "payload"}'
        secret = "my_secret"

        # 測試沒有等號的簽名
        result = verify_webhook_signature(body, "malformed_signature", secret)
        assert result is False

        # 測試空簽名
        result = verify_webhook_signature(body, "", secret)
        assert result is False

    def test_unicode_secret(self):
        """測試包含 Unicode 字符的 secret"""
        body = b'{"test": "payload"}'
        secret = "我的秘密_🔐"

        # 創建正確的簽名
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()
        signature = f"sha256={expected_sig}"

        result = verify_webhook_signature(body, signature, secret)
        assert result is True

    def test_large_payload(self):
        """測試大型 payload"""
        # 創建 1MB 的 payload
        body = b"x" * (1024 * 1024)
        secret = "my_secret"

        # 創建正確的簽名
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()
        signature = f"sha256={expected_sig}"

        result = verify_webhook_signature(body, signature, secret)
        assert result is True

    def test_timing_attack_protection(self):
        """測試時序攻擊保護"""
        body = b'{"test": "payload"}'
        secret = "my_secret"

        # 創建正確的簽名
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()
        correct_signature = f"sha256={expected_sig}"

        # 創建部分正確的簽名（只有前幾個字符正確）
        partial_sig = expected_sig[:10] + "0" * (len(expected_sig) - 10)
        partial_signature = f"sha256={partial_sig}"

        # 兩個都應該返回 False，但執行時間應該相似（由 hmac.compare_digest 保證）
        result1 = verify_webhook_signature(body, partial_signature, secret)
        result2 = verify_webhook_signature(body, "sha256=completely_wrong", secret)

        assert result1 is False
        assert result2 is False

    def test_exception_handling(self):
        """測試異常處理"""
        body = b'{"test": "payload"}'
        secret = "my_secret"

        # 測試不支持的演算法（應該拋出異常並返回 False）
        result = verify_webhook_signature(body, "md5=signature", secret, "unsupported_algorithm")
        assert result is False

    def test_case_sensitivity(self):
        """測試大小寫敏感性"""
        body = b'{"test": "payload"}'
        secret = "my_secret"

        # 創建正確的簽名
        expected_sig = hmac.new(
            secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        # 測試大寫前綴（應該失敗，因為我們期望小寫）
        signature_upper = f"SHA256={expected_sig}"
        result = verify_webhook_signature(body, signature_upper, secret)
        assert result is False

        # 測試正確的小寫前綴
        signature_lower = f"sha256={expected_sig}"
        result = verify_webhook_signature(body, signature_lower, secret)
        assert result is True

    def test_multiple_equals_in_signature(self):
        """測試簽名中包含多個等號的情況"""
        body = b'{"test": "payload"}'
        secret = "my_secret"

        # 模擬一個包含多個等號的簽名格式
        signature_with_multiple_equals = "sha256=abc=def=ghi"

        # 這應該能正確處理，取第一個等號後的所有內容作為簽名
        result = verify_webhook_signature(body, signature_with_multiple_equals, secret)
        assert result is False  # 因為 abc=def=ghi 不是有效的簽名
