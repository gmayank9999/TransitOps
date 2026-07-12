"""
Auth service — register, login (with account lockout), token refresh.
"""

import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.schemas.auth import UserLogin, UserRegister

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _password_meets_policy(password: str) -> bool:
    """At least 8 chars, at least one digit."""
    return len(password) >= 8 and bool(re.search(r"\d", password))


async def register_user(db: AsyncSession, data: UserRegister) -> User:
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Password policy
    if not _password_meets_policy(data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters and contain at least one digit",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def login_user(db: AsyncSession, data: UserLogin) -> dict:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Use the same generic failure path for both wrong email and wrong password
    # so we don't leak whether an email is registered (timing difference is acceptable here)
    generic_failure = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )

    if user is None:
        raise generic_failure

    # Account lockout check
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account locked due to too many failed attempts. Try again later.",
        )

    if not verify_password(data.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        await db.flush()
        raise generic_failure

    # Successful login — reset lockout counters
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.flush()

    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id, remember_me=data.remember_me)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
    }


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict:
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise JWTError("not a refresh token")
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return {
        "access_token": create_access_token(user.id, user.role.value),
        "refresh_token": refresh_token,  # keep the existing refresh token
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name,
    }
