import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    license_plate = Column(String(20), unique=True, nullable=False, index=True)
    make = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    category = Column(String(30), default="STANDARD_SEDAN") # STANDARD_SEDAN, COMFORT_HYBRID, EV_CAMPUS_SHUTTLE, ACCESSIBLE_VAN
    total_capacity = Column(Integer, default=4)
    status = Column(String(20), default="AVAILABLE") # AVAILABLE, ON_TRIP, MAINTENANCE, OFFLINE
    battery_or_fuel_level = Column(Float, default=95.0) # Percentage 0-100
    odometer_km = Column(Float, default=12500.0)
    tire_pressure_psi = Column(Float, default=34.0)
    engine_temp_c = Column(Float, default=85.0)
    last_service_date = Column(DateTime, default=datetime.utcnow)
    next_service_km = Column(Float, default=15000.0)
    maintenance_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    driver_profile = relationship("DriverProfile", back_populates="vehicle", uselist=False)
    rides = relationship("Ride", back_populates="vehicle")
    maintenance_records = relationship("MaintenanceRecord", back_populates="vehicle", cascade="all, delete-orphan")
    telemetry_logs = relationship("VehicleTelemetry", back_populates="vehicle", cascade="all, delete-orphan")

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vehicle_id = Column(String(36), ForeignKey("vehicles.id"), nullable=False)
    service_type = Column(String(50), nullable=False) # OIL_CHANGE, BRAKE_INSPECTION, BATTERY_HEALTH, TIRE_ROTATION, FULL_DIAGNOSTIC
    odometer_at_service = Column(Float, default=0.0)
    cost_amount = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    performed_at = Column(DateTime, default=datetime.utcnow)
    next_due_km = Column(Float, default=0.0)
    status = Column(String(20), default="COMPLETED") # SCHEDULED, IN_PROGRESS, COMPLETED

    vehicle = relationship("Vehicle", back_populates="maintenance_records")

class VehicleTelemetry(Base):
    __tablename__ = "vehicle_telemetry"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vehicle_id = Column(String(36), ForeignKey("vehicles.id"), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=0.0)
    battery_or_fuel_level = Column(Float, default=95.0)
    tire_pressure_psi = Column(Float, default=34.0)
    engine_temp_c = Column(Float, default=85.0)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="telemetry_logs")
