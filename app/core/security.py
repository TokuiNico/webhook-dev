import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)


def verify_webhook_signature(
    body: bytes, signature: str, secret: str, algorithm: str = "sha256"
) -> bool:
    """
    Verify webhook signature using HMAC.

    Args:
        body: Raw request body as bytes
        signature: Signature from webhook headers
        secret: Secret key for verification
        algorithm: Hash algorithm (default: sha256)

    Returns:
        bool: True if signature is valid, False otherwise
    """
    try:
        # Create HMAC signature
        expected_signature = hmac.new(
            secret.encode("utf-8"), body, getattr(hashlib, algorithm)
        ).hexdigest()

        # Handle different signature formats
        # GitHub format: sha256=<signature>
        if signature.startswith(f"{algorithm}="):
            provided_signature = signature.split("=", 1)[1]
        else:
            provided_signature = signature

        # Constant time comparison to prevent timing attacks
        return hmac.compare_digest(expected_signature, provided_signature)

    except Exception as e:
        logger.error(f"Error verifying webhook signature: {e}")
        return False
