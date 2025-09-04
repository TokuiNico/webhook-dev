import hmac
import hashlib
from fastapi import Request
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


def verify_github_signature(body: bytes, signature: str, secret: str) -> bool:
    """
    Verify GitHub webhook signature.

    Args:
        body: Raw request body
        signature: X-Hub-Signature-256 header value
        secret: GitHub webhook secret

    Returns:
        bool: True if valid
    """
    return verify_webhook_signature(body, signature, secret, "sha256")


def verify_stripe_signature(body: bytes, signature: str, secret: str) -> bool:
    """
    Verify Stripe webhook signature.

    Args:
        body: Raw request body
        signature: Stripe-Signature header value
        secret: Stripe webhook secret

    Returns:
        bool: True if valid
    """
    # Stripe uses a different format: t=timestamp,v1=signature
    try:
        sig_parts = {}
        for part in signature.split(","):
            key, value = part.split("=", 1)
            sig_parts[key] = value

        if "v1" not in sig_parts:
            return False

        return verify_webhook_signature(body, sig_parts["v1"], secret, "sha256")
    except Exception as e:
        logger.error(f"Error parsing Stripe signature: {e}")
        return False


async def get_webhook_body_and_signature(request: Request):
    """
    FastAPI dependency to extract request body and signature headers.

    Returns:
        tuple: (body, signature_headers)
    """
    body = await request.body()

    # Extract common signature headers
    signature_headers = {
        "github": request.headers.get("X-Hub-Signature-256"),
        "stripe": request.headers.get("Stripe-Signature"),
        "generic": request.headers.get("X-Webhook-Signature"),
    }

    return body, signature_headers
