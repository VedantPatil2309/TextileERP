from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles

router = APIRouter(prefix="/admin/products", tags=["Master - Product"])

@router.get("/")
def list_products(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    rows = db.execute(text("""
        SELECT *
        FROM product_master
    """)).mappings().all()

    return rows

@router.post("/")
def create_product(
    
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])
    try:
        db.execute(text("""
            INSERT INTO product_master (product_name, category, unit  ,gsm, width ,hsn_code,gst,avg_rate)
            VALUES (:product_name, :category, :unit,:gsm ,:width , :hsn_code,:gst,:avg_rate )
        """), data)

        db.commit()
        return {"status":"success" , "message": "Product created"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@router.patch("/{id}/status")
def toggle_product(
    id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN"])

    db.execute(text("""
        UPDATE product_master
        SET is_active = NOT is_active
        WHERE id = :id
    """), {"id": id})

    db.commit()
    return {"message": "Status updated"}
