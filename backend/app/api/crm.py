from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles

router = APIRouter(prefix="/crm", tags=["CRM"])


# ── Auto-generate Quotation Number ───────────────────────────
def generate_quotation_number(db: Session) -> str:
    from datetime import date
    today = date.today()
    fy = f"{str(today.year)[2:]}{str(today.year+1)[2:]}" if today.month >= 4 \
         else f"{str(today.year-1)[2:]}{str(today.year)[2:]}"
    row = db.execute(text("""
        SELECT COUNT(*) AS cnt FROM quotations
        WHERE quotation_number LIKE :pattern
    """), {"pattern": f"QT/{fy}/%"}).fetchone()
    return f"QT/{fy}/{str((row.cnt or 0) + 1).zfill(4)}"


# ════════════════════════════════════════════════════════════
# CUSTOMERS — read from party_master (type = Customer/Both)
# ════════════════════════════════════════════════════════════

@router.get("/customers")
def list_customers(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    rows = db.execute(text("""
        SELECT id, party_code, party_name, party_type,
               contact_no, gst_no, city, credit_days, is_active
        FROM party_master
        WHERE LOWER(party_type) IN ('customer', 'both')
        ORDER BY party_name
    """)).mappings().all()
    return rows


# ════════════════════════════════════════════════════════════
# LEADS
# ════════════════════════════════════════════════════════════

@router.get("/leads")
def list_leads(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    rows = db.execute(text("""
        SELECT * FROM leads ORDER BY id DESC
    """)).mappings().all()
    return rows


@router.post("/leads")
def create_lead(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    try:
        db.execute(text("""
            INSERT INTO leads
                (company_name, contact_person, contact_no, city,
                 source, product_interest, estimated_value,
                 stage, follow_up_date, notes)
            VALUES
                (:company_name, :contact_person, :contact_no, :city,
                 :source, :product_interest, :estimated_value,
                 :stage, :follow_up_date, :notes)
        """), {
            "company_name":    data["company_name"],
            "contact_person":  data.get("contact_person", ""),
            "contact_no":      data["contact_no"],
            "city":            data.get("city", ""),
            "source":          data.get("source", ""),
            "product_interest": data.get("product_interest", ""),
            "estimated_value": data.get("estimated_value") or None,
            "stage":           data.get("stage", "NEW"),
            "follow_up_date":  data.get("follow_up_date") or None,
            "notes":           data.get("notes", ""),
        })
        db.commit()
        return {"status": "success", "message": "Lead created successfully"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


@router.patch("/leads/{id}/stage")
def update_lead_stage(
    id: int,
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    try:
        db.execute(text("""
            UPDATE leads SET stage = :stage WHERE id = :id
        """), {"stage": data["stage"], "id": id})
        db.commit()
        return {"status": "success", "message": "Stage updated"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ════════════════════════════════════════════════════════════
# QUOTATIONS
# ════════════════════════════════════════════════════════════

@router.get("/quotation-masters")
def get_quotation_masters(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    customers = db.execute(text("""
        SELECT id, party_code, party_name, city
        FROM party_master
        WHERE LOWER(party_type) IN ('customer', 'both') AND is_active = true
        ORDER BY party_name
    """)).mappings().all()
    products = db.execute(text("""
        SELECT id, product_name, unit, gst AS default_gst
        FROM product_master WHERE is_active = true ORDER BY product_name
    """)).mappings().all()
    qualities = db.execute(text("""
        SELECT id, quality_name, grade
        FROM quality_master WHERE is_active = true ORDER BY quality_name
    """)).mappings().all()
    return {
        "customers": list(customers),
        "products":  list(products),
        "qualities": list(qualities),
    }


@router.get("/quotations")
def list_quotations(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    rows = db.execute(text("""
        SELECT
            q.id, q.quotation_number, q.quotation_date,
            q.valid_till, q.status,
            q.taxable_amount, q.gst_amount, q.grand_total,
            q.terms, q.notes,
            pm.party_name AS customer_name,
            (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) AS item_count
        FROM quotations q
        JOIN party_master pm ON pm.id = q.customer_id
        ORDER BY q.id DESC
    """)).mappings().all()
    return rows


@router.post("/quotations")
def create_quotation(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    try:
        items          = data.get("items", [])
        taxable_amount = sum(float(i["taxable_amount"]) for i in items)
        gst_amount     = sum(float(i["gst_amount"])     for i in items)
        grand_total    = sum(float(i["total_amount"])    for i in items)
        quotation_number = generate_quotation_number(db)

        result = db.execute(text("""
            INSERT INTO quotations
                (quotation_number, quotation_date, valid_till,
                 customer_id, taxable_amount, gst_amount, grand_total,
                 status, terms, notes)
            VALUES
                (:quotation_number, :quotation_date, :valid_till,
                 :customer_id, :taxable_amount, :gst_amount, :grand_total,
                 'DRAFT', :terms, :notes)
            RETURNING id
        """), {
            "quotation_number": quotation_number,
            "quotation_date":   data["quotation_date"],
            "valid_till":       data["valid_till"],
            "customer_id":      data["customer_id"],
            "taxable_amount":   taxable_amount,
            "gst_amount":       gst_amount,
            "grand_total":      grand_total,
            "terms":            data.get("terms", ""),
            "notes":            data.get("notes", ""),
        })
        quotation_id = result.fetchone()[0]

        for item in items:
            db.execute(text("""
                INSERT INTO quotation_items
                    (quotation_id, product_id, quality_id, qty, unit,
                     rate, gst_percent, taxable_amount, gst_amount, total_amount)
                VALUES
                    (:quotation_id, :product_id, :quality_id, :qty, :unit,
                     :rate, :gst_percent, :taxable_amount, :gst_amount, :total_amount)
            """), {
                "quotation_id":   quotation_id,
                "product_id":     item["product_id"],
                "quality_id":     item.get("quality_id") or None,
                "qty":            float(item["qty"]),
                "unit":           item.get("unit", ""),
                "rate":           float(item["rate"]),
                "gst_percent":    float(item.get("gst_percent") or 0),
                "taxable_amount": float(item["taxable_amount"]),
                "gst_amount":     float(item["gst_amount"]),
                "total_amount":   float(item["total_amount"]),
            })

        db.commit()
        return {"status": "success", "message": f"Quotation {quotation_number} created", "quotation_number": quotation_number}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


@router.patch("/quotations/{id}/status")
def update_quotation_status(
    id: int,
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    try:
        db.execute(text("""
            UPDATE quotations SET status = :status WHERE id = :id
        """), {"status": data["status"], "id": id})
        db.commit()
        return {"status": "success", "message": "Quotation status updated"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
