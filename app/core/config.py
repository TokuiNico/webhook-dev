from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database settings - SQLite for development
    DATABASE_URL: str = "sqlite+aiosqlite:///./webhook.db"

    # RabbitMQ settings
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    # Development settings
    DEVELOPMENT: bool = True
    USE_SQLITE: bool = True  # Use SQLite for development

    # TaskIQ settings
    USE_MEMORY_BROKER: bool = True  # 測試環境使用 InMemoryBroker
    REDIS_URL: str = "redis://localhost:6379/0"  # 用於開發時的 result backend

    # Security settings
    API_KEY: str = "hello"

    # Server settings
    DOMAIN: str = "http://localhost:8000"  # 用於生成 ingest_url，預設為本地開發

    # MySQL settings (for production)
    MYSQL_ROOT_PASSWORD: str = "rootpassword"
    MYSQL_DATABASE: str = "webhook_db"
    MYSQL_USER: str = "webhook_user"
    MYSQL_PASSWORD: str = "webhook_password"

    class Config:
        env_file = ".env"


settings = Settings()
