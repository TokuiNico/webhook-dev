from pydantic import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672//"

    class Config:
        env_file = ".env"

settings = Settings()
