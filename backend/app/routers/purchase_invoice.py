from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles

router = APIRouter(prefix="/purchase/invoices", tags=["Purchase - Invoice"])


# ── Auto-generate Invoice Number ─────────────────────────────────────────────
def generate_invoice_number(db: Session) -> str:
    from datetime import date
    today = date.today()
    fy = f"{str(today.year)[2:]}{str(today.year + 1)[2:]}" if today.month >= 4 \
         else f"{str(today.year - 1)[2:]}{str(today.year)[2:]}"

    row = db.execute(text("""
        SELECT COUNT(*) AS cnt
        FROM purchase_invoice
        WHERE invoice_number LIKE :pattern
    """), {"pattern": f"PINV/{fy}/%"}).fetchone()

    next_no = (row.cnt or 0) + 1
    return f"PINV/{fy}/{str(next_no).zfill(4)}"


# ── GET /purchase/invoices ───────────────────────────────────────────────────
@router.get("/")
def list_invoices(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE", "ACCOUNTS"])

    rows = db.execute(text("""
        SELECT
            pi.id,
            pi.invoice_number,
            pi.invoice_date,
            pi.supplier_inv_no,
            pi.supplier_inv_date,
            pi.taxable_amount,
            pi.gst_percent,
            pi.gst_amount,
            pi.total_amount,
            pi.payment_status,
            pi.due_date,
            g.grn_number,
            pm.party_name
        FROM purchase_invoice pi
        JOIN grn g           ON g.id  = pi.grn_id
        JOIN party_master pm ON pm.id = pi.party_id
        ORDER BY pi.id DESC
    """)).mappings().all()

    return rows


# ── POST /purchase/invoices ──────────────────────────────────────────────────
@router.post("/")
def create_invoice(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "PURCHASE", "ACCOUNTS"])

    try:
        # Check: GRN must be ACCEPTED before invoice
        grn = db.execute(text("""
            SELECT id, status FROM grn WHERE id = :grn_id
        """), {"grn_id": data["grn_id"]}).fetchone()

        if not grn:
            return {"status": "error", "message": "GRN not found"}
        if grn.status not in ("ACCEPTED", "INSPECTED"):
            return {
                "status":  "error",
                "message": f"Cannot create invoice. GRN status is '{grn.status}'. Must be ACCEPTED."
            }

        # Check: Invoice not already created for this GRN
        existing = db.execute(text("""
            SELECT id FROM purchase_invoice WHERE grn_id = :grn_id
        """), {"grn_id": data["grn_id"]}).fetchone()

        if existing:
            return {
                "status":  "error",
                "message": "Invoice already exists for this GRN"
            }

        invoice_number = generate_invoice_number(db)

        taxable_amount = float(data.get("taxable_amount") or 0)
        gst_percent    = float(data.get("gst_percent") or 0)
        gst_amount     = round(taxable_amount * gst_percent / 100, 2)
        total_amount   = round(taxable_amount + gst_amount, 2)

        db.execute(text("""
            INSERT INTO purchase_invoice
                (invoice_number, invoice_date, grn_id, po_id, party_id,
                 supplier_inv_no, supplier_inv_date,
                 taxable_amount, gst_percent, gst_amount, total_amount,
                 payment_status, due_date)
            VALUES
                (:invoice_number, :invoice_date, :grn_id, :po_id, :party_id,
                 :supplier_inv_no, :supplier_inv_date,
                 :taxable_amount, :gst_percent, :gst_amount, :total_amount,
                 'UNPAID', :due_date)
        """), {
            "invoice_number":    invoice_number,
            "invoice_date":      data["invoice_date"],
            "grn_id":            data["grn_id"],
            "po_id":             data.get("po_id") or None,
            "party_id":          data["party_id"],
            "supplier_inv_no":   data["supplier_inv_no"],
            "supplier_inv_date": data.get("supplier_inv_date") or None,
            "taxable_amount":    taxable_amount,
            "gst_percent":       gst_percent,
            "gst_amount":        gst_amount,
            "total_amount":      total_amount,
            "due_date":          data.get("due_date") or None,
        })

        # Mark GRN as INVOICED
        db.execute(text("""
            UPDATE grn SET status = 'INVOICED' WHERE id = :grn_id
        """), {"grn_id": data["grn_id"]})

        db.commit()
        return {
            "status":         "success",
            "message":        f"Purchase Invoice {invoice_number} created successfully",
            "invoice_number": invoice_number
        }

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ── PATCH /purchase/invoices/{id}/pay ────────────────────────────────────────
@router.patch("/{id}/pay")
def mark_paid(
    id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "ACCOUNTS"])

    try:
        db.execute(text("""
            UPDATE purchase_invoice
            SET payment_status = 'PAID'
            WHERE id = :id
        """), {"id": id})

        db.commit()
        return {"status": "success", "message": "Invoice marked as Paid"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
