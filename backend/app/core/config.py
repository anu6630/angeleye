from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings from environment variables"""

    # Database
    DATABASE_URL: str = "postgresql://notebooksocial:notebooksocial_password@localhost:5432/notebooksocial"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

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

    # Storage (STOR-01: Datasets stored in MinIO, STOR-03: Outputs stored in MinIO/S3)
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    DATASETS_BUCKET: str = "datasets"
    NOTEBOOKS_BUCKET: str = "notebooks"

    # AWS S3 (production)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # CDN (STOR-04: Pre-rendered outputs served via CloudFront)
    CLOUDFRONT_DISTRIBUTION_ID: str = ""
    CLOUDFRONT_DOMAIN: str = ""

    # File upload limits (STOR-01: Max 100MB for datasets)
    MAX_DATASET_SIZE_MB: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
