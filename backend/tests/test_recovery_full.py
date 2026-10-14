import sys
import os
import unittest
from datetime import datetime, timedelta
import json

# Safe Windows cp1252 printing
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db, Base
from app.auth_utils import create_access_token
from app.models import (
    User, Ride, DisruptionEvent, PassengerConstraint, RecoveryPlan, PassengerDelayRecord
)
from app.services.recovery_service import (
    calculate_dynamic_confidence_score,
    calculate_historical_delay_burden,
    calculate_plan_fairness_score,
    record_passenger_delay,
    evaluate_passenger_constraints,
    generate_alternative_recovery_plans,
    create_disruption_event,
    get_or_create_passenger_constraint
)

class TestRecoveryFullSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False
        )

        @event.listens_for(cls.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

        def override_get_db():
            db = cls.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    def setUp(self):
        self.db = self.Session()

    def tearDown(self):
        self.db.close()

    # =========================================================================
    # Phase 1: Dynamic Confidence Calculation Tests
    # =========================================================================
    def test_01_confidence_formula_exact_weights(self):
        """
        Verifies formula: Confidence = 0.35*Deadline + 0.30*Walking + 0.20*Fare + 0.15*Constraint
        """
        # Optimal plan: 0 wait, 0 walk, fare savings ₹20, all constraints met
        score, breakdown = calculate_dynamic_confidence_score(
            wait_delta_min=0, max_wait_time_min=15,
            walking_distance_m=0, walking_tolerance_m=300,
            fare_delta_inr=-20.0, max_fare_tolerance_inr=50.0,
            base_fare_inr=60.0,
            constraints_satisfied_count=5, total_constraints_count=5
        )
        self.assertGreaterEqual(score, 0.95)
        self.assertLessEqual(score, 1.0)
        self.assertEqual(breakdown["walking_score"], 1.0)
        self.assertEqual(breakdown["constraint_score"], 1.0)
        self.assertGreaterEqual(breakdown["fare_score"], 0.90)

    def test_02_confidence_edge_cases_and_zero_division(self):
        """Handles 0 denominators and negative values safely, always returns [0.0, 1.0]."""
        score, _ = calculate_dynamic_confidence_score(
            wait_delta_min=0, max_wait_time_min=0,
            walking_distance_m=0, walking_tolerance_m=0,
            fare_delta_inr=0.0, max_fare_tolerance_inr=0.0,
            base_fare_inr=0.0,
            constraints_satisfied_count=0, total_constraints_count=0
        )
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_03_confidence_deadline_slack_vs_breach(self):
        """Deadline ahead increases score; deadline breach decays score."""
        now = datetime.utcnow()
        # 10 min buffer ahead of deadline
        score_ahead, b_ahead = calculate_dynamic_confidence_score(
            estimated_arrival_dt=now,
            deadline_dt=now + timedelta(minutes=10),
            walking_distance_m=0, fare_delta_inr=0.0
        )
        # 10 min late after deadline
        score_late, b_late = calculate_dynamic_confidence_score(
            estimated_arrival_dt=now + timedelta(minutes=10),
            deadline_dt=now,
            walking_distance_m=0, fare_delta_inr=0.0
        )
        self.assertGreater(b_ahead["deadline_score"], b_late["deadline_score"])
        self.assertGreater(score_ahead, score_late)

    # =========================================================================
    # Phase 2: Multi-Trip Fairness Budget Tests (Recency Decay lambda = 0.8)
    # =========================================================================
    def test_04_fairness_recency_decay_formula(self):
        """
        Verifies exponential recency decay: Burden = delay * (0.8 ^ days_ago).
        Recent delays must yield higher burden than older delays.
        """
        user_recent = User(
            id="usr-fair-1", email="recent@test.in", full_name="Recent User",
            password_hash="pwd", role="PASSENGER"
        )
        user_old = User(
            id="usr-fair-2", email="old@test.in", full_name="Old User",
            password_hash="pwd", role="PASSENGER"
        )
        self.db.add_all([user_recent, user_old])
        self.db.commit()

        now = datetime.utcnow()

        # Recent delay: 20 minutes delay, recorded 0.1 days ago
        record_passenger_delay(
            self.db, user_id=user_recent.id, delay_minutes=20.0,
            timestamp=now - timedelta(hours=2)
        )
        # Old delay: 20 minutes delay, recorded 5 days ago
        record_passenger_delay(
            self.db, user_id=user_old.id, delay_minutes=20.0,
            timestamp=now - timedelta(days=5)
        )

        burden_recent = calculate_historical_delay_burden(self.db, user_recent.id, reference_time=now)
        burden_old = calculate_historical_delay_burden(self.db, user_old.id, reference_time=now)

        # Older delay must have decayed: (0.8 ^ 5) = 0.32768 -> 20 * 0.32768 ~ 6.55 min
        self.assertGreater(burden_recent, burden_old)
        self.assertAlmostEqual(burden_recent, 20.0, delta=1.5)
        self.assertLess(burden_old, 10.0)

    def test_05_fairness_new_passenger_zero_records(self):
        """New passenger with 0 history gets historical burden 0.0 and base fairness 1.0."""
        user_new = User(
            id="usr-fair-new", email="newbie@test.in", full_name="New Commuter",
            password_hash="pwd", role="PASSENGER"
        )
        self.db.add(user_new)
        self.db.commit()

        burden = calculate_historical_delay_burden(self.db, user_new.id)
        self.assertEqual(burden, 0.0)

        fairness_score, details = calculate_plan_fairness_score(
            historical_burden_min=burden,
            proposed_wait_delta_min=0,
            proposed_detour_km=0.0
        )
        self.assertEqual(fairness_score, 1.0)
        self.assertEqual(details["status"], "FRESH_PASSENGER")

    def test_06_fairness_repeated_disruptions_and_ranking_protection(self):
        """High delay burden heavily penalizes additional delay options."""
        # Passenger endured 30 minutes of cumulative delay
        score_delayed_more, _ = calculate_plan_fairness_score(
            historical_burden_min=30.0,
            proposed_wait_delta_min=10, # Proposed +10 min wait
            proposed_detour_km=2.0
        )
        # Express option with 0 wait
        score_express, _ = calculate_plan_fairness_score(
            historical_burden_min=30.0,
            proposed_wait_delta_min=0,
            proposed_detour_km=0.0
        )
        self.assertGreater(score_express, score_delayed_more)
        self.assertEqual(score_express, 1.0)

    # =========================================================================
    # Phase 3 & 4: Recovery API Endpoints & XAI Reports
    # =========================================================================
    def test_07_recovery_api_disruption_reporting_and_plan_generation(self):
        """POST /api/recovery/disruptions reports disruption, auto-generates plans."""
        test_user = User(
            id="usr-api-1", email="rider.api@test.in", full_name="API Commuter",
            password_hash="pwd", role="PASSENGER", wallet_balance=250.0
        )
        test_ride = Ride(
            id="ride-api-1", origin_name="Tech Park", origin_lat=12.93, origin_lng=77.68,
            destination_name="Metro Station", destination_lat=12.97, destination_lng=77.64,
            total_fare_amount=120.0, individual_share_amount=40.0
        )
        self.db.add_all([test_user, test_ride])
        self.db.commit()

        token = create_access_token(data={"sub": test_user.id, "email": test_user.email, "role": test_user.role})
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "disruption_type": "VEHICLE_BREAKDOWN",
            "ride_id": test_ride.id,
            "severity": "CRITICAL",
            "details": "Electric shuttle coolant temperature alert"
        }
        res = self.client.post("/api/recovery/disruptions", json=payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("disruption", data)
        self.assertIn("plans", data)
        self.assertGreaterEqual(len(data["plans"]), 2)

        first_plan = data["plans"][0]
        self.assertIn("confidence_score", first_plan)
        self.assertIn("fairness_score", first_plan)
        self.assertIn("fare_delta_inr", first_plan)
        self.assertIn("walking_distance_m", first_plan)

        disrupt_id = data["disruption"]["id"]

        # GET /api/recovery/disruptions/{id}/plans (XAI explanation report)
        xai_res = self.client.get(f"/api/recovery/disruptions/{disrupt_id}/plans", headers=headers)
        self.assertEqual(xai_res.status_code, 200)
        xai_data = xai_res.json()
        self.assertIn("xai_explanation", xai_data)
        xai = xai_data["xai_explanation"]
        self.assertIn("selected_plan", xai)
        self.assertIn("rejected_alternatives", xai)
        self.assertIn("explanation_narrative", xai)

        # Plan acceptance
        plan_id = first_plan["id"]
        accept_res = self.client.post(f"/api/recovery/plans/{plan_id}/accept", headers=headers)
        self.assertEqual(accept_res.status_code, 200)
        self.assertEqual(accept_res.json()["status"], "ACCEPTED")

    def test_08_passenger_constraints_api_crud(self):
        """GET & PUT /api/recovery/constraints update and return INR limits."""
        test_user = User(
            id="usr-api-2", email="rider.limits@test.in", full_name="Limits Commuter",
            password_hash="pwd", role="PASSENGER"
        )
        self.db.add(test_user)
        self.db.commit()

        token = create_access_token(data={"sub": test_user.id, "email": test_user.email, "role": test_user.role})
        headers = {"Authorization": f"Bearer {token}"}

        # Get initial constraints
        get_res = self.client.get("/api/recovery/constraints", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        initial = get_res.json()
        self.assertIn("max_fare_tolerance_inr", initial)

        # Update constraints
        update_payload = {
            "max_wait_time_min": 18,
            "max_detour_km": 4.5,
            "max_fare_tolerance_inr": 75.0,
            "walking_tolerance_m": 450,
            "community_segment": "AIRPORT_TRAVELER"
        }
        put_res = self.client.put("/api/recovery/constraints", json=update_payload, headers=headers)
        self.assertEqual(put_res.status_code, 200)
        updated = put_res.json()
        self.assertEqual(updated["max_wait_time_min"], 18)
        self.assertEqual(updated["max_detour_km"], 4.5)
        self.assertEqual(updated["max_fare_tolerance_inr"], 75.0)
        self.assertEqual(updated["walking_tolerance_m"], 450)
        self.assertEqual(updated["community_segment"], "AIRPORT_TRAVELER")

    def test_09_user_fairness_history_endpoint(self):
        """GET /api/recovery/fairness/me returns delay events and recency decay burden."""
        test_user = User(
            id="usr-api-3", email="rider.fairness@test.in", full_name="Fairness Commuter",
            password_hash="pwd", role="PASSENGER"
        )
        self.db.add(test_user)
        self.db.commit()

        token = create_access_token(data={"sub": test_user.id, "email": test_user.email, "role": test_user.role})
        headers = {"Authorization": f"Bearer {token}"}

        # Add delay record
        record_passenger_delay(self.db, user_id=test_user.id, delay_minutes=15.0, reason="Traffic detour")

        fair_res = self.client.get("/api/recovery/fairness/me", headers=headers)
        self.assertEqual(fair_res.status_code, 200)
        data = fair_res.json()
        self.assertEqual(data["user_id"], test_user.id)
        self.assertEqual(data["decay_lambda"], 0.8)
        self.assertGreaterEqual(data["historical_burden_min"], 14.0)
        self.assertEqual(len(data["records"]), 1)

if __name__ == "__main__":
    unittest.main()
