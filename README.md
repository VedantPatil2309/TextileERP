# Textile ERP

A full-stack ERP application for textile operations, covering:
- Masters (products, quality, machines, parties)
- Purchase (PO -> GRN -> Purchase Invoice)
- Sales (SO -> Delivery Challan -> Sales Invoice -> Receipts)
- Inventory and stock movement tracking
- CRM (customers, leads, quotations)
- Finance and KPI dashboards

## Tech Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL, JWT Auth
- Frontend: React (CRA), React Router, Axios, Tailwind CSS, Recharts

## Project Structure

```text
erp/
  backend/
    app/
      api/         # module APIs
      routers/     # purchase routes
      core/        # auth, db, security, dependencies
      services/    # domain helpers (stock, KPI)
      models/      # currently minimal
      main.py      # FastAPI app entry
    requirements.txt
    .env.example
  frontend/
    src/
      pages/
      components/
      layouts/
      services/
      utils/
    package.json
    .env.example
  purchase_schema.sql
  DEPLOYMENT.md
```

## Prerequisites

- Python 3.10+
- Node.js 20+
- PostgreSQL 14+

## Environment Setup

### Backend

1. Copy env file:
```bash
cp backend/.env.example backend/.env
```
2. Set values in `backend/.env`:
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `CORS_ORIGINS`

### Frontend

1. Copy env file:
```bash
cp frontend/.env.example frontend/.env
```
2. Set value in `frontend/.env`:
- `REACT_APP_API_BASE_URL` (example: `http://127.0.0.1:8000`)

## Local Run

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# Linux/macOS
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `GET /healthz`

### Frontend

```bash
cd frontend
npm ci
npm start
```

## Build

```bash
cd frontend
npm run build
```

## Security Notes

- Auth uses JWT Bearer token.
- Passwords are stored as bcrypt hashes.
- Legacy plain-text passwords are auto-migrated to hash on successful login.
- Never commit `.env` files.

## Deployment Notes

See `DEPLOYMENT.md` for deployment checklist.

## Recommended Next Improvements

- Add backend tests (auth, RBAC, stock transactions, purchase/sales workflows)
- Add Alembic migrations for schema versioning
- Add CI workflow (lint + tests + build)
- Add Dockerfiles for backend/frontend
