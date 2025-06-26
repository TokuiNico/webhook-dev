from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+aiomysql://user:password@localhost:3306/webhook_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    API_KEY: str = "your-api-key-for-management-endpoints"
    
    # Database settings
    MYSQL_ROOT_PASSWORD: str = "rootpassword"
    MYSQL_DATABASE: str = "webhook_db"
    MYSQL_USER: str = "webhook_user"
    MYSQL_PASSWORD: str = "webhook_password"

    class Config:
        env_file = ".env"

settings = Settings()
