"""
Auth router — thin route handlers that delegate to auth_service.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RefreshRequest, TokenResponse, UserLogin, UserOut, UserRegister
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new user.
    In production this would be Admin-only; for demo it is open so seed accounts can be created.
    """
    user = await auth_service.register_user(db, data)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate and receive JWT access + refresh tokens.
    Lockout triggers after 5 consecutive failed attempts.
    """
    return await auth_service.login_user(db, data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    return await auth_service.refresh_access_token(db, body.refresh_token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
