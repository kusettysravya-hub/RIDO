from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, DriverProfile, Vehicle, Ride, AuditLog
from ..auth_utils import get_current_user, require_role

router = APIRouter(prefix="/api/drivers", tags=["Driver Dashboard & Workflow"])

@router.post("/toggle-availability")
def toggle_availability(
    is_online: bool,
    lat: float = 37.7749,
    lng: float = -122.4194,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = current_user.driver_profile
    if not profile:
        raise HTTPException(status_code=400, detail="User does not have an active driver profile")

    profile.is_online = is_online
    profile.current_lat = lat
    profile.current_lng = lng

    # If vehicle attached, update its status
    if profile.vehicle:
        profile.vehicle.status = "AVAILABLE" if is_online else "OFFLINE"

    db.add(AuditLog(
        user_id=current_user.id,
        action="DRIVER_AVAILABILITY_CHANGE",
        resource_type="DRIVER",
        resource_id=profile.id,
        details=f"Driver status set to {'Online' if is_online else 'Offline'}"
    ))

    db.commit()
    return {
        "is_online": profile.is_online,
        "current_lat": profile.current_lat,
        "current_lng": profile.current_lng,
        "message": f"Driver is now {'Online and ready for dispatches' if is_online else 'Offline'}"
    }

@router.get("/dashboard")
def get_driver_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = current_user.driver_profile
    if not profile:
        # Create a default driver profile for demonstration if user switched to driver role
        profile = DriverProfile(
            user_id=current_user.id,
            license_number=f"DL-CAMPUS-{current_user.id[:6].upper()}",
            is_online=True,
            current_lat=37.7793,
            current_lng=-122.4192,
            rating=4.92,
            total_earnings=340.50,
            total_trips=28
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    vehicle = profile.vehicle

    # Find any active ride assigned to this driver
    active_ride = db.query(Ride).filter(
        Ride.driver_id == profile.id,
        Ride.status.in_(["ASSIGNED", "DRIVER_ARRIVING", "STARTED", "IN_PROGRESS"])
    ).first()

    # Find pending requests ready to be accepted
    pending_rides = db.query(Ride).filter(
        Ride.status.in_(["REQUESTED", "MATCHING"])
    ).limit(3).all()

    return {
        "driver_id": profile.id,
        "full_name": current_user.full_name,
        "is_online": profile.is_online,
        "current_lat": profile.current_lat,
        "current_lng": profile.current_lng,
        "rating": profile.rating,
        "total_trips": profile.total_trips,
        "total_earnings": round(profile.total_earnings, 2),
        "license_number": profile.license_number,
        "assigned_vehicle": {
            "id": vehicle.id,
            "plate": vehicle.license_plate,
            "model": f"{vehicle.make} {vehicle.model}",
            "battery_or_fuel": vehicle.battery_or_fuel_level,
            "capacity": vehicle.total_capacity
        } if vehicle else None,
        "active_ride_id": active_ride.id if active_ride else None,
        "pending_offers_count": len(pending_rides)
    }

@router.post("/accept-ride/{ride_id}")
def accept_ride(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = current_user.driver_profile
    if not profile:
        raise HTTPException(status_code=400, detail="Driver profile required")

    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    ride.driver_id = profile.id
    if profile.vehicle:
        ride.vehicle_id = profile.vehicle.id
        profile.vehicle.status = "ON_TRIP"
    ride.status = "ASSIGNED"

    db.add(AuditLog(
        user_id=current_user.id,
        action="DRIVER_ACCEPT_RIDE",
        resource_type="RIDE",
        resource_id=ride.id,
        details=f"Driver {current_user.full_name} accepted ride #{ride.id[:6]}"
    ))

    db.commit()
    return {"success": True, "message": "Ride assignment accepted", "ride_id": ride.id}

@router.post("/verify-otp")
def verify_start_otp(
    ride_id: str,
    otp: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Driver verifies 4-digit passenger OTP code to securely start the trip.
    """
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.start_otp != otp.strip():
        raise HTTPException(status_code=400, detail="Invalid 4-digit start OTP")

    ride.status = "IN_PROGRESS"
    db.add(AuditLog(
        user_id=current_user.id,
        action="RIDE_STARTED_OTP_VERIFIED",
        resource_type="RIDE",
        resource_id=ride.id,
        details=f"Start OTP verified by driver. Ride #{ride.id[:6]} started."
    ))

    db.commit()
    return {"success": True, "message": "OTP Verified! Trip is now in progress."}
