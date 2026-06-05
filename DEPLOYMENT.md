# Deployment Notes

## Backend

1. Create env file from template:
   - `backend/.env.example` -> `backend/.env`
2. Set secure values:
   - `DATABASE_URL`
   - `JWT_SECRET_KEY` (must not be default)
   - `CORS_ORIGINS`
3. Install dependencies:
   - `pip install -r backend/requirements.txt`
4. Run API:
   - `uvicorn app.main:app --host 0.0.0.0 --port 8000`

Health check endpoint: `/healthz`

## Frontend

1. Create env file:
   - `frontend/.env.example` -> `frontend/.env`
2. Set `REACT_APP_API_BASE_URL`
3. Build:
   - `npm ci`
   - `npm run build`

## Security Baseline Added

- JWT bearer authentication
- Password hash verification (bcrypt)
- Legacy plain-text password auto-migration on successful login
- Environment-driven DB and CORS config
- Removed API side-effect call from frontend client
