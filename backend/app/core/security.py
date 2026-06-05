import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


def create_access_token(*, user_id: int, username: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role.upper(),
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


def is_default_jwt_secret() -> bool:
    return JWT_SECRET_KEY == "change-me-in-production"


def parse_token_payload(token: str) -> dict:
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        username = payload.get("username")
        role = payload.get("role")
        if not user_id or not username or not role:
            raise ValueError("Invalid token payload")
        return {
            "id": int(user_id),
            "user_id": int(user_id),
            "username": username,
            "role": role.upper(),
        }
    except (JWTError, ValueError, TypeError) as exc:
        raise ValueError("Invalid or expired token") from exc
