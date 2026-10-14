import sys
import unittest
from datetime import datetime

# Safe Windows cp1252 printing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from app.models import (
    Base, User, Ride, DisruptionEvent, PassengerConstraint, RecoveryPlan
)

class TestRecoveryModelsDatabase(unittest.TestCase):

    def setUp(self):
        """Creates a fresh in-memory SQLite database with foreign keys enforced."""
        self.engine = create_engine("sqlite:///:memory:", echo=False)
        
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed base user and ride for testing
        self.user = User(
            id="usr-test-101",
            email="aarav.patel@techhub.in",
            full_name="Aarav Patel",
            password_hash="hashed_pw_test",
            role="PASSENGER",
            wallet_balance=350.0
        )
        self.driver_user = User(
            id="usr-driver-202",
            email="driver.rajesh@voltride.in",
            full_name="Rajesh Kumar",
            password_hash="hashed_pw_test",
            role="DRIVER",
            wallet_balance=1200.0
        )
        self.ride = Ride(
            id="ride-test-303",
            origin_name="Electronic City Gate 1, Bengaluru",
            origin_lat=12.8452,
            origin_lng=77.6602,
            destination_name="Koramangala Sony World, Bengaluru",
            destination_lat=12.9352,
            destination_lng=77.6245,
            total_fare_amount=180.0, # ₹180 INR
            individual_share_amount=60.0 # ₹60 INR per passenger
        )
        self.db.add_all([self.user, self.driver_user, self.ride])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_01_table_creation_and_schema_inspection(self):
        """Verifies that all three recovery tables and expected columns are created."""
        inspector = inspect(self.engine)
        tables = inspector.get_table_names()

        self.assertIn("disruption_events", tables)
        self.assertIn("passenger_constraints", tables)
        self.assertIn("recovery_plans", tables)

        # Check disruption_events columns
        disrupt_cols = {c["name"] for c in inspector.get_columns("disruption_events")}
        expected_disrupt_cols = {
            "id", "ride_id", "disruption_type", "severity", "status",
            "reported_by_id", "disruption_details", "created_at", "updated_at", "resolved_at"
        }
        self.assertTrue(expected_disrupt_cols.issubset(disrupt_cols))

        # Check passenger_constraints columns including INR currency
        constraint_cols = {c["name"] for c in inspector.get_columns("passenger_constraints")}
        expected_constraint_cols = {
            "id", "user_id", "community_segment", "max_wait_time_min",
            "max_detour_km", "max_fare_tolerance_pct", "max_fare_tolerance_inr",
            "walking_tolerance_m", "cumulative_delay_min", "preferred_departure_slack_min",
            "created_at", "updated_at"
        }
        self.assertTrue(expected_constraint_cols.issubset(constraint_cols))

        # Check recovery_plans columns including dynamic confidence and INR currency
        plan_cols = {c["name"] for c in inspector.get_columns("recovery_plans")}
        expected_plan_cols = {
            "id", "disruption_id", "affected_passenger_id", "target_ride_id",
            "action_type", "detour_delta_km", "wait_delta_min", "fare_delta_inr",
            "is_feasible", "confidence_score", "fairness_score", "explanation_summary",
            "explanation_bullets", "status", "created_at", "updated_at", "applied_at"
        }
        self.assertTrue(expected_plan_cols.issubset(plan_cols))

    def test_02_disruption_event_lifecycle_and_constraints(self):
        """Tests DisruptionEvent model persistence, check constraints, and relationships."""
        event = DisruptionEvent(
            ride_id=self.ride.id,
            disruption_type="VEHICLE_BREAKDOWN",
            severity="HIGH",
            status="DETECTED",
            reported_by_id=self.user.id,
            disruption_details="EV motor inverter temperature warning near Silk Board junction"
        )
        self.db.add(event)
        self.db.commit()

        # Verify query and relationships
        queried = self.db.query(DisruptionEvent).filter_by(id=event.id).first()
        self.assertIsNotNone(queried)
        self.assertEqual(queried.ride.id, self.ride.id)
        self.assertEqual(queried.reported_by.id, self.user.id)
        self.assertEqual(queried.severity, "HIGH")

        # Bidirectional check: user -> disruption_events_reported
        self.assertIn(queried, self.user.disruption_events_reported)
        # Bidirectional check: ride -> disruption_events
        self.assertIn(queried, self.ride.disruption_events)

        # Verify invalid severity check constraint
        invalid_severity = DisruptionEvent(
            disruption_type="ROUTE_CHANGE",
            severity="INVALID_SEVERITY_LEVEL",
            status="DETECTED"
        )
        self.db.add(invalid_severity)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_03_passenger_constraint_inr_and_uniqueness(self):
        """Tests PassengerConstraint model, INR currency thresholds, uniqueness, and bounds."""
        constraint = PassengerConstraint(
            user_id=self.user.id,
            community_segment="CORPORATE_EMPLOYEE",
            max_wait_time_min=10,
            max_detour_km=2.5,
            max_fare_tolerance_pct=20.0,
            max_fare_tolerance_inr=40.0, # ₹40 INR max change tolerance
            walking_tolerance_m=400,
            cumulative_delay_min=5.0
        )
        self.db.add(constraint)
        self.db.commit()

        # Verify query and relationship
        queried = self.db.query(PassengerConstraint).filter_by(user_id=self.user.id).first()
        self.assertIsNotNone(queried)
        self.assertEqual(queried.max_fare_tolerance_inr, 40.0)
        self.assertEqual(self.user.passenger_constraint.id, queried.id)

        # Verify uniqueness of user_id (one constraint profile per user)
        duplicate_constraint = PassengerConstraint(
            user_id=self.user.id,
            community_segment="CAMPUS_STUDENT",
            max_wait_time_min=15
        )
        self.db.add(duplicate_constraint)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

        # Verify check constraint: negative wait time must fail
        negative_wait = PassengerConstraint(
            user_id=self.driver_user.id,
            max_wait_time_min=-5
        )
        self.db.add(negative_wait)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_04_recovery_plan_dynamic_confidence_and_cascade(self):
        """Tests RecoveryPlan model, dynamic confidence bounds [0.0, 1.0], and cascade delete."""
        disruption = DisruptionEvent(
            ride_id=self.ride.id,
            disruption_type="PASSENGER_CANCEL",
            severity="MEDIUM",
            status="DETECTED",
            reported_by_id=self.user.id
        )
        self.db.add(disruption)
        self.db.flush()

        # Dynamic calculated confidence score (e.g. 0.88 based on constraint satisfaction)
        plan = RecoveryPlan(
            disruption_id=disruption.id,
            affected_passenger_id=self.user.id,
            target_ride_id=self.ride.id,
            action_type="SUBSTITUTE_PASSENGER",
            detour_delta_km=0.2,
            wait_delta_min=2,
            fare_delta_inr=-15.0, # ₹15 saved for passengers
            is_feasible=True,
            confidence_score=0.88,
            fairness_score=0.95,
            explanation_summary="Matched with nearby standby passenger; fare reduced by ₹15.00",
            explanation_bullets='["Standby passenger pickup is 200m ahead", "Detour is +0.2 km", "Fare delta: -₹15.00"]',
            status="PROPOSED"
        )
        self.db.add(plan)
        self.db.commit()

        # Verify query and bidirectional navigation
        queried_plan = self.db.query(RecoveryPlan).filter_by(id=plan.id).first()
        self.assertIsNotNone(queried_plan)
        self.assertEqual(queried_plan.fare_delta_inr, -15.0)
        self.assertEqual(queried_plan.confidence_score, 0.88)
        self.assertEqual(queried_plan.disruption.id, disruption.id)
        self.assertIn(queried_plan, self.user.recovery_plans)
        self.assertIn(queried_plan, self.ride.target_recovery_plans)

        # Test check constraint: confidence_score > 1.0 must fail
        invalid_confidence = RecoveryPlan(
            disruption_id=disruption.id,
            action_type="SOLO_FALLBACK",
            confidence_score=1.5, # Out of [0.0, 1.0] range
            explanation_summary="Invalid confidence test"
        )
        self.db.add(invalid_confidence)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

        # Test check constraint: confidence_score < 0.0 must fail
        negative_confidence = RecoveryPlan(
            disruption_id=disruption.id,
            action_type="SOLO_FALLBACK",
            confidence_score=-0.2, # Negative
            explanation_summary="Invalid negative confidence test"
        )
        self.db.add(negative_confidence)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

        # Test cascade delete: deleting DisruptionEvent must automatically delete associated RecoveryPlans
        self.db.delete(disruption)
        self.db.commit()
        orphaned_plans = self.db.query(RecoveryPlan).filter_by(disruption_id=disruption.id).all()
        self.assertEqual(len(orphaned_plans), 0)

if __name__ == "__main__":
    unittest.main()
