import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(120), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="PASSENGER") # PASSENGER, DRIVER, FLEET_MANAGER, ADMIN
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    wallet_balance = Column(Float, default=150.0)
    is_verified = Column(Boolean, default=False)
    college_id = Column(String(50), nullable=True) # e.g. CS2024-049
    department = Column(String(100), nullable=True) # e.g. Computer Science & Engineering
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    passenger_profile = relationship("PassengerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    driver_profile = relationship("DriverProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    emergency_contacts = relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")
    recurring_rides = relationship("RecurringRide", back_populates="user", cascade="all, delete-orphan")
    ride_requests = relationship("RideRequest", back_populates="passenger")
    payments = relationship("Payment", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    passenger_constraint = relationship("PassengerConstraint", back_populates="user", uselist=False, cascade="all, delete-orphan")
    disruption_events_reported = relationship("DisruptionEvent", back_populates="reported_by", foreign_keys="DisruptionEvent.reported_by_id")
    recovery_plans = relationship("RecoveryPlan", back_populates="affected_passenger", foreign_keys="RecoveryPlan.affected_passenger_id")
    delay_records = relationship("PassengerDelayRecord", back_populates="user", cascade="all, delete-orphan")

class PassengerProfile(Base):
    __tablename__ = "passenger_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    student_or_staff = Column(String(20), default="STUDENT") # STUDENT, FACULTY, STAFF
    preferred_gender_pref = Column(String(20), default="ANY")
    total_rides_taken = Column(Integer, default=0)
    saved_co2_kg = Column(Float, default=0.0)

    user = relationship("User", back_populates="passenger_profile")

class DriverProfile(Base):
    __tablename__ = "driver_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    is_online = Column(Boolean, default=False)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    heading = Column(Float, default=0.0)
    rating = Column(Float, default=4.9)
    total_ratings = Column(Integer, default=12)
    total_trips = Column(Integer, default=0)
    total_earnings = Column(Float, default=0.0)
    vehicle_id = Column(String(36), ForeignKey("vehicles.id"), nullable=True, unique=True)

    user = relationship("User", back_populates="driver_profile")
    vehicle = relationship("Vehicle", back_populates="driver_profile")
    rides = relationship("Ride", back_populates="driver")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    contact_name = Column(String(100), nullable=False)
    relationship_type = Column(String(50), default="Parent / Guardian")
    phone_number = Column(String(20), nullable=False)
    is_primary = Column(Boolean, default=True)

    user = relationship("User", back_populates="emergency_contacts")
