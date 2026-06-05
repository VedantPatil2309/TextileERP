from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles
from datetime import date

router = APIRouter(prefix="/finance", tags=["Finance"])


def get_date_filter(period: str):
    today = date.today()
    if period == "month":
        return f"{today.year}-{today.month:02d}-01"
    elif period == "quarter":
        q_start_month = ((today.month - 1) // 3) * 3 + 1
        return f"{today.year}-{q_start_month:02d}-01"
    else:  # year — Indian FY April to March
        fy_start = today.year if today.month >= 4 else today.year - 1
        return f"{fy_start}-04-01"


@router.get("/summary")
def finance_summary(
    period: str = "month",
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "ACCOUNTS", "MANAGER"])
    from_date = get_date_filter(period)

    # ── Revenue from sales invoices ─────────────────────────
    rev = db.execute(text("""
        SELECT
            COALESCE(SUM(grand_total), 0)    AS revenue,
            COALESCE(SUM(total_gst), 0)      AS total_gst_collected,
            COALESCE(SUM(amount_paid), 0)    AS amount_collected,
            COALESCE(SUM(grand_total - amount_paid) FILTER (WHERE payment_status != 'PAID'), 0)
                                              AS outstanding_receivable,
            COUNT(*)                          AS invoice_count,
            COUNT(*) FILTER (WHERE payment_status != 'PAID')
                                              AS unpaid_invoices,
            CASE WHEN COUNT(*) > 0
                 THEN AVG(grand_total) ELSE 0 END AS avg_invoice_value
        FROM sales_invoices
        WHERE invoice_date >= :from_date
    """), {"from_date": from_date}).fetchone()

    # ── Purchase cost ────────────────────────────────────────
    pur = db.execute(text("""
        SELECT
            COALESCE(SUM(total_amount), 0) AS purchase_cost,
            COALESCE(SUM(total_amount) FILTER (WHERE payment_status != 'PAID'), 0)
                                            AS purchase_outstanding,
            COUNT(*)                        AS purchase_invoice_count
        FROM purchase_invoice
        WHERE invoice_date >= :from_date
    """), {"from_date": from_date}).fetchone()

    # ── Monthly trend (last 6 months always) ────────────────
    trend = db.execute(text("""
        SELECT
            TO_CHAR(m.month, 'Mon') AS month,
            COALESCE(s.revenue, 0)       AS revenue,
            COALESCE(p.purchase_cost, 0) AS purchase_cost,
            COALESCE(r.collected, 0)     AS collected
        FROM generate_series(
            DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
            DATE_TRUNC('month', CURRENT_DATE),
            '1 month'
        ) AS m(month)
        LEFT JOIN (
            SELECT DATE_TRUNC('month', invoice_date) AS mo,
                   SUM(grand_total) AS revenue
            FROM sales_invoices GROUP BY mo
        ) s ON s.mo = m.month
        LEFT JOIN (
            SELECT DATE_TRUNC('month', invoice_date) AS mo,
                   SUM(total_amount) AS purchase_cost
            FROM purchase_invoice GROUP BY mo
        ) p ON p.mo = m.month
        LEFT JOIN (
            SELECT DATE_TRUNC('month', receipt_date) AS mo,
                   SUM(amount_received) AS collected
            FROM payment_receipts GROUP BY mo
        ) r ON r.mo = m.month
        ORDER BY m.month
    """)).mappings().all()

    # ── Top customers by revenue ─────────────────────────────
    top_customers = db.execute(text("""
        SELECT
            pm.party_name AS customer_name,
            SUM(si.grand_total) AS total_revenue,
            SUM(si.grand_total - si.amount_paid) FILTER (WHERE si.payment_status != 'PAID')
                AS outstanding
        FROM sales_invoices si
        JOIN party_master pm ON pm.id = si.customer_id
        WHERE si.invoice_date >= :from_date
        GROUP BY pm.party_name
        ORDER BY total_revenue DESC
        LIMIT 5
    """), {"from_date": from_date}).mappings().all()

    # ── Overdue invoices ─────────────────────────────────────
    overdue = db.execute(text("""
        SELECT
            si.invoice_number,
            pm.party_name AS customer_name,
            (si.grand_total - si.amount_paid) AS balance,
            (CURRENT_DATE - si.due_date)       AS days_overdue
        FROM sales_invoices si
        JOIN party_master pm ON pm.id = si.customer_id
        WHERE si.payment_status != 'PAID'
          AND si.due_date IS NOT NULL
          AND si.due_date < CURRENT_DATE
        ORDER BY days_overdue DESC
        LIMIT 10
    """)).mappings().all()

    return {
        "revenue":                float(rev.revenue),
        "total_gst_collected":    float(rev.total_gst_collected),
        "amount_collected":       float(rev.amount_collected),
        "outstanding_receivable": float(rev.outstanding_receivable),
        "invoice_count":          int(rev.invoice_count),
        "unpaid_invoices":        int(rev.unpaid_invoices),
        "avg_invoice_value":      float(rev.avg_invoice_value),
        "purchase_cost":          float(pur.purchase_cost),
        "purchase_outstanding":   float(pur.purchase_outstanding),
        "purchase_invoice_count": int(pur.purchase_invoice_count),
        "monthly_trend":          [dict(r) for r in trend],
        "top_customers":          [dict(r) for r in top_customers],
        "overdue_invoices":       [dict(r) for r in overdue],
    }
