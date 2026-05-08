from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import JWTError, jwt
from fastapi import Request, HTTPException, status
from cryptography.fernet import Fernet
from passlib.context import CryptContext
import base64
import hashlib
from app.core.config import settings

# Password hashing context (using argon2)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Fernet for token encryption (SEC-06)
# Generate a proper Fernet key from the encryption key
def _get_fernet_key(key: str) -> bytes:
    """Convert a string key to a Fernet-compatible key"""
    # Use SHA-256 to get 32 bytes, then base64 encode for Fernet
    return base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())

cipher_suite = Fernet(_get_fernet_key(settings.ENCRYPTION_KEY))


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token (D-09, AUTH-03)"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any]) -> str:
    """Create JWT refresh token (D-11, AUTH-03)"""
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """Verify JWT token and return user ID"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type_payload: str = payload.get("type")

        if user_id is None or token_type_payload != token_type:
            return None
        return user_id
    except JWTError:
        return None


async def get_current_user_id(request: Request) -> Optional[int]:
    """Get current user ID from httpOnly cookie or Authorization header (D-10, D-12)"""
    # First try to get token from cookie
    access_token = request.cookies.get("access_token")

    # If no cookie, try Authorization header
    if not access_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            access_token = auth_header.replace("Bearer ", "")

    if not access_token:
        return None

    user_id = verify_token(access_token, "access")
    if user_id:
        return int(user_id)

    # If access token invalid, check refresh token and rotate (simplified for MVP)
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        new_user_id = verify_token(refresh_token, "refresh")
        if new_user_id:
            # In production, would need to return new access token via response
            return int(new_user_id)

    return None


def encrypt_token(token: str) -> str:
    """Encrypt OAuth token at rest (SEC-06, D-04, D-28)"""
    return cipher_suite.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt OAuth token (SEC-06, D-04, D-28)"""
    return cipher_suite.decrypt(encrypted_token.encode()).decode()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)
