from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles
from app.services.stock_service import add_stock, record_stock_movement
from typing import Optional

router = APIRouter(prefix="/purchase/grn", tags=["Purchase - GRN"])


# ── Auto-generate GRN Number ─────────────────────────────────────────────────
def generate_grn_number(db: Session) -> str:
    from datetime import date
    today = date.today()
    fy = f"{str(today.year)[2:]}{str(today.year + 1)[2:]}" if today.month >= 4 \
         else f"{str(today.year - 1)[2:]}{str(today.year)[2:]}"

    row = db.execute(text("""
        SELECT COUNT(*) AS cnt
        FROM grn
        WHERE grn_number LIKE :pattern
    """), {"pattern": f"GRN/{fy}/%"}).fetchone()

    next_no = (row.cnt or 0) + 1
    return f"GRN/{fy}/{str(next_no).zfill(4)}"


# ── GET /purchase/grn ────────────────────────────────────────────────────────
@router.get("/")
def list_grn(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE", "ACCOUNTS", "STORE"])

    query = """
        SELECT
            g.id,
            g.grn_number,
            g.grn_date,
            g.status,
            g.vehicle_no,
            g.bill_no,
            g.bill_date,
            g.remarks,
            po.po_number,
            po.id       AS po_id,
            po.party_id,
            pm.party_name,
            pm.credit_days
        FROM grn g
        JOIN purchase_order po ON po.id = g.po_id
        JOIN party_master pm   ON pm.id = g.party_id
    """
    params = {}
    if status:
        query += " WHERE g.status = :status"
        params["status"] = status

    query += " ORDER BY g.id DESC"

    rows = db.execute(text(query), params).mappings().all()
    return rows


# ── GET /purchase/grn/{id}/items ─────────────────────────────────────────────
@router.get("/{grn_id}/items")
def get_grn_items(
    grn_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE", "ACCOUNTS", "STORE"])

    rows = db.execute(text("""
        SELECT
            gi.id           AS grn_item_id,
            gi.grn_id,
            gi.po_item_id,
            gi.product_id,
            gi.quality_id,
            gi.received_qty,
            gi.accepted_qty,
            gi.rejected_qty,
            gi.unit,
            gi.rate,
            gi.amount,
            gi.inspection_note,
            pm.product_name,
            qm.quality_name
        FROM grn_items gi
        JOIN product_master pm  ON pm.id = gi.product_id
        LEFT JOIN quality_master qm ON qm.id = gi.quality_id
        WHERE gi.grn_id = :grn_id
        ORDER BY gi.id
    """), {"grn_id": grn_id}).mappings().all()

    return rows


# ── POST /purchase/grn ───────────────────────────────────────────────────────
@router.post("/")
def create_grn(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE", "STORE"])

    try:
        grn_number = generate_grn_number(db)
        items      = data.get("items", [])

        # Insert GRN header
        result = db.execute(text("""
            INSERT INTO grn
                (grn_number, grn_date, po_id, party_id,
                 vehicle_no, bill_no, bill_date, status, remarks)
            VALUES
                (:grn_number, :grn_date, :po_id, :party_id,
                 :vehicle_no, :bill_no, :bill_date, 'PENDING', :remarks)
            RETURNING id
        """), {
            "grn_number": grn_number,
            "grn_date":   data["grn_date"],
            "po_id":      data["po_id"],
            "party_id":   data["party_id"],
            "vehicle_no": data.get("vehicle_no", ""),
            "bill_no":    data.get("bill_no", ""),
            "bill_date":  data.get("bill_date") or None,
            "remarks":    data.get("remarks", ""),
        })
        grn_id = result.fetchone()[0]

        # Insert GRN items + update PO item received/pending qty
        for item in items:
            received_qty = float(item.get("received_qty") or 0)
            rejected_qty = float(item.get("rejected_qty") or 0)
            accepted_qty = max(0, received_qty - rejected_qty)
            rate         = float(item.get("rate") or 0)
            amount       = accepted_qty * rate

            db.execute(text("""
                INSERT INTO grn_items
                    (grn_id, po_item_id, product_id, quality_id,
                     received_qty, accepted_qty, rejected_qty,
                     unit, rate, amount, inspection_note)
                VALUES
                    (:grn_id, :po_item_id, :product_id, :quality_id,
                     :received_qty, :accepted_qty, :rejected_qty,
                     :unit, :rate, :amount, :inspection_note)
            """), {
                "grn_id":          grn_id,
                "po_item_id":      item["po_item_id"],
                "product_id":      item["product_id"],
                "quality_id":      item.get("quality_id") or None,
                "received_qty":    received_qty,
                "accepted_qty":    accepted_qty,
                "rejected_qty":    rejected_qty,
                "unit":            item.get("unit", ""),
                "rate":            rate,
                "amount":          amount,
                "inspection_note": item.get("inspection_note", ""),
            })

            # Update received_qty and pending_qty on PO item
            db.execute(text("""
                UPDATE purchase_order_items
                SET
                    received_qty = received_qty + :received_qty,
                    pending_qty  = pending_qty  - :received_qty
                WHERE id = :po_item_id
            """), {
                "received_qty": received_qty,
                "po_item_id":   item["po_item_id"],
            })

        # Update GRN status → ACCEPTED if no rejections, else INSPECTED
        has_rejection = any(
            float(i.get("rejected_qty") or 0) > 0 for i in items
        )
        grn_status = "INSPECTED" if has_rejection else "ACCEPTED"
        db.execute(text("""
            UPDATE grn SET status = :status WHERE id = :id
        """), {"status": grn_status, "id": grn_id})

        # Update PO status based on pending_qty
        db.execute(text("""
            UPDATE purchase_order po
            SET status = CASE
                WHEN (
                    SELECT COALESCE(SUM(pending_qty), 0)
                    FROM purchase_order_items
                    WHERE po_id = po.id
                ) = 0 THEN 'CLOSED'
                WHEN (
                    SELECT COALESCE(SUM(received_qty), 0)
                    FROM purchase_order_items
                    WHERE po_id = po.id
                ) > 0 THEN 'PARTIAL'
                ELSE 'OPEN'
            END
            WHERE po.id = :po_id
        """), {"po_id": data["po_id"]})

        # Update stock ledger — add accepted_qty to inventory
        for item in items:
            accepted_qty = max(
                0,
                float(item.get("received_qty") or 0) - float(item.get("rejected_qty") or 0)
            )
            if accepted_qty > 0:
                add_stock(
                    db,
                    product_id=item["product_id"],
                    quality_id=item.get("quality_id") or None,
                    qty=accepted_qty,
                    unit=item.get("unit", "")
                )
                record_stock_movement(
                    db,
                    movement_type="IN",
                    source_module="PURCHASE_GRN",
                    source_id=grn_id,
                    source_ref=grn_number,
                    product_id=item["product_id"],
                    quality_id=item.get("quality_id") or None,
                    qty=accepted_qty,
                    unit=item.get("unit", ""),
                    rate=float(item.get("rate") or 0),
                    remarks="Stock received against GRN"
                )

        db.commit()
        return {
            "status":     "success",
            "message":    f"GRN {grn_number} created successfully",
            "grn_number": grn_number
        }

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
