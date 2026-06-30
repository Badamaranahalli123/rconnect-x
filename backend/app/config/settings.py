from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgre:yourpassword@localhost:5432/rconnectx"
    GNEWS_API_KEY: str = ""
    DEVTO_API_KEY: str = ""
    NEWS_API_KEY: str = ""
    
    # App
    APP_NAME: str = "RConnectX"
    DEBUG: bool = True
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    cors_origins_list: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]
    
    # APIs
    OPENROUTER_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # Email (Resend)
    RESEND_API_KEY: str = ""  # ✅ ADD THIS
    
    # VAPID Keys
    VAPID_PUBLIC_KEY: str = "04275ece093b27ce4a6d10c1c144d150a7c656524a2ae67a1feebd3cf454df3d38786446792a73e85ecd4fd2a4dfca24069b7b5ba6e0875b23d570660afeab670d"
    VAPID_PRIVATE_KEY: str = ""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

def get_settings():
    return settings
