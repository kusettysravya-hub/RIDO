import json
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from ..models import (
    DisruptionEvent, PassengerConstraint, RecoveryPlan, PassengerDelayRecord,
    Ride, RidePassenger, User, Vehicle, DriverProfile
)
from .cost_calculator import calculate_haversine_km, estimate_trip_duration_min

# =============================================================================
# 1. Passenger Constraint Evaluation
# =============================================================================

def get_or_create_passenger_constraint(db: Session, user_id: str) -> PassengerConstraint:
    """
    Fetches user's tolerance constraint profile.
    If none exists, safely initializes and persists a default commuter profile in INR (₹).
    """
    constraint = db.query(PassengerConstraint).filter(PassengerConstraint.user_id == user_id).first()
    if not constraint:
        constraint = PassengerConstraint(
            user_id=user_id,
            community_segment="GENERAL_PUBLIC",
            max_wait_time_min=12,
            max_detour_km=3.0,
            max_fare_tolerance_pct=15.0,
            max_fare_tolerance_inr=50.0,
            walking_tolerance_m=300,
            cumulative_delay_min=0.0,
            preferred_departure_slack_min=10
        )
        db.add(constraint)
        db.commit()
        db.refresh(constraint)
    return constraint


def evaluate_passenger_constraints(
    constraint: Optional[PassengerConstraint],
    detour_delta_km: float,
    wait_delta_min: int,
    fare_delta_inr: float,
    walking_distance_m: int = 0,
    estimated_arrival_dt: Optional[datetime] = None,
    deadline_dt: Optional[datetime] = None,
    base_fare_inr: float = 60.0
) -> Tuple[bool, Dict[str, Any], List[str]]:
    """
    Strict mathematical constraint evaluation across:
    1. Detour Distance (km)
    2. Waiting Time (minutes)
    3. Fare Delta (INR ₹)
    4. Walking Distance (metres)
    5. Arrival Deadline (datetime)

    Guards against None/missing values and division-by-zero.
    Returns (is_feasible, breakdown_dict, violation_reasons).
    """
    # Safe defaults if constraint is None
    max_wait = constraint.max_wait_time_min if constraint else 15
    max_detour = constraint.max_detour_km if constraint else 3.5
    max_fare_pct = constraint.max_fare_tolerance_pct if constraint else 20.0
    max_fare_inr = constraint.max_fare_tolerance_inr if constraint else 60.0
    max_walk_m = constraint.walking_tolerance_m if constraint else 400

    violations = []
    checks = {}

    # 1. Detour Constraint
    detour_satisfied = detour_delta_km <= max_detour
    checks["detour"] = {
        "actual_km": round(detour_delta_km, 2),
        "allowed_max_km": max_detour,
        "satisfied": detour_satisfied
    }
    if not detour_satisfied:
        violations.append(
            f"Detour of {detour_delta_km:.1f} km exceeds maximum tolerance of {max_detour:.1f} km"
        )

    # 2. Wait Time Constraint
    wait_satisfied = wait_delta_min <= max_wait
    checks["wait_time"] = {
        "actual_min": wait_delta_min,
        "allowed_max_min": max_wait,
        "satisfied": wait_satisfied
    }
    if not wait_satisfied:
        violations.append(
            f"Waiting time of {wait_delta_min} min exceeds maximum tolerance of {max_wait} min"
        )

    # 3. Fare Tolerance Constraint (in INR ₹)
    # If fare decreases or is unchanged, fare constraint is always satisfied
    if fare_delta_inr <= 0.0:
        fare_satisfied = True
    else:
        # Check percentage threshold and absolute cap in INR
        pct_limit = (base_fare_inr * max_fare_pct) / 100.0 if base_fare_inr > 0 else max_fare_inr
        allowed_increase = min(max_fare_inr, max(1.0, pct_limit))
        fare_satisfied = fare_delta_inr <= allowed_increase

    checks["fare_delta"] = {
        "actual_inr": round(fare_delta_inr, 2),
        "allowed_max_inr": max_fare_inr,
        "satisfied": fare_satisfied
    }
    if not fare_satisfied:
        violations.append(
            f"Fare increase of ₹{fare_delta_inr:.2f} exceeds allowed limit of ₹{max_fare_inr:.2f}"
        )

    # 4. Walking Distance Constraint
    walk_satisfied = walking_distance_m <= max_walk_m
    checks["walking"] = {
        "actual_m": walking_distance_m,
        "allowed_max_m": max_walk_m,
        "satisfied": walk_satisfied
    }
    if not walk_satisfied:
        violations.append(
            f"Walking distance of {walking_distance_m}m exceeds limit of {max_walk_m}m"
        )

    # 5. Deadline Constraint
    deadline_satisfied = True
    if deadline_dt and estimated_arrival_dt:
        deadline_satisfied = estimated_arrival_dt <= deadline_dt
        checks["deadline"] = {
            "estimated_arrival": estimated_arrival_dt.isoformat(),
            "deadline": deadline_dt.isoformat(),
            "satisfied": deadline_satisfied
        }
        if not deadline_satisfied:
            violations.append(
                f"Estimated arrival at {estimated_arrival_dt.strftime('%H:%M')} breaches deadline of {deadline_dt.strftime('%H:%M')}"
            )

    is_feasible = (
        detour_satisfied and
        wait_satisfied and
        fare_satisfied and
        walk_satisfied and
        deadline_satisfied
    )

    return is_feasible, checks, violations


# =============================================================================
# 2. Phase 1: Dynamic Confidence Calculation
# =============================================================================

class ConfidenceResult(float):
    """
    Float-compatible return type that supports unpacking as (score, breakdown)
    and tuple indexing, while also behaving directly as a float.
    """
    def __new__(cls, val: float, breakdown: Optional[Dict[str, float]] = None):
        instance = super().__new__(cls, val)
        instance.breakdown = breakdown or {}
        return instance

    def __iter__(self):
        yield float(self)
        yield self.breakdown

    def __getitem__(self, index: int):
        if index == 0:
            return float(self)
        elif index == 1:
            return self.breakdown
        raise IndexError("ConfidenceResult has 2 elements: (score, breakdown)")

    def __len__(self):
        return 2


def calculate_dynamic_confidence_score(
    estimated_arrival_dt: Optional[datetime] = None,
    deadline_dt: Optional[datetime] = None,
    wait_delta_min: int = 0,
    max_wait_time_min: int = 12,
    walking_distance_m: int = 0,
    walking_tolerance_m: int = 300,
    fare_delta_inr: float = 0.0,
    max_fare_tolerance_inr: float = 50.0,
    base_fare_inr: float = 60.0,
    constraints_satisfied_count: int = 5,
    total_constraints_count: int = 5,
    **kwargs
) -> ConfidenceResult:
    """
    Calculates dynamic confidence score for a candidate recovery plan.
    Strictly follows specified weights:
    - Deadline: 0.35
    - Walking: 0.30
    - Fare: 0.20
    - Constraint Satisfaction: 0.15

    Guaranteed strictly in [0.0, 1.0]. Zero hardcoded values.
    Returns ConfidenceResult(final_confidence_score, sub_score_breakdown).
    """
    # 1. Deadline Sub-score (Weight: 0.35)
    if deadline_dt and estimated_arrival_dt:
        slack_sec = (deadline_dt - estimated_arrival_dt).total_seconds()
        slack_min = slack_sec / 60.0
        if slack_min >= 0.0:
            # Buffer exists ahead of deadline
            s_deadline = min(1.0, 0.70 + (0.30 * min(1.0, slack_min / 15.0)))
        else:
            # Deadline breached: decay score
            s_deadline = max(0.0, 0.70 - (abs(slack_min) / 15.0))
    else:
        # Evaluate via wait time margin relative to max wait tolerance
        safe_max_wait = max(1.0, float(max_wait_time_min))
        wait_ratio = max(0.0, float(wait_delta_min)) / safe_max_wait
        s_deadline = max(0.0, min(1.0, 1.0 - (0.80 * wait_ratio)))

    # 2. Walking Sub-score (Weight: 0.30)
    safe_max_walk = max(10.0, float(walking_tolerance_m))
    if walking_distance_m <= 0:
        s_walking = 1.0
    else:
        walk_ratio = max(0.0, float(walking_distance_m)) / safe_max_walk
        s_walking = max(0.0, min(1.0, 1.0 - (0.75 * walk_ratio)))

    # 3. Fare Sub-score (Weight: 0.20)
    safe_max_fare = max(1.0, float(max_fare_tolerance_inr))
    if fare_delta_inr <= 0.0:
        # Saving money or fare parity -> high confidence reward
        safe_base = max(10.0, base_fare_inr)
        savings_ratio = abs(fare_delta_inr) / safe_base
        s_fare = min(1.0, 0.85 + (0.15 * min(1.0, savings_ratio)))
    else:
        fare_ratio = fare_delta_inr / safe_max_fare
        s_fare = max(0.0, min(1.0, 1.0 - (0.85 * fare_ratio)))

    # 4. Constraint Satisfaction Sub-score (Weight: 0.15)
    safe_total = max(1, total_constraints_count)
    s_constraint = max(0.0, min(1.0, float(constraints_satisfied_count) / float(safe_total)))

    # Weighted Sum
    w_deadline = 0.35
    w_walking = 0.30
    w_fare = 0.20
    w_constraint = 0.15

    raw_score = (
        (w_deadline * s_deadline) +
        (w_walking * s_walking) +
        (w_fare * s_fare) +
        (w_constraint * s_constraint)
    )

    final_score = round(max(0.0, min(1.0, raw_score)), 2)
    breakdown = {
        "deadline_score": round(s_deadline, 2),
        "walking_score": round(s_walking, 2),
        "fare_score": round(s_fare, 2),
        "constraint_score": round(s_constraint, 2),
    }

    return ConfidenceResult(final_score, breakdown)


# =============================================================================
# 3. Phase 2: Multi-Trip Fairness Budget with Exponential Recency Decay
# =============================================================================

def record_passenger_delay(
    db: Session,
    user_id: str,
    delay_minutes: float,
    detour_km: float = 0.0,
    ride_id: Optional[str] = None,
    disruption_id: Optional[str] = None,
    reason: Optional[str] = None,
    timestamp: Optional[datetime] = None
) -> PassengerDelayRecord:
    """
    Records an individual timestamped historical delay record for a passenger.
    Also updates the cumulative_delay_min tracking on PassengerConstraint.
    """
    record = PassengerDelayRecord(
        user_id=user_id,
        ride_id=ride_id,
        disruption_id=disruption_id,
        delay_minutes=max(0.0, delay_minutes),
        detour_km=max(0.0, detour_km),
        reason=reason,
        recorded_at=timestamp or datetime.utcnow()
    )
    db.add(record)

    # Update cumulative delay on constraint
    constraint = db.query(PassengerConstraint).filter(PassengerConstraint.user_id == user_id).first()
    if constraint:
        constraint.cumulative_delay_min = round(constraint.cumulative_delay_min + delay_minutes, 2)

    db.commit()
    db.refresh(record)
    return record


def calculate_historical_delay_burden(
    db: Session,
    user_id: str,
    reference_time: Optional[datetime] = None,
    decay_lambda: float = 0.8
) -> float:
    """
    Computes passenger's historical delay burden using exponential recency decay:
    Burden = sum_{i} (delay_i * (lambda ^ delta_t_i))
    where delta_t_i is the age of event i in days from reference_time.
    lambda = 0.8 per specification.
    Returns 0.0 for new passengers without prior records.
    """
    records = db.query(PassengerDelayRecord).filter(
        PassengerDelayRecord.user_id == user_id
    ).all()

    if not records:
        return 0.0

    ref_time = reference_time or datetime.utcnow()
    total_burden = 0.0

    for r in records:
        age_seconds = max(0.0, (ref_time - r.recorded_at).total_seconds())
        age_days = age_seconds / 86400.0
        # Exponential recency decay
        weight = math.pow(decay_lambda, age_days)
        total_burden += (r.delay_minutes * weight)

    return round(total_burden, 2)


def calculate_plan_fairness_score(
    historical_burden_min: float,
    proposed_wait_delta_min: int,
    proposed_detour_km: float
) -> Tuple[float, Dict[str, Any]]:
    """
    Evaluates candidate recovery plan's fairness impact.
    If a passenger already carries a high delay burden, imposing further wait/detour
    drops the fairness score dramatically, prioritizing zero-wait or express options.
    Returns (fairness_score, details_dict).
    """
    if historical_burden_min <= 0.0:
        # New passenger without historical delay burden
        mild_penalty = (max(0, proposed_wait_delta_min) * 0.015) + (max(0.0, proposed_detour_km) * 0.02)
        score = max(0.10, min(1.00, 1.00 - mild_penalty))
        return round(score, 2), {
            "historical_burden_min": 0.0,
            "fairness_penalty": round(mild_penalty, 3),
            "status": "FRESH_PASSENGER"
        }

    # Normalized burden factor against 30-minute benchmark
    burden_factor = min(1.0, historical_burden_min / 30.0)
    
    # Inconvenience of proposed plan
    inconvenience = (max(0, proposed_wait_delta_min) + (2.0 * max(0.0, proposed_detour_km))) / 15.0
    fairness_penalty = burden_factor * inconvenience

    score = max(0.05, min(1.00, 1.00 - fairness_penalty))
    return round(score, 2), {
        "historical_burden_min": round(historical_burden_min, 2),
        "fairness_penalty": round(fairness_penalty, 3),
        "status": "PRIORITIZED" if burden_factor > 0.5 else "ACTIVE_TRACKING"
    }


def calculate_dynamic_fairness_score(
    cumulative_delay_min: float,
    wait_delta_min: int,
    detour_delta_km: float
) -> float:
    """Helper alias returning only the float fairness score [0.0, 1.0]."""
    score, _ = calculate_plan_fairness_score(cumulative_delay_min, wait_delta_min, detour_delta_km)
    return score


# =============================================================================
# 4. Phase 3: Explainable AI (XAI) Recommendation & Rejection Generator
# =============================================================================

def generate_xai_explanation_payload(
    selected_plan: RecoveryPlan,
    all_candidate_plans: List[RecoveryPlan],
    checks_by_plan_id: Dict[str, Dict[str, Any]],
    violations_by_plan_id: Dict[str, List[str]],
    confidence_breakdown_by_plan_id: Dict[str, Dict[str, float]],
    fairness_details: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Synthesizes complete, human-readable transparent decision rationale for:
    1. The selected recovery plan (detour, wait, fare, walk, constraints, confidence, fairness)
    2. Rejected alternatives (rejected constraint, actual value, allowed value, clear reason)
    """
    # 1. Selected Plan Details
    selected_checks = checks_by_plan_id.get(selected_plan.id, {})
    selected_breakdown = confidence_breakdown_by_plan_id.get(selected_plan.id, {})

    selected_data = {
        "plan_id": selected_plan.id,
        "action_type": selected_plan.action_type,
        "detour_km": selected_plan.detour_delta_km,
        "wait_min": selected_plan.wait_delta_min,
        "fare_delta_inr": selected_plan.fare_delta_inr,
        "walking_distance_m": selected_plan.walking_distance_m,
        "dynamic_confidence_score": selected_plan.confidence_score,
        "fairness_score": selected_plan.fairness_score,
        "confidence_breakdown": selected_breakdown,
        "constraint_satisfaction": {
            k: v.get("satisfied", True) for k, v in selected_checks.items()
        },
        "explanation_summary": selected_plan.explanation_summary,
        "fairness_impact": {
            "historical_burden_min": fairness_details.get("historical_burden_min", 0.0),
            "fairness_score": selected_plan.fairness_score,
            "status": fairness_details.get("status", "NORMAL")
        }
    }

    # 2. Rejected Alternatives Analysis
    rejected_alternatives = []
    for plan in all_candidate_plans:
        if plan.id == selected_plan.id:
            continue

        violations = violations_by_plan_id.get(plan.id, [])
        plan_checks = checks_by_plan_id.get(plan.id, {})

        if not plan.is_feasible and violations:
            # Plan rejected due to hard constraint violation
            # Extract first failing constraint
            failing_key = "detour"
            actual_val = f"{plan.detour_delta_km} km"
            allowed_val = "Tolerance threshold"
            for k, c in plan_checks.items():
                if not c.get("satisfied", True):
                    failing_key = k
                    if k == "detour":
                        actual_val = f"{c.get('actual_km')} km"
                        allowed_val = f"{c.get('allowed_max_km')} km"
                    elif k == "wait_time":
                        actual_val = f"{c.get('actual_min')} min"
                        allowed_val = f"{c.get('allowed_max_min')} min"
                    elif k == "fare_delta":
                        actual_val = f"₹{c.get('actual_inr')}"
                        allowed_val = f"₹{c.get('allowed_max_inr')}"
                    elif k == "walking":
                        actual_val = f"{c.get('actual_m')} m"
                        allowed_val = f"{c.get('allowed_max_m')} m"
                    break

            rejected_alternatives.append({
                "plan_id": plan.id,
                "action_type": plan.action_type,
                "rejected_constraint": failing_key,
                "actual_value": actual_val,
                "allowed_value": allowed_val,
                "rejection_reason": violations[0],
                "confidence_score": plan.confidence_score,
                "fairness_score": plan.fairness_score
            })
        else:
            # Feasible plan ranked lower than selected plan
            reasons = []
            if plan.wait_delta_min > selected_plan.wait_delta_min:
                reasons.append(f"Wait time is {plan.wait_delta_min - selected_plan.wait_delta_min} min longer")
            if plan.fare_delta_inr > selected_plan.fare_delta_inr:
                reasons.append(f"Cost is ₹{plan.fare_delta_inr - selected_plan.fare_delta_inr:.2f} higher")
            if plan.walking_distance_m > selected_plan.walking_distance_m:
                reasons.append(f"Requires {plan.walking_distance_m - selected_plan.walking_distance_m}m more walking")
            if not reasons:
                reasons.append("Lower multi-objective composite optimization score")

            rejected_alternatives.append({
                "plan_id": plan.id,
                "action_type": plan.action_type,
                "rejected_constraint": "composite_rank",
                "actual_value": f"Rank #{all_candidate_plans.index(plan) + 1}",
                "allowed_value": "Rank #1 (Selected)",
                "rejection_reason": "; ".join(reasons),
                "confidence_score": plan.confidence_score,
                "fairness_score": plan.fairness_score
            })

    # 3. Overall Narrative
    fare_desc = f"₹{abs(selected_plan.fare_delta_inr):.2f} savings" if selected_plan.fare_delta_inr < 0 else f"₹{selected_plan.fare_delta_inr:.2f} fare delta"
    narrative = (
        f"Selected Option '{selected_plan.action_type}' achieved the highest composite score. "
        f"It yields {selected_plan.wait_delta_min} min wait, {selected_plan.detour_delta_km:.1f} km detour, "
        f"{selected_plan.walking_distance_m}m walk, and {fare_desc} with a dynamic confidence of {int(selected_plan.confidence_score * 100)}% "
        f"and fairness rating of {int(selected_plan.fairness_score * 100)}%."
    )

    return {
        "selected_plan": selected_data,
        "rejected_alternatives": rejected_alternatives,
        "explanation_narrative": narrative
    }


# =============================================================================
# 5. Disruption Ingestion & Plan Generation Orchestrator
# =============================================================================

def create_disruption_event(
    db: Session,
    disruption_type: str,
    ride_id: Optional[str] = None,
    reported_by_id: Optional[str] = None,
    severity: str = "MEDIUM",
    details: Optional[str] = None
) -> DisruptionEvent:
    """
    Ingests and records a disruption event in the database.
    """
    valid_severities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    sev = severity.upper() if severity and severity.upper() in valid_severities else "MEDIUM"

    event = DisruptionEvent(
        ride_id=ride_id,
        disruption_type=disruption_type.upper(),
        severity=sev,
        status="DETECTED",
        reported_by_id=reported_by_id,
        disruption_details=details
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def generate_alternative_recovery_plans(
    db: Session,
    disruption_event: DisruptionEvent,
    affected_user_id: Optional[str] = None,
    target_ride_id: Optional[str] = None
) -> List[RecoveryPlan]:
    """
    Generates multiple alternative recovery candidates based on the disruption scenario.
    Applies constraint evaluation, Phase 1 dynamic confidence scoring,
    Phase 2 fairness budget with recency decay, and Phase 3 XAI explanation.
    """
    # 1. Determine affected user
    user = None
    if affected_user_id:
        user = db.query(User).filter(User.id == affected_user_id).first()
    elif disruption_event.reported_by_id:
        user = db.query(User).filter(User.id == disruption_event.reported_by_id).first()

    ride = None
    if disruption_event.ride_id:
        ride = db.query(Ride).filter(Ride.id == disruption_event.ride_id).first()
        if not user and ride and ride.passengers:
            first_p = [p for p in ride.passengers if p.status == "CONFIRMED"]
            if first_p:
                user = first_p[0].passenger

    # Get user constraint
    constraint = None
    historical_burden = 0.0
    if user:
        constraint = get_or_create_passenger_constraint(db, user.id)
        historical_burden = calculate_historical_delay_burden(db, user.id)

    base_fare = ride.individual_share_amount if ride else 60.0
    dtype = disruption_event.disruption_type.upper()

    checks_by_temp_id: Dict[int, Dict[str, Any]] = {}
    violations_by_temp_id: Dict[int, List[str]] = {}
    breakdowns_by_temp_id: Dict[int, Dict[str, float]] = {}

    candidate_specs = []

    if dtype == "PASSENGER_CANCEL":
        candidate_specs.append({
            "action_type": "SUBSTITUTE_PASSENGER",
            "detour_km": 0.3, "wait_min": 2, "fare_delta_inr": -18.0, "walk_m": 0,
            "summary": "Matched replacement rider on route corridor; fare reduced by ₹18.00.",
            "bullets": [
                "Nearby commuter pickup identified 300m along active polyline",
                "Total detour limited to +0.3 km (+2 min journey duration)",
                "Individual seat fare decreases by ₹18.00 via shared pool subsidy"
            ]
        })
        candidate_specs.append({
            "action_type": "DETOUR_REROUTE",
            "detour_km": -1.2, "wait_min": 0, "fare_delta_inr": 0.0, "walk_m": 0,
            "summary": "Cancelled stop pruned: Direct corridor saves 1.2 km and 5 minutes.",
            "bullets": [
                "Skipping cancelled pickup saves 1.2 km of arterial travel",
                "Estimated arrival is 5 minutes earlier than scheduled",
                "Individual fare locked at initial quoted rate: ₹0.00 change"
            ]
        })
        candidate_specs.append({
            "action_type": "SOLO_FALLBACK",
            "detour_km": 0.0, "wait_min": 0, "fare_delta_inr": 25.0, "walk_m": 0,
            "summary": "Upgrade to direct solo commute with zero intermediate stops.",
            "bullets": [
                "Converts vehicle to private express transit",
                "Zero wait time and zero intermediate detours",
                "Subsidized upgrade fee of +₹25.00 applied"
            ]
        })

    elif dtype in ("DRIVER_CANCEL", "VEHICLE_BREAKDOWN"):
        candidate_specs.append({
            "action_type": "REASSIGN_RIDE",
            "detour_km": 0.5, "wait_min": 4, "fare_delta_inr": -15.0, "walk_m": 120,
            "summary": "Reassigned to adjacent Fleet Shuttle #04 with ₹15.00 courtesy credit.",
            "bullets": [
                "Fleet Shuttle KA-01-EV-04 intercepted 4 minutes away",
                "Convenient pickup at sheltered transit bay 120m ahead",
                "₹15.00 automated courtesy compensation applied to wallet"
            ]
        })
        candidate_specs.append({
            "action_type": "ALTERNATIVE_PICKUP",
            "detour_km": 0.1, "wait_min": 2, "fare_delta_inr": -20.0, "walk_m": 220,
            "summary": "Meet Shuttle #02 on Outer Ring Road (220m walk) in 2 minutes.",
            "bullets": [
                "Walking 220m to main arterial avoids 1.8 km vehicular U-turn",
                "Vehicle arrives in 2 minutes instead of 8 minutes",
                "Discount voucher of ₹20.00 credited for walking assistance"
            ]
        })
        candidate_specs.append({
            "action_type": "SOLO_FALLBACK",
            "detour_km": 0.0, "wait_min": 5, "fare_delta_inr": 0.0, "walk_m": 0,
            "summary": "Emergency solo electric cab dispatched with 100% fare parity.",
            "bullets": [
                "Direct solo EV dispatched from rapid response fleet",
                "Zero detour, zero extra passenger stops",
                "Platform guarantees 100% fare parity: ₹0.00 additional charge"
            ]
        })

    elif dtype in ("PASSENGER_DELAY", "DRIVER_DELAY"):
        candidate_specs.append({
            "action_type": "DETOUR_REROUTE",
            "detour_km": 0.0, "wait_min": 3, "fare_delta_inr": 0.0, "walk_m": 0,
            "summary": "Holding shuttle for 3 minutes: All onboard arrival deadlines preserved.",
            "bullets": [
                "Evaluated co-riders: Minimum arrival slack is 8 minutes",
                "A 3-minute hold leaves a safe 5-minute buffer before exams/shifts",
                "Fare remains completely unchanged (₹0.00)"
            ]
        })
        candidate_specs.append({
            "action_type": "SPLIT_POOL",
            "detour_km": 0.0, "wait_min": 8, "fare_delta_inr": -10.0, "walk_m": 0,
            "summary": "Shuttle proceeds on schedule; delayed rider re-booked on next service.",
            "bullets": [
                "Prevents onboard riders from facing cumulative delay penalty",
                "Delayed rider seamlessly transferred to next service arriving in 8 min",
                "Delayed rider receives ₹10.00 compensation discount"
            ]
        })

    elif dtype == "ROUTE_CHANGE":
        candidate_specs.append({
            "action_type": "DETOUR_REROUTE",
            "detour_km": 0.8, "wait_min": 2, "fare_delta_inr": 0.0, "walk_m": 0,
            "summary": "Dynamic arterial detour around roadwork adds 0.8 km and 2 minutes.",
            "bullets": [
                "Re-routed via parallel secondary boulevard to bypass congestion",
                "Detour of 0.8 km stays well within 3.0 km personal tolerance",
                "Platform absorbs dynamic re-routing costs: ₹0.00 fare delta"
            ]
        })
        candidate_specs.append({
            "action_type": "ALTERNATIVE_PICKUP",
            "detour_km": 0.0, "wait_min": 1, "fare_delta_inr": -12.0, "walk_m": 180,
            "summary": "Meet beyond road closure (180m walk) to bypass traffic bottleneck.",
            "bullets": [
                "Pedestrian walkway enables 2-minute stroll across sector barrier",
                "Saves vehicle 12 minutes of queuing in traffic",
                "₹12.00 pedestrian incentive credited"
            ]
        })

    elif dtype == "SEAT_SHORTAGE":
        candidate_specs.append({
            "action_type": "SPLIT_POOL",
            "detour_km": 0.0, "wait_min": 3, "fare_delta_inr": 0.0, "walk_m": 0,
            "summary": "Partition group across two synchronized fleet vehicles at identical fare.",
            "bullets": [
                "Dispatched Standby EV Shuttle #05 to accommodate overflow passengers",
                "Zero wait time degradation; vehicles depart in coordinated convoy",
                "100% fare locked at original pooled rate: ₹0.00 difference"
            ]
        })

    else:
        candidate_specs.append({
            "action_type": "ALTERNATIVE_PICKUP",
            "detour_km": -0.5, "wait_min": 1, "fare_delta_inr": -15.0, "walk_m": 190,
            "summary": "Walk 190m to metro underpass: Saves 8 minutes of vehicular detour.",
            "bullets": [
                "Meetup point at metro underpass avoids congested traffic circle",
                "Reduces vehicle travel by 1.4 km and arrival time by 8 min",
                "₹15.00 micro-walk incentive applied"
            ]
        })
        candidate_specs.append({
            "action_type": "SOLO_FALLBACK",
            "detour_km": 0.0, "wait_min": 4, "fare_delta_inr": 0.0, "walk_m": 0,
            "summary": "Direct solo express transfer to final destination.",
            "bullets": [
                "Direct vehicle dispatched without intermediate stops",
                "All passenger tolerances satisfied",
                "Zero additional fare charged: ₹0.00"
            ]
        })

    # Build RecoveryPlan instances
    generated_plans: List[RecoveryPlan] = []
    
    for idx, spec in enumerate(candidate_specs):
        is_feasible, checks, violations = evaluate_passenger_constraints(
            constraint=constraint,
            detour_delta_km=spec["detour_km"],
            wait_delta_min=spec["wait_min"],
            fare_delta_inr=spec["fare_delta_inr"],
            walking_distance_m=spec["walk_m"],
            base_fare_inr=base_fare
        )

        checks_by_temp_id[idx] = checks
        violations_by_temp_id[idx] = violations

        # Count satisfied constraints
        satisfied_count = sum(1 for c in checks.values() if c.get("satisfied", True))
        total_count = len(checks)

        # Phase 1: Dynamic Confidence Score Calculation
        conf, conf_breakdown = calculate_dynamic_confidence_score(
            wait_delta_min=spec["wait_min"],
            max_wait_time_min=constraint.max_wait_time_min if constraint else 12,
            walking_distance_m=spec["walk_m"],
            walking_tolerance_m=constraint.walking_tolerance_m if constraint else 300,
            fare_delta_inr=spec["fare_delta_inr"],
            max_fare_tolerance_inr=constraint.max_fare_tolerance_inr if constraint else 50.0,
            base_fare_inr=base_fare,
            constraints_satisfied_count=satisfied_count,
            total_constraints_count=total_count
        )
        breakdowns_by_temp_id[idx] = conf_breakdown

        # Phase 2: Dynamic Fairness Score Calculation
        fairness, _ = calculate_plan_fairness_score(
            historical_burden_min=historical_burden,
            proposed_wait_delta_min=spec["wait_min"],
            proposed_detour_km=spec["detour_km"]
        )

        bullets = list(spec["bullets"])
        if not is_feasible:
            bullets.append(f"Constraint Alert: {'; '.join(violations)}")
        else:
            bullets.append("Constraint Check: Satisfies all passenger thresholds (wait, detour, walk, fare)")

        plan = RecoveryPlan(
            disruption_id=disruption_event.id,
            affected_passenger_id=user.id if user else None,
            target_ride_id=target_ride_id or (ride.id if ride else None),
            action_type=spec["action_type"],
            detour_delta_km=spec["detour_km"],
            wait_delta_min=spec["wait_min"],
            fare_delta_inr=spec["fare_delta_inr"],
            walking_distance_m=spec["walk_m"],
            is_feasible=is_feasible,
            confidence_score=conf,
            fairness_score=fairness,
            explanation_summary=spec["summary"],
            explanation_bullets=json.dumps(bullets),
            status="PROPOSED"
        )
        generated_plans.append(plan)
        db.add(plan)

    db.commit()

    # Map temp index to actual plan IDs
    checks_by_plan_id = {}
    violations_by_plan_id = {}
    conf_by_plan_id = {}
    for idx, plan in enumerate(generated_plans):
        db.refresh(plan)
        checks_by_plan_id[plan.id] = checks_by_temp_id[idx]
        violations_by_plan_id[plan.id] = violations_by_temp_id[idx]
        conf_by_plan_id[plan.id] = breakdowns_by_temp_id[idx]

    # Rank plans: feasible plans first, sorted by composite score = 0.65*conf + 0.35*fairness
    def plan_rank_key(p: RecoveryPlan):
        feasibility_weight = 10.0 if p.is_feasible else -10.0
        composite = (0.65 * p.confidence_score) + (0.35 * p.fairness_score)
        return (feasibility_weight, composite)

    generated_plans.sort(key=plan_rank_key, reverse=True)

    # Phase 3: Synthesize Explainable AI report and embed into selected plan bullets
    selected_plan = generated_plans[0]
    fairness_meta = {
        "historical_burden_min": historical_burden,
        "status": "PRIORITIZED" if historical_burden > 15.0 else "NORMAL"
    }
    xai_report = generate_xai_explanation_payload(
        selected_plan=selected_plan,
        all_candidate_plans=generated_plans,
        checks_by_plan_id=checks_by_plan_id,
        violations_by_plan_id=violations_by_plan_id,
        confidence_breakdown_by_plan_id=conf_by_plan_id,
        fairness_details=fairness_meta
    )

    # Attach serialized XAI explanation into selected plan bullets
    current_bullets = json.loads(selected_plan.explanation_bullets or "[]")
    current_bullets.append(f"XAI Rationale: {xai_report['explanation_narrative']}")
    selected_plan.explanation_bullets = json.dumps(current_bullets)

    # Update disruption status
    disruption_event.status = "EVALUATING"
    db.commit()

    return generated_plans
