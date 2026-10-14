from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "PASSENGER" # PASSENGER, DRIVER, FLEET_MANAGER, ADMIN
    phone: Optional[str] = None
    college_id: Optional[str] = None
    department: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class DemoLogin(BaseModel):
    role: str # "PASSENGER" | "DRIVER" | "FLEET_MANAGER" | "ADMIN"

class CampusVerification(BaseModel):
    college_id: str
    department: str
    student_or_staff: str = "STUDENT"

class WalletTopupRequest(BaseModel):
    amount: float

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    wallet_balance: float
    is_verified: bool
    college_id: Optional[str] = None
    department: Optional[str] = None
    driver_profile_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
