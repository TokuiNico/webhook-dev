from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database settings
    # Default to SQLite for local development
    DATABASE_URL: str = "sqlite+aiosqlite:///./webhook.db"

    # RabbitMQ settings
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    # Development settings (defaults for local development)
    DEVELOPMENT: bool = True
    USE_SQLITE: bool = True
    USE_MEMORY_BROKER: bool = True  # Use InMemoryBroker for development

    # Security settings
    API_KEY: str = "change-me-in-production"
    SECRET_KEY: str = "change-me-in-production-secret"

    # CORS Settings
    CORS_ORIGINS: List[str] = ["*"]

    # Server settings
    DOMAIN: str = "http://localhost:8000"

    # PostgreSQL settings (for production, overridden by DATABASE_URL)
    POSTGRES_USER: str = "webhook_user"
    POSTGRES_PASSWORD: str = "webhook_password"
    POSTGRES_DB: str = "webhook_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields from .env (e.g., RABBITMQ_USER)


settings = Settings()
