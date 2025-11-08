from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
from pydantic import field_validator
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Portfolio Tracker"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS - Can accept JSON array string or comma-separated string
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from various formats."""
        if isinstance(v, str):
            # Try to parse as JSON array first
            if v.startswith('['):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Try comma-separated
            if ',' in v:
                return [origin.strip() for origin in v.split(',')]
            # Single URL
            return [v]
        return v

    # Frontend URL (for OAuth redirects)
    FRONTEND_URL: str = "http://localhost:5173"

    # Stock API
    ALPHA_VANTAGE_API_KEY: str | None = None

    # OpenAI API
    OPENAI_API_KEY: str | None = None

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Cache settings
    STOCK_CACHE_EXPIRE_SECONDS: int = 60  # Cache stock prices for 1 minute

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


settings = Settings()
