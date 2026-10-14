import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    SafetyEvent, EmergencyContact, Rating, User, Ride, AuditLog, Notification,
    DriverProfile, LocationSharingSession
)
from ..schemas import (
    SafetyEventCreate, SafetyEventResolve, SafetyEventResponse,
    EmergencyContactCreate, EmergencyContactResponse, RatingCreate,
    LocationSharingToggleRequest, LocationSharingResponse, SharedContactInfo,
    EmergencyRecipient, MaskedContactAlert, SOSResponseSummary
)
from ..auth_utils import get_current_user, require_role

router = APIRouter(prefix="/api/safety", tags=["Safety & Accountability"])

def mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "Not provided"
    cleaned = phone.strip()
    if len(cleaned) <= 5:
        return cleaned
    return f"{cleaned[:4]} ••••• {cleaned[-2:]}"

@router.post("/sos", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def trigger_sos(
    data: SafetyEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Safety SOS Simulation: Immediately registers high-priority safety incident,
    notifies campus security / emergency contacts, and logs to system audit.
    Returns comprehensive Emergency Response Summary with full operational transparency.
    (Clearly labeled as an academic simulation).
    """
    ride = None
    if data.ride_id:
        ride = db.query(Ride).filter(Ride.id == data.ride_id).first()
    else:
        # Check if user has an active ride
        active_ride = db.query(Ride).filter(
            Ride.status.in_(["REQUESTED", "ASSIGNED", "DRIVER_ARRIVING", "STARTED", "IN_PROGRESS"])
        ).order_by(Ride.created_at.desc()).first()
        if active_ride:
            ride = active_ride

    import uuid as _uuid
    event = SafetyEvent(
        id=str(_uuid.uuid4()),
        ride_id=ride.id if ride else None,
        reported_by_user_id=current_user.id,
        event_type=data.event_type or "SOS_SIMULATION",
        severity=data.severity or "HIGH",
        lat=data.lat,
        lng=data.lng,
        description=f"[SIMULATION DEMO] {data.description}",
        status="OPEN"
    )
    db.add(event)
    db.flush()

    # Notify Admins & Fleet Managers
    admins = db.query(User).filter(User.role.in_(["ADMIN", "FLEET_MANAGER"])).all()
    ride_label = f"ride #{ride.id[:6]}" if ride else "Safety Center SOS Drill"
    for admin in admins:
        db.add(Notification(
            user_id=admin.id,
            title="CRITICAL: SOS Panic Alert Triggered",
            message=f"SOS simulation triggered by {current_user.full_name} for {ride_label} at ({data.lat:.4f}, {data.lng:.4f}).",
            notification_type="SAFETY_ALERT"
        ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="SAFETY_SOS_SIMULATION",
        resource_type="SAFETY_EVENT",
        details=f"SOS alert triggered for {ride_label} by {current_user.full_name}"
    ))

    # Fetch emergency contacts
    contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).all()
    masked_contacts = [
        {
            "id": c.id,
            "name": c.contact_name,
            "relationship": c.relationship_type,
            "phone_masked": mask_phone(c.phone_number),
            "delivery_status": "DELIVERED (SIMULATED SMS)"
        }
        for c in contacts
    ]

    # Check location sharing status
    loc_session = db.query(LocationSharingSession).filter(LocationSharingSession.user_id == current_user.id).first()
    is_loc_active = loc_session.is_active if loc_session else True

    # Construct comprehensive 8-point emergency response summary
    incident_code = f"SOS-SIM-{event.id[:8].upper()}"
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    intended_recipients = [
        {
            "name": "Campus Security Command & Emergency Operations",
            "role": "Institutional Safety Dispatch & Rapid Response",
            "channel": "SIMULATED_RADIO_DISPATCH",
            "status": "ACKNOWLEDGED (SIMULATION)"
        },
        {
            "name": "VoltRide Fleet Telematics & Safety Desk",
            "role": "Fleet Operations & Route Safety Telemetry",
            "channel": "SIMULATED_FLEET_TELEMETRY",
            "status": "ACKNOWLEDGED (SIMULATION)"
        }
    ]
    if contacts:
        intended_recipients.append({
            "name": f"Verified Emergency Contacts ({len(contacts)} Registered)",
            "role": "Personal Trusted Safety Circle",
            "channel": "SIMULATED_SMS_BROADCAST",
            "status": "DELIVERED (SIMULATION)"
        })

    system_actions = [
        f"1. High-priority incident {incident_code} registered in SQLite safety registry.",
        f"2. Simulated distress SMS broadcasts dispatched to {len(contacts)} verified emergency contact(s) with secure tracking link.",
        f"3. Live simulated GPS coordinate stream ({data.lat:.4f}° N, {data.lng:.4f}° E) routed to Campus Security & Fleet Dispatch.",
        "4. Automated emergency call simulation initiated to 24/7 Campus Security Rapid Response helpline (1800-CAMPUS-SAFE).",
        "5. Local emergency panic siren drill synthesizer activated in commuter browser.",
        "6. Permanent tamper-evident audit log committed to system security ledger."
    ]

    shared_names = [c.contact_name for c in contacts] + ["Campus Security Command", "VoltRide Dispatch"]

    db.commit()
    db.refresh(event)

    return {
        # Core & backwards-compatible fields
        "id": event.id,
        "event_id": event.id,
        "ride_id": event.ride_id,
        "reported_by_user_id": event.reported_by_user_id,
        "reporter_name": current_user.full_name,
        "reporter_role": current_user.role,
        "event_type": event.event_type,
        "severity": event.severity,
        "lat": event.lat,
        "lng": event.lng,
        "description": event.description,
        "status": "SENT (SIMULATION)",
        "resolution_notes": event.resolution_notes,
        "created_at": event.created_at,
        "resolved_at": event.resolved_at,

        # Enhanced Transparent Emergency Response Summary
        "incident_id": incident_code,
        "timestamp": timestamp_str,
        "intended_recipients": intended_recipients,
        "emergency_contacts": masked_contacts,
        "live_location_sharing": {
            "is_active": is_loc_active,
            "status": "ACTIVE (SIMULATED GPS)" if is_loc_active else "ACTIVATED ON SOS (SIMULATION)",
            "simulated_coordinates": {"lat": data.lat, "lng": data.lng},
            "location_label": "Campus Tech Corridor (Simulated Emergency Stream)",
            "shared_with": shared_names,
            "disclaimer": "SIMULATED GPS TRACKING: For academic demonstration only. Real coordinates are neither captured nor shared."
        },
        "simulated_emergency_call": {
            "initiated": True,
            "intended_recipient": "Campus Security Rapid Response Desk (1800-CAMPUS-SAFE)",
            "channel": "Web Audio Synthesizer Emergency Drill",
            "call_status": "CONNECTED (SIMULATION AUDIO)",
            "disclaimer": "Simulated voice line for academic demonstration."
        },
        "system_actions": system_actions,
        "disclaimer": "ACADEMIC SIMULATION: All emergency actions, alerts, GPS telemetry, and simulated calls are executed within an academic test harness. No real-world 911/112/police emergency services or cellular networks are contacted."
    }

@router.get("/incidents", response_model=List[SafetyEventResponse])
def get_incidents(db: Session = Depends(get_db)):
    events = db.query(SafetyEvent).order_by(SafetyEvent.created_at.desc()).limit(50).all()
    results = []
    for e in events:
        results.append({
            "id": e.id,
            "ride_id": e.ride_id,
            "reported_by_user_id": e.reported_by_user_id,
            "reporter_name": e.reporter.full_name if e.reporter else "User",
            "reporter_role": e.reporter.role if e.reporter else "PASSENGER",
            "event_type": e.event_type,
            "severity": e.severity,
            "lat": e.lat,
            "lng": e.lng,
            "description": e.description,
            "status": e.status,
            "resolution_notes": e.resolution_notes,
            "created_at": e.created_at,
            "resolved_at": e.resolved_at,
        })
    return results

@router.post("/incidents/{id}/resolve", response_model=SafetyEventResponse)
def resolve_incident(
    id: str,
    data: SafetyEventResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "FLEET_MANAGER"]))
):
    event = db.query(SafetyEvent).filter(SafetyEvent.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Safety incident not found")

    event.status = "RESOLVED"
    event.resolution_notes = data.resolution_notes
    event.resolved_at = datetime.utcnow()

    db.add(AuditLog(
        user_id=current_user.id,
        action="SAFETY_INCIDENT_RESOLVED",
        resource_type="SAFETY_EVENT",
        resource_id=event.id,
        details=f"Incident resolved by {current_user.full_name}: {data.resolution_notes}"
    ))

    db.commit()
    db.refresh(event)

    return {
        "id": event.id,
        "ride_id": event.ride_id,
        "reported_by_user_id": event.reported_by_user_id,
        "reporter_name": event.reporter.full_name if event.reporter else "User",
        "reporter_role": event.reporter.role if event.reporter else "PASSENGER",
        "event_type": event.event_type,
        "severity": event.severity,
        "lat": event.lat,
        "lng": event.lng,
        "description": event.description,
        "status": event.status,
        "resolution_notes": event.resolution_notes,
        "created_at": event.created_at,
        "resolved_at": event.resolved_at,
    }

@router.get("/emergency-contacts", response_model=List[EmergencyContactResponse])
def get_emergency_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).all()

@router.post("/emergency-contacts", response_model=EmergencyContactResponse, status_code=status.HTTP_201_CREATED)
def add_emergency_contact(
    data: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact = EmergencyContact(
        user_id=current_user.id,
        contact_name=data.contact_name,
        relationship_type=data.relationship_type,
        phone_number=data.phone_number,
        is_primary=data.is_primary
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.post("/rate")
def submit_rating(
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rating = Rating(
        ride_id=data.ride_id,
        rater_user_id=current_user.id,
        rated_user_id=data.rated_user_id,
        rating_score=data.rating_score,
        feedback=data.feedback,
        tags=data.tags
    )
    db.add(rating)

    # Recalculate target user's average rating if driver
    driver = db.query(DriverProfile).filter(DriverProfile.user_id == data.rated_user_id).first()
    if driver:
        driver.total_ratings += 1
        driver.rating = round(((driver.rating * (driver.total_ratings - 1)) + data.rating_score) / driver.total_ratings, 2)

    db.commit()
    return {"success": True, "message": "Rating submitted successfully"}

# --- Live Location Sharing Endpoints ---

@router.get("/location-sharing", response_model=LocationSharingResponse)
def get_location_sharing_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves live simulated location sharing status and trusted viewing circle.
    """
    session = db.query(LocationSharingSession).filter(LocationSharingSession.user_id == current_user.id).first()
    if not session:
        session = LocationSharingSession(
            user_id=current_user.id,
            is_active=False,
            shared_contact_ids="[]",
            simulated_lat=12.9716,
            simulated_lng=77.5946,
            location_label="Campus Tech Corridor (Simulated GPS)"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    try:
        allowed_ids = json.loads(session.shared_contact_ids or "[]")
    except Exception:
        allowed_ids = []

    contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).all()
    shared_with = [
        SharedContactInfo(
            id=c.id,
            name=c.contact_name,
            relationship=c.relationship_type,
            phone_masked=mask_phone(c.phone_number),
            is_primary=c.is_primary,
            can_view=c.id in allowed_ids if allowed_ids else (session.is_active and True)
        )
        for c in contacts
    ]

    return LocationSharingResponse(
        is_active=session.is_active,
        status="ACTIVE" if session.is_active else "STOPPED",
        user_id=current_user.id,
        simulated_location={
            "lat": session.simulated_lat,
            "lng": session.simulated_lng,
            "location_label": session.location_label,
            "heading": 42.5,
            "speed_kmh": 24.0 if session.is_active else 0.0,
            "is_simulation": True,
            "disclaimer": "SIMULATED GPS TRACKING: For academic demonstration only. Real coordinates are neither captured nor shared."
        },
        shared_with=shared_with,
        started_at=session.started_at,
        updated_at=session.updated_at,
        disclaimer="Simulated GPS tracking for VoltRide academic capstone demonstration."
    )

@router.post("/location-sharing/toggle", response_model=LocationSharingResponse)
def toggle_location_sharing(
    data: LocationSharingToggleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Starts or stops simulated live location sharing with selected emergency contacts.
    """
    session = db.query(LocationSharingSession).filter(LocationSharingSession.user_id == current_user.id).first()
    if not session:
        session = LocationSharingSession(
            user_id=current_user.id,
            is_active=False,
            shared_contact_ids="[]",
            simulated_lat=12.9716,
            simulated_lng=77.5946,
            location_label="Campus Tech Corridor (Simulated GPS)"
        )
        db.add(session)

    session.is_active = data.is_active
    if data.contact_ids is not None:
        session.shared_contact_ids = json.dumps(data.contact_ids)
    elif data.is_active and not session.shared_contact_ids:
        all_ids = [c.id for c in db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).all()]
        session.shared_contact_ids = json.dumps(all_ids)

    if data.is_active:
        session.started_at = datetime.utcnow()
    else:
        session.started_at = None

    action_label = "LOCATION_SHARING_STARTED" if data.is_active else "LOCATION_SHARING_STOPPED"
    db.add(AuditLog(
        user_id=current_user.id,
        action=action_label,
        resource_type="SAFETY",
        details=f"Live simulated location sharing {session.is_active} by {current_user.full_name}"
    ))

    db.commit()
    db.refresh(session)

    return get_location_sharing_status(current_user=current_user, db=db)

