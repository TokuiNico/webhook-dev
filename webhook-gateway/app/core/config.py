from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database settings - SQLite for development
    DATABASE_URL: str = "sqlite+aiosqlite:///./webhook.db"
    
    # Redis settings
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Development settings
    DEVELOPMENT: bool = True
    USE_FAKE_REDIS: bool = True  # Use fakeredis in development
    USE_SQLITE: bool = True  # Use SQLite for development
    
    # Security settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    API_KEY: str = "your-api-key-for-management-endpoints"
    MANAGEMENT_API_KEY: str = "your-management-api-key"
    
    # MySQL settings (for production)
    MYSQL_ROOT_PASSWORD: str = "rootpassword"
    MYSQL_DATABASE: str = "webhook_db"
    MYSQL_USER: str = "webhook_user"
    MYSQL_PASSWORD: str = "webhook_password"

    class Config:
        env_file = ".env"

settings = Settings()
