"""
auth.py — JWT authentication, password hashing, dependencies
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from bson import ObjectId

from database import db

# ── Config ─────────────────────────────────────────────────

SECRET_KEY  = os.getenv("SECRET_KEY", "change-me-in-production-super-secret-key-2024")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "24"))

security = HTTPBearer()


# ── Pydantic model ──────────────────────────────────────────

class UserInDB(BaseModel):
    id: str
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


# ── Password ────────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT ─────────────────────────────────────────────────────

def create_token(payload: dict, expires_hours: int = TOKEN_EXPIRE_HOURS) -> str:
    data = payload.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    data["exp"] = expire
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Dependencies ────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserInDB:
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user ID in token.")

    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")

    return UserInDB(
        id=str(user["_id"]),
        name=user.get("name", ""),
        email=user["email"],
        role=user["role"],
    )


def require_admin(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user
