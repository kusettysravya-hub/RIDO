from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .seed_data import seed_database
from .routers import (
    auth_router,
    rides_router,
    passengers_router,
    drivers_router,
    fleet_router,
    safety_router,
    analytics_router,
    recovery_router,
)

# Initialize FastAPI App
app = FastAPI(
    title="VoltRide / CommuteFlow - Self-Healing Ride Pooling & Fleet Telematics Platform",
    description="An intelligent community-agnostic ride pooling and resilient fleet management platform with Explainable AI self-healing dynamic disruption recovery.",
    version="2.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(rides_router)
app.include_router(passengers_router)
app.include_router(drivers_router)
app.include_router(fleet_router)
app.include_router(safety_router)
app.include_router(analytics_router)
app.include_router(recovery_router)

@app.on_event("startup")
def on_startup():
    # Create tables and auto-seed if first run
    Base.metadata.create_all(bind=engine)
    seed_database()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "CampusCommute Academic Mobility & Fleet Engine",
        "simulation_mode": True,
        "database": "SQLite (zero-configuration local dev)",
        "disclaimer": "Academic BTech Computer Science Prototype. All emergency actions, payments, and GPS tracking operate in safe local simulation mode."
    }
