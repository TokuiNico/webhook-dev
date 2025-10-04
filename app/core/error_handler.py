"""
錯誤處理器
提供統一的錯誤處理和異常轉換機制
"""

import logging
from typing import Union
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from .exceptions import (
    WebhookGatewayException,
    ValidationError as CustomValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
    RateLimitError,
    ExternalServiceError,
    DatabaseError,
    TaskError
)

logger = logging.getLogger(__name__)


class ErrorHandler:
    """錯誤處理器"""

    @staticmethod
    def handle_webhook_gateway_exception(
        request: Request,
        exc: WebhookGatewayException
    ) -> JSONResponse:
        """處理自訂異常"""
        logger.error(
            f"Webhook 閘道器異常: {exc.error_code} - {exc.message}",
            extra={
                "error_code": exc.error_code,
                "status_code": exc.status_code,
                "path": str(request.url.path),
                "method": request.method,
                "details": exc.details
            }
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict()
        )

    @staticmethod
    def handle_http_exception(
        request: Request,
        exc: HTTPException
    ) -> JSONResponse:
        """處理 FastAPI HTTP 異常"""
        logger.warning(
            f"HTTP 異常: {exc.status_code} - {exc.detail}",
            extra={
                "status_code": exc.status_code,
                "path": str(request.url.path),
                "method": request.method,
                "detail": exc.detail
            }
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTP_ERROR",
                "message": exc.detail,
                "status_code": exc.status_code
            }
        )

    @staticmethod
    def handle_validation_error(
        request: Request,
        exc: Union[RequestValidationError, ValidationError]
    ) -> JSONResponse:
        """處理驗證錯誤"""
        errors = []

        if isinstance(exc, RequestValidationError):
            for error in exc.errors():
                errors.append({
                    "field": ".".join(str(loc) for loc in error["loc"]),
                    "message": error["msg"],
                    "value": error.get("input")
                })
        else:
            # Pydantic ValidationError
            for error in exc.errors():
                errors.append({
                    "field": ".".join(str(loc) for loc in error["loc"]),
                    "message": error["msg"],
                    "value": error.get("input")
                })

        logger.warning(
            f"驗證錯誤: {len(errors)} 個錯誤",
            extra={
                "path": str(request.url.path),
                "method": request.method,
                "errors": errors
            }
        )

        return JSONResponse(
            status_code=422,
            content={
                "error": "VALIDATION_ERROR",
                "message": "請求資料驗證失敗",
                "status_code": 422,
                "details": {
                    "errors": errors
                }
            }
        )

    @staticmethod
    def handle_database_error(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """處理資料庫錯誤"""
        logger.error(
            f"資料庫錯誤: {str(exc)}",
            extra={
                "path": str(request.url.path),
                "method": request.method,
                "error_type": type(exc).__name__
            },
            exc_info=True
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": "DATABASE_ERROR",
                "message": "資料庫操作失敗",
                "status_code": 500
            }
        )

    @staticmethod
    def handle_external_service_error(
        request: Request,
        exc: Exception,
        service_name: str = "external"
    ) -> JSONResponse:
        """處理外部服務錯誤"""
        logger.error(
            f"外部服務錯誤 ({service_name}): {str(exc)}",
            extra={
                "path": str(request.url.path),
                "method": request.method,
                "service_name": service_name,
                "error_type": type(exc).__name__
            },
            exc_info=True
        )

        return JSONResponse(
            status_code=502,
            content={
                "error": "EXTERNAL_SERVICE_ERROR",
                "message": f"外部服務 {service_name} 暫時無法使用",
                "status_code": 502,
                "details": {
                    "service_name": service_name
                }
            }
        )

    @staticmethod
    def handle_unexpected_error(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """處理未預期的錯誤"""
        logger.error(
            f"未預期錯誤: {str(exc)}",
            extra={
                "path": str(request.url.path),
                "method": request.method,
                "error_type": type(exc).__name__
            },
            exc_info=True
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "message": "伺服器內部錯誤",
                "status_code": 500
            }
        )


def create_exception_handlers():
    """創建異常處理器映射"""
    return {
        WebhookGatewayException: ErrorHandler.handle_webhook_gateway_exception,
        HTTPException: ErrorHandler.handle_http_exception,
        RequestValidationError: ErrorHandler.handle_validation_error,
        ValidationError: ErrorHandler.handle_validation_error,
        Exception: ErrorHandler.handle_unexpected_error,
    }


# 便利函數用於拋出自訂異常
def raise_validation_error(
    message: str,
    field: str = None,
    value: str = None
) -> None:
    """拋出驗證錯誤"""
    raise CustomValidationError(message, field=field, value=value)


def raise_not_found_error(
    resource_type: str,
    resource_id: str = None,
    message: str = None
) -> None:
    """拋出資源不存在錯誤"""
    if message is None:
        message = f"{resource_type} 不存在"
    raise NotFoundError(message, resource_type, resource_id)


def raise_authentication_error(
    message: str = "認證失敗",
    auth_type: str = None
) -> None:
    """拋出認證錯誤"""
    raise AuthenticationError(message, auth_type=auth_type)


def raise_authorization_error(
    message: str = "權限不足",
    required_permission: str = None
) -> None:
    """拋出授權錯誤"""
    raise AuthorizationError(message, required_permission=required_permission)


def raise_rate_limit_error(
    message: str = "請求過於頻繁，請稍後再試",
    retry_after: int = None
) -> None:
    """拋出速率限制錯誤"""
    raise RateLimitError(message, retry_after=retry_after)


def raise_external_service_error(
    service_name: str,
    message: str = None,
    external_status_code: int = None
) -> None:
    """拋出外部服務錯誤"""
    if message is None:
        message = f"外部服務 {service_name} 錯誤"
    raise ExternalServiceError(message, service_name, external_status_code)


def raise_database_error(
    message: str,
    operation: str = None
) -> None:
    """拋出資料庫錯誤"""
    raise DatabaseError(message, operation=operation)


def raise_task_error(
    message: str,
    task_id: str = None,
    task_type: str = None
) -> None:
    """拋出任務錯誤"""
    raise TaskError(message, task_id=task_id, task_type=task_type)

