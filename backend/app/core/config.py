from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings from environment variables"""

    # Database
    DATABASE_URL: str = "postgresql://notebooksocial:notebooksocial_password@localhost:5432/notebooksocial"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_SOCKET_TIMEOUT: int = 5
    REDIS_SOCKET_CONNECT_TIMEOUT: int = 5

    @field_validator("REDIS_URL")
    @classmethod
    def validate_redis_url(cls, v: str) -> str:
        """Validate REDIS_URL starts with redis://"""
        if not v.startswith("redis://"):
            raise ValueError("REDIS_URL must start with redis://")
        return v

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth - Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: Optional[str] = None

    # OAuth - Facebook
    FACEBOOK_CLIENT_ID: str = ""
    FACEBOOK_CLIENT_SECRET: str = ""
    FACEBOOK_REDIRECT_URI: Optional[str] = None

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10

    # Encryption for OAuth tokens (SEC-06)
    ENCRYPTION_KEY: str = "dev-encryption-key-32-bytes-long"  # Must be 32 bytes for AES-256

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ENABLE_TEST_LOGIN: bool = False

    # Storage (STOR-01: Datasets stored in MinIO, STOR-03: Outputs stored in MinIO/S3)
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    DATASETS_BUCKET: str = "datasets"
    NOTEBOOKS_BUCKET: str = "notebooks"
    BANNERS_BUCKET: str = "banners"
    AVATARS_BUCKET: str = "avatars"

    # AWS S3 (production)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # CDN (STOR-04: Pre-rendered outputs served via CloudFront)
    CLOUDFRONT_DISTRIBUTION_ID: str = ""
    CLOUDFRONT_DOMAIN: str = ""

    # File upload limits (STOR-01: Max 100MB for datasets)
    MAX_DATASET_SIZE_MB: int = 100

    # Search (DISC-03, DISC-04: Meilisearch for fast, typo-tolerant search)
    MEILISEARCH_URL: str = "http://localhost:7700"
    MEILISEARCH_INDEX_NAME: str = "notebooks"
    MEILISEARCH_TIMEOUT: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
