from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db_dependency import get_db
from app.core.current_user import get_current_user
from app.core.rbac import allow_roles

router = APIRouter(prefix="/production", tags=["Production"])


# ── Auto-generate Production Order Number ────────────────────
def generate_order_number(db: Session) -> str:
    from datetime import date
    today = date.today()
    fy = f"{str(today.year)[2:]}{str(today.year+1)[2:]}" if today.month >= 4 \
         else f"{str(today.year-1)[2:]}{str(today.year)[2:]}"

    row = db.execute(text("""
        SELECT COUNT(*) AS cnt FROM production_orders
        WHERE order_number LIKE :pattern
    """), {"pattern": f"PRD/{fy}/%"}).fetchone()

    return f"PRD/{fy}/{str((row.cnt or 0) + 1).zfill(4)}"


# ── GET /production/masters ──────────────────────────────────
@router.get("/masters")
def get_masters(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "PRODUCTION"])

    products = db.execute(text("""
        SELECT id, product_name, category, unit
        FROM product_master WHERE is_active = true ORDER BY product_name
    """)).mappings().all()

    qualities = db.execute(text("""
        SELECT id, quality_name, grade
        FROM quality_master WHERE is_active = true ORDER BY quality_name
    """)).mappings().all()

    machines = db.execute(text("""
        SELECT id, machine_name, machine_type, department
        FROM machine_master WHERE is_active = true ORDER BY machine_name
    """)).mappings().all()

    return {
        "products":  list(products),
        "qualities": list(qualities),
        "machines":  list(machines),
    }


# ── GET /production/orders ───────────────────────────────────
@router.get("/orders")
def list_orders(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "PRODUCTION"])

    rows = db.execute(text("""
        SELECT
            po.id,
            po.order_number,
            po.production_date,
            po.shift,
            po.planned_qty,
            po.actual_qty,
            po.input_qty,
            po.status,
            po.remarks,
            pm.product_name,
            qm.quality_name,
            mm.machine_name,
            mm.machine_type
        FROM production_orders po
        JOIN product_master  pm ON pm.id = po.product_id
        LEFT JOIN quality_master qm ON qm.id = po.quality_id
        LEFT JOIN machine_master mm ON mm.id = po.machine_id
        ORDER BY po.id DESC
    """)).mappings().all()

    return rows


# ── POST /production/orders ──────────────────────────────────
@router.post("/orders")
def create_order(
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "PRODUCTION"])

    try:
        order_number = generate_order_number(db)

        db.execute(text("""
            INSERT INTO production_orders
                (order_number, production_date, shift, product_id, quality_id,
                 machine_id, planned_qty, actual_qty, input_qty, status, remarks)
            VALUES
                (:order_number, :production_date, :shift, :product_id, :quality_id,
                 :machine_id, :planned_qty, :actual_qty, :input_qty, 'PLANNED', :remarks)
        """), {
            "order_number":    order_number,
            "production_date": data["production_date"],
            "shift":           data.get("shift", ""),
            "product_id":      data["product_id"],
            "quality_id":      data.get("quality_id") or None,
            "machine_id":      data.get("machine_id") or None,
            "planned_qty":     data.get("planned_qty") or None,
            "actual_qty":      data.get("actual_qty")  or None,
            "input_qty":       data.get("input_qty")   or None,
            "remarks":         data.get("remarks", ""),
        })

        db.commit()
        return {"status": "success", "message": f"Production Order {order_number} created", "order_number": order_number}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


# ── PATCH /production/orders/{id}/status ─────────────────────
@router.patch("/orders/{id}/status")
def update_status(
    id: int,
    data: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    allow_roles(user, ["ADMIN", "MANAGER", "PRODUCTION"])

    try:
        db.execute(text("""
            UPDATE production_orders SET status = :status WHERE id = :id
        """), {"status": data["status"], "id": id})

        db.commit()
        return {"status": "success", "message": "Status updated"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
 