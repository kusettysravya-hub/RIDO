import sys
import os
import unittest
from datetime import datetime, timedelta
import json

# Safe Windows cp1252 printing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.models import (
    Base, User, Ride, DisruptionEvent, PassengerConstraint, RecoveryPlan
)
from app.services.recovery_service import (
    evaluate_passenger_constraints,
    calculate_dynamic_confidence_score,
    calculate_dynamic_fairness_score,
    get_or_create_passenger_constraint,
    create_disruption_event,
    generate_alternative_recovery_plans
)

class TestRecoveryServiceAndConstraints(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", echo=False)
        
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed test passenger and ride
        self.passenger = User(
            id="usr-p-100",
            email="ananya.iyer@metro.in",
            full_name="Ananya Iyer",
            password_hash="mockpass",
            role="PASSENGER",
            wallet_balance=400.0
        )
        self.ride = Ride(
            id="ride-r-200",
            origin_name="HSR Layout Sector 1, Bengaluru",
            origin_lat=12.9116,
            origin_lng=77.6389,
            destination_name="Embassy Tech Village, Bengaluru",
            destination_lat=12.9279,
            destination_lng=77.6974,
            total_fare_amount=160.0,
            individual_share_amount=55.0
        )
        self.db.add_all([self.passenger, self.ride])
        self.db.commit()

        # Seed custom constraint
        self.constraint = PassengerConstraint(
            user_id=self.passenger.id,
            community_segment="CORPORATE_EMPLOYEE",
            max_wait_time_min=10,
            max_detour_km=2.5,
            max_fare_tolerance_pct=15.0,
            max_fare_tolerance_inr=30.0,
            walking_tolerance_m=350,
            cumulative_delay_min=4.0
        )
        self.db.add(self.constraint)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # -------------------------------------------------------------------------
    # 1. Constraint Evaluation Tests
    # -------------------------------------------------------------------------
    def test_01_all_constraints_satisfied(self):
        """Plan within all passenger limits should evaluate to is_feasible = True."""
        is_feasible, checks, violations = evaluate_passenger_constraints(
            constraint=self.constraint,
            detour_delta_km=1.2, # < 2.5 km
            wait_delta_min=5,     # < 10 min
            fare_delta_inr=-10.0, # Savings
            walking_distance_m=150, # < 350 m
            base_fare_inr=55.0
        )
        self.assertTrue(is_feasible)
        self.assertEqual(len(violations), 0)
        self.assertTrue(checks["detour"]["satisfied"])
        self.assertTrue(checks["wait_time"]["satisfied"])
        self.assertTrue(checks["fare_delta"]["satisfied"])
        self.assertTrue(checks["walking"]["satisfied"])

    def test_02_detour_constraint_breach(self):
        """Plan exceeding max detour must evaluate to is_feasible = False."""
        is_feasible, checks, violations = evaluate_passenger_constraints(
            constraint=self.constraint,
            detour_delta_km=4.2, # > 2.5 km limit
            wait_delta_min=4,
            fare_delta_inr=0.0,
            walking_distance_m=100
        )
        self.assertFalse(is_feasible)
        self.assertFalse(checks["detour"]["satisfied"])
        self.assertTrue(any("Detour" in v for v in violations))

    def test_03_wait_time_constraint_breach(self):
        """Plan exceeding max wait time must evaluate to is_feasible = False."""
        is_feasible, checks, violations = evaluate_passenger_constraints(
            constraint=self.constraint,
            detour_delta_km=0.5,
            wait_delta_min=18, # > 10 min limit
            fare_delta_inr=0.0,
            walking_distance_m=50
        )
        self.assertFalse(is_feasible)
        self.assertFalse(checks["wait_time"]["satisfied"])
        self.assertTrue(any("Waiting time" in v for v in violations))

    def test_04_fare_tolerance_constraint_breach(self):
        """Plan with fare increase exceeding max INR cap must fail constraint."""
        is_feasible, checks, violations = evaluate_passenger_constraints(
            constraint=self.constraint,
            detour_delta_km=0.5,
            wait_delta_min=3,
            fare_delta_inr=45.0, # > ₹30.0 limit
            walking_distance_m=50,
            base_fare_inr=55.0
        )
        self.assertFalse(is_feasible)
        self.assertFalse(checks["fare_delta"]["satisfied"])
        self.assertTrue(any("Fare increase" in v for v in violations))

    def test_05_walking_distance_constraint_breach(self):
        """Plan exceeding walking tolerance must fail constraint."""
        is_feasible, checks, violations = evaluate_passenger_constraints(
            constraint=self.constraint,
            detour_delta_km=0.1,
            wait_delta_min=2,
            fare_delta_inr=0.0,
            walking_distance_m=600 # > 350m limit
        )
        self.assertFalse(is_feasible)
        self.assertFalse(checks["walking"]["satisfied"])
        self.assertTrue(any("Walking distance" in v for v in violations))

    def test_06_deadline_constraint_breach(self):
        """Plan where arrival exceeds deadline must fail constraint."""
        now = datetime.utcnow()
        estimated_arrival = now + timedelta(minutes=45)
        deadline = now + timedelta(minutes=30) # Arrival is 15 min late

        is_feasible, checks, violations = evaluate_passenger_constraints(
            constraint=self.constraint,
            detour_delta_km=0.5,
            wait_delta_min=3,
            fare_delta_inr=0.0,
            walking_distance_m=50,
            estimated_arrival_dt=estimated_arrival,
            deadline_dt=deadline
        )
        self.assertFalse(is_feasible)
        self.assertFalse(checks["deadline"]["satisfied"])
        self.assertTrue(any("deadline" in v.lower() for v in violations))

    def test_07_edge_cases_none_constraint_and_zero_division(self):
        """Constraint evaluator handles None constraint and zero base fare gracefully."""
        is_feasible, checks, violations = evaluate_passenger_constraints(
            constraint=None, # Missing constraint profile
            detour_delta_km=1.0,
            wait_delta_min=5,
            fare_delta_inr=10.0,
            walking_distance_m=100,
            base_fare_inr=0.0 # Division by zero edge case
        )
        self.assertTrue(is_feasible)
        self.assertIn("detour", checks)
        self.assertIn("wait_time", checks)
        self.assertIn("fare_delta", checks)
        self.assertIn("walking", checks)

    # -------------------------------------------------------------------------
    # 2. Dynamic Score Calculation Tests
    # -------------------------------------------------------------------------
    def test_08_dynamic_confidence_score_calculation(self):
        """Confidence score must be in [0.05, 0.99] and respond monotonically to margins."""
        # High quality plan (little detour, small wait, fare savings, low walk)
        high_conf = calculate_dynamic_confidence_score(
            detour_delta_km=0.2, max_detour_km=3.0,
            wait_delta_min=2, max_wait_time_min=15,
            fare_delta_inr=-15.0, max_fare_tolerance_inr=50.0,
            walking_distance_m=50, walking_tolerance_m=300
        )
        self.assertGreaterEqual(high_conf, 0.75)
        self.assertLessEqual(high_conf, 0.99)

        # Marginal plan (high detour, high wait, max fare increase, long walk)
        low_conf = calculate_dynamic_confidence_score(
            detour_delta_km=3.0, max_detour_km=3.0,
            wait_delta_min=14, max_wait_time_min=15,
            fare_delta_inr=48.0, max_fare_tolerance_inr=50.0,
            walking_distance_m=290, walking_tolerance_m=300
        )
        self.assertLess(low_conf, high_conf)
        self.assertGreaterEqual(low_conf, 0.05)

        # Zero denominator division safety check
        zero_safe_conf = calculate_dynamic_confidence_score(
            detour_delta_km=1.0, max_detour_km=0.0,
            wait_delta_min=2, max_wait_time_min=0,
            fare_delta_inr=5.0, max_fare_tolerance_inr=0.0,
            walking_distance_m=0, walking_tolerance_m=0
        )
        self.assertGreaterEqual(zero_safe_conf, 0.05)
        self.assertLessEqual(zero_safe_conf, 0.99)

    def test_09_dynamic_fairness_score_calculation(self):
        """Fairness score penalizes additional delay on riders with high cumulative delay."""
        # Rider with 0 historical delay
        fresh_fairness = calculate_dynamic_fairness_score(
            cumulative_delay_min=0.0,
            wait_delta_min=5,
            detour_delta_km=1.0
        )
        self.assertGreaterEqual(fresh_fairness, 0.80)

        # Rider with 25 minutes of past delay offered a plan with 8 min wait & 2 km detour
        delayed_rider_fairness = calculate_dynamic_fairness_score(
            cumulative_delay_min=25.0,
            wait_delta_min=8,
            detour_delta_km=2.0
        )
        # Fairness score should drop significantly
        self.assertLess(delayed_rider_fairness, fresh_fairness)
        self.assertGreaterEqual(delayed_rider_fairness, 0.10)

    # -------------------------------------------------------------------------
    # 3. Disruption Ingestion & Multi-Alternative Plan Generation Tests
    # -------------------------------------------------------------------------
    def test_10_generate_plans_for_driver_cancel(self):
        """DRIVER_CANCEL generates 3 viable alternatives with stored metrics in INR."""
        disruption = create_disruption_event(
            db=self.db,
            disruption_type="DRIVER_CANCEL",
            ride_id=self.ride.id,
            reported_by_id=self.passenger.id,
            severity="HIGH",
            details="Driver unable to reach pickup due to puncture"
        )
        self.assertEqual(disruption.status, "DETECTED")

        plans = generate_alternative_recovery_plans(
            db=self.db,
            disruption_event=disruption,
            affected_user_id=self.passenger.id
        )
        self.assertEqual(len(plans), 3)
        self.assertEqual(disruption.status, "EVALUATING")

        # Verify action types
        action_types = {p.action_type for p in plans}
        self.assertIn("REASSIGN_RIDE", action_types)
        self.assertIn("ALTERNATIVE_PICKUP", action_types)
        self.assertIn("SOLO_FALLBACK", action_types)

        for p in plans:
            # Check all fields stored properly
            self.assertIsNotNone(p.detour_delta_km)
            self.assertIsNotNone(p.wait_delta_min)
            self.assertIsNotNone(p.fare_delta_inr)
            self.assertIsNotNone(p.walking_distance_m)
            self.assertGreaterEqual(p.confidence_score, 0.05)
            self.assertLessEqual(p.confidence_score, 0.99)
            self.assertGreaterEqual(p.fairness_score, 0.10)
            self.assertLessEqual(p.fairness_score, 1.00)
            self.assertTrue(p.is_feasible)

            # Bullet points must be valid JSON
            bullets = json.loads(p.explanation_bullets)
            self.assertIsInstance(bullets, list)
            self.assertGreater(len(bullets), 0)

    def test_11_generate_plans_for_vehicle_breakdown(self):
        """VEHICLE_BREAKDOWN generates alternative recovery options and persists in DB."""
        disruption = create_disruption_event(
            db=self.db,
            disruption_type="VEHICLE_BREAKDOWN",
            ride_id=self.ride.id,
            reported_by_id=self.passenger.id,
            severity="CRITICAL",
            details="EV battery high temp alert"
        )
        plans = generate_alternative_recovery_plans(
            db=self.db,
            disruption_event=disruption,
            affected_user_id=self.passenger.id
        )
        self.assertEqual(len(plans), 3)

        # Check DB persistence
        queried_plans = self.db.query(RecoveryPlan).filter_by(disruption_id=disruption.id).all()
        self.assertEqual(len(queried_plans), 3)

    def test_12_generate_plans_for_passenger_cancel(self):
        """PASSENGER_CANCEL generates seat replacement, reroute, and solo options."""
        disruption = create_disruption_event(
            db=self.db,
            disruption_type="PASSENGER_CANCEL",
            ride_id=self.ride.id,
            reported_by_id=self.passenger.id,
            severity="MEDIUM"
        )
        plans = generate_alternative_recovery_plans(
            db=self.db,
            disruption_event=disruption,
            affected_user_id=self.passenger.id
        )
        self.assertEqual(len(plans), 3)
        actions = [p.action_type for p in plans]
        self.assertIn("SUBSTITUTE_PASSENGER", actions)
        self.assertIn("DETOUR_REROUTE", actions)
        self.assertIn("SOLO_FALLBACK", actions)

if __name__ == "__main__":
    unittest.main()
