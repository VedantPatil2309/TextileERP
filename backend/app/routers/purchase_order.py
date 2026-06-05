from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles
from typing import Optional

router = APIRouter(prefix="/purchase/orders", tags=["Purchase - Orders"])


# ── Auto-generate PO Number ──────────────────────────────────────────────────
def generate_po_number(db: Session, po_type: str) -> str:
    prefix_map = {
        "RAW_MATERIAL": "RM",
        "PACKING":      "PM",
        "JOB_WORK":     "JW",
    }
    prefix = prefix_map.get(po_type, "PO")

    # Financial year: e.g. 2425 for FY 2024-25
    from datetime import date
    today = date.today()
    fy = f"{str(today.year)[2:]}{str(today.year + 1)[2:]}" if today.month >= 4 \
         else f"{str(today.year - 1)[2:]}{str(today.year)[2:]}"

    row = db.execute(text("""
        SELECT COUNT(*) AS cnt
        FROM purchase_order
        WHERE po_number LIKE :pattern
    """), {"pattern": f"{prefix}/{fy}/%"}).fetchone()

    next_no = (row.cnt or 0) + 1
    return f"{prefix}/{fy}/{str(next_no).zfill(4)}"


# ── GET /purchase/orders ─────────────────────────────────────────────────────
@router.get("/")
def list_orders(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE", "ACCOUNTS"])

    query = """
        SELECT
            po.id,
            po.po_number,
            po.po_date,
            po.po_type,
            po.status,
            po.total_amount,
            po.remarks,
            pm.party_name
        FROM purchase_order po
        JOIN party_master pm ON pm.id = po.party_id
    """
    params = {}
    if status:
        query += " WHERE po.status = :status"
        params["status"] = status

    query += " ORDER BY po.id DESC"

    rows = db.execute(text(query), params).mappings().all()
    return rows


# ── GET /purchase/orders/{id}/items ──────────────────────────────────────────
@router.get("/{po_id}/items")
def get_po_items(
    po_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE", "ACCOUNTS"])

    rows = db.execute(text("""
        SELECT
            poi.id          AS po_item_id,
            poi.po_id,
            poi.product_id,
            poi.quality_id,
            poi.quantity,
            poi.unit,
            poi.rate,
            poi.amount,
            poi.pending_qty,
            poi.received_qty,
            pm.product_name,
            qm.quality_name
        FROM purchase_order_items poi
        JOIN product_master pm ON pm.id = poi.product_id
        LEFT JOIN quality_master qm ON qm.id = poi.quality_id
        WHERE poi.po_id = :po_id
        ORDER BY poi.id
    """), {"po_id": po_id}).mappings().all()

    return rows


# ── POST /purchase/orders ────────────────────────────────────────────────────
@router.post("/")
def create_order(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE"])

    try:
        po_number = generate_po_number(db, data.get("po_type", "PO"))

        # Calculate total
        items = data.get("items", [])
        total_amount = sum(
            float(i["quantity"]) * float(i["rate"]) for i in items
        )

        # Insert PO header
        result = db.execute(text("""
            INSERT INTO purchase_order
                (po_number, po_date, party_id, po_type, status, total_amount, remarks)
            VALUES
                (:po_number, :po_date, :party_id, :po_type, 'OPEN', :total_amount, :remarks)
            RETURNING id
        """), {
            "po_number":    po_number,
            "po_date":      data["po_date"],
            "party_id":     data["party_id"],
            "po_type":      data["po_type"],
            "total_amount": total_amount,
            "remarks":      data.get("remarks", ""),
        })
        po_id = result.fetchone()[0]

        # Insert PO items
        for item in items:
            qty    = float(item["quantity"])
            rate   = float(item["rate"])
            amount = qty * rate

            db.execute(text("""
                INSERT INTO purchase_order_items
                    (po_id, product_id, quality_id, quantity, unit,
                     rate, amount, pending_qty, received_qty)
                VALUES
                    (:po_id, :product_id, :quality_id, :quantity, :unit,
                     :rate, :amount, :quantity, 0)
            """), {
                "po_id":      po_id,
                "product_id": item["product_id"],
                "quality_id": item.get("quality_id") or None,
                "quantity":   qty,
                "unit":       item.get("unit", ""),
                "rate":       rate,
                "amount":     amount,
            })

        db.commit()
        return {
            "status":    "success",
            "message":   f"Purchase Order {po_number} created successfully",
            "po_number": po_number
        }

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ── PATCH /purchase/orders/{id}/cancel ───────────────────────────────────────
@router.patch("/{id}/cancel")
def cancel_order(
    id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE"])

    try:
        db.execute(text("""
            UPDATE purchase_order
            SET status = 'CANCELLED'
            WHERE id = :id AND status = 'OPEN'
        """), {"id": id})

        db.commit()
        return {"status": "success", "message": "Purchase Order cancelled"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
