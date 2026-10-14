import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import User, PassengerProfile, AuditLog
from app.auth_utils import hash_password, create_access_token

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

class TestAuthWalletTopup(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        self.client = TestClient(app)
        app.dependency_overrides[get_db] = override_get_db

        self.user = User(
            email="teststudent@campuscommute.edu",
            full_name="Test Commuter",
            password_hash=hash_password("secret123"),
            role="PASSENGER",
            wallet_balance=150.0,
            is_verified=False
        )
        self.db.add(self.user)
        self.db.flush()
        profile = PassengerProfile(user_id=self.user.id)
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(self.user)

        self.token = create_access_token({"sub": self.user.id, "role": self.user.role, "email": self.user.email})
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self):
        app.dependency_overrides.pop(get_db, None)
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def test_topup_wallet_success(self):
        # 1. Top up +100
        res = self.client.post(
            "/api/auth/wallet-topup",
            json={"amount": 100.0},
            headers=self.headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["wallet_balance"], 250.0)

        # 2. Check SQLite persistence via /me
        me_res = self.client.get("/api/auth/me", headers=self.headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["wallet_balance"], 250.0)

        # 3. Check direct DB model
        db_user = self.db.query(User).filter(User.id == self.user.id).first()
        self.db.refresh(db_user)
        self.assertEqual(db_user.wallet_balance, 250.0)

        # 4. Check audit log
        log = self.db.query(AuditLog).filter(AuditLog.user_id == self.user.id, AuditLog.action == "WALLET_TOPUP").first()
        self.assertIsNotNone(log)
        self.assertIn("100.00", log.details)

    def test_topup_and_save_verify_credentials_preserves_balance(self):
        # Top up +250
        res1 = self.client.post(
            "/api/auth/wallet-topup",
            json={"amount": 250.0},
            headers=self.headers
        )
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["wallet_balance"], 400.0)

        # Perform Save & Verify Institutional Credentials
        verify_res = self.client.post(
            "/api/auth/verify-college",
            json={
                "college_id": "BTECH-CS-2024-999",
                "department": "Computer Science & Engineering",
                "student_or_staff": "STUDENT"
            },
            headers=self.headers
        )
        self.assertEqual(verify_res.status_code, 200)
        verify_data = verify_res.json()
        self.assertTrue(verify_data["is_verified"])
        self.assertEqual(verify_data["college_id"], "BTECH-CS-2024-999")
        # Ensure wallet balance was NOT reset
        self.assertEqual(verify_data["wallet_balance"], 400.0)

        # Verify balance again via /me
        me_res = self.client.get("/api/auth/me", headers=self.headers)
        self.assertEqual(me_res.json()["wallet_balance"], 400.0)

    def test_topup_boundary_validations(self):
        # Negative amount
        res_neg = self.client.post(
            "/api/auth/wallet-topup",
            json={"amount": -50.0},
            headers=self.headers
        )
        self.assertEqual(res_neg.status_code, 400)

        # Zero amount
        res_zero = self.client.post(
            "/api/auth/wallet-topup",
            json={"amount": 0.0},
            headers=self.headers
        )
        self.assertEqual(res_zero.status_code, 400)

        # Excess amount (> 10000)
        res_excess = self.client.post(
            "/api/auth/wallet-topup",
            json={"amount": 15000.0},
            headers=self.headers
        )
        self.assertEqual(res_excess.status_code, 400)

if __name__ == "__main__":
    unittest.main()
