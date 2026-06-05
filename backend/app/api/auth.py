from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db

from app.core.security import create_access_token, is_default_jwt_secret
from app.core.passwords import hash_password, verify_password

router = APIRouter(prefix="/auth")


@router.post("/login")
def login(credentials: dict, db: Session = Depends(get_db)):
    username = (credentials.get("username") or "").strip()
    password = credentials.get("password") or ""
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    if is_default_jwt_secret():
        raise HTTPException(
            status_code=500,
            detail="JWT secret is not configured. Set JWT_SECRET_KEY in environment.",
        )

    user = db.execute(
        text("""
        SELECT id, username, role, password, is_active
        FROM users
        WHERE username=:u
        """),
        {"u": username},
    ).fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    stored_password = user.password or ""
    password_ok = verify_password(password, stored_password)
    # Backward-compatible migration for legacy plain-text passwords.
    if password_ok and stored_password and not (
        stored_password.startswith("bcrypt_sha256$")
        or stored_password.startswith("$2a$")
        or stored_password.startswith("$2b$")
        or stored_password.startswith("$2y$")
    ):
        db.execute(
            text("UPDATE users SET password = :pw WHERE id = :id"),
            {"pw": hash_password(password), "id": user.id},
        )
        db.commit()

    if not password_ok:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
        },
    }
