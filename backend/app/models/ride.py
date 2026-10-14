import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from ..database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Ride(Base):
    __tablename__ = "rides"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    driver_id = Column(String(36), ForeignKey("driver_profiles.id"), nullable=True)
    vehicle_id = Column(String(36), ForeignKey("vehicles.id"), nullable=True)
    
    status = Column(String(25), default="REQUESTED") 
    # REQUESTED, MATCHING, ASSIGNED, DRIVER_ARRIVING, STARTED, IN_PROGRESS, COMPLETED, CANCELLED

    origin_name = Column(String(120), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_name = Column(String(120), nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)

    scheduled_departure = Column(DateTime, default=datetime.utcnow)
    total_distance_km = Column(Float, default=5.0)
    estimated_duration_min = Column(Integer, default=15)
    total_fare_amount = Column(Float, default=12.0)
    individual_share_amount = Column(Float, default=12.0)
    surge_multiplier = Column(Float, default=1.0)
    start_otp = Column(String(6), default="1234")
    route_polyline = Column(Text, nullable=True) # JSON encoded coordinate waypoints

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    driver = relationship("DriverProfile", back_populates="rides")
    vehicle = relationship("Vehicle", back_populates="rides")
    passengers = relationship("RidePassenger", back_populates="ride", cascade="all, delete-orphan")
    safety_events = relationship("SafetyEvent", back_populates="ride", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="ride")
    ratings = relationship("Rating", back_populates="ride", cascade="all, delete-orphan")
    disruption_events = relationship("DisruptionEvent", back_populates="ride", cascade="all, delete-orphan")
    target_recovery_plans = relationship("RecoveryPlan", back_populates="target_ride", foreign_keys="RecoveryPlan.target_ride_id")

class RideRequest(Base):
    __tablename__ = "ride_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    passenger_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    origin_name = Column(String(120), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_name = Column(String(120), nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    preferred_time = Column(DateTime, default=datetime.utcnow)
    seats_needed = Column(Integer, default=1)
    status = Column(String(20), default="PENDING") # PENDING, MATCHED, ACCEPTED, CANCELLED
    ride_id = Column(String(36), ForeignKey("rides.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    passenger = relationship("User", back_populates="ride_requests")

class RidePassenger(Base):
    __tablename__ = "ride_passengers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ride_id = Column(String(36), ForeignKey("rides.id"), nullable=False)
    passenger_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    pickup_name = Column(String(120), nullable=False)
    dropoff_name = Column(String(120), nullable=False)
    fare_charged = Column(Float, default=0.0)
    seats_booked = Column(Integer, default=1)
    status = Column(String(20), default="CONFIRMED") # CONFIRMED, PICKED_UP, DROPPED_OFF, CANCELLED
    joined_at = Column(DateTime, default=datetime.utcnow)

    ride = relationship("Ride", back_populates="passengers")
    passenger = relationship("User")

class RecurringRide(Base):
    __tablename__ = "recurring_rides"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(100), default="Campus Morning Commute")
    origin_name = Column(String(120), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_name = Column(String(120), nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    departure_time = Column(String(10), default="08:30") # "08:30 AM"
    frequency = Column(String(20), default="WEEKDAYS") # DAILY, WEEKDAYS, WEEKLY
    days_of_week = Column(String(50), default="Mon,Tue,Wed,Thu,Fri")
    seats_needed = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recurring_rides")
