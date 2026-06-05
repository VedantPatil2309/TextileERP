from sqlalchemy import text
from sqlalchemy.orm import Session


def ensure_stock_movements_table(db: Session) -> None:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS stock_movements (
            id            SERIAL PRIMARY KEY,
            movement_date TIMESTAMP    NOT NULL DEFAULT NOW(),
            movement_type VARCHAR(20)  NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
            source_module VARCHAR(30)  NOT NULL,
            source_id     INT,
            source_ref    VARCHAR(40),
            product_id    INT          NOT NULL REFERENCES product_master(id),
            quality_id    INT          REFERENCES quality_master(id),
            qty           NUMERIC(10,3) NOT NULL,
            unit          VARCHAR(10),
            rate          NUMERIC(10,2) DEFAULT 0,
            remarks       TEXT
        );
    """))


def record_stock_movement(
    db: Session,
    *,
    movement_type: str,
    source_module: str,
    source_id: int | None,
    source_ref: str | None,
    product_id: int,
    quality_id: int | None,
    qty: float,
    unit: str | None,
    rate: float | None = None,
    remarks: str | None = None,
) -> None:
    ensure_stock_movements_table(db)
    db.execute(text("""
        INSERT INTO stock_movements
            (movement_type, source_module, source_id, source_ref,
             product_id, quality_id, qty, unit, rate, remarks)
        VALUES
            (:movement_type, :source_module, :source_id, :source_ref,
             :product_id, :quality_id, :qty, :unit, :rate, :remarks)
    """), {
        "movement_type": movement_type,
        "source_module": source_module,
        "source_id": source_id,
        "source_ref": source_ref,
        "product_id": product_id,
        "quality_id": quality_id,
        "qty": qty,
        "unit": unit or "",
        "rate": rate or 0,
        "remarks": remarks or "",
    })


def add_stock(
    db: Session,
    *,
    product_id: int,
    quality_id: int | None,
    qty: float,
    unit: str | None,
) -> None:
    existing = db.execute(text("""
        SELECT id
        FROM stock_ledger
        WHERE product_id = :product_id
          AND quality_id IS NOT DISTINCT FROM :quality_id
    """), {
        "product_id": product_id,
        "quality_id": quality_id,
    }).fetchone()

    if existing:
        db.execute(text("""
            UPDATE stock_ledger
            SET quantity = quantity + :qty,
                last_updated = NOW()
            WHERE id = :id
        """), {
            "qty": qty,
            "id": existing.id,
        })
    else:
        db.execute(text("""
            INSERT INTO stock_ledger
                (product_id, quality_id, quantity, unit, last_updated)
            VALUES
                (:product_id, :quality_id, :qty, :unit, NOW())
        """), {
            "product_id": product_id,
            "quality_id": quality_id,
            "qty": qty,
            "unit": unit or "",
        })


def deduct_stock(
    db: Session,
    *,
    product_id: int,
    quality_id: int | None,
    qty: float,
) -> None:
    row = db.execute(text("""
        SELECT id, quantity
        FROM stock_ledger
        WHERE product_id = :product_id
          AND quality_id IS NOT DISTINCT FROM :quality_id
    """), {
        "product_id": product_id,
        "quality_id": quality_id,
    }).fetchone()

    available = float(row.quantity) if row else 0.0
    if available < qty:
        raise ValueError(
            f"Insufficient stock. Available: {available}, Requested: {qty}"
        )

    db.execute(text("""
        UPDATE stock_ledger
        SET quantity = quantity - :qty,
            last_updated = NOW()
        WHERE id = :id
    """), {
        "qty": qty,
        "id": row.id,
    })
