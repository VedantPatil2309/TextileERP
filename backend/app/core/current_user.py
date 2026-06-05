from fastapi import Header, HTTPException

from app.core.security import parse_token_payload


def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    token = parts[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        return parse_token_payload(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
