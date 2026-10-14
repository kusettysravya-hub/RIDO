import sys
import os
import unittest
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Safe Windows cp1252 printing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import Base
from app.models import (
    User, Ride, DisruptionEvent, PassengerConstraint, RecoveryPlan, PassengerDelayRecord
)
from app.services.recovery_service import (
    calculate_dynamic_confidence_score,
    calculate_historical_delay_burden,
    calculate_plan_fairness_score,
    evaluate_passenger_constraints,
    generate_alternative_recovery_plans,
    create_disruption_event,
    get_or_create_passenger_constraint,
    record_passenger_delay
)

class TestRecoveryEdgeCases(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False
        )

        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed demo user
        self.user = User(
            id="usr-edge-1", email="edge.user@commute.in", full_name="Edge Tester",
            password_hash="pw", role="PASSENGER"
        )
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_edge_01_missing_passenger_constraints(self):
        """When user has no constraint in DB, auto-creates with safe defaults."""
        user2 = User(
            id="usr-edge-2", email="edge2@commute.in", full_name="Edge 2",
            password_hash="pw", role="PASSENGER"
        )
        self.db.add(user2)
        self.db.commit()

        constraint = get_or_create_passenger_constraint(self.db, user2.id)
        self.assertIsNotNone(constraint)
        self.assertEqual(constraint.max_wait_time_min, 12)
        self.assertEqual(constraint.max_detour_km, 3.0)
        self.assertEqual(constraint.max_fare_tolerance_inr, 50.0)

    def test_edge_02_zero_fare_and_zero_walking(self):
        """Zero fare delta and zero walking distance are evaluated safely."""
        is_feas, checks, viols = evaluate_passenger_constraints(
            constraint=None,
            detour_delta_km=0.0,
            wait_delta_min=0,
            fare_delta_inr=0.0,
            walking_distance_m=0,
            base_fare_inr=0.0
        )
        self.assertTrue(is_feas)
        self.assertEqual(checks["fare_delta"]["actual_inr"], 0.0)
        self.assertEqual(checks["walking"]["actual_m"], 0)

    def test_edge_03_invalid_and_expired_deadlines(self):
        """Deadline in the past is handled safely and flagged as a violation."""
        now = datetime.utcnow()
        expired_deadline = now - timedelta(minutes=10) # 10 minutes ago
        estimated_arrival = now + timedelta(minutes=15)

        is_feas, checks, viols = evaluate_passenger_constraints(
            constraint=None,
            detour_delta_km=1.0,
            wait_delta_min=5,
            fare_delta_inr=0.0,
            estimated_arrival_dt=estimated_arrival,
            deadline_dt=expired_deadline
        )
        self.assertFalse(is_feas)
        self.assertFalse(checks["deadline"]["satisfied"])

    def test_edge_04_all_alternatives_violate_constraints(self):
        """
        When passenger has extremely strict tolerances (e.g. max wait 0 min, max detour 0 km),
        all candidate plans properly flag is_feasible = False without crashing.
        """
        strict_constraint = PassengerConstraint(
            user_id=self.user.id,
            max_wait_time_min=0, # 0 minutes tolerance
            max_detour_km=0.0,   # 0 km detour tolerance
            max_fare_tolerance_inr=0.0,
            walking_tolerance_m=0
        )
        self.db.add(strict_constraint)
        self.db.commit()

        # Check a plan with 2 min wait
        is_feas, checks, viols = evaluate_passenger_constraints(
            constraint=strict_constraint,
            detour_delta_km=0.5,
            wait_delta_min=2,
            fare_delta_inr=10.0,
            walking_distance_m=50
        )
        self.assertFalse(is_feas)
        self.assertFalse(checks["detour"]["satisfied"])
        self.assertFalse(checks["wait_time"]["satisfied"])
        self.assertFalse(checks["fare_delta"]["satisfied"])
        self.assertFalse(checks["walking"]["satisfied"])

    def test_edge_05_repeated_disruptions_and_multiple_passengers(self):
        """Multiple passengers experiencing repeated disruptions accumulate independent burdens."""
        user_a = self.user
        user_b = User(id="usr-b", email="b@test.in", full_name="User B", password_hash="pw", role="PASSENGER")
        self.db.add(user_b)
        self.db.commit()

        # User A suffers 3 disruptions in 1 day (10 min, 15 min, 12 min)
        now = datetime.utcnow()
        record_passenger_delay(self.db, user_a.id, 10.0, timestamp=now - timedelta(hours=3))
        record_passenger_delay(self.db, user_a.id, 15.0, timestamp=now - timedelta(hours=2))
        record_passenger_delay(self.db, user_a.id, 12.0, timestamp=now - timedelta(hours=1))

        # User B suffers 1 disruption (5 min)
        record_passenger_delay(self.db, user_b.id, 5.0, timestamp=now - timedelta(hours=1))

        burden_a = calculate_historical_delay_burden(self.db, user_a.id, reference_time=now)
        burden_b = calculate_historical_delay_burden(self.db, user_b.id, reference_time=now)

        self.assertGreater(burden_a, 30.0) # > 30 minutes accumulated
        self.assertLess(burden_b, 6.0)

        # Plan with +5 min wait for User A should have severe fairness penalty
        fairness_a, details_a = calculate_plan_fairness_score(burden_a, proposed_wait_delta_min=5, proposed_detour_km=1.0)
        # Same plan for User B should have much higher fairness
        fairness_b, details_b = calculate_plan_fairness_score(burden_b, proposed_wait_delta_min=5, proposed_detour_km=1.0)

        self.assertLess(fairness_a, fairness_b)
        self.assertEqual(details_a["status"], "PRIORITIZED")

    def test_edge_06_deleted_disruption_event_cascades_safely(self):
        """Deleting a disruption event automatically cascade-deletes its plans and doesn't orphan."""
        event = create_disruption_event(self.db, disruption_type="ROUTE_CHANGE")
        plans = generate_alternative_recovery_plans(self.db, event, affected_user_id=self.user.id)
        self.assertGreater(len(plans), 0)

        # Delete event
        self.db.delete(event)
        self.db.commit()

        orphans = self.db.query(RecoveryPlan).filter(RecoveryPlan.disruption_id == event.id).all()
        self.assertEqual(len(orphans), 0)

    def test_edge_07_invalid_confidence_values_enforce_check_constraint(self):
        """Database check constraints strictly reject confidence < 0.0 or > 1.0."""
        event = create_disruption_event(self.db, disruption_type="SEAT_SHORTAGE")
        
        bad_plan_high = RecoveryPlan(
            disruption_id=event.id, action_type="SOLO_FALLBACK",
            confidence_score=1.4, explanation_summary="Bad high"
        )
        self.db.add(bad_plan_high)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

        bad_plan_neg = RecoveryPlan(
            disruption_id=event.id, action_type="SOLO_FALLBACK",
            confidence_score=-0.1, explanation_summary="Bad negative"
        )
        self.db.add(bad_plan_neg)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_edge_08_no_recovery_alternatives_fallback(self):
        """When unknown disruption type is passed, returns a safe fallback plan rather than empty list or crash."""
        event = create_disruption_event(self.db, disruption_type="SURGE_BLOCK")
        plans = generate_alternative_recovery_plans(self.db, event, affected_user_id=self.user.id)
        self.assertIsInstance(plans, list)
        self.assertGreaterEqual(len(plans), 1)
        # Should still generate valid plan with valid bounds
        for p in plans:
            self.assertGreaterEqual(p.confidence_score, 0.0)
            self.assertLessEqual(p.confidence_score, 1.0)
            self.assertGreaterEqual(p.fairness_score, 0.0)
            self.assertLessEqual(p.fairness_score, 1.0)

    def test_edge_09_new_passenger_zero_history(self):
        """New passenger with 0 historical delays starts with 0.0 burden and high fairness tolerance."""
        new_user = User(
            id="usr-brand-new", email="brandnew@commute.in", full_name="Brand New",
            password_hash="pw", role="PASSENGER"
        )
        self.db.add(new_user)
        self.db.commit()

        burden = calculate_historical_delay_burden(self.db, new_user.id)
        self.assertEqual(burden, 0.0)

        # Plan with +4 min wait and 0.5 km detour
        fairness, details = calculate_plan_fairness_score(
            historical_burden_min=burden,
            proposed_wait_delta_min=4,
            proposed_detour_km=0.5
        )
        self.assertGreaterEqual(fairness, 0.90)
        self.assertEqual(details["status"], "FRESH_PASSENGER")
        self.assertEqual(details["historical_burden_min"], 0.0)

    def test_edge_10_extreme_and_invalid_confidence_inputs_stay_bounded(self):
        """Extreme negative or huge inputs to calculate_dynamic_confidence_score remain strictly in [0.0, 1.0]."""
        # Huge delays and penalties
        score_extreme_neg = calculate_dynamic_confidence_score(
            wait_delta_min=999, max_wait_time_min=1,
            walking_distance_m=99999, walking_tolerance_m=10,
            fare_delta_inr=5000.0, max_fare_tolerance_inr=10.0,
            constraints_satisfied_count=0, total_constraints_count=10
        )
        self.assertGreaterEqual(score_extreme_neg, 0.0)
        self.assertLessEqual(score_extreme_neg, 0.10)

        # Negative wait or negative walking (abnormal inputs)
        score_extreme_pos = calculate_dynamic_confidence_score(
            wait_delta_min=-50, max_wait_time_min=10,
            walking_distance_m=-100, walking_tolerance_m=300,
            fare_delta_inr=-500.0, max_fare_tolerance_inr=50.0,
            constraints_satisfied_count=10, total_constraints_count=10
        )
        self.assertGreaterEqual(score_extreme_pos, 0.90)
        self.assertLessEqual(score_extreme_pos, 1.0)


if __name__ == "__main__":
    unittest.main()
