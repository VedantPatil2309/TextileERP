from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles

router = APIRouter(prefix="/purchase", tags=["Purchase - Masters"])


# ── GET /purchase/masters ────────────────────────────────────────────────────
# Returns parties (suppliers), products, qualities for frontend dropdowns
@router.get("/masters")
def get_purchase_masters(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE", "ACCOUNTS", "STORE"])

    parties = db.execute(text("""
        SELECT id, party_code, party_name, party_type, credit_days
        FROM party_master
        WHERE is_active = true
          AND LOWER(party_type) IN ('supplier', 'both')
        ORDER BY party_name
    """)).mappings().all()

    products = db.execute(text("""
        SELECT id, product_code, product_name, unit, hsn_code, gst
        FROM product_master
        WHERE is_active = true
        ORDER BY product_name
    """)).mappings().all()

    qualities = db.execute(text("""
        SELECT id, quality_code, quality_name, grade
        FROM quality_master
        WHERE is_active = true
        ORDER BY quality_name
    """)).mappings().all()

    return {
        "parties":   list(parties),
        "products":  list(products),
        "qualities": list(qualities),
    }
