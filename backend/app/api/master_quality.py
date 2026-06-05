from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles

router = APIRouter(prefix="/admin/qualities", tags=["Master - Quality"])

@router.get("/")
def list_qualities(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    rows = db.execute(text("""
        SELECT *
        FROM quality_master
        ORDER BY quality_code
    """)).mappings().all()

    return rows

@router.post("/")
def create_quality(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])
    try:
        db.execute(text("""
            INSERT INTO quality_master (quality_name , product_type, grade)
            VALUES (:quality_name,:product_type,:grade)
        """),data)

        db.commit()
        return {"status":"success","message": "Quality created"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


@router.patch("/{id}/status")
def toggle_quality_status(
    id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    db.execute(text("""
        UPDATE quality_master
        SET is_active = NOT is_active
        WHERE id = :id
    """), {"id": id})

    db.commit()
    return {"message": "Quality status updated"}
