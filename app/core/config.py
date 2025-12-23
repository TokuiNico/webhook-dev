from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database settings
    # Default to SQLite for local development
    DATABASE_URL: str = "sqlite+aiosqlite:///./webhook.db"

    # RabbitMQ settings
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    # Development settings
    DEVELOPMENT: bool = False
    USE_SQLITE: bool = False  # Production default should be False (use PostgreSQL)

    # TaskIQ settings
    USE_MEMORY_BROKER: bool = False  # Production default should be False (use RabbitMQ)
    REDIS_URL: str = "redis://localhost:6379/0"  # 用於開發時的 result backend

    # Security settings
    API_KEY: str = "change-me-in-production"
    SECRET_KEY: str = "change-me-in-production-secret"

    # CORS Settings
    CORS_ORIGINS: List[str] = ["*"]

    # Server settings
    DOMAIN: str = "http://localhost:8000"  # 用於生成 ingest_url

    # PostgreSQL settings (for production)
    POSTGRES_USER: str = "webhook_user"
    POSTGRES_PASSWORD: str = "webhook_password"
    POSTGRES_DB: str = "webhook_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    class Config:
        env_file = ".env"


settings = Settings()
