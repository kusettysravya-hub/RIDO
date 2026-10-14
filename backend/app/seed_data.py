import sys
from datetime import datetime, timedelta
from .database import SessionLocal, Base, engine

# Ensure safe printing on Windows cp1252 consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from .models import (
    User, PassengerProfile, DriverProfile, EmergencyContact,
    Vehicle, MaintenanceRecord, VehicleTelemetry,
    Ride, RidePassenger, RecurringRide, SafetyEvent, Payment, AuditLog,
    PassengerConstraint, DisruptionEvent, RecoveryPlan
)
from .auth_utils import hash_password

def seed_database():
    print("[*] Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "student@campuscommute.edu").first():
            print("[+] Database already seeded. Checking passenger constraints...")
            if not db.query(PassengerConstraint).first():
                all_passengers = db.query(User).filter(User.role == "PASSENGER").all()
                for p in all_passengers:
                    db.add(PassengerConstraint(
                        user_id=p.id,
                        community_segment="CAMPUS_STUDENT" if "student" in p.email else "CORPORATE_EMPLOYEE",
                        max_wait_time_min=12,
                        max_detour_km=3.0,
                        max_fare_tolerance_pct=15.0,
                        max_fare_tolerance_inr=50.0,
                        walking_tolerance_m=300,
                        cumulative_delay_min=0.0
                    ))
                db.commit()
                print("[+] Default passenger constraints seeded.")
            return

        print("[*] Clearing and populating fresh academic demo dataset...")
        pwd_hash = hash_password("password123")

        # 1. Users
        student_user = User(
            email="student@campuscommute.edu",
            full_name="Alex Rivera",
            password_hash=pwd_hash,
            role="PASSENGER",
            phone="+1 (555) 234-5678",
            college_id="BTECH-CS-2024-042",
            department="Computer Science & Engineering",
            is_verified=True,
            wallet_balance=185.50
        )
        db.add(student_user)

        faculty_user = User(
            email="faculty@campuscommute.edu",
            full_name="Dr. Priya Sharma",
            password_hash=pwd_hash,
            role="PASSENGER",
            phone="+1 (555) 345-6789",
            college_id="FAC-CS-108",
            department="Artificial Intelligence & Data Science",
            is_verified=True,
            wallet_balance=240.00
        )
        db.add(faculty_user)

        driver_user1 = User(
            email="driver@campuscommute.edu",
            full_name="Marcus Vance",
            password_hash=pwd_hash,
            role="DRIVER",
            phone="+1 (555) 876-5432",
            college_id="STAFF-TRANS-014",
            department="Campus Transport Services",
            is_verified=True,
            wallet_balance=420.00
        )
        db.add(driver_user1)

        driver_user2 = User(
            email="driver2@campuscommute.edu",
            full_name="Elena Rostova",
            password_hash=pwd_hash,
            role="DRIVER",
            phone="+1 (555) 765-4321",
            college_id="STAFF-TRANS-019",
            department="Campus Transport Services",
            is_verified=True,
            wallet_balance=385.00
        )
        db.add(driver_user2)

        fleet_user = User(
            email="fleet@campuscommute.edu",
            full_name="David Chen",
            password_hash=pwd_hash,
            role="FLEET_MANAGER",
            phone="+1 (555) 987-0001",
            college_id="MGR-OPS-003",
            department="Fleet Operations & Mobility",
            is_verified=True,
            wallet_balance=1000.00
        )
        db.add(fleet_user)

        admin_user = User(
            email="admin@campuscommute.edu",
            full_name="Dean Sarah Jenkins",
            password_hash=pwd_hash,
            role="ADMIN",
            phone="+1 (555) 999-0000",
            college_id="ADMIN-EXEC-001",
            department="Dean of Student Affairs & Transportation",
            is_verified=True,
            wallet_balance=5000.00
        )
        db.add(admin_user)
        db.flush()

        # 2. Profiles & Emergency Contacts
        db.add(PassengerProfile(
            user_id=student_user.id,
            student_or_staff="STUDENT",
            total_rides_taken=18,
            saved_co2_kg=42.5
        ))
        db.add(EmergencyContact(
            user_id=student_user.id,
            contact_name="Elena Rivera (Mother)",
            relationship_type="Parent / Guardian",
            phone_number="+1 (555) 987-6543",
            is_primary=True
        ))

        db.add(PassengerProfile(
            user_id=faculty_user.id,
            student_or_staff="FACULTY",
            total_rides_taken=12,
            saved_co2_kg=31.2
        ))

        # 3. Fleet Vehicles (Around SF Campus Coordinates: ~37.7749, -122.4194)
        v1 = Vehicle(
            license_plate="CAMPUS-EV-01",
            make="Tesla",
            model="Model Y Campus Green",
            year=2024,
            category="EV_CAMPUS_SHUTTLE",
            total_capacity=4,
            status="AVAILABLE",
            battery_or_fuel_level=92.0,
            odometer_km=8450.0,
            tire_pressure_psi=36.0,
            engine_temp_c=80.0,
            next_service_km=25000.0,
            maintenance_notes="All systems nominal. Battery health at 99%."
        )
        db.add(v1)

        v2 = Vehicle(
            license_plate="CAMPUS-HY-02",
            make="Toyota",
            model="Camry Hybrid XLE",
            year=2023,
            category="COMFORT_HYBRID",
            total_capacity=4,
            status="AVAILABLE",
            battery_or_fuel_level=88.0,
            odometer_km=14200.0,
            tire_pressure_psi=34.0,
            engine_temp_c=88.0,
            next_service_km=20000.0,
            maintenance_notes="Smooth hybrid drive."
        )
        db.add(v2)

        v3 = Vehicle(
            license_plate="CAMPUS-SED-03",
            make="Honda",
            model="Civic Eco EX",
            year=2023,
            category="STANDARD_SEDAN",
            total_capacity=4,
            status="AVAILABLE",
            battery_or_fuel_level=76.0,
            odometer_km=19500.0,
            tire_pressure_psi=33.5,
            engine_temp_c=89.0,
            next_service_km=25000.0
        )
        db.add(v3)

        v4 = Vehicle(
            license_plate="CAMPUS-VAN-04",
            make="Ford",
            model="Transit Accessible Shuttle",
            year=2024,
            category="ACCESSIBLE_VAN",
            total_capacity=6,
            status="AVAILABLE",
            battery_or_fuel_level=82.0,
            odometer_km=22100.0,
            tire_pressure_psi=38.0,
            engine_temp_c=84.0,
            next_service_km=30000.0,
            maintenance_notes="Wheelchair hydraulic ramp inspected."
        )
        db.add(v4)

        v5 = Vehicle(
            license_plate="CAMPUS-EV-05",
            make="Chevrolet",
            model="Bolt EV",
            year=2023,
            category="EV_CAMPUS_SHUTTLE",
            total_capacity=4,
            status="MAINTENANCE",
            battery_or_fuel_level=28.0,
            odometer_km=41200.0,
            tire_pressure_psi=26.5, # Low tire warning
            engine_temp_c=102.0,
            next_service_km=40000.0,
            maintenance_notes="SCHEDULED: Low tire pressure & 40,000 km brake pad inspection."
        )
        db.add(v5)
        db.flush()

        # 4. Driver Profiles
        dp1 = DriverProfile(
            user_id=driver_user1.id,
            license_number="CA-DL-CAMPUS-991",
            is_online=True,
            current_lat=37.7793,
            current_lng=-122.4192,
            heading=45.0,
            rating=4.95,
            total_ratings=84,
            total_trips=142,
            total_earnings=1840.50,
            vehicle_id=v1.id
        )
        db.add(dp1)

        dp2 = DriverProfile(
            user_id=driver_user2.id,
            license_number="CA-DL-CAMPUS-882",
            is_online=True,
            current_lat=37.7858,
            current_lng=-122.4065,
            heading=180.0,
            rating=4.88,
            total_ratings=62,
            total_trips=98,
            total_earnings=1250.00,
            vehicle_id=v2.id
        )
        db.add(dp2)
        db.flush()

        # 5. Active and Scheduled Rides for Empty-Seat Matching
        # Ride 1: Metro Station -> University Main Campus Gate
        ride1 = Ride(
            driver_id=dp1.id,
            vehicle_id=v1.id,
            status="ASSIGNED",
            origin_name="Metro Transit Station (Powell St)",
            origin_lat=37.7844,
            origin_lng=-122.4080,
            destination_name="University Main Campus Gate",
            destination_lat=37.7749,
            destination_lng=-122.4194,
            total_distance_km=2.4,
            estimated_duration_min=10,
            total_fare_amount=8.50,
            individual_share_amount=4.25, # Split among 2 riders
            surge_multiplier=1.0,
            start_otp="4821",
            route_polyline='[{"lat":37.7844,"lng":-122.4080},{"lat":37.7810,"lng":-122.4125},{"lat":37.7780,"lng":-122.4160},{"lat":37.7749,"lng":-122.4194}]'
        )
        db.add(ride1)
        db.flush()

        # Passenger 1 on Ride 1 (Faculty Member)
        db.add(RidePassenger(
            ride_id=ride1.id,
            passenger_id=faculty_user.id,
            pickup_name="Metro Transit Station",
            dropoff_name="University Main Campus Gate",
            fare_charged=4.25,
            seats_booked=1,
            status="CONFIRMED"
        ))

        # Ride 2: South Student Residences -> Science & Tech Complex
        ride2 = Ride(
            driver_id=dp2.id,
            vehicle_id=v2.id,
            status="DRIVER_ARRIVING",
            origin_name="South Student Residences (Mission Campus)",
            origin_lat=37.7602,
            origin_lng=-122.4199,
            destination_name="Science & Engineering Complex",
            destination_lat=37.7749,
            destination_lng=-122.4194,
            total_distance_km=3.8,
            estimated_duration_min=14,
            total_fare_amount=10.20,
            individual_share_amount=10.20, # 1 passenger currently, 3 empty seats!
            surge_multiplier=1.0,
            start_otp="7194",
            route_polyline='[{"lat":37.7602,"lng":-122.4199},{"lat":37.7675,"lng":-122.4196},{"lat":37.7710,"lng":-122.4195},{"lat":37.7749,"lng":-122.4194}]'
        )
        db.add(ride2)

        # 6. Recurring Commute Schedules
        db.add(RecurringRide(
            user_id=student_user.id,
            title="Morning CSE Lecture Commute",
            origin_name="South Park Student Apartments",
            origin_lat=37.7820,
            origin_lng=-122.3950,
            destination_name="Computer Science Department Hall",
            destination_lat=37.7749,
            destination_lng=-122.4194,
            departure_time="08:30",
            frequency="WEEKDAYS",
            days_of_week="Mon,Tue,Wed,Thu,Fri",
            seats_needed=1,
            is_active=True
        ))

        db.add(RecurringRide(
            user_id=student_user.id,
            title="Evening Library Return Commute",
            origin_name="University Central Library",
            origin_lat=37.7749,
            origin_lng=-122.4194,
            destination_name="South Park Student Apartments",
            destination_lat=37.7820,
            destination_lng=-122.3950,
            departure_time="18:15",
            frequency="WEEKDAYS",
            days_of_week="Mon,Tue,Wed,Thu",
            seats_needed=1,
            is_active=True
        ))

        # 7. Maintenance Records
        db.add(MaintenanceRecord(
            vehicle_id=v5.id,
            service_type="BRAKE_INSPECTION",
            odometer_at_service=41200.0,
            cost_amount=180.00,
            description="Brake pad replacement and diagnostic calibration scheduled",
            next_due_km=50000.0,
            status="SCHEDULED"
        ))
        db.add(MaintenanceRecord(
            vehicle_id=v1.id,
            service_type="TIRE_ROTATION",
            odometer_at_service=8000.0,
            cost_amount=45.00,
            description="Regular 8,000 km tire rotation and pressure balance",
            next_due_km=16000.0,
            status="COMPLETED"
        ))

        # 8. Simulated Safety Event
        db.add(SafetyEvent(
            ride_id=ride1.id,
            reported_by_user_id=student_user.id,
            event_type="SOS_SIMULATION",
            severity="HIGH",
            lat=37.7810,
            lng=-122.4125,
            description="[SIMULATION DEMO] Test of emergency panic alert broadcast during campus transit.",
            status="RESOLVED",
            resolution_notes="Academic drill verified: Campus safety dispatch notified within 8 seconds."
        ))

        # 9. Audit Logs
        db.add(AuditLog(
            user_id=admin_user.id,
            action="SYSTEM_INITIALIZATION",
            resource_type="SYSTEM",
            details="CampusCommute system initialized with default academic demo seed."
        ))

        db.commit()
        print("[OK] Academic dataset seeded successfully!")
        print("Demo User Accounts:")
        print("  Passenger:      student@campuscommute.edu / password123")
        print("  Faculty:        faculty@campuscommute.edu / password123")
        print("  Driver:         driver@campuscommute.edu  / password123")
        print("  Fleet Manager:  fleet@campuscommute.edu   / password123")
        print("  Administrator:  admin@campuscommute.edu   / password123")

    except Exception as e:
        db.rollback()
        print(f"[ERR] Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
