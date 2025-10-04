"""
自訂異常類型定義
提供專門的異常類型以便更好的錯誤處理和診斷
"""

from typing import Any, Dict, Optional


class WebhookGatewayException(Exception):
    """Webhook 閘道器基礎異常類別"""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典格式以便序列化"""
        return {
            "error": self.error_code or "INTERNAL_ERROR",
            "message": self.message,
            "status_code": self.status_code,
            "details": self.details
        }


class ValidationError(WebhookGatewayException):
    """驗證錯誤"""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs
    ):
        super().__init__(message, status_code=400, error_code="VALIDATION_ERROR", **kwargs)
        self.field = field
        self.value = value

        if field:
            self.details["field"] = field
        if value is not None:
            self.details["value"] = str(value)


class AuthenticationError(WebhookGatewayException):
    """認證錯誤"""

    def __init__(
        self,
        message: str = "認證失敗",
        auth_type: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, status_code=401, error_code="AUTHENTICATION_ERROR", **kwargs)
        self.auth_type = auth_type

        if auth_type:
            self.details["auth_type"] = auth_type


class AuthorizationError(WebhookGatewayException):
    """授權錯誤"""

    def __init__(
        self,
        message: str = "權限不足",
        required_permission: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, status_code=403, error_code="AUTHORIZATION_ERROR", **kwargs)
        self.required_permission = required_permission

        if required_permission:
            self.details["required_permission"] = required_permission


class NotFoundError(WebhookGatewayException):
    """資源不存在錯誤"""

    def __init__(
        self,
        message: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, status_code=404, error_code="NOT_FOUND", **kwargs)
        self.resource_type = resource_type
        self.resource_id = resource_id

        self.details.update({
            "resource_type": resource_type,
        })
        if resource_id:
            self.details["resource_id"] = resource_id


class ConflictError(WebhookGatewayException):
    """資源衝突錯誤"""

    def __init__(
        self,
        message: str,
        resource_type: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs
    ):
        super().__init__(message, status_code=409, error_code="CONFLICT", **kwargs)
        self.resource_type = resource_type
        self.field = field
        self.value = value

        self.details.update({
            "resource_type": resource_type,
        })
        if field:
            self.details["field"] = field
        if value is not None:
            self.details["value"] = str(value)


class RateLimitError(WebhookGatewayException):
    """速率限制錯誤"""

    def __init__(
        self,
        message: str = "請求過於頻繁，請稍後再試",
        retry_after: Optional[int] = None,
        **kwargs
    ):
        super().__init__(message, status_code=429, error_code="RATE_LIMIT_EXCEEDED", **kwargs)
        self.retry_after = retry_after

        if retry_after:
            self.details["retry_after"] = retry_after


class ExternalServiceError(WebhookGatewayException):
    """外部服務錯誤"""

    def __init__(
        self,
        message: str,
        service_name: str,
        external_status_code: Optional[int] = None,
        **kwargs
    ):
        super().__init__(message, status_code=502, error_code="EXTERNAL_SERVICE_ERROR", **kwargs)
        self.service_name = service_name
        self.external_status_code = external_status_code

        self.details.update({
            "service_name": service_name,
        })
        if external_status_code:
            self.details["external_status_code"] = external_status_code


class DatabaseError(WebhookGatewayException):
    """資料庫錯誤"""

    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, status_code=500, error_code="DATABASE_ERROR", **kwargs)
        self.operation = operation

        if operation:
            self.details["operation"] = operation


class TaskError(WebhookGatewayException):
    """任務處理錯誤"""

    def __init__(
        self,
        message: str,
        task_id: Optional[str] = None,
        task_type: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, status_code=500, error_code="TASK_ERROR", **kwargs)
        self.task_id = task_id
        self.task_type = task_type

        if task_id:
            self.details["task_id"] = task_id
        if task_type:
            self.details["task_type"] = task_type

