from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles

router = APIRouter(prefix="/admin/parties", tags=["Master - Party"])

@router.get("/")
def list_parties(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    rows = db.execute(text("""
        SELECT *
        FROM party_master
        ORDER BY party_code
    """)).mappings().all()

    return rows

@router.post("/")       
def create_party(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    try:
        db.execute(text("""
            INSERT INTO party_master
            (party_name, party_type, contact_no, gst_no, city, credit_days  )
            VALUES
            (:party_name, :party_type, :contact_no, :gst_no, :city, :credit_days )
        """), data)

        db.commit()

        return {"status": "success", "message": "Party added successfully"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}



@router.patch("/{id}/status")
def toggle_party_status(
    id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    db.execute(text("""
        UPDATE party_master
        SET is_active = NOT is_active
        WHERE id = :id
    """), {"id": id})

    db.commit()
    return {"message": "Party status updated"}
