from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class DisruptionCreate(BaseModel):
    disruption_type: str # PASSENGER_CANCEL, DRIVER_CANCEL, VEHICLE_BREAKDOWN, etc.
    ride_id: Optional[str] = None
    severity: str = "MEDIUM" # LOW, MEDIUM, HIGH, CRITICAL
    details: Optional[str] = None

class DisruptionResponse(BaseModel):
    id: str
    ride_id: Optional[str]
    disruption_type: str
    severity: str
    status: str
    reported_by_id: Optional[str]
    disruption_details: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

class RecoveryPlanResponse(BaseModel):
    id: str
    disruption_id: str
    affected_passenger_id: Optional[str]
    target_ride_id: Optional[str]
    action_type: str
    detour_delta_km: float
    wait_delta_min: int
    fare_delta_inr: float
    walking_distance_m: int
    is_feasible: bool
    confidence_score: float
    fairness_score: float
    explanation_summary: str
    explanation_bullets: List[str]
    status: str
    created_at: datetime

class PassengerConstraintUpdate(BaseModel):
    max_wait_time_min: Optional[int] = None
    max_detour_km: Optional[float] = None
    max_fare_tolerance_pct: Optional[float] = None
    max_fare_tolerance_inr: Optional[float] = None
    walking_tolerance_m: Optional[int] = None
    community_segment: Optional[str] = None

class PassengerConstraintResponse(BaseModel):
    id: str
    user_id: str
    community_segment: str
    max_wait_time_min: int
    max_detour_km: float
    max_fare_tolerance_pct: float
    max_fare_tolerance_inr: float
    walking_tolerance_m: int
    cumulative_delay_min: float
    historical_burden_min: float
    updated_at: datetime

class DelayRecordResponse(BaseModel):
    id: str
    user_id: str
    ride_id: Optional[str]
    disruption_id: Optional[str]
    delay_minutes: float
    detour_km: float
    reason: Optional[str]
    recorded_at: datetime

class XAIExplanationResponse(BaseModel):
    disruption_id: str
    disruption_type: str
    severity: str
    selected_plan: Dict[str, Any]
    rejected_alternatives: List[Dict[str, Any]]
    explanation_narrative: str
