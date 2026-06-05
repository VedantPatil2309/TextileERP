from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db

router = APIRouter(prefix="/kpis", tags=["KPIs"])


@router.get("/")
def get_kpis(db: Session = Depends(get_db)):
    """
    Calculate live KPIs from real module data:
    - OEE: avg efficiency from production orders (actual_qty / planned_qty)
    - Yield: avg yield from production orders (actual_qty / input_qty)
    - OTD: % of sales orders delivered by expected delivery date
    - Margin: gross margin from sales invoices vs purchase invoices (this month)
    """

    # ── OEE — avg efficiency from production orders ──────────
    oee_row = db.execute(text("""
        SELECT
            CASE WHEN SUM(planned_qty) > 0
                 THEN ROUND((SUM(actual_qty) / SUM(planned_qty)) * 100, 1)
                 ELSE 0 END AS oee
        FROM production_orders
        WHERE status = 'COMPLETED'
          AND planned_qty > 0
          AND production_date >= CURRENT_DATE - INTERVAL '30 days'
    """)).fetchone()

    # ── Yield — avg yield from production orders ─────────────
    yield_row = db.execute(text("""
        SELECT
            CASE WHEN SUM(input_qty) > 0
                 THEN ROUND((SUM(actual_qty) / SUM(input_qty)) * 100, 1)
                 ELSE 0 END AS yield_pct
        FROM production_orders
        WHERE status = 'COMPLETED'
          AND input_qty > 0
          AND production_date >= CURRENT_DATE - INTERVAL '30 days'
    """)).fetchone()

    # ── OTD — % SO delivered on time ─────────────────────────
    otd_row = db.execute(text("""
        SELECT
            CASE WHEN COUNT(*) > 0
                 THEN ROUND(
                     COUNT(*) FILTER (
                         WHERE status = 'CLOSED'
                         AND (delivery_date IS NULL OR delivery_date >= so_date)
                     )::numeric / COUNT(*) * 100, 1)
                 ELSE 0 END AS otd
        FROM sales_orders
        WHERE so_date >= CURRENT_DATE - INTERVAL '30 days'
    """)).fetchone()

    # ── Gross Margin — this month ─────────────────────────────
    margin_row = db.execute(text("""
        WITH rev AS (
            SELECT COALESCE(SUM(grand_total), 0) AS revenue
            FROM sales_invoices
            WHERE DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', CURRENT_DATE)
        ),
        cost AS (
            SELECT COALESCE(SUM(total_amount), 0) AS purchase_cost
            FROM purchase_invoice
            WHERE DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', CURRENT_DATE)
        )
        SELECT
            CASE WHEN rev.revenue > 0
                 THEN ROUND(((rev.revenue - cost.purchase_cost) / rev.revenue) * 100, 1)
                 ELSE 0 END AS margin
        FROM rev, cost
    """)).fetchone()

    return {
        "oee":    float(oee_row.oee    if oee_row    and oee_row.oee    else 0),
        "yield":  float(yield_row.yield_pct if yield_row and yield_row.yield_pct else 0),
        "otd":    float(otd_row.otd    if otd_row    and otd_row.otd    else 0),
        "margin": float(margin_row.margin if margin_row and margin_row.margin else 0),
    }
