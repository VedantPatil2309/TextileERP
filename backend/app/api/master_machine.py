from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles

router = APIRouter(prefix="/admin/machines", tags=["Master - Machine"])

@router.get("/")
def list_machines(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    rows = db.execute(text("""
        SELECT *
        FROM machine_master
        ORDER BY machine_code
    """)).mappings().all()

    return rows


@router.post("/")
def create_machine(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])
    try:
        db.execute(text("""
            INSERT INTO machine_master (machine_name, 
                        machine_type, capacity,department,
                        location,purchase_date,status,
                        maintenance_due,remarks)
            VALUES (:machine_name, :machine_type, :capacity,
                        :department,:location,:purchase_date,
                        :status,:maintenance_due,:remarks)
        """), data)

        db.commit()
        return {"status":"success" , "message": "Machine created"}
        
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@router.patch("/{id}/status")
def toggle_machine_status(
    id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    db.execute(text("""
        UPDATE machine_master
        SET is_active = NOT is_active
        WHERE id = :id
    """), {"id": id})

    db.commit()
    return {"message": "Machine status updated"}
