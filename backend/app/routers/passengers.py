from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, PassengerProfile, RecurringRide, AuditLog
from ..schemas import RecurringRideCreate, RecurringRideResponse
from ..auth_utils import get_current_user

router = APIRouter(prefix="/api/passengers", tags=["Passenger & Recurring Commute"])

@router.get("/profile")
def get_passenger_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = current_user.passenger_profile
    if not profile:
        profile = PassengerProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return {
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "college_id": current_user.college_id,
        "department": current_user.department,
        "is_verified": current_user.is_verified,
        "wallet_balance": current_user.wallet_balance,
        "student_or_staff": profile.student_or_staff,
        "total_rides_taken": profile.total_rides_taken,
        "saved_co2_kg": profile.saved_co2_kg,
    }

@router.post("/recurring-rides", response_model=RecurringRideResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_ride(
    data: RecurringRideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Recurring Commute Planning: Schedule repeated rides (Daily, Weekdays,
    Weekly morning campus travel / evening return).
    """
    recurring = RecurringRide(
        user_id=current_user.id,
        title=data.title,
        origin_name=data.origin_name,
        origin_lat=data.origin_lat,
        origin_lng=data.origin_lng,
        destination_name=data.destination_name,
        destination_lat=data.destination_lat,
        destination_lng=data.destination_lng,
        departure_time=data.departure_time,
        frequency=data.frequency,
        days_of_week=data.days_of_week,
        seats_needed=data.seats_needed,
        is_active=True
    )
    db.add(recurring)
    db.add(AuditLog(
        user_id=current_user.id,
        action="CREATE_RECURRING_RIDE",
        resource_type="RECURRING_RIDE",
        details=f"Scheduled recurring commute: {data.title} ({data.frequency} at {data.departure_time})"
    ))
    db.commit()
    db.refresh(recurring)
    return recurring

@router.get("/recurring-rides", response_model=List[RecurringRideResponse])
def list_recurring_rides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(RecurringRide).filter(
        RecurringRide.user_id == current_user.id,
        RecurringRide.is_active == True
    ).order_by(RecurringRide.created_at.desc()).all()

@router.delete("/recurring-rides/{id}")
def cancel_recurring_ride(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recurring = db.query(RecurringRide).filter(
        RecurringRide.id == id,
        RecurringRide.user_id == current_user.id
    ).first()
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring commute plan not found")

    recurring.is_active = False
    db.add(AuditLog(
        user_id=current_user.id,
        action="CANCEL_RECURRING_RIDE",
        resource_type="RECURRING_RIDE",
        resource_id=id,
        details=f"Cancelled recurring ride {recurring.title}"
    ))
    db.commit()
    return {"message": "Recurring ride schedule cancelled successfully"}
