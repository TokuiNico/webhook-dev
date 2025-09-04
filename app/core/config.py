from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database settings - SQLite for development
    DATABASE_URL: str = "sqlite+aiosqlite:///./webhook.db"

    # RabbitMQ settings
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    # Development settings
    DEVELOPMENT: bool = True
    USE_SQLITE: bool = True  # Use SQLite for development
    DISABLE_BROKER: bool = True  # 在開發環境跳過 broker 啟動

    # Security settings
    API_KEY: str = "your-api-key"

    # MySQL settings (for production)
    MYSQL_ROOT_PASSWORD: str = "rootpassword"
    MYSQL_DATABASE: str = "webhook_db"
    MYSQL_USER: str = "webhook_user"
    MYSQL_PASSWORD: str = "webhook_password"

    class Config:
        env_file = ".env"

settings = Settings()
