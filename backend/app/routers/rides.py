from typing import List, Optional
from datetime import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    Ride, RidePassenger, RideRequest, User, DriverProfile, Vehicle,
    Payment, Notification, AuditLog
)
from ..schemas import (
    RideCreate, RideResponse, RideSearchQuery, RideMatchScore,
    CostExplanation, RideRequestCreate
)
from ..auth_utils import get_current_user
from ..services.matching_engine import evaluate_ride_matching
from ..services.cost_calculator import calculate_haversine_km, estimate_trip_duration_min, calculate_transparent_cost
from ..services.simulation import generate_simulated_polyline, get_next_ride_status

router = APIRouter(prefix="/api/rides", tags=["Rides & Matching"])

def format_ride_response(ride: Ride) -> dict:
    passengers_list = []
    for p in ride.passengers:
        passengers_list.append({
            "id": p.id,
            "passenger_id": p.passenger_id,
            "passenger_name": p.passenger.full_name if p.passenger else "Student Rider",
            "pickup_name": p.pickup_name,
            "dropoff_name": p.dropoff_name,
            "fare_charged": p.fare_charged,
            "seats_booked": p.seats_booked,
            "status": p.status,
            "joined_at": p.joined_at,
        })

    driver_name = ride.driver.user.full_name if (ride.driver and ride.driver.user) else None
    driver_phone = ride.driver.user.phone if (ride.driver and ride.driver.user) else None
    driver_rating = ride.driver.rating if ride.driver else None
    vehicle_plate = ride.vehicle.license_plate if ride.vehicle else None
    vehicle_model = f"{ride.vehicle.make} {ride.vehicle.model}" if ride.vehicle else None

    return {
        "id": ride.id,
        "driver_id": ride.driver_id,
        "driver_name": driver_name,
        "driver_phone": driver_phone,
        "driver_rating": driver_rating,
        "vehicle_id": ride.vehicle_id,
        "vehicle_plate": vehicle_plate,
        "vehicle_model": vehicle_model,
        "status": ride.status,
        "origin_name": ride.origin_name,
        "origin_lat": ride.origin_lat,
        "origin_lng": ride.origin_lng,
        "destination_name": ride.destination_name,
        "destination_lat": ride.destination_lat,
        "destination_lng": ride.destination_lng,
        "total_distance_km": ride.total_distance_km,
        "estimated_duration_min": ride.estimated_duration_min,
        "total_fare_amount": ride.total_fare_amount,
        "individual_share_amount": ride.individual_share_amount,
        "surge_multiplier": ride.surge_multiplier,
        "start_otp": ride.start_otp,
        "route_polyline": ride.route_polyline,
        "scheduled_departure": ride.scheduled_departure,
        "created_at": ride.created_at,
        "passengers": passengers_list,
    }

@router.post("/search", response_model=List[RideMatchScore])
def search_matching_rides(
    query: RideSearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Intelligent Empty-Seat Optimization: Evaluates active/scheduled rides,
    computes route compatibility, and returns explainable match scores.
    """
    # Find rides that are either REQUESTED, MATCHING, ASSIGNED, or DRIVER_ARRIVING
    available_rides = db.query(Ride).filter(
        Ride.status.in_(["REQUESTED", "MATCHING", "ASSIGNED", "DRIVER_ARRIVING"])
    ).all()

    matches = evaluate_ride_matching(
        passenger_pickup_lat=query.origin_lat,
        passenger_pickup_lng=query.origin_lng,
        passenger_dropoff_lat=query.destination_lat,
        passenger_dropoff_lng=query.destination_lng,
        passenger_user=current_user,
        available_rides=available_rides,
        max_acceptable_detour_km=3.5
    )

    return matches

@router.post("/estimate-cost", response_model=CostExplanation)
def estimate_cost(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
    passengers_count: int = 1,
    vehicle_category: str = "STANDARD_SEDAN"
):
    """
    Returns transparent cost breakdown with empty-seat optimization savings.
    """
    dist_km = calculate_haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
    dist_km = max(1.0, dist_km)
    dur_min = estimate_trip_duration_min(dist_km)

    cost_data = calculate_transparent_cost(
        distance_km=dist_km,
        duration_min=dur_min,
        passengers_count=passengers_count,
        capacity=4,
        surge_multiplier=1.0,
        vehicle_category=vehicle_category
    )
    return cost_data

@router.post("/create", response_model=RideResponse)
def create_ride(
    data: RideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new ride or shared commute trip.
    """
    dist_km = calculate_haversine_km(data.origin_lat, data.origin_lng, data.destination_lat, data.destination_lng)
    dist_km = max(1.0, dist_km)
    dur_min = estimate_trip_duration_min(dist_km)

    cost_info = calculate_transparent_cost(
        distance_km=dist_km,
        duration_min=dur_min,
        passengers_count=1,
        capacity=4
    )

    polyline = generate_simulated_polyline(
        data.origin_lat, data.origin_lng,
        data.destination_lat, data.destination_lng
    )

    # Assign an available driver & vehicle if available
    driver_profile = None
    vehicle = None

    if current_user.role == "DRIVER":
        if current_user.driver_profile:
            driver_profile = current_user.driver_profile
        else:
            driver_profile = db.query(DriverProfile).filter(DriverProfile.user_id == current_user.id).first()
        if not driver_profile:
            driver_profile = DriverProfile(
                user_id=current_user.id,
                license_number=f"DL-CAMPUS-{current_user.id[:6].upper()}",
                is_online=True,
                current_lat=data.origin_lat,
                current_lng=data.origin_lng,
                rating=4.95,
                total_earnings=150.0,
                total_trips=10
            )
            db.add(driver_profile)
            db.flush()

        if data.vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
        if not vehicle and driver_profile.vehicle:
            vehicle = driver_profile.vehicle
        if not vehicle:
            vehicle = db.query(Vehicle).filter(Vehicle.status.in_(["AVAILABLE", "OFFLINE"])).first() or db.query(Vehicle).first()
            if vehicle and not driver_profile.vehicle_id:
                driver_profile.vehicle_id = vehicle.id
    else:
        # Auto-match with an online driver
        available_driver = db.query(DriverProfile).filter(DriverProfile.is_online == True).first()
        if available_driver:
            driver_profile = available_driver
            vehicle = available_driver.vehicle

    ride = Ride(
        driver_id=driver_profile.id if driver_profile else None,
        vehicle_id=vehicle.id if vehicle else None,
        status="ASSIGNED" if driver_profile else "REQUESTED",
        origin_name=data.origin_name,
        origin_lat=data.origin_lat,
        origin_lng=data.origin_lng,
        destination_name=data.destination_name,
        destination_lat=data.destination_lat,
        destination_lng=data.destination_lng,
        scheduled_departure=data.scheduled_departure or datetime.utcnow(),
        total_distance_km=dist_km,
        estimated_duration_min=dur_min,
        total_fare_amount=cost_info["total_vehicle_fare"],
        individual_share_amount=cost_info["individual_fare"],
        start_otp="4821",
        route_polyline=polyline
    )
    db.add(ride)
    db.flush()

    # Add creating user as first passenger if role is PASSENGER
    if current_user.role == "PASSENGER":
        passenger_entry = RidePassenger(
            ride_id=ride.id,
            passenger_id=current_user.id,
            pickup_name=data.origin_name,
            dropoff_name=data.destination_name,
            fare_charged=cost_info["individual_fare"],
            seats_booked=1,
            status="CONFIRMED"
        )
        db.add(passenger_entry)

    db.add(AuditLog(
        user_id=current_user.id,
        action="RIDE_CREATED",
        resource_type="RIDE",
        resource_id=ride.id,
        details=f"Ride created from {data.origin_name} to {data.destination_name}"
    ))

    db.commit()
    db.refresh(ride)
    return format_ride_response(ride)

@router.post("/{id}/join", response_model=RideResponse)
def join_shared_ride(
    id: str,
    pickup_name: str,
    dropoff_name: str,
    seats_booked: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Intelligent empty seat optimization: passenger joins an existing ride,
    re-splitting the shared total fare across more passengers.
    """
    ride = db.query(Ride).filter(Ride.id == id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    # Check already joined
    existing_passenger = db.query(RidePassenger).filter(
        RidePassenger.ride_id == id,
        RidePassenger.passenger_id == current_user.id,
        RidePassenger.status != "CANCELLED"
    ).first()
    if existing_passenger:
        raise HTTPException(status_code=400, detail="You are already registered on this ride")

    total_capacity = ride.vehicle.total_capacity if ride.vehicle else 4
    current_count = len([p for p in ride.passengers if p.status == "CONFIRMED"])
    if current_count + seats_booked > total_capacity:
        raise HTTPException(status_code=400, detail="Not enough empty seats remaining on this vehicle")

    # Recalculate cost with new passenger
    new_passenger_count = current_count + seats_booked
    new_cost_info = calculate_transparent_cost(
        distance_km=ride.total_distance_km,
        duration_min=ride.estimated_duration_min,
        passengers_count=new_passenger_count,
        capacity=total_capacity,
        surge_multiplier=ride.surge_multiplier
    )

    # Update individual share for all passengers
    ride.individual_share_amount = new_cost_info["individual_fare"]

    # Add passenger
    new_passenger = RidePassenger(
        ride_id=ride.id,
        passenger_id=current_user.id,
        pickup_name=pickup_name,
        dropoff_name=dropoff_name,
        fare_charged=new_cost_info["individual_fare"],
        seats_booked=seats_booked,
        status="CONFIRMED"
    )
    db.add(new_passenger)

    # Update fare_charged for all other existing passengers
    for p in ride.passengers:
        if p.status == "CONFIRMED":
            p.fare_charged = new_cost_info["individual_fare"]

    # Notify driver
    if ride.driver and ride.driver.user:
        db.add(Notification(
            user_id=ride.driver.user.id,
            title="New Passenger Joined!",
            message=f"{current_user.full_name} joined your shared ride to {dropoff_name}."
        ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="JOIN_SHARED_RIDE",
        resource_type="RIDE",
        resource_id=ride.id,
        details=f"User {current_user.full_name} joined ride #{ride.id[:6]} with {seats_booked} seat(s)"
    ))

    db.commit()
    db.refresh(ride)
    return format_ride_response(ride)

@router.get("/active", response_model=Optional[RideResponse])
def get_active_ride(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches currently ongoing ride for passenger, driver, or fleet manager.
    """
    active_statuses = ["REQUESTED", "MATCHING", "ASSIGNED", "DRIVER_ARRIVING", "STARTED", "IN_PROGRESS"]

    if current_user.role == "DRIVER" and current_user.driver_profile:
        ride = db.query(Ride).filter(
            Ride.driver_id == current_user.driver_profile.id,
            Ride.status.in_(active_statuses)
        ).order_by(Ride.created_at.desc()).first()
        if ride:
            return format_ride_response(ride)

    # If Passenger
    passenger_entry = db.query(RidePassenger).join(Ride).filter(
        RidePassenger.passenger_id == current_user.id,
        Ride.status.in_(active_statuses),
        RidePassenger.status != "CANCELLED"
    ).order_by(Ride.created_at.desc()).first()

    if passenger_entry:
        return format_ride_response(passenger_entry.ride)

    # Fallback: check any ride created by user
    ride = db.query(Ride).filter(
        Ride.status.in_(active_statuses)
    ).order_by(Ride.created_at.desc()).first()

    return format_ride_response(ride) if ride else None

@router.get("/history", response_model=List[RideResponse])
def get_ride_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rides = db.query(Ride).order_by(Ride.created_at.desc()).limit(25).all()
    return [format_ride_response(r) for r in rides]

@router.get("/{id}", response_model=RideResponse)
def get_ride_by_id(id: str, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return format_ride_response(ride)

@router.post("/{id}/status", response_model=RideResponse)
def update_ride_status(
    id: str,
    new_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Advances ride lifecycle:
    REQUESTED -> MATCHING -> ASSIGNED -> DRIVER_ARRIVING -> STARTED -> IN_PROGRESS -> COMPLETED
    """
    ride = db.query(Ride).filter(Ride.id == id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    target_status = new_status or get_next_ride_status(ride.status)
    ride.status = target_status

    if target_status == "COMPLETED":
        ride.completed_at = datetime.utcnow()
        # Update vehicle status & odometer
        if ride.vehicle:
            ride.vehicle.status = "AVAILABLE"
            ride.vehicle.odometer_km += ride.total_distance_km
            ride.vehicle.battery_or_fuel_level = max(10.0, ride.vehicle.battery_or_fuel_level - 1.5)

        # Update driver stats
        if ride.driver:
            ride.driver.total_trips += 1
            ride.driver.total_earnings += round(ride.total_fare_amount * 0.8, 2)

    db.add(AuditLog(
        user_id=current_user.id,
        action="RIDE_STATUS_CHANGE",
        resource_type="RIDE",
        resource_id=ride.id,
        details=f"Ride status transitioned to {target_status}"
    ))

    db.commit()
    db.refresh(ride)
    return format_ride_response(ride)

@router.post("/{id}/complete-payment")
def complete_simulated_payment(
    id: str,
    payment_method: str = "CAMPUS_WALLET",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Transparent shared payment record simulation.
    Deducts passenger fare from simulated campus wallet and credits driver payout.
    """
    ride = db.query(Ride).filter(Ride.id == id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    fare = ride.individual_share_amount

    if payment_method == "CAMPUS_WALLET":
        if current_user.wallet_balance < fare:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient wallet balance. Required: ₹{fare:.2f}, Available: ₹{current_user.wallet_balance:.2f}"
            )
        current_user.wallet_balance -= fare

    # Record passenger payment
    payment = Payment(
        ride_id=ride.id,
        user_id=current_user.id,
        amount=fare,
        payment_method=payment_method,
        payment_type="RIDE_FARE",
        status="COMPLETED",
        description=f"Simulated ride payment for trip #{ride.id[:6]} via {payment_method}"
    )
    db.add(payment)

    # Credit driver payout
    if ride.driver and ride.driver.user:
        driver_payout = round(fare * 0.8, 2)
        ride.driver.user.wallet_balance += driver_payout
        db.add(Payment(
            ride_id=ride.id,
            user_id=ride.driver.user.id,
            amount=driver_payout,
            payment_method="CAMPUS_WALLET",
            payment_type="DRIVER_PAYOUT",
            status="COMPLETED",
            description=f"Driver payout (80% share) for trip #{ride.id[:6]}"
        ))

    db.commit()
    return {
        "success": True,
        "message": f"Simulated payment of ₹{fare:.2f} completed via {payment_method}.",
        "new_balance": round(current_user.wallet_balance, 2),
        "ride_id": ride.id
    }
