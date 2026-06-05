from datetime import date, timedelta
import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/erp")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def _table_exists(db: Session, table_name: str) -> bool:
    row = db.execute(
        text(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = :table_name
            )
            """
        ),
        {"table_name": table_name},
    ).fetchone()
    return bool(row[0]) if row else False


def _fy_code(today: date) -> str:
    if today.month >= 4:
        return f"{str(today.year)[2:]}{str(today.year + 1)[2:]}"
    return f"{str(today.year - 1)[2:]}{str(today.year)[2:]}"


def seed_dummy_data() -> dict:
    """
    Insert dummy data across ERP tables in FK-safe order.
    It inserts only when a table is empty (idempotent-style for first run).
    """
    db = SessionLocal()
    today = date.today()
    fy = _fy_code(today)
    summary = {"inserted_tables": [], "skipped_tables": [], "errors": []}

    def mark_inserted(name: str) -> None:
        summary["inserted_tables"].append(name)

    def mark_skipped(name: str) -> None:
        summary["skipped_tables"].append(name)

    def table_ready(name: str) -> bool:
        if not _table_exists(db, name):
            mark_skipped(f"{name} (missing)")
            return False
        return True

    def is_empty(name: str) -> bool:
        return db.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar() == 0

    try:
        # 1) MASTER TABLES
        if table_ready("users"):
            if is_empty("users"):
                db.execute(
                    text(
                        """
                        INSERT INTO users (username, password, role, is_active)
                        VALUES
                        ('admin', 'admin123', 'ADMIN', true),
                        ('manager', 'manager123', 'MANAGER', true),
                        ('purchase', 'purchase123', 'PURCHASE', true),
                        ('sales', 'sales123', 'SALES', true)
                        """
                    )
                )
                mark_inserted("users")
            else:
                mark_skipped("users (already has data)")

        if table_ready("party_master"):
            if is_empty("party_master"):
                db.execute(
                    text(
                        """
                        INSERT INTO party_master
                        (party_name, party_type, contact_no, gst_no, city, credit_days)
                        VALUES
                        ('Galaxy Traders', 'Supplier', '9876500011', '24ABCDE1234F1Z9', 'Surat', 30),
                        ('Sunrise Textiles', 'Customer', '9876500022', '24ABCDE2234F1Z8', 'Ahmedabad', 20),
                        ('Omni Fabrics', 'Both', '9876500033', '24ABCDE3234F1Z7', 'Mumbai', 25)
                        """
                    )
                )
                mark_inserted("party_master")
            else:
                mark_skipped("party_master (already has data)")

        if table_ready("product_master"):
            if is_empty("product_master"):
                db.execute(
                    text(
                        """
                        INSERT INTO product_master
                        (product_name, category, unit, gsm, width, hsn_code, gst, avg_rate)
                        VALUES
                        ('Cotton Grey Fabric', 'Fabric', 'MTR', 110, 58, '5208', 5, 72),
                        ('Poly Cotton Fabric', 'Fabric', 'MTR', 130, 60, '5513', 12, 95),
                        ('Packing Roll', 'Packing', 'PCS', 0, 0, '3923', 18, 45)
                        """
                    )
                )
                mark_inserted("product_master")
            else:
                mark_skipped("product_master (already has data)")

        if table_ready("quality_master"):
            if is_empty("quality_master"):
                db.execute(
                    text(
                        """
                        INSERT INTO quality_master (quality_name, product_type, grade)
                        VALUES
                        ('Premium White', 'Fabric', 'A'),
                        ('Standard Dyed', 'Fabric', 'B'),
                        ('Packing Standard', 'Packing', 'A')
                        """
                    )
                )
                mark_inserted("quality_master")
            else:
                mark_skipped("quality_master (already has data)")

        if table_ready("machine_master"):
            if is_empty("machine_master"):
                db.execute(
                    text(
                        """
                        INSERT INTO machine_master
                        (machine_name, machine_type, capacity, department, location,
                         purchase_date, status, maintenance_due, remarks)
                        VALUES
                        ('Loom-01', 'Loom', '200 MTR/day', 'Weaving', 'Plant A',
                         :purchase_date, 'RUNNING', :maintenance_due, 'Primary loom'),
                        ('Dyeing-01', 'Dyeing', '150 MTR/day', 'Dyeing', 'Plant B',
                         :purchase_date, 'RUNNING', :maintenance_due, 'Dyeing unit')
                        """
                    ),
                    {
                        "purchase_date": today - timedelta(days=365),
                        "maintenance_due": today + timedelta(days=30),
                    },
                )
                mark_inserted("machine_master")
            else:
                mark_skipped("machine_master (already has data)")

        # Common IDs for transactional tables
        supplier_id = None
        customer_id = None
        product_id = None
        quality_id = None
        machine_id = None

        if table_ready("party_master"):
            supplier_id = db.execute(
                text(
                    """
                    SELECT id FROM party_master
                    WHERE LOWER(party_type) IN ('supplier', 'both')
                    ORDER BY id
                    LIMIT 1
                    """
                )
            ).scalar()
            customer_id = db.execute(
                text(
                    """
                    SELECT id FROM party_master
                    WHERE LOWER(party_type) IN ('customer', 'both')
                    ORDER BY id
                    LIMIT 1
                    """
                )
            ).scalar()

        if table_ready("product_master"):
            product_id = db.execute(text("SELECT id FROM product_master ORDER BY id LIMIT 1")).scalar()
        if table_ready("quality_master"):
            quality_id = db.execute(text("SELECT id FROM quality_master ORDER BY id LIMIT 1")).scalar()
        if table_ready("machine_master"):
            machine_id = db.execute(text("SELECT id FROM machine_master ORDER BY id LIMIT 1")).scalar()

        # 2) CRM
        quotation_id = None
        if table_ready("leads"):
            if is_empty("leads"):
                db.execute(
                    text(
                        """
                        INSERT INTO leads
                        (company_name, contact_person, contact_no, city, source,
                         product_interest, estimated_value, stage, follow_up_date, notes)
                        VALUES
                        ('BlueLine Exports', 'Rakesh Shah', '9898981111', 'Surat', 'Reference',
                         'Cotton Grey Fabric', 250000, 'NEW', :follow_up_date, 'High-volume buyer')
                        """
                    ),
                    {"follow_up_date": today + timedelta(days=5)},
                )
                mark_inserted("leads")
            else:
                mark_skipped("leads (already has data)")

        if table_ready("quotations") and table_ready("quotation_items"):
            if is_empty("quotations") and customer_id and product_id:
                quotation_no = f"QT/{fy}/0001"
                result = db.execute(
                    text(
                        """
                        INSERT INTO quotations
                        (quotation_number, quotation_date, valid_till, customer_id,
                         taxable_amount, gst_amount, grand_total, status, terms, notes)
                        VALUES
                        (:quotation_number, :quotation_date, :valid_till, :customer_id,
                         :taxable_amount, :gst_amount, :grand_total, 'ACCEPTED', :terms, :notes)
                        RETURNING id
                        """
                    ),
                    {
                        "quotation_number": quotation_no,
                        "quotation_date": today,
                        "valid_till": today + timedelta(days=15),
                        "customer_id": customer_id,
                        "taxable_amount": 10000,
                        "gst_amount": 500,
                        "grand_total": 10500,
                        "terms": "Delivery in 7 days",
                        "notes": "Dummy quotation",
                    },
                )
                quotation_id = result.scalar()
                db.execute(
                    text(
                        """
                        INSERT INTO quotation_items
                        (quotation_id, product_id, quality_id, qty, unit, rate, gst_percent,
                         taxable_amount, gst_amount, total_amount)
                        VALUES
                        (:quotation_id, :product_id, :quality_id, 100, 'MTR', 100, 5, 10000, 500, 10500)
                        """
                    ),
                    {
                        "quotation_id": quotation_id,
                        "product_id": product_id,
                        "quality_id": quality_id,
                    },
                )
                mark_inserted("quotations + quotation_items")
            else:
                mark_skipped("quotations/quotation_items (already has data or masters missing)")

        # 3) PURCHASE
        po_id = None
        po_item_id = None
        grn_id = None
        challan_id = None
        sales_invoice_id = None

        if table_ready("purchase_order") and table_ready("purchase_order_items"):
            if is_empty("purchase_order") and supplier_id and product_id:
                po_no = f"RM/{fy}/0001"
                result = db.execute(
                    text(
                        """
                        INSERT INTO purchase_order
                        (po_number, po_date, party_id, po_type, status, total_amount, remarks)
                        VALUES
                        (:po_number, :po_date, :party_id, 'RAW_MATERIAL', 'PARTIAL', 9000, 'Dummy PO')
                        RETURNING id
                        """
                    ),
                    {"po_number": po_no, "po_date": today, "party_id": supplier_id},
                )
                po_id = result.scalar()
                result = db.execute(
                    text(
                        """
                        INSERT INTO purchase_order_items
                        (po_id, product_id, quality_id, quantity, unit, rate, amount, received_qty, pending_qty)
                        VALUES
                        (:po_id, :product_id, :quality_id, 100, 'MTR', 90, 9000, 60, 40)
                        RETURNING id
                        """
                    ),
                    {"po_id": po_id, "product_id": product_id, "quality_id": quality_id},
                )
                po_item_id = result.scalar()
                mark_inserted("purchase_order + purchase_order_items")
            else:
                mark_skipped("purchase_order/purchase_order_items (already has data or masters missing)")

        if table_ready("grn") and table_ready("grn_items"):
            if is_empty("grn") and po_id and po_item_id and supplier_id and product_id:
                grn_no = f"GRN/{fy}/0001"
                result = db.execute(
                    text(
                        """
                        INSERT INTO grn
                        (grn_number, grn_date, po_id, party_id, vehicle_no, bill_no, bill_date, status, remarks)
                        VALUES
                        (:grn_number, :grn_date, :po_id, :party_id, 'GJ05AB1234', 'BILL-1001',
                         :bill_date, 'ACCEPTED', 'Dummy GRN')
                        RETURNING id
                        """
                    ),
                    {
                        "grn_number": grn_no,
                        "grn_date": today,
                        "po_id": po_id,
                        "party_id": supplier_id,
                        "bill_date": today,
                    },
                )
                grn_id = result.scalar()
                db.execute(
                    text(
                        """
                        INSERT INTO grn_items
                        (grn_id, po_item_id, product_id, quality_id, received_qty, accepted_qty,
                         rejected_qty, unit, rate, amount, inspection_note)
                        VALUES
                        (:grn_id, :po_item_id, :product_id, :quality_id, 60, 60, 0, 'MTR', 90, 5400, 'QC OK')
                        """
                    ),
                    {
                        "grn_id": grn_id,
                        "po_item_id": po_item_id,
                        "product_id": product_id,
                        "quality_id": quality_id,
                    },
                )
                mark_inserted("grn + grn_items")
            else:
                mark_skipped("grn/grn_items (already has data or dependency missing)")

        if table_ready("purchase_invoice"):
            if is_empty("purchase_invoice") and grn_id and po_id and supplier_id:
                pinv_no = f"PINV/{fy}/0001"
                db.execute(
                    text(
                        """
                        INSERT INTO purchase_invoice
                        (invoice_number, invoice_date, grn_id, po_id, party_id, supplier_inv_no,
                         supplier_inv_date, taxable_amount, gst_percent, gst_amount, total_amount,
                         payment_status, due_date)
                        VALUES
                        (:invoice_number, :invoice_date, :grn_id, :po_id, :party_id, 'SUP-INV-001',
                         :supplier_inv_date, 5400, 5, 270, 5670, 'UNPAID', :due_date)
                        """
                    ),
                    {
                        "invoice_number": pinv_no,
                        "invoice_date": today,
                        "grn_id": grn_id,
                        "po_id": po_id,
                        "party_id": supplier_id,
                        "supplier_inv_date": today,
                        "due_date": today + timedelta(days=30),
                    },
                )
                mark_inserted("purchase_invoice")
            else:
                mark_skipped("purchase_invoice (already has data or dependency missing)")

        if table_ready("stock_ledger"):
            if is_empty("stock_ledger") and product_id:
                db.execute(
                    text(
                        """
                        INSERT INTO stock_ledger
                        (product_id, quality_id, quantity, unit, last_updated)
                        VALUES (:product_id, :quality_id, 60, 'MTR', NOW())
                        """
                    ),
                    {"product_id": product_id, "quality_id": quality_id},
                )
                mark_inserted("stock_ledger")
            else:
                mark_skipped("stock_ledger (already has data or dependency missing)")

        # 4) PRODUCTION
        if table_ready("production_orders"):
            if is_empty("production_orders") and product_id:
                prod_no = f"PRD/{fy}/0001"
                db.execute(
                    text(
                        """
                        INSERT INTO production_orders
                        (order_number, production_date, shift, product_id, quality_id, machine_id,
                         planned_qty, actual_qty, input_qty, status, remarks)
                        VALUES
                        (:order_number, :production_date, 'A', :product_id, :quality_id, :machine_id,
                         500, 480, 520, 'COMPLETED', 'Dummy production order')
                        """
                    ),
                    {
                        "order_number": prod_no,
                        "production_date": today,
                        "product_id": product_id,
                        "quality_id": quality_id,
                        "machine_id": machine_id,
                    },
                )
                mark_inserted("production_orders")
            else:
                mark_skipped("production_orders (already has data or masters missing)")

        # 5) SALES
        so_id = None
        so_item_id = None
        if table_ready("sales_orders") and table_ready("sales_order_items"):
            if is_empty("sales_orders") and customer_id and product_id:
                so_no = f"SO/{fy}/0001"
                result = db.execute(
                    text(
                        """
                        INSERT INTO sales_orders
                        (so_number, so_date, customer_id, quotation_id, delivery_date,
                         total_amount, status, remarks)
                        VALUES
                        (:so_number, :so_date, :customer_id, :quotation_id, :delivery_date,
                         10500, 'PARTIAL', 'Dummy sales order')
                        RETURNING id
                        """
                    ),
                    {
                        "so_number": so_no,
                        "so_date": today,
                        "customer_id": customer_id,
                        "quotation_id": quotation_id,
                        "delivery_date": today + timedelta(days=7),
                    },
                )
                so_id = result.scalar()
                result = db.execute(
                    text(
                        """
                        INSERT INTO sales_order_items
                        (so_id, product_id, quality_id, qty, unit, rate, gst_percent, taxable_amount,
                         gst_amount, total_amount, pending_qty, delivered_qty)
                        VALUES
                        (:so_id, :product_id, :quality_id, 100, 'MTR', 100, 5, 10000, 500, 10500, 40, 60)
                        RETURNING id
                        """
                    ),
                    {"so_id": so_id, "product_id": product_id, "quality_id": quality_id},
                )
                so_item_id = result.scalar()
                mark_inserted("sales_orders + sales_order_items")
            else:
                mark_skipped("sales_orders/sales_order_items (already has data or masters missing)")

        if table_ready("delivery_challans") and table_ready("delivery_challan_items"):
            if is_empty("delivery_challans") and so_id and so_item_id and product_id:
                dc_no = f"DC/{fy}/0001"
                result = db.execute(
                    text(
                        """
                        INSERT INTO delivery_challans
                        (challan_number, challan_date, so_id, vehicle_no, driver_name, status, remarks)
                        VALUES
                        (:challan_number, :challan_date, :so_id, 'GJ01XY5555', 'Mahesh', 'INVOICED', 'Dummy DC')
                        RETURNING id
                        """
                    ),
                    {"challan_number": dc_no, "challan_date": today, "so_id": so_id},
                )
                challan_id = result.scalar()
                db.execute(
                    text(
                        """
                        INSERT INTO delivery_challan_items
                        (challan_id, so_item_id, product_id, quality_id, delivery_qty, unit, rate,
                         gst_percent, taxable_amount, gst_amount)
                        VALUES
                        (:challan_id, :so_item_id, :product_id, :quality_id, 60, 'MTR', 100, 5, 6000, 300)
                        """
                    ),
                    {
                        "challan_id": challan_id,
                        "so_item_id": so_item_id,
                        "product_id": product_id,
                        "quality_id": quality_id,
                    },
                )
                mark_inserted("delivery_challans + delivery_challan_items")
            else:
                mark_skipped("delivery_challans/delivery_challan_items (already has data or dependency missing)")

        if table_ready("sales_invoices"):
            if is_empty("sales_invoices") and challan_id and so_id and customer_id:
                sinv_no = f"SINV/{fy}/0001"
                result = db.execute(
                    text(
                        """
                        INSERT INTO sales_invoices
                        (invoice_number, invoice_date, challan_id, so_id, customer_id,
                         taxable_amount, cgst_amount, sgst_amount, igst_amount, total_gst, grand_total,
                         gst_type, due_date, payment_status, amount_paid, remarks)
                        VALUES
                        (:invoice_number, :invoice_date, :challan_id, :so_id, :customer_id,
                         6000, 150, 150, 0, 300, 6300, 'CGST/SGST', :due_date, 'PARTIAL', 3000, 'Dummy sales invoice')
                        RETURNING id
                        """
                    ),
                    {
                        "invoice_number": sinv_no,
                        "invoice_date": today,
                        "challan_id": challan_id,
                        "so_id": so_id,
                        "customer_id": customer_id,
                        "due_date": today + timedelta(days=20),
                    },
                )
                sales_invoice_id = result.scalar()
                mark_inserted("sales_invoices")
            else:
                mark_skipped("sales_invoices (already has data or dependency missing)")

        if table_ready("payment_receipts"):
            if is_empty("payment_receipts") and sales_invoice_id:
                rcp_no = f"RCP/{fy}/0001"
                db.execute(
                    text(
                        """
                        INSERT INTO payment_receipts
                        (receipt_number, receipt_date, invoice_id, amount_received, payment_mode, reference_no, remarks)
                        VALUES
                        (:receipt_number, :receipt_date, :invoice_id, 3000, 'UPI', 'UPIREF001', 'Dummy receipt')
                        """
                    ),
                    {"receipt_number": rcp_no, "receipt_date": today, "invoice_id": sales_invoice_id},
                )
                mark_inserted("payment_receipts")
            else:
                mark_skipped("payment_receipts (already has data or dependency missing)")

        db.commit()
        return {"status": "success", **summary}

    except Exception as exc:
        db.rollback()
        summary["errors"].append(str(exc))
        return {"status": "error", **summary}
    finally:
        db.close()


def seed_minimum_dummy_data(min_rows: int = 20) -> dict:
    """
    Ensure at least `min_rows` dummy rows exist in related ERP tables.
    This runs base seeding first, then tops up counts.
    """
    base_result = seed_dummy_data()
    db = SessionLocal()
    today = date.today()
    fy = _fy_code(today)
    summary = {
        "status": "success",
        "min_rows": min_rows,
        "base_seed": base_result,
        "topped_up": [],
        "skipped": [],
        "errors": [],
    }

    def exists(name: str) -> bool:
        return _table_exists(db, name)

    def count(name: str) -> int:
        return int(db.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar() or 0)

    try:
        party_ids = [r[0] for r in db.execute(text("SELECT id FROM party_master ORDER BY id")).fetchall()] if exists("party_master") else []
        supplier_ids = [r[0] for r in db.execute(text("SELECT id FROM party_master WHERE LOWER(party_type) IN ('supplier','both') ORDER BY id")).fetchall()] if exists("party_master") else []
        customer_ids = [r[0] for r in db.execute(text("SELECT id FROM party_master WHERE LOWER(party_type) IN ('customer','both') ORDER BY id")).fetchall()] if exists("party_master") else []
        product_ids = [r[0] for r in db.execute(text("SELECT id FROM product_master ORDER BY id")).fetchall()] if exists("product_master") else []
        quality_ids = [r[0] for r in db.execute(text("SELECT id FROM quality_master ORDER BY id")).fetchall()] if exists("quality_master") else []
        machine_ids = [r[0] for r in db.execute(text("SELECT id FROM machine_master ORDER BY id")).fetchall()] if exists("machine_master") else []

        # 1) LEADS
        if exists("leads"):
            current = count("leads")
            need = max(0, min_rows - current)
            for i in range(need):
                n = current + i + 1
                db.execute(
                    text(
                        """
                        INSERT INTO leads
                        (company_name, contact_person, contact_no, city, source, product_interest,
                         estimated_value, stage, follow_up_date, notes)
                        VALUES
                        (:company_name, :contact_person, :contact_no, :city, :source, :product_interest,
                         :estimated_value, :stage, :follow_up_date, :notes)
                        """
                    ),
                    {
                        "company_name": f"Lead Co {n}",
                        "contact_person": f"Person {n}",
                        "contact_no": f"97{str(20000000 + n).zfill(8)}",
                        "city": ["Surat", "Ahmedabad", "Mumbai"][n % 3],
                        "source": ["Reference", "Direct", "Exhibition"][n % 3],
                        "product_interest": f"Product {n}",
                        "estimated_value": 50000 + n * 1000,
                        "stage": ["NEW", "CONTACTED", "FOLLOW_UP"][n % 3],
                        "follow_up_date": today + timedelta(days=(n % 7) + 1),
                        "notes": f"Dummy lead {n}",
                    },
                )
            summary["topped_up"].append(f"leads +{need}")
        else:
            summary["skipped"].append("leads (missing)")

        # 2) QUOTATIONS + ITEMS
        if exists("quotations") and exists("quotation_items") and customer_ids and product_ids:
            current = count("quotations")
            need = max(0, min_rows - current)
            for i in range(need):
                n = current + i + 1
                qty = 40 + (n % 90)
                rate = 80 + (n % 35)
                gst_percent = 5 if n % 2 else 12
                taxable = qty * rate
                gst_amt = round(taxable * gst_percent / 100, 2)
                total = round(taxable + gst_amt, 2)
                qid = db.execute(
                    text(
                        """
                        INSERT INTO quotations
                        (quotation_number, quotation_date, valid_till, customer_id, taxable_amount,
                         gst_amount, grand_total, status, terms, notes)
                        VALUES
                        (:quotation_number, :quotation_date, :valid_till, :customer_id, :taxable_amount,
                         :gst_amount, :grand_total, 'ACCEPTED', :terms, :notes)
                        RETURNING id
                        """
                    ),
                    {
                        "quotation_number": f"QT/{fy}/{n:04d}",
                        "quotation_date": today - timedelta(days=n % 20),
                        "valid_till": today + timedelta(days=15 + (n % 10)),
                        "customer_id": customer_ids[(n - 1) % len(customer_ids)],
                        "taxable_amount": taxable,
                        "gst_amount": gst_amt,
                        "grand_total": total,
                        "terms": "Dummy terms",
                        "notes": f"Dummy quotation {n}",
                    },
                ).scalar()
                db.execute(
                    text(
                        """
                        INSERT INTO quotation_items
                        (quotation_id, product_id, quality_id, qty, unit, rate, gst_percent,
                         taxable_amount, gst_amount, total_amount)
                        VALUES
                        (:quotation_id, :product_id, :quality_id, :qty, 'MTR', :rate, :gst_percent,
                         :taxable_amount, :gst_amount, :total_amount)
                        """
                    ),
                    {
                        "quotation_id": qid,
                        "product_id": product_ids[(n - 1) % len(product_ids)],
                        "quality_id": quality_ids[(n - 1) % len(quality_ids)] if quality_ids else None,
                        "qty": qty,
                        "rate": rate,
                        "gst_percent": gst_percent,
                        "taxable_amount": taxable,
                        "gst_amount": gst_amt,
                        "total_amount": total,
                    },
                )
            summary["topped_up"].append(f"quotations + items +{need}")
        else:
            summary["skipped"].append("quotations/quotation_items (missing or no masters)")

        # 3) PURCHASE ORDER + ITEMS
        po_ids = []
        if exists("purchase_order") and exists("purchase_order_items") and supplier_ids and product_ids:
            current = count("purchase_order")
            need = max(0, min_rows - current)
            for i in range(need):
                n = current + i + 1
                po_type = ["RAW_MATERIAL", "PACKING", "JOB_WORK"][n % 3]
                prefix = "RM" if po_type == "RAW_MATERIAL" else ("PM" if po_type == "PACKING" else "JW")
                qty = 100 + (n % 60)
                rate = 70 + (n % 25)
                amount = qty * rate
                received = qty // 2
                pending = qty - received
                po_id = db.execute(
                    text(
                        """
                        INSERT INTO purchase_order
                        (po_number, po_date, party_id, po_type, status, total_amount, remarks)
                        VALUES
                        (:po_number, :po_date, :party_id, :po_type, :status, :total_amount, :remarks)
                        RETURNING id
                        """
                    ),
                    {
                        "po_number": f"{prefix}/{fy}/{n:04d}",
                        "po_date": today - timedelta(days=n % 20),
                        "party_id": supplier_ids[(n - 1) % len(supplier_ids)],
                        "po_type": po_type,
                        "status": "PARTIAL",
                        "total_amount": amount,
                        "remarks": f"Dummy PO {n}",
                    },
                ).scalar()
                po_ids.append(po_id)
                db.execute(
                    text(
                        """
                        INSERT INTO purchase_order_items
                        (po_id, product_id, quality_id, quantity, unit, rate, amount, received_qty, pending_qty)
                        VALUES
                        (:po_id, :product_id, :quality_id, :quantity, 'MTR', :rate, :amount, :received_qty, :pending_qty)
                        """
                    ),
                    {
                        "po_id": po_id,
                        "product_id": product_ids[(n - 1) % len(product_ids)],
                        "quality_id": quality_ids[(n - 1) % len(quality_ids)] if quality_ids else None,
                        "quantity": qty,
                        "rate": rate,
                        "amount": amount,
                        "received_qty": received,
                        "pending_qty": pending,
                    },
                )
            summary["topped_up"].append(f"purchase_order + items +{need}")
        else:
            summary["skipped"].append("purchase_order/purchase_order_items (missing or no masters)")

        # Refresh purchase refs
        if exists("purchase_order"):
            po_ids = [r[0] for r in db.execute(text("SELECT id FROM purchase_order ORDER BY id")).fetchall()]

        # 4) GRN + ITEMS
        if exists("grn") and exists("grn_items") and po_ids and product_ids:
            current = count("grn")
            need = max(0, min_rows - current)
            po_item_map = {
                r["po_id"]: r["id"]
                for r in db.execute(text("SELECT id, po_id FROM purchase_order_items ORDER BY id")).mappings().all()
            }
            po_party_map = {
                r["id"]: r["party_id"]
                for r in db.execute(text("SELECT id, party_id FROM purchase_order ORDER BY id")).mappings().all()
            }
            created = 0
            for i in range(need):
                n = current + i + 1
                po_id = po_ids[(n - 1) % len(po_ids)]
                po_item_id = po_item_map.get(po_id)
                if not po_item_id:
                    continue
                received = 40 + (n % 50)
                rejected = n % 3
                accepted = received - rejected
                rate = 70 + (n % 20)
                grn_id = db.execute(
                    text(
                        """
                        INSERT INTO grn
                        (grn_number, grn_date, po_id, party_id, vehicle_no, bill_no, bill_date, status, remarks)
                        VALUES
                        (:grn_number, :grn_date, :po_id, :party_id, :vehicle_no, :bill_no, :bill_date, :status, :remarks)
                        RETURNING id
                        """
                    ),
                    {
                        "grn_number": f"GRN/{fy}/{n:04d}",
                        "grn_date": today - timedelta(days=n % 15),
                        "po_id": po_id,
                        "party_id": po_party_map.get(po_id),
                        "vehicle_no": f"GJ05AB{1000+n}",
                        "bill_no": f"BILL-{n:04d}",
                        "bill_date": today - timedelta(days=n % 15),
                        "status": "INSPECTED" if rejected else "ACCEPTED",
                        "remarks": f"Dummy GRN {n}",
                    },
                ).scalar()
                db.execute(
                    text(
                        """
                        INSERT INTO grn_items
                        (grn_id, po_item_id, product_id, quality_id, received_qty, accepted_qty, rejected_qty,
                         unit, rate, amount, inspection_note)
                        VALUES
                        (:grn_id, :po_item_id, :product_id, :quality_id, :received_qty, :accepted_qty, :rejected_qty,
                         'MTR', :rate, :amount, :inspection_note)
                        """
                    ),
                    {
                        "grn_id": grn_id,
                        "po_item_id": po_item_id,
                        "product_id": product_ids[(n - 1) % len(product_ids)],
                        "quality_id": quality_ids[(n - 1) % len(quality_ids)] if quality_ids else None,
                        "received_qty": received,
                        "accepted_qty": accepted,
                        "rejected_qty": rejected,
                        "rate": rate,
                        "amount": accepted * rate,
                        "inspection_note": "Dummy QC",
                    },
                )
                created += 1
            summary["topped_up"].append(f"grn + items +{created}")
        else:
            summary["skipped"].append("grn/grn_items (missing or no dependency)")

        # 5) PRODUCTION ORDERS
        if exists("production_orders") and product_ids:
            current = count("production_orders")
            need = max(0, min_rows - current)
            for i in range(need):
                n = current + i + 1
                planned = 300 + (n * 4)
                actual = planned - (n % 15)
                db.execute(
                    text(
                        """
                        INSERT INTO production_orders
                        (order_number, production_date, shift, product_id, quality_id, machine_id,
                         planned_qty, actual_qty, input_qty, status, remarks)
                        VALUES
                        (:order_number, :production_date, :shift, :product_id, :quality_id, :machine_id,
                         :planned_qty, :actual_qty, :input_qty, :status, :remarks)
                        """
                    ),
                    {
                        "order_number": f"PRD/{fy}/{n:04d}",
                        "production_date": today - timedelta(days=n % 20),
                        "shift": ["A", "B", "C"][n % 3],
                        "product_id": product_ids[(n - 1) % len(product_ids)],
                        "quality_id": quality_ids[(n - 1) % len(quality_ids)] if quality_ids else None,
                        "machine_id": machine_ids[(n - 1) % len(machine_ids)] if machine_ids else None,
                        "planned_qty": planned,
                        "actual_qty": actual,
                        "input_qty": planned + (n % 25),
                        "status": ["PLANNED", "IN_PROGRESS", "COMPLETED"][n % 3],
                        "remarks": f"Dummy production {n}",
                    },
                )
            summary["topped_up"].append(f"production_orders +{need}")
        else:
            summary["skipped"].append("production_orders (missing or no masters)")

        # 6) PURCHASE INVOICES
        if exists("purchase_invoice") and exists("grn"):
            current = count("purchase_invoice")
            need = max(0, min_rows - current)
            grn_rows = db.execute(
                text(
                    """
                    SELECT g.id, g.po_id, g.party_id
                    FROM grn g
                    LEFT JOIN purchase_invoice pi ON pi.grn_id = g.id
                    WHERE pi.id IS NULL
                    ORDER BY g.id
                    """
                )
            ).mappings().all()
            created = 0
            for i, row in enumerate(grn_rows[:need], start=1):
                n = current + i
                taxable = 3500 + (n * 90)
                gstp = 5 if n % 2 else 12
                gst_amt = round(taxable * gstp / 100, 2)
                db.execute(
                    text(
                        """
                        INSERT INTO purchase_invoice
                        (invoice_number, invoice_date, grn_id, po_id, party_id, supplier_inv_no,
                         supplier_inv_date, taxable_amount, gst_percent, gst_amount, total_amount,
                         payment_status, due_date)
                        VALUES
                        (:invoice_number, :invoice_date, :grn_id, :po_id, :party_id, :supplier_inv_no,
                         :supplier_inv_date, :taxable_amount, :gst_percent, :gst_amount, :total_amount,
                         :payment_status, :due_date)
                        """
                    ),
                    {
                        "invoice_number": f"PINV/{fy}/{n:04d}",
                        "invoice_date": today - timedelta(days=n % 10),
                        "grn_id": row["id"],
                        "po_id": row["po_id"],
                        "party_id": row["party_id"],
                        "supplier_inv_no": f"SUPINV{n:05d}",
                        "supplier_inv_date": today - timedelta(days=n % 12),
                        "taxable_amount": taxable,
                        "gst_percent": gstp,
                        "gst_amount": gst_amt,
                        "total_amount": round(taxable + gst_amt, 2),
                        "payment_status": "UNPAID",
                        "due_date": today + timedelta(days=30),
                    },
                )
                created += 1
            summary["topped_up"].append(f"purchase_invoice +{created}")
        else:
            summary["skipped"].append("purchase_invoice (missing)")

        # 7) SALES ORDER + ITEMS
        so_ids = []
        if exists("sales_orders") and exists("sales_order_items") and customer_ids and product_ids:
            quote_ids = [r[0] for r in db.execute(text("SELECT id FROM quotations ORDER BY id")).fetchall()] if exists("quotations") else []
            current = count("sales_orders")
            need = max(0, min_rows - current)
            for i in range(need):
                n = current + i + 1
                qty = 60 + (n % 70)
                rate = 85 + (n % 30)
                gstp = 5 if n % 2 else 12
                taxable = qty * rate
                gst_amt = round(taxable * gstp / 100, 2)
                total = round(taxable + gst_amt, 2)
                delivered = qty // 2
                pending = qty - delivered
                so_id = db.execute(
                    text(
                        """
                        INSERT INTO sales_orders
                        (so_number, so_date, customer_id, quotation_id, delivery_date, total_amount, status, remarks)
                        VALUES
                        (:so_number, :so_date, :customer_id, :quotation_id, :delivery_date, :total_amount, :status, :remarks)
                        RETURNING id
                        """
                    ),
                    {
                        "so_number": f"SO/{fy}/{n:04d}",
                        "so_date": today - timedelta(days=n % 15),
                        "customer_id": customer_ids[(n - 1) % len(customer_ids)],
                        "quotation_id": quote_ids[(n - 1) % len(quote_ids)] if quote_ids else None,
                        "delivery_date": today + timedelta(days=5 + (n % 10)),
                        "total_amount": total,
                        "status": "PARTIAL",
                        "remarks": f"Dummy SO {n}",
                    },
                ).scalar()
                so_ids.append(so_id)
                db.execute(
                    text(
                        """
                        INSERT INTO sales_order_items
                        (so_id, product_id, quality_id, qty, unit, rate, gst_percent, taxable_amount, gst_amount, total_amount, pending_qty, delivered_qty)
                        VALUES
                        (:so_id, :product_id, :quality_id, :qty, 'MTR', :rate, :gst_percent, :taxable_amount, :gst_amount, :total_amount, :pending_qty, :delivered_qty)
                        """
                    ),
                    {
                        "so_id": so_id,
                        "product_id": product_ids[(n - 1) % len(product_ids)],
                        "quality_id": quality_ids[(n - 1) % len(quality_ids)] if quality_ids else None,
                        "qty": qty,
                        "rate": rate,
                        "gst_percent": gstp,
                        "taxable_amount": taxable,
                        "gst_amount": gst_amt,
                        "total_amount": total,
                        "pending_qty": pending,
                        "delivered_qty": delivered,
                    },
                )
            summary["topped_up"].append(f"sales_orders + items +{need}")
        else:
            summary["skipped"].append("sales_orders/sales_order_items (missing or no masters)")

        # 8) DELIVERY CHALLANS + ITEMS
        if exists("delivery_challans") and exists("delivery_challan_items"):
            so_ids_all = [r[0] for r in db.execute(text("SELECT id FROM sales_orders ORDER BY id")).fetchall()] if exists("sales_orders") else []
            so_item_map = {
                r["so_id"]: r["id"]
                for r in db.execute(text("SELECT id, so_id FROM sales_order_items ORDER BY id")).mappings().all()
            } if exists("sales_order_items") else {}
            current = count("delivery_challans")
            need = max(0, min_rows - current)
            created = 0
            for i in range(need):
                if not so_ids_all:
                    break
                n = current + i + 1
                so_id = so_ids_all[(n - 1) % len(so_ids_all)]
                so_item_id = so_item_map.get(so_id)
                if not so_item_id:
                    continue
                dqty = 20 + (n % 40)
                rate = 90 + (n % 25)
                challan_id = db.execute(
                    text(
                        """
                        INSERT INTO delivery_challans
                        (challan_number, challan_date, so_id, vehicle_no, driver_name, status, remarks)
                        VALUES
                        (:challan_number, :challan_date, :so_id, :vehicle_no, :driver_name, 'DELIVERED', :remarks)
                        RETURNING id
                        """
                    ),
                    {
                        "challan_number": f"DC/{fy}/{n:04d}",
                        "challan_date": today - timedelta(days=n % 12),
                        "so_id": so_id,
                        "vehicle_no": f"GJ01XY{7000+n}",
                        "driver_name": f"Driver {n}",
                        "remarks": f"Dummy DC {n}",
                    },
                ).scalar()
                db.execute(
                    text(
                        """
                        INSERT INTO delivery_challan_items
                        (challan_id, so_item_id, product_id, quality_id, delivery_qty, unit, rate, gst_percent, taxable_amount, gst_amount)
                        VALUES
                        (:challan_id, :so_item_id, :product_id, :quality_id, :delivery_qty, 'MTR', :rate, 5, :taxable_amount, :gst_amount)
                        """
                    ),
                    {
                        "challan_id": challan_id,
                        "so_item_id": so_item_id,
                        "product_id": product_ids[(n - 1) % len(product_ids)] if product_ids else None,
                        "quality_id": quality_ids[(n - 1) % len(quality_ids)] if quality_ids else None,
                        "delivery_qty": dqty,
                        "rate": rate,
                        "taxable_amount": dqty * rate,
                        "gst_amount": round(dqty * rate * 0.05, 2),
                    },
                )
                created += 1
            summary["topped_up"].append(f"delivery_challans + items +{created}")
        else:
            summary["skipped"].append("delivery_challans/delivery_challan_items (missing)")

        # 9) SALES INVOICES
        if exists("sales_invoices") and exists("delivery_challans"):
            challans = db.execute(
                text(
                    """
                    SELECT dc.id, dc.so_id, so.customer_id
                    FROM delivery_challans dc
                    JOIN sales_orders so ON so.id = dc.so_id
                    LEFT JOIN sales_invoices si ON si.challan_id = dc.id
                    WHERE si.id IS NULL
                    ORDER BY dc.id
                    """
                )
            ).mappings().all()
            current = count("sales_invoices")
            need = max(0, min_rows - current)
            created = 0
            for i, row in enumerate(challans[:need], start=1):
                n = current + i
                taxable = 3000 + (n * 100)
                cgst = round(taxable * 0.025, 2)
                sgst = round(taxable * 0.025, 2)
                grand = round(taxable + cgst + sgst, 2)
                paid = round(grand * 0.4, 2)
                db.execute(
                    text(
                        """
                        INSERT INTO sales_invoices
                        (invoice_number, invoice_date, challan_id, so_id, customer_id, taxable_amount,
                         cgst_amount, sgst_amount, igst_amount, total_gst, grand_total, gst_type,
                         due_date, payment_status, amount_paid, remarks)
                        VALUES
                        (:invoice_number, :invoice_date, :challan_id, :so_id, :customer_id, :taxable_amount,
                         :cgst_amount, :sgst_amount, 0, :total_gst, :grand_total, 'CGST/SGST',
                         :due_date, 'PARTIAL', :amount_paid, :remarks)
                        """
                    ),
                    {
                        "invoice_number": f"SINV/{fy}/{n:04d}",
                        "invoice_date": today - timedelta(days=n % 10),
                        "challan_id": row["id"],
                        "so_id": row["so_id"],
                        "customer_id": row["customer_id"],
                        "taxable_amount": taxable,
                        "cgst_amount": cgst,
                        "sgst_amount": sgst,
                        "total_gst": cgst + sgst,
                        "grand_total": grand,
                        "due_date": today + timedelta(days=20),
                        "amount_paid": paid,
                        "remarks": f"Dummy sales invoice {n}",
                    },
                )
                created += 1
            summary["topped_up"].append(f"sales_invoices +{created}")
        else:
            summary["skipped"].append("sales_invoices (missing)")

        # 10) PAYMENT RECEIPTS
        if exists("payment_receipts") and exists("sales_invoices"):
            invoice_rows = db.execute(
                text(
                    """
                    SELECT id, grand_total, amount_paid
                    FROM sales_invoices
                    WHERE amount_paid < grand_total
                    ORDER BY id
                    """
                )
            ).mappings().all()
            current = count("payment_receipts")
            need = max(0, min_rows - current)
            created = 0
            for i, row in enumerate(invoice_rows[:need], start=1):
                n = current + i
                pending = float(row["grand_total"]) - float(row["amount_paid"])
                pay = min(pending, 1000 + (n % 4) * 500)
                db.execute(
                    text(
                        """
                        INSERT INTO payment_receipts
                        (receipt_number, receipt_date, invoice_id, amount_received, payment_mode, reference_no, remarks)
                        VALUES
                        (:receipt_number, :receipt_date, :invoice_id, :amount_received, :payment_mode, :reference_no, :remarks)
                        """
                    ),
                    {
                        "receipt_number": f"RCP/{fy}/{n:04d}",
                        "receipt_date": today - timedelta(days=n % 8),
                        "invoice_id": row["id"],
                        "amount_received": pay,
                        "payment_mode": ["Cash", "UPI", "NEFT"][n % 3],
                        "reference_no": f"REF{n:05d}",
                        "remarks": f"Dummy receipt {n}",
                    },
                )
                new_paid = float(row["amount_paid"]) + pay
                new_status = "PAID" if new_paid >= float(row["grand_total"]) else "PARTIAL"
                db.execute(
                    text("UPDATE sales_invoices SET amount_paid=:paid, payment_status=:status WHERE id=:id"),
                    {"paid": new_paid, "status": new_status, "id": row["id"]},
                )
                created += 1
            summary["topped_up"].append(f"payment_receipts +{created}")
        else:
            summary["skipped"].append("payment_receipts (missing)")

        db.commit()
        return summary

    except Exception as exc:
        db.rollback()
        summary["status"] = "error"
        summary["errors"].append(str(exc))
        return summary
    finally:
        db.close()
