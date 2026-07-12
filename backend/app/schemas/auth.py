"""
Pydantic schemas for User / Auth endpoints.
"""

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters, at least one digit")
    full_name: str = Field(min_length=1, max_length=150)
    role: UserRole

    model_config = {"str_strip_whitespace": True}


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

    model_config = {"str_strip_whitespace": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    full_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}
