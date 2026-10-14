from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class EmergencyContactCreate(BaseModel):
    contact_name: str
    relationship_type: str = "Parent / Guardian"
    phone_number: str
    is_primary: bool = True

class EmergencyContactResponse(BaseModel):
    id: str
    contact_name: str
    relationship_type: str
    phone_number: str
    is_primary: bool

    class Config:
        from_attributes = True

class SafetyEventCreate(BaseModel):
    ride_id: Optional[str] = None
    event_type: str = "SOS_SIMULATION" # SOS_SIMULATION, SPEEDING_ALERT, ROUTE_DEVIATION
    lat: float
    lng: float
    description: str
    severity: str = "HIGH"

class SafetyEventResolve(BaseModel):
    resolution_notes: str

class SafetyEventResponse(BaseModel):
    id: str
    ride_id: Optional[str] = None
    reported_by_user_id: str
    reporter_name: Optional[str] = None
    reporter_role: Optional[str] = None
    event_type: str
    severity: str
    lat: float
    lng: float
    description: str
    status: str
    resolution_notes: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True

# --- Location Sharing Schemas ---

class LocationSharingToggleRequest(BaseModel):
    is_active: bool
    contact_ids: Optional[List[str]] = None

class SharedContactInfo(BaseModel):
    id: str
    name: str
    relationship: str
    phone_masked: str
    is_primary: bool
    can_view: bool

class LocationSharingResponse(BaseModel):
    is_active: bool
    status: str # "ACTIVE" | "STOPPED"
    user_id: str
    simulated_location: Dict[str, Any]
    shared_with: List[SharedContactInfo]
    started_at: Optional[datetime] = None
    updated_at: datetime
    disclaimer: str

# --- SOS Alert Transparency Schemas ---

class EmergencyRecipient(BaseModel):
    name: str
    role: str
    channel: str
    status: str

class MaskedContactAlert(BaseModel):
    id: str
    name: str
    relationship: str
    phone_masked: str
    delivery_status: str

class SOSResponseSummary(BaseModel):
    incident_id: str
    event_id: str
    ride_id: Optional[str] = None
    reporter_name: str
    status: str # "SENT (SIMULATION)"
    timestamp: str
    intended_recipients: List[EmergencyRecipient]
    emergency_contacts: List[MaskedContactAlert]
    live_location_sharing: Dict[str, Any]
    simulated_emergency_call: Dict[str, Any]
    system_actions: List[str]
    disclaimer: str

class RatingCreate(BaseModel):
    ride_id: str
    rated_user_id: str
    rating_score: int # 1 to 5
    feedback: Optional[str] = None
    tags: Optional[str] = None
