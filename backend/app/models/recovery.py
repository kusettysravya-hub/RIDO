import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey, Text,
    Boolean, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from ..database import Base

def generate_uuid():
    return str(uuid.uuid4())

class DisruptionEvent(Base):
    """
    Records real-world mobility disruptions across 9 operational scenarios:
    1. PASSENGER_CANCEL
    2. DRIVER_CANCEL
    3. PASSENGER_DELAY
    4. DRIVER_DELAY
    5. VEHICLE_BREAKDOWN
    6. ROUTE_CHANGE
    7. NEW_PASSENGER_REQUEST
    8. SEAT_SHORTAGE
    9. ALTERNATIVE_PICKUP
    """
    __tablename__ = "disruption_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ride_id = Column(String(36), ForeignKey("rides.id", ondelete="CASCADE"), nullable=True, index=True)
    disruption_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(20), default="DETECTED", nullable=False, index=True) # DETECTED, EVALUATING, RESOLVED, FAILED
    
    reported_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    disruption_details = Column(Text, nullable=True) # JSON or descriptive summary
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
            name="chk_disruption_severity"
        ),
        CheckConstraint(
            "status IN ('DETECTED', 'EVALUATING', 'RESOLVED', 'FAILED')",
            name="chk_disruption_status"
        ),
    )

    # Bidirectional ORM Relationships
    ride = relationship("Ride", back_populates="disruption_events")
    reported_by = relationship("User", back_populates="disruption_events_reported", foreign_keys=[reported_by_id])
    recovery_plans = relationship(
        "RecoveryPlan",
        back_populates="disruption",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class PassengerConstraint(Base):
    """
    Stores personalized tolerance profiles and multi-trip fairness budgets
    for community commuters across Indian urban corridors (college, tech-park, airport, general public).
    All currency thresholds are denominated strictly in Indian Rupees (₹ / INR).
    """
    __tablename__ = "passenger_constraints"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    community_segment = Column(String(50), default="GENERAL_PUBLIC", nullable=False, index=True)
    # CAMPUS_STUDENT, CORPORATE_EMPLOYEE, AIRPORT_TRAVELER, GENERAL_PUBLIC

    # Core Tolerance Constraints
    max_wait_time_min = Column(Integer, default=12, nullable=False) # Max acceptable wait in minutes
    max_detour_km = Column(Float, default=3.0, nullable=False) # Max acceptable detour in kilometers
    max_fare_tolerance_pct = Column(Float, default=15.0, nullable=False) # Max % increase passenger is willing to absorb
    max_fare_tolerance_inr = Column(Float, default=50.0, nullable=False) # Max absolute fare change in ₹ INR
    walking_tolerance_m = Column(Integer, default=300, nullable=False) # Walking tolerance in meters for alternative meetup points
    preferred_departure_slack_min = Column(Integer, default=10, nullable=False) # Buffer minutes before hard deadline

    # Multi-Trip Fairness Budget (Tracks cumulative historical delays endured across past journeys)
    cumulative_delay_min = Column(Float, default=0.0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("max_wait_time_min >= 0", name="chk_passenger_wait_time"),
        CheckConstraint("max_detour_km >= 0.0", name="chk_passenger_detour_km"),
        CheckConstraint("max_fare_tolerance_pct >= 0.0", name="chk_passenger_fare_pct"),
        CheckConstraint("max_fare_tolerance_inr >= 0.0", name="chk_passenger_fare_inr"),
        CheckConstraint("walking_tolerance_m >= 0", name="chk_passenger_walk_m"),
        CheckConstraint("cumulative_delay_min >= 0.0", name="chk_passenger_cum_delay"),
    )

    # Bidirectional ORM Relationship
    user = relationship("User", back_populates="passenger_constraint")


class RecoveryPlan(Base):
    """
    Encapsulates an algorithmic recovery candidate for a specific disruption.
    Confidence score and fairness score are computed dynamically based on
    constraint satisfaction margins (no arbitrary hardcoded constants).
    Currency delta is strictly denominated in Indian Rupees (₹ / INR).
    """
    __tablename__ = "recovery_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    disruption_id = Column(String(36), ForeignKey("disruption_events.id", ondelete="CASCADE"), nullable=False, index=True)
    affected_passenger_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    target_ride_id = Column(String(36), ForeignKey("rides.id", ondelete="SET NULL"), nullable=True, index=True)
    
    action_type = Column(String(50), nullable=False, index=True)
    # REASSIGN_RIDE, SUBSTITUTE_PASSENGER, DETOUR_REROUTE, SPLIT_POOL, ALTERNATIVE_PICKUP, SOLO_FALLBACK

    # Quantitative Metric Deltas
    detour_delta_km = Column(Float, default=0.0, nullable=False) # Incremental detour added/saved
    wait_delta_min = Column(Integer, default=0, nullable=False) # Additional wait time in minutes
    fare_delta_inr = Column(Float, default=0.0, nullable=False) # Change in fare in ₹ INR (negative = savings)
    walking_distance_m = Column(Integer, default=0, nullable=False) # Walking distance in metres
    
    is_feasible = Column(Boolean, default=True, nullable=False) # Satisfies all user-configured constraints
    confidence_score = Column(Float, default=0.0, nullable=False) # Dynamically calculated [0.0, 1.0]
    fairness_score = Column(Float, default=1.0, nullable=False) # Dynamically calculated [0.0, 1.0]
    
    # Explainable AI (XAI) Rationales
    explanation_summary = Column(String(255), nullable=False)
    explanation_bullets = Column(Text, nullable=True) # JSON array of transparent metric reasons
    status = Column(String(20), default="PROPOSED", nullable=False, index=True) # PROPOSED, ACCEPTED, REJECTED, APPLIED
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    applied_at = Column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "confidence_score >= 0.0 AND confidence_score <= 1.0",
            name="chk_recovery_confidence"
        ),
        CheckConstraint(
            "fairness_score >= 0.0 AND fairness_score <= 1.0",
            name="chk_recovery_fairness"
        ),
        CheckConstraint(
            "walking_distance_m >= 0",
            name="chk_recovery_walk_m"
        ),
        CheckConstraint(
            "status IN ('PROPOSED', 'ACCEPTED', 'REJECTED', 'APPLIED')",
            name="chk_recovery_status"
        ),
    )

    # Bidirectional ORM Relationships
    disruption = relationship("DisruptionEvent", back_populates="recovery_plans")
    affected_passenger = relationship("User", back_populates="recovery_plans", foreign_keys=[affected_passenger_id])
    target_ride = relationship("Ride", back_populates="target_recovery_plans", foreign_keys=[target_ride_id])


class PassengerDelayRecord(Base):
    """
    Tracks individual historical delay and detour events with exact timestamps.
    Used by the multi-trip fairness engine to compute exponential recency decay
    burdens (lambda = 0.8) and prevent repeating delays on the same commuter.
    """
    __tablename__ = "passenger_delay_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ride_id = Column(String(36), ForeignKey("rides.id", ondelete="SET NULL"), nullable=True, index=True)
    disruption_id = Column(String(36), ForeignKey("disruption_events.id", ondelete="SET NULL"), nullable=True, index=True)
    
    delay_minutes = Column(Float, nullable=False, default=0.0) # Additional wait or trip duration endured
    detour_km = Column(Float, nullable=False, default=0.0) # Detour distance endured in km
    reason = Column(String(255), nullable=True) # Operational cause
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("delay_minutes >= 0.0", name="chk_delay_min_nonneg"),
        CheckConstraint("detour_km >= 0.0", name="chk_detour_km_nonneg"),
    )

    # Relationships
    user = relationship("User", back_populates="delay_records")
    ride = relationship("Ride")
    disruption = relationship("DisruptionEvent")

