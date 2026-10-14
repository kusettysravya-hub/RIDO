from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class RideCreate(BaseModel):
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    scheduled_departure: Optional[datetime] = None
    vehicle_id: Optional[str] = None

class RideRequestCreate(BaseModel):
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    preferred_time: Optional[datetime] = None
    seats_needed: int = 1

class RideSearchQuery(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    preferred_time: Optional[datetime] = None
    seats_needed: int = 1

class CostExplanation(BaseModel):
    base_fare: float
    distance_km: float
    distance_rate_per_km: float
    distance_cost: float
    duration_min: int
    duration_cost: float
    surge_multiplier: float
    total_vehicle_fare: float
    current_passengers: int
    capacity: int
    individual_fare: float
    empty_seats: int
    shared_savings_pct: float
    formula_explanation: str

class RideMatchScore(BaseModel):
    ride_id: str
    driver_name: str
    driver_rating: float
    vehicle_model: str
    license_plate: str
    origin_name: str
    destination_name: str
    available_seats: int
    total_capacity: int
    status: str
    pickup_distance_km: float
    destination_distance_km: float
    detour_km: float
    match_score_pct: float
    cost_per_seat: float
    shared_savings_pct: float
    explanation_reasons: List[str]

class RidePassengerResponse(BaseModel):
    id: str
    passenger_id: str
    passenger_name: str
    pickup_name: str
    dropoff_name: str
    fare_charged: float
    seats_booked: int
    status: str
    joined_at: datetime

    class Config:
        from_attributes = True

class RideResponse(BaseModel):
    id: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_rating: Optional[float] = None
    vehicle_id: Optional[str] = None
    vehicle_plate: Optional[str] = None
    vehicle_model: Optional[str] = None
    status: str
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    total_distance_km: float
    estimated_duration_min: int
    total_fare_amount: float
    individual_share_amount: float
    surge_multiplier: float
    start_otp: str
    route_polyline: Optional[str] = None
    scheduled_departure: datetime
    created_at: datetime
    passengers: List[RidePassengerResponse] = []

    class Config:
        from_attributes = True
