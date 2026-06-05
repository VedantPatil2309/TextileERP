from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles
from app.services.stock_service import ensure_stock_movements_table

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/stock")
def get_stock(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "STORE", "ACCOUNTS"])

    rows = db.execute(text("""
        SELECT
            sl.id,
            sl.quantity,
            sl.unit,
            sl.last_updated,
            pm.id           AS product_id,
            pm.product_name,
            pm.category,
            pm.avg_rate     AS unit_cost,
            pm.hsn_code,
            qm.id           AS quality_id,
            qm.quality_name,
            qm.grade
        FROM stock_ledger sl
        JOIN product_master  pm ON pm.id = sl.product_id
        LEFT JOIN quality_master qm ON qm.id = sl.quality_id
        ORDER BY pm.category, pm.product_name
    """)).mappings().all()

    return rows


@router.get("/movements")
def get_stock_movements(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "STORE", "ACCOUNTS", "SALES"])
    ensure_stock_movements_table(db)

    rows = db.execute(text("""
        SELECT
            sm.id,
            sm.movement_date,
            sm.movement_type,
            sm.source_module,
            sm.source_ref,
            sm.qty,
            sm.unit,
            sm.rate,
            sm.remarks,
            pm.product_name,
            qm.quality_name
        FROM stock_movements sm
        JOIN product_master pm ON pm.id = sm.product_id
        LEFT JOIN quality_master qm ON qm.id = sm.quality_id
        ORDER BY sm.id DESC
        LIMIT :limit
    """), {"limit": max(1, min(limit, 500))}).mappings().all()

    return rows


@router.get("/")
def get_inventory(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    return get_stock(db=db, user=user)
