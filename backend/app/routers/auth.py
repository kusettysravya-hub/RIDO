from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, PassengerProfile, DriverProfile, AuditLog
from ..schemas import UserRegister, UserLogin, DemoLogin, CampusVerification, WalletTopupRequest, UserResponse, TokenResponse
from ..auth_utils import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=data.role if data.role in ["PASSENGER", "DRIVER", "FLEET_MANAGER", "ADMIN"] else "PASSENGER",
        phone=data.phone,
        college_id=data.college_id,
        department=data.department,
        is_verified=bool(data.college_id), # verified if college ID provided
        wallet_balance=150.0 if data.role == "PASSENGER" else 50.0
    )
    db.add(new_user)
    db.flush()

    # Create associated profile
    if new_user.role == "PASSENGER":
        profile = PassengerProfile(user_id=new_user.id)
        db.add(profile)
    elif new_user.role == "DRIVER":
        d_profile = DriverProfile(
            user_id=new_user.id,
            license_number=f"DL-CAMPUS-{new_user.id[:6].upper()}"
        )
        db.add(d_profile)

    # Audit log
    db.add(AuditLog(
        user_id=new_user.id,
        action="USER_REGISTER",
        resource_type="USER",
        resource_id=new_user.id,
        details=f"User registered with role {new_user.role}"
    ))

    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "role": new_user.role, "email": new_user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/demo-login", response_model=TokenResponse)
def demo_login(data: DemoLogin, db: Session = Depends(get_db)):
    """
    Frictionless one-click demo login for academic examination and testing.
    """
    role_email_map = {
        "PASSENGER": "student@campuscommute.edu",
        "DRIVER": "driver@campuscommute.edu",
        "FLEET_MANAGER": "fleet@campuscommute.edu",
        "ADMIN": "admin@campuscommute.edu",
    }
    target_email = role_email_map.get(data.role.upper(), "student@campuscommute.edu")
    user = db.query(User).filter(User.email == target_email).first()

    if not user:
        raise HTTPException(status_code=404, detail=f"Demo account for {data.role} not found. Run seed script.")

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/verify-college", response_model=UserResponse)
def verify_college(data: CampusVerification, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Simulates academic institutional verification.
    Grants the user a verified student/staff badge.
    """
    current_user.college_id = data.college_id
    current_user.department = data.department
    current_user.is_verified = True

    if current_user.passenger_profile:
        current_user.passenger_profile.student_or_staff = data.student_or_staff

    db.add(AuditLog(
        user_id=current_user.id,
        action="COLLEGE_VERIFICATION",
        resource_type="USER",
        resource_id=current_user.id,
        details=f"Institutional verification approved for {data.college_id} ({data.department})"
    ))

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/wallet-topup", response_model=UserResponse)
@router.post("/topup", response_model=UserResponse)
def topup_wallet(
    data: WalletTopupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulated wallet top-up for VoltRide academic prototype.
    Updates passenger/user wallet balance in the SQLite database and logs an audit trail.
    """
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Top-up amount must be greater than zero")
    if data.amount > 10000:
        raise HTTPException(status_code=400, detail="Maximum single top-up limit is ₹10,000 in simulation mode")

    current_user.wallet_balance = round(float(current_user.wallet_balance or 0.0) + float(data.amount), 2)

    db.add(AuditLog(
        user_id=current_user.id,
        action="WALLET_TOPUP",
        resource_type="USER",
        resource_id=current_user.id,
        details=f"Simulated wallet top-up: +₹{data.amount:.2f}. New balance: ₹{current_user.wallet_balance:.2f}"
    ))

    db.commit()
    db.refresh(current_user)
    return current_user

