from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles
from app.core.passwords import hash_password

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── GET /admin/users ──────────────────────────────────────────
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])
    rows = db.execute(text("""
        SELECT id, username, role, is_active, created_at
        FROM users ORDER BY id
    """)).mappings().all()
    return rows


# ── POST /admin/users ─────────────────────────────────────────
@router.post("/users")
def create_user(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    # Check duplicate username
    existing = db.execute(text(
        "SELECT id FROM users WHERE username = :u"
    ), {"u": data["username"]}).fetchone()
    if existing:
        return {"status": "error", "message": "Username already exists"}

    valid_roles = ["ADMIN","MANAGER","PURCHASE","ACCOUNTS","SALES","PRODUCTION","STORE"]
    if data.get("role", "").upper() not in valid_roles:
        return {"status": "error", "message": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}

    try:
        if len((data.get("password") or "").strip()) < 6:
            return {"status": "error", "message": "Password must be at least 6 characters"}
        hashed = hash_password(data["password"])
        db.execute(text("""
            INSERT INTO users (username, password, role, is_active)
            VALUES (:username, :password, :role, true)
        """), {
            "username": data["username"],
            "password": hashed,
            "role":     data["role"].upper(),
        })
        db.commit()
        return {"status": "success", "message": f"User '{data['username']}' created successfully"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ── PUT /admin/users/{id} — update role ───────────────────────
@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])
    try:
        db.execute(text("""
            UPDATE users SET role = :role WHERE id = :id
        """), {"role": data["role"].upper(), "id": user_id})
        db.commit()
        return {"status": "success", "message": "Role updated"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ── PATCH /admin/users/{id}/status — toggle active ────────────
@router.patch("/users/{user_id}/status")
def toggle_status(
    user_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    # Prevent self-deactivation
    if user.get("id") == user_id:
        return {"status": "error", "message": "Cannot deactivate your own account"}

    try:
        db.execute(text("""
            UPDATE users SET is_active = NOT is_active WHERE id = :id
        """), {"id": user_id})
        db.commit()
        return {"status": "success", "message": "Status toggled"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ── PATCH /admin/users/{id}/reset-password ────────────────────
@router.patch("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    new_pw = data.get("new_password", "")
    if len(new_pw) < 6:
        return {"status": "error", "message": "Password must be at least 6 characters"}

    try:
        hashed = hash_password(new_pw)
        db.execute(text("""
            UPDATE users SET password = :pw WHERE id = :id
        """), {"pw": hashed, "id": user_id})
        db.commit()
        return {"status": "success", "message": "Password reset successfully"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
