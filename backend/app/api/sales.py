from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles
from app.services.stock_service import deduct_stock, record_stock_movement

router = APIRouter(prefix="/sales", tags=["Sales"])


# ── Number generators ─────────────────────────────────────────
def gen_number(db, table, col, prefix):
    from datetime import date
    today = date.today()
    fy = f"{str(today.year)[2:]}{str(today.year+1)[2:]}" if today.month >= 4 \
         else f"{str(today.year-1)[2:]}{str(today.year)[2:]}"
    row = db.execute(text(
        f"SELECT COUNT(*) AS cnt FROM {table} WHERE {col} LIKE :p"
    ), {"p": f"{prefix}/{fy}/%"}).fetchone()
    return f"{prefix}/{fy}/{str((row.cnt or 0) + 1).zfill(4)}"


# ════════════════════════════════════════════════════════════
# MASTERS for dropdowns
# ════════════════════════════════════════════════════════════
@router.get("/masters")
def get_masters(db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES", "ACCOUNTS"])
    customers = db.execute(text("""
        SELECT id, party_code, party_name, city, credit_days
        FROM party_master
        WHERE LOWER(party_type) IN ('customer','both') AND is_active = true
        ORDER BY party_name
    """)).mappings().all()
    products = db.execute(text("""
        SELECT id, product_name, unit, gst AS default_gst
        FROM product_master WHERE is_active = true ORDER BY product_name
    """)).mappings().all()
    qualities = db.execute(text("""
        SELECT id, quality_name FROM quality_master WHERE is_active = true ORDER BY quality_name
    """)).mappings().all()
    quotations = db.execute(text("""
        SELECT q.id, q.quotation_number, q.customer_id, pm.party_name AS customer_name
        FROM quotations q
        JOIN party_master pm ON pm.id = q.customer_id
        WHERE q.status = 'ACCEPTED'
        ORDER BY q.id DESC
    """)).mappings().all()
    return {"customers": list(customers), "products": list(products),
            "qualities": list(qualities), "quotations": list(quotations)}


# ════════════════════════════════════════════════════════════
# SALES ORDERS
# ════════════════════════════════════════════════════════════
@router.get("/orders")
def list_orders(status: str = None, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES", "ACCOUNTS"])
    q = """
        SELECT so.id, so.so_number, so.so_date, so.delivery_date,
               so.total_amount, so.status, so.remarks,
               pm.party_name AS customer_name, pm.id AS customer_id,
               qt.quotation_number
        FROM sales_orders so
        JOIN party_master pm ON pm.id = so.customer_id
        LEFT JOIN quotations qt ON qt.id = so.quotation_id
        {where} ORDER BY so.id DESC
    """
    where = "WHERE so.status = :status" if status else ""
    rows = db.execute(text(q.format(where=where)),
                      {"status": status} if status else {}).mappings().all()
    return rows


@router.get("/order-items/{so_id}")
def get_order_items(so_id: int, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES", "ACCOUNTS"])
    rows = db.execute(text("""
        SELECT soi.id, soi.product_id, soi.quality_id, soi.qty,
               soi.unit, soi.rate, soi.gst_percent,
               soi.taxable_amount, soi.gst_amount, soi.total_amount,
               soi.pending_qty, soi.delivered_qty,
               pm.product_name, qm.quality_name
        FROM sales_order_items soi
        JOIN product_master pm ON pm.id = soi.product_id
        LEFT JOIN quality_master qm ON qm.id = soi.quality_id
        WHERE soi.so_id = :so_id
    """), {"so_id": so_id}).mappings().all()
    return rows


@router.get("/quotation-items/{quotation_id}")
def get_quotation_items(quotation_id: int, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    rows = db.execute(text("""
        SELECT qi.*, pm.product_name, qm.quality_name
        FROM quotation_items qi
        JOIN product_master pm ON pm.id = qi.product_id
        LEFT JOIN quality_master qm ON qm.id = qi.quality_id
        WHERE qi.quotation_id = :qid
    """), {"qid": quotation_id}).mappings().all()
    return rows


@router.post("/orders")
def create_order(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    try:
        items      = data.get("items", [])
        total      = sum(float(i["total_amount"]) for i in items)
        so_number  = gen_number(db, "sales_orders", "so_number", "SO")

        result = db.execute(text("""
            INSERT INTO sales_orders
                (so_number, so_date, customer_id, quotation_id,
                 delivery_date, total_amount, status, remarks)
            VALUES (:so_number, :so_date, :customer_id, :quotation_id,
                    :delivery_date, :total_amount, 'OPEN', :remarks)
            RETURNING id
        """), {
            "so_number":     so_number,
            "so_date":       data["so_date"],
            "customer_id":   data["customer_id"],
            "quotation_id":  data.get("quotation_id") or None,
            "delivery_date": data.get("delivery_date") or None,
            "total_amount":  total,
            "remarks":       data.get("remarks", ""),
        })
        so_id = result.fetchone()[0]

        for item in items:
            qty = float(item["qty"])
            db.execute(text("""
                INSERT INTO sales_order_items
                    (so_id, product_id, quality_id, qty, unit, rate,
                     gst_percent, taxable_amount, gst_amount, total_amount,
                     pending_qty, delivered_qty)
                VALUES (:so_id, :product_id, :quality_id, :qty, :unit, :rate,
                        :gst_percent, :taxable_amount, :gst_amount, :total_amount,
                        :pending_qty, 0)
            """), {
                "so_id":          so_id,
                "product_id":     item["product_id"],
                "quality_id":     item.get("quality_id") or None,
                "qty":            qty,
                "unit":           item.get("unit", ""),
                "rate":           float(item["rate"]),
                "gst_percent":    float(item.get("gst_percent") or 0),
                "taxable_amount": float(item["taxable_amount"]),
                "gst_amount":     float(item["gst_amount"]),
                "total_amount":   float(item["total_amount"]),
                "pending_qty":    qty,
            })

        # Mark quotation as converted if linked
        if data.get("quotation_id"):
            db.execute(text(
                "UPDATE quotations SET status = 'ACCEPTED' WHERE id = :id"
            ), {"id": data["quotation_id"]})

        db.commit()
        return {"status": "success", "message": f"Sales Order {so_number} created", "so_number": so_number}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


@router.patch("/orders/{id}/cancel")
def cancel_order(id: int, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER"])
    try:
        db.execute(text("UPDATE sales_orders SET status='CANCELLED' WHERE id=:id"), {"id": id})
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ════════════════════════════════════════════════════════════
# DELIVERY CHALLANS
# ════════════════════════════════════════════════════════════
@router.get("/challans")
def list_challans(status: str = None, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES", "ACCOUNTS"])
    where = "WHERE dc.status = :status" if status else ""
    rows = db.execute(text(f"""
        SELECT dc.id, dc.challan_number, dc.challan_date,
               dc.vehicle_no, dc.driver_name, dc.status, dc.remarks,
               so.so_number, pm.party_name AS customer_name, pm.id AS customer_id
        FROM delivery_challans dc
        JOIN sales_orders so ON so.id = dc.so_id
        JOIN party_master pm ON pm.id = so.customer_id
        {where} ORDER BY dc.id DESC
    """), {"status": status} if status else {}).mappings().all()
    return rows


@router.get("/challan-items/{challan_id}")
def get_challan_items(challan_id: int, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES", "ACCOUNTS"])
    rows = db.execute(text("""
        SELECT dci.id, dci.so_item_id, dci.product_id, dci.quality_id,
               dci.delivery_qty, dci.unit, dci.rate,
               dci.gst_percent, dci.taxable_amount, dci.gst_amount,
               pm.product_name, qm.quality_name
        FROM delivery_challan_items dci
        JOIN product_master pm ON pm.id = dci.product_id
        LEFT JOIN quality_master qm ON qm.id = dci.quality_id
        WHERE dci.challan_id = :challan_id
    """), {"challan_id": challan_id}).mappings().all()
    return rows


@router.post("/challans")
def create_challan(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES"])
    try:
        items          = data.get("items", [])
        challan_number = gen_number(db, "delivery_challans", "challan_number", "DC")

        result = db.execute(text("""
            INSERT INTO delivery_challans
                (challan_number, challan_date, so_id, vehicle_no, driver_name, status, remarks)
            VALUES (:challan_number, :challan_date, :so_id, :vehicle_no, :driver_name, 'DELIVERED', :remarks)
            RETURNING id
        """), {
            "challan_number": challan_number,
            "challan_date":   data["challan_date"],
            "so_id":          data["so_id"],
            "vehicle_no":     data.get("vehicle_no", ""),
            "driver_name":    data.get("driver_name", ""),
            "remarks":        data.get("remarks", ""),
        })
        challan_id = result.fetchone()[0]

        for item in items:
            dqty = float(item["delivery_qty"])
            if dqty <= 0:
                continue
            pending_row = db.execute(text("""
                SELECT pending_qty
                FROM sales_order_items
                WHERE id = :id
            """), {"id": item["so_item_id"]}).fetchone()
            pending_qty = float(pending_row.pending_qty) if pending_row else 0
            if dqty > pending_qty:
                raise ValueError(
                    f"Delivery qty {dqty} exceeds pending qty {pending_qty}"
                )

            # Stock OUT validation + deduction on delivery
            try:
                deduct_stock(
                    db,
                    product_id=item["product_id"],
                    quality_id=item.get("quality_id") or None,
                    qty=dqty
                )
            except ValueError as e:
                raise ValueError(str(e))

            tax  = dqty * float(item.get("rate", 0))
            gst  = float(item.get("gst_percent") or 0)
            db.execute(text("""
                INSERT INTO delivery_challan_items
                    (challan_id, so_item_id, product_id, quality_id,
                     delivery_qty, unit, rate, gst_percent, taxable_amount, gst_amount)
                VALUES (:challan_id, :so_item_id, :product_id, :quality_id,
                        :delivery_qty, :unit, :rate, :gst_percent, :taxable_amount, :gst_amount)
            """), {
                "challan_id":    challan_id,
                "so_item_id":    item["so_item_id"],
                "product_id":    item["product_id"],
                "quality_id":    item.get("quality_id") or None,
                "delivery_qty":  dqty,
                "unit":          item.get("unit", ""),
                "rate":          float(item.get("rate", 0)),
                "gst_percent":   gst,
                "taxable_amount": tax,
                "gst_amount":    (tax * gst / 100),
            })
            # Update SO item pending qty
            db.execute(text("""
                UPDATE sales_order_items
                SET delivered_qty = delivered_qty + :dqty,
                    pending_qty   = GREATEST(pending_qty - :dqty, 0)
                WHERE id = :id
            """), {"dqty": dqty, "id": item["so_item_id"]})

            record_stock_movement(
                db,
                movement_type="OUT",
                source_module="SALES_CHALLAN",
                source_id=challan_id,
                source_ref=challan_number,
                product_id=item["product_id"],
                quality_id=item.get("quality_id") or None,
                qty=dqty,
                unit=item.get("unit", ""),
                rate=float(item.get("rate") or 0),
                remarks="Stock dispatched against Delivery Challan"
            )

        # Update SO status
        row = db.execute(text("""
            SELECT COUNT(*) FILTER (WHERE pending_qty > 0) AS open_items
            FROM sales_order_items WHERE so_id = :so_id
        """), {"so_id": data["so_id"]}).fetchone()
        new_status = "CLOSED" if row.open_items == 0 else "PARTIAL"
        db.execute(text("UPDATE sales_orders SET status = :s WHERE id = :id"),
                   {"s": new_status, "id": data["so_id"]})

        db.commit()
        return {"status": "success", "message": f"Challan {challan_number} created", "challan_number": challan_number}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ════════════════════════════════════════════════════════════
# SALES INVOICES
# ════════════════════════════════════════════════════════════
@router.get("/invoices")
def list_invoices(payment_status: str = None, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES", "ACCOUNTS"])
    where = "WHERE si.payment_status = ANY(string_to_array(:ps,','))" if payment_status else ""
    rows = db.execute(text(f"""
        SELECT si.id, si.invoice_number, si.invoice_date, si.due_date,
               si.taxable_amount, si.cgst_amount, si.sgst_amount, si.igst_amount,
               si.total_gst, si.grand_total, si.gst_type,
               si.payment_status, si.amount_paid,
               (si.grand_total - si.amount_paid) AS balance_amount,
               si.remarks,
               pm.party_name AS customer_name, pm.id AS customer_id,
               so.so_number, dc.challan_number
        FROM sales_invoices si
        JOIN party_master pm ON pm.id = si.customer_id
        LEFT JOIN sales_orders so ON so.id = si.so_id
        LEFT JOIN delivery_challans dc ON dc.id = si.challan_id
        {where} ORDER BY si.id DESC
    """), {"ps": payment_status} if payment_status else {}).mappings().all()
    return rows


@router.post("/invoices")
def create_invoice(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "SALES", "ACCOUNTS"])
    try:
        # Block duplicate invoice per challan
        dup = db.execute(text(
            "SELECT id FROM sales_invoices WHERE challan_id = :cid"
        ), {"cid": data["challan_id"]}).fetchone()
        if dup:
            return {"status": "error", "message": "Invoice already created for this challan"}

        inv_number = gen_number(db, "sales_invoices", "invoice_number", "SINV")

        # Get so_id from challan
        challan = db.execute(text(
            "SELECT so_id FROM delivery_challans WHERE id = :id"
        ), {"id": data["challan_id"]}).fetchone()

        result = db.execute(text("""
            INSERT INTO sales_invoices
                (invoice_number, invoice_date, challan_id, so_id, customer_id,
                 taxable_amount, cgst_amount, sgst_amount, igst_amount,
                 total_gst, grand_total, gst_type, due_date,
                 payment_status, amount_paid, remarks)
            VALUES
                (:invoice_number, :invoice_date, :challan_id, :so_id, :customer_id,
                 :taxable_amount, :cgst_amount, :sgst_amount, :igst_amount,
                 :total_gst, :grand_total, :gst_type, :due_date,
                 'UNPAID', 0, :remarks)
            RETURNING id
        """), {
            "invoice_number":  inv_number,
            "invoice_date":    data["invoice_date"],
            "challan_id":      data["challan_id"],
            "so_id":           challan.so_id if challan else None,
            "customer_id":     data["customer_id"],
            "taxable_amount":  data["taxable_amount"],
            "cgst_amount":     data.get("cgst_amount", 0),
            "sgst_amount":     data.get("sgst_amount", 0),
            "igst_amount":     data.get("igst_amount", 0),
            "total_gst":       data.get("total_gst", 0),
            "grand_total":     data["grand_total"],
            "gst_type":        data.get("gst_type", "CGST/SGST"),
            "due_date":        data.get("due_date") or None,
            "remarks":         data.get("remarks", ""),
        })

        # Mark challan as invoiced
        db.execute(text(
            "UPDATE delivery_challans SET status='INVOICED' WHERE id=:id"
        ), {"id": data["challan_id"]})

        db.commit()
        return {"status": "success", "message": f"Invoice {inv_number} created", "invoice_number": inv_number}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


@router.patch("/invoices/{id}/pay")
def mark_invoice_paid(id: int, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "ACCOUNTS"])
    try:
        db.execute(text("""
            UPDATE sales_invoices
            SET payment_status = 'PAID',
                amount_paid    = grand_total
            WHERE id = :id
        """), {"id": id})
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ════════════════════════════════════════════════════════════
# PAYMENT RECEIPTS
# ════════════════════════════════════════════════════════════
@router.get("/receipts")
def list_receipts(db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "ACCOUNTS"])
    rows = db.execute(text("""
        SELECT pr.id, pr.receipt_number, pr.receipt_date, pr.amount_received,
               pr.payment_mode, pr.reference_no, pr.remarks,
               pm.party_name AS customer_name,
               si.invoice_number
        FROM payment_receipts pr
        JOIN sales_invoices si ON si.id = pr.invoice_id
        JOIN party_master pm ON pm.id = si.customer_id
        ORDER BY pr.id DESC
    """)).mappings().all()
    return rows


@router.post("/receipts")
def create_receipt(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    allow_roles(user, ["ADMIN", "MANAGER", "ACCOUNTS"])
    try:
        receipt_number = gen_number(db, "payment_receipts", "receipt_number", "RCP")
        amount = float(data["amount_received"])

        db.execute(text("""
            INSERT INTO payment_receipts
                (receipt_number, receipt_date, invoice_id, amount_received,
                 payment_mode, reference_no, remarks)
            VALUES (:receipt_number, :receipt_date, :invoice_id, :amount_received,
                    :payment_mode, :reference_no, :remarks)
        """), {
            "receipt_number":  receipt_number,
            "receipt_date":    data["receipt_date"],
            "invoice_id":      data["invoice_id"],
            "amount_received": amount,
            "payment_mode":    data.get("payment_mode", "Cash"),
            "reference_no":    data.get("reference_no", ""),
            "remarks":         data.get("remarks", ""),
        })

        # Update invoice amount_paid and payment_status
        inv = db.execute(text(
            "SELECT grand_total, amount_paid FROM sales_invoices WHERE id = :id"
        ), {"id": data["invoice_id"]}).fetchone()

        new_paid   = float(inv.amount_paid) + amount
        new_status = "PAID" if new_paid >= float(inv.grand_total) else "PARTIAL"
        db.execute(text("""
            UPDATE sales_invoices
            SET amount_paid    = :paid,
                payment_status = :status
            WHERE id = :id
        """), {"paid": new_paid, "status": new_status, "id": data["invoice_id"]})

        db.commit()
        return {"status": "success", "message": f"Receipt {receipt_number} saved", "receipt_number": receipt_number}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
