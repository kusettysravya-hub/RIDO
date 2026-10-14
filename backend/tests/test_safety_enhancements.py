import unittest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import User, PassengerProfile, EmergencyContact
from app.auth_utils import hash_password, create_access_token

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

class TestSafetyEnhancements(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        self.client = TestClient(app)
        app.dependency_overrides[get_db] = override_get_db

        # Unique email per test run
        uid = str(uuid.uuid4())[:8]
        self.user = User(
            email=f"priya_{uid}@campuscommute.edu",
            full_name="Priya Sharma",
            password_hash=hash_password("secret123"),
            role="PASSENGER",
            wallet_balance=500.0,
            is_verified=True,
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.profile = PassengerProfile(user_id=self.user.id)
        self.contact1 = EmergencyContact(
            user_id=self.user.id,
            contact_name="Raj Sharma",
            phone_number="+919876543210",
            relationship_type="Parent",
            is_primary=True,
        )
        self.contact2 = EmergencyContact(
            user_id=self.user.id,
            contact_name="Campus Security Warden",
            phone_number="+919876500000",
            relationship_type="Campus Warden",
            is_primary=False,
        )
        self.db.add_all([self.profile, self.contact1, self.contact2])
        self.db.commit()
        self.db.refresh(self.contact1)
        self.db.refresh(self.contact2)

        self.token = create_access_token({
            "sub": self.user.id,
            "role": self.user.role,
            "email": self.user.email,
        })
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        app.dependency_overrides.pop(get_db, None)
        self.db.rollback()
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def test_location_sharing_initial_state(self):
        res = self.client.get("/api/safety/location-sharing", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["is_active"])
        self.assertEqual(data["status"], "STOPPED")
        self.assertEqual(len(data["shared_with"]), 2)
        # By default not active, can_view is false
        self.assertFalse(data["shared_with"][0]["can_view"])
        self.assertIn("SIMULATED GPS TRACKING", data["simulated_location"]["disclaimer"])

    def test_location_sharing_toggle_on_and_off(self):
        # 1. Enable location sharing with contact 1 only
        res = self.client.post(
            "/api/safety/location-sharing/toggle",
            json={
                "is_active": True,
                "contact_ids": [self.contact1.id],
                "lat": 12.9716,
                "lng": 77.5946,
                "location_label": "Campus Main Gate",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_active"])
        self.assertEqual(data["status"], "ACTIVE")

        # Contact 1 can view, Contact 2 cannot
        c1 = next(c for c in data["shared_with"] if c["id"] == self.contact1.id)
        c2 = next(c for c in data["shared_with"] if c["id"] == self.contact2.id)
        self.assertTrue(c1["can_view"])
        self.assertFalse(c2["can_view"])
        self.assertIn("•••••", c1["phone_masked"])

        # 2. Verify GET returns active status
        res_get = self.client.get("/api/safety/location-sharing", headers=self.headers)
        self.assertEqual(res_get.status_code, 200)
        self.assertTrue(res_get.json()["is_active"])

        # 3. Disable location sharing
        res_off = self.client.post(
            "/api/safety/location-sharing/toggle",
            json={
                "is_active": False,
                "contact_ids": [],
            },
            headers=self.headers,
        )
        self.assertEqual(res_off.status_code, 200)
        self.assertFalse(res_off.json()["is_active"])
        self.assertEqual(res_off.json()["status"], "STOPPED")

    def test_sos_simulation_drill_without_ride(self):
        # Trigger SOS drill (standalone drill)
        res = self.client.post(
            "/api/safety/sos",
            json={
                "event_type": "SOS_SIMULATION",
                "lat": 12.9716,
                "lng": 77.5946,
                "description": "Safety Panic Button Drill Simulation",
                "severity": "CRITICAL",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 201)
        summary = res.json()

        # 1. Incident ID
        self.assertTrue(summary["incident_id"].startswith("SOS-SIM-"))
        # 2. Alert Status
        self.assertIn("SIMULATION", summary["status"])
        # 3. Timestamp
        self.assertIsNotNone(summary["timestamp"])
        # 4. Intended Recipients
        self.assertGreaterEqual(len(summary["intended_recipients"]), 2)
        recipients_names = [r["name"] for r in summary["intended_recipients"]]
        self.assertTrue(any("Campus Security" in name for name in recipients_names))
        # 5. Masked emergency contacts
        self.assertEqual(len(summary["emergency_contacts"]), 2)
        for contact in summary["emergency_contacts"]:
            self.assertIn("•••••", contact["phone_masked"])
            self.assertIn("SIMULATED", contact["delivery_status"])
        # 6. Simulated emergency call
        call_info = summary["simulated_emergency_call"]
        self.assertTrue(call_info["initiated"])
        self.assertIn("Campus Security Rapid Response Desk", call_info["intended_recipient"])
        # 7. Live Location info
        loc_info = summary["live_location_sharing"]
        self.assertIsNotNone(loc_info)
        self.assertIn("SIMULATED GPS", loc_info["disclaimer"])
        # 8. System actions performed
        self.assertGreaterEqual(len(summary["system_actions"]), 4)
        # Academic Prototype Simulation disclaimer
        self.assertIn("ACADEMIC SIMULATION", summary["disclaimer"])

    def test_sos_with_active_location_sharing(self):
        # Enable location sharing first
        self.client.post(
            "/api/safety/location-sharing/toggle",
            json={
                "is_active": True,
                "contact_ids": [self.contact1.id, self.contact2.id],
            },
            headers=self.headers,
        )

        res = self.client.post(
            "/api/safety/sos",
            json={
                "event_type": "PANIC_BUTTON",
                "lat": 12.9720,
                "lng": 77.5950,
                "description": "Urgent assistance simulation",
                "severity": "CRITICAL",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 201)
        summary = res.json()
        self.assertTrue(summary["live_location_sharing"]["is_active"])
        self.assertIn("Raj Sharma", summary["live_location_sharing"]["shared_with"])
        self.assertIn("Campus Security Warden", summary["live_location_sharing"]["shared_with"])

if __name__ == "__main__":
    unittest.main()
