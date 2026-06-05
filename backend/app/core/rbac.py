from fastapi import HTTPException

def allow_roles(user, allowed_roles: list):
    if user["role"].upper() not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Access denied for this role"
        )
