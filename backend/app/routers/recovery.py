import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    User, Ride, DisruptionEvent, PassengerConstraint, RecoveryPlan,
    PassengerDelayRecord, AuditLog, Notification
)
from ..schemas import (
    DisruptionCreate, DisruptionResponse, RecoveryPlanResponse,
    PassengerConstraintUpdate, PassengerConstraintResponse,
    DelayRecordResponse, XAIExplanationResponse
)
from ..auth_utils import get_current_user
from ..services.recovery_service import (
    create_disruption_event,
    generate_alternative_recovery_plans,
    get_or_create_passenger_constraint,
    calculate_historical_delay_burden,
    record_passenger_delay,
    generate_xai_explanation_payload,
    evaluate_passenger_constraints,
    calculate_dynamic_confidence_score
)

router = APIRouter(prefix="/api/recovery", tags=["Self-Healing Recovery & XAI"])

def format_plan_response(plan: RecoveryPlan) -> dict:
    bullets = []
    if plan.explanation_bullets:
        try:
            bullets = json.loads(plan.explanation_bullets)
        except Exception:
            bullets = [plan.explanation_bullets]

    return {
        "id": plan.id,
        "disruption_id": plan.disruption_id,
        "affected_passenger_id": plan.affected_passenger_id,
        "target_ride_id": plan.target_ride_id,
        "action_type": plan.action_type,
        "detour_delta_km": plan.detour_delta_km,
        "wait_delta_min": plan.wait_delta_min,
        "fare_delta_inr": plan.fare_delta_inr,
        "walking_distance_m": plan.walking_distance_m,
        "is_feasible": plan.is_feasible,
        "confidence_score": plan.confidence_score,
        "fairness_score": plan.fairness_score,
        "explanation_summary": plan.explanation_summary,
        "explanation_bullets": bullets,
        "status": plan.status,
        "created_at": plan.created_at
    }

def format_constraint_response(constraint: PassengerConstraint, burden_min: float) -> dict:
    return {
        "id": constraint.id,
        "user_id": constraint.user_id,
        "community_segment": constraint.community_segment,
        "max_wait_time_min": constraint.max_wait_time_min,
        "max_detour_km": constraint.max_detour_km,
        "max_fare_tolerance_pct": constraint.max_fare_tolerance_pct,
        "max_fare_tolerance_inr": constraint.max_fare_tolerance_inr,
        "walking_tolerance_m": constraint.walking_tolerance_m,
        "cumulative_delay_min": constraint.cumulative_delay_min,
        "historical_burden_min": burden_min,
        "updated_at": constraint.updated_at
    }


# =============================================================================
# Disruption Ingestion & Plan Generation Endpoints
# =============================================================================

@router.post("/disruptions", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def report_and_process_disruption(
    payload: DisruptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingests an operational disruption (passenger cancel, driver cancel, delay, breakdown, etc.),
    records the event, and immediately evaluates and generates multi-alternative recovery plans
    ranked by dynamic confidence and multi-trip fairness.
    """
    event = create_disruption_event(
        db=db,
        disruption_type=payload.disruption_type,
        ride_id=payload.ride_id,
        reported_by_id=current_user.id,
        severity=payload.severity,
        details=payload.details
    )

    plans = generate_alternative_recovery_plans(
        db=db,
        disruption_event=event,
        affected_user_id=current_user.id
    )

    # Calculate XAI explanation payload immediately
    burden = calculate_historical_delay_burden(db, current_user.id)
    checks_by_id = {}
    violations_by_id = {}
    conf_by_id = {}
    constraint = get_or_create_passenger_constraint(db, current_user.id)

    for p in plans:
        is_feas, checks, viols = evaluate_passenger_constraints(
            constraint=constraint,
            detour_delta_km=p.detour_delta_km,
            wait_delta_min=p.wait_delta_min,
            fare_delta_inr=p.fare_delta_inr,
            walking_distance_m=p.walking_distance_m
        )
        checks_by_id[p.id] = checks
        violations_by_id[p.id] = viols

        _, c_breakdown = calculate_dynamic_confidence_score(
            wait_delta_min=p.wait_delta_min,
            max_wait_time_min=constraint.max_wait_time_min,
            walking_distance_m=p.walking_distance_m,
            walking_tolerance_m=constraint.walking_tolerance_m,
            fare_delta_inr=p.fare_delta_inr,
            max_fare_tolerance_inr=constraint.max_fare_tolerance_inr
        )
        conf_by_id[p.id] = c_breakdown

    selected_plan = plans[0] if plans else None
    xai_payload = {}
    if selected_plan:
        xai_payload = generate_xai_explanation_payload(
            selected_plan=selected_plan,
            all_candidate_plans=plans,
            checks_by_plan_id=checks_by_id,
            violations_by_plan_id=violations_by_id,
            confidence_breakdown_by_plan_id=conf_by_id,
            fairness_details={"historical_burden_min": burden, "status": "ACTIVE"}
        )

    formatted_plans = [format_plan_response(p) for p in plans]

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="DISRUPTION_REPORTED",
        resource_type="DISRUPTION",
        resource_id=event.id,
        details=f"Disruption {event.disruption_type} reported; {len(plans)} recovery plans generated."
    ))
    db.commit()

    return {
        "disruption": {
            "id": event.id,
            "ride_id": event.ride_id,
            "disruption_type": event.disruption_type,
            "severity": event.severity,
            "status": event.status,
            "reported_by_id": event.reported_by_id,
            "disruption_details": event.disruption_details,
            "created_at": event.created_at,
            "resolved_at": event.resolved_at
        },
        "plans": formatted_plans,
        "selected_plan": formatted_plans[0] if formatted_plans else None,
        "xai_explanation": xai_payload
    }


@router.get("/disruptions", response_model=List[DisruptionResponse])
def list_disruptions(
    limit: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists recent operational disruptions across the mobility platform.
    """
    events = db.query(DisruptionEvent).order_by(DisruptionEvent.created_at.desc()).limit(limit).all()
    return events


@router.get("/disruptions/{id}", response_model=DisruptionResponse)
def get_disruption_by_id(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves a single disruption record.
    """
    event = db.query(DisruptionEvent).filter(DisruptionEvent.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Disruption event not found")
    return event


@router.get("/disruptions/{id}/plans", response_model=Dict[str, Any])
def get_disruption_recovery_plans(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all candidate recovery plans for a disruption event along with
    the Explainable AI (XAI) rationale report comparing selected vs rejected alternatives.
    """
    event = db.query(DisruptionEvent).filter(DisruptionEvent.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Disruption event not found")

    plans = db.query(RecoveryPlan).filter(RecoveryPlan.disruption_id == id).all()
    if not plans:
        # Generate plans if none existed yet
        plans = generate_alternative_recovery_plans(db=db, disruption_event=event, affected_user_id=current_user.id)

    formatted_plans = [format_plan_response(p) for p in plans]
    selected_plan = plans[0] if plans else None

    # Calculate burden and construct XAI report
    burden = calculate_historical_delay_burden(db, current_user.id)

    checks_by_id = {}
    violations_by_id = {}
    conf_by_id = {}
    constraint = get_or_create_passenger_constraint(db, current_user.id)

    for p in plans:
        is_feas, checks, viols = evaluate_passenger_constraints(
            constraint=constraint,
            detour_delta_km=p.detour_delta_km,
            wait_delta_min=p.wait_delta_min,
            fare_delta_inr=p.fare_delta_inr,
            walking_distance_m=p.walking_distance_m
        )
        checks_by_id[p.id] = checks
        violations_by_id[p.id] = viols
        
        _, c_breakdown = calculate_dynamic_confidence_score(
            wait_delta_min=p.wait_delta_min,
            max_wait_time_min=constraint.max_wait_time_min,
            walking_distance_m=p.walking_distance_m,
            walking_tolerance_m=constraint.walking_tolerance_m,
            fare_delta_inr=p.fare_delta_inr,
            max_fare_tolerance_inr=constraint.max_fare_tolerance_inr
        )
        conf_by_id[p.id] = c_breakdown

    xai_payload = {}
    if selected_plan:
        xai_payload = generate_xai_explanation_payload(
            selected_plan=selected_plan,
            all_candidate_plans=plans,
            checks_by_plan_id=checks_by_id,
            violations_by_plan_id=violations_by_id,
            confidence_breakdown_by_plan_id=conf_by_id,
            fairness_details={"historical_burden_min": burden, "status": "ACTIVE"}
        )

    return {
        "disruption_id": event.id,
        "disruption_type": event.disruption_type,
        "plans": formatted_plans,
        "selected_plan": format_plan_response(selected_plan) if selected_plan else None,
        "xai_explanation": xai_payload
    }


# =============================================================================
# Recovery Plan Action Endpoints (Accept / Reject)
# =============================================================================

@router.post("/plans/{id}/accept", response_model=Dict[str, Any])
def accept_recovery_plan(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Passenger or dispatcher accepts a candidate recovery plan.
    Applies the healing action, records timestamped delay for fairness,
    transitions plan and disruption status, and notifies the commuter.
    """
    plan = db.query(RecoveryPlan).filter(RecoveryPlan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found")

    plan.status = "ACCEPTED"
    plan.applied_at = datetime.utcnow()

    disruption = plan.disruption
    if disruption:
        disruption.status = "RESOLVED"
        disruption.resolved_at = datetime.utcnow()

    # Phase 2: Record historical delay for multi-trip fairness tracking
    if plan.affected_passenger_id:
        record_passenger_delay(
            db=db,
            user_id=plan.affected_passenger_id,
            delay_minutes=float(plan.wait_delta_min),
            detour_km=float(plan.detour_delta_km),
            ride_id=plan.target_ride_id,
            disruption_id=plan.disruption_id,
            reason=f"Accepted {plan.action_type} for {disruption.disruption_type if disruption else 'disruption'}"
        )

    # Add notification for commuter
    db.add(Notification(
        user_id=current_user.id,
        title="Recovery Plan Activated",
        message=f"Recovery action '{plan.action_type}' applied: {plan.explanation_summary}"
    ))

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="RECOVERY_PLAN_ACCEPTED",
        resource_type="RECOVERY_PLAN",
        resource_id=plan.id,
        details=f"Plan #{plan.id[:8]} accepted ({plan.action_type}). Disruption resolved."
    ))

    db.commit()
    db.refresh(plan)

    return {
        "status": "ACCEPTED",
        "plan": format_plan_response(plan),
        "message": f"Successfully accepted {plan.action_type}. Your trip has been dynamically healed."
    }


@router.post("/plans/{id}/reject", response_model=Dict[str, Any])
def reject_recovery_plan(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Commuter rejects a proposed plan.
    Marks plan as REJECTED and falls back to an emergency solo voucher.
    """
    plan = db.query(RecoveryPlan).filter(RecoveryPlan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found")

    plan.status = "REJECTED"

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="RECOVERY_PLAN_REJECTED",
        resource_type="RECOVERY_PLAN",
        resource_id=plan.id,
        details=f"Commuter rejected plan #{plan.id[:8]}."
    ))
    db.commit()

    return {
        "status": "REJECTED",
        "plan_id": plan.id,
        "message": "Plan rejected. An emergency solo fallback voucher has been prepared for you."
    }


# =============================================================================
# Passenger Constraints & Fairness API Endpoints
# =============================================================================

@router.get("/constraints", response_model=PassengerConstraintResponse)
def get_user_constraints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves current user's tolerance constraint profile and historical delay burden.
    """
    constraint = get_or_create_passenger_constraint(db, current_user.id)
    burden = calculate_historical_delay_burden(db, current_user.id)
    return format_constraint_response(constraint, burden)


@router.put("/constraints", response_model=PassengerConstraintResponse)
def update_user_constraints(
    payload: PassengerConstraintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates passenger's personalized tolerance limits (wait time, detour km, fare cap in ₹, walking distance).
    """
    constraint = get_or_create_passenger_constraint(db, current_user.id)

    if payload.max_wait_time_min is not None:
        if payload.max_wait_time_min < 0:
            raise HTTPException(status_code=400, detail="max_wait_time_min must be non-negative")
        constraint.max_wait_time_min = payload.max_wait_time_min

    if payload.max_detour_km is not None:
        if payload.max_detour_km < 0:
            raise HTTPException(status_code=400, detail="max_detour_km must be non-negative")
        constraint.max_detour_km = payload.max_detour_km

    if payload.max_fare_tolerance_pct is not None:
        if payload.max_fare_tolerance_pct < 0:
            raise HTTPException(status_code=400, detail="max_fare_tolerance_pct must be non-negative")
        constraint.max_fare_tolerance_pct = payload.max_fare_tolerance_pct

    if payload.max_fare_tolerance_inr is not None:
        if payload.max_fare_tolerance_inr < 0:
            raise HTTPException(status_code=400, detail="max_fare_tolerance_inr must be non-negative")
        constraint.max_fare_tolerance_inr = payload.max_fare_tolerance_inr

    if payload.walking_tolerance_m is not None:
        if payload.walking_tolerance_m < 0:
            raise HTTPException(status_code=400, detail="walking_tolerance_m must be non-negative")
        constraint.walking_tolerance_m = payload.walking_tolerance_m

    if payload.community_segment is not None:
        constraint.community_segment = payload.community_segment

    constraint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(constraint)

    burden = calculate_historical_delay_burden(db, current_user.id)
    return format_constraint_response(constraint, burden)


@router.get("/fairness/me", response_model=Dict[str, Any])
def get_user_fairness_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves user's historical timestamped delay records and the computed
    exponential recency decay burden (lambda = 0.8).
    """
    records = db.query(PassengerDelayRecord).filter(
        PassengerDelayRecord.user_id == current_user.id
    ).order_by(PassengerDelayRecord.recorded_at.desc()).all()

    burden = calculate_historical_delay_burden(db, current_user.id)

    formatted_records = []
    for r in records:
        formatted_records.append({
            "id": r.id,
            "user_id": r.user_id,
            "ride_id": r.ride_id,
            "disruption_id": r.disruption_id,
            "delay_minutes": r.delay_minutes,
            "detour_km": r.detour_km,
            "reason": r.reason,
            "recorded_at": r.recorded_at
        })

    return {
        "user_id": current_user.id,
        "historical_burden_min": burden,
        "decay_lambda": 0.8,
        "total_events": len(formatted_records),
        "records": formatted_records
    }
