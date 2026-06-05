import hashlib

import bcrypt


def _to_bytes(password: str) -> bytes:
    return password.encode("utf-8")


def hash_password(password: str) -> str:
    """
    Use bcrypt with SHA-256 pre-hashing to avoid bcrypt's 72-byte limit.
    Stored format:
      bcrypt_sha256$<bcrypt_hash>
    """
    digest = hashlib.sha256(_to_bytes(password)).hexdigest().encode("ascii")
    hashed = bcrypt.hashpw(digest, bcrypt.gensalt()).decode("utf-8")
    return f"bcrypt_sha256${hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False

    raw = _to_bytes(password)

    # New format
    if stored_hash.startswith("bcrypt_sha256$"):
        bcrypt_hash = stored_hash.split("$", 1)[1].encode("utf-8")
        digest = hashlib.sha256(raw).hexdigest().encode("ascii")
        return bcrypt.checkpw(digest, bcrypt_hash)

    # Existing bcrypt hash format
    if stored_hash.startswith("$2a$") or stored_hash.startswith("$2b$") or stored_hash.startswith("$2y$"):
        try:
            return bcrypt.checkpw(raw, stored_hash.encode("utf-8"))
        except ValueError:
            # Some bcrypt backends reject >72 bytes explicitly.
            return False

    # Legacy plain-text fallback
    return password == stored_hash
