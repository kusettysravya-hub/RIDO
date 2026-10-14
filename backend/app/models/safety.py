import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

def generate_uuid():
    return str(uuid.uuid4())

class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ride_id = Column(String(36), ForeignKey("rides.id"), nullable=True)
    reported_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    event_type = Column(String(50), default="SOS_SIMULATION") # SOS_SIMULATION, SPEEDING_ALERT, ROUTE_DEVIATION, SUSPICIOUS_STOP
    severity = Column(String(20), default="HIGH") # HIGH, MEDIUM, LOW
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="OPEN") # OPEN, INVESTIGATING, RESOLVED
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    ride = relationship("Ride", back_populates="safety_events")
    reporter = relationship("User")

class LocationSharingSession(Base):
    __tablename__ = "location_sharing_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    is_active = Column(Boolean, default=False)
    shared_contact_ids = Column(Text, default="[]")  # JSON list of contact IDs
    simulated_lat = Column(Float, default=12.9716)
    simulated_lng = Column(Float, default=77.5946)
    location_label = Column(String(100), default="Campus Tech Corridor (Simulated GPS)")
    started_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True) # User who triggered the action
    action = Column(String(100), nullable=False) # e.g. "USER_LOGIN", "VEHICLE_ASSIGNED", "SOS_TRIGGERED"
    resource_type = Column(String(50), nullable=False) # "RIDE", "VEHICLE", "USER", "MAINTENANCE"
    resource_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.utcnow)
