from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Vehicle, DriverProfile, MaintenanceRecord, AuditLog
from ..schemas import (
    VehicleCreate, VehicleUpdate, VehicleResponse,
    MaintenanceRecordCreate, MaintenanceRecordResponse
)
from ..auth_utils import get_current_user, require_role

router = APIRouter(prefix="/api/fleet", tags=["Fleet Management & Maintenance"])

@router.get("/vehicles", response_model=List[VehicleResponse])
def get_fleet_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).all()
    results = []
    for v in vehicles:
        driver_name = v.driver_profile.user.full_name if (v.driver_profile and v.driver_profile.user) else None
        driver_id = v.driver_profile.id if v.driver_profile else None

        results.append({
            "id": v.id,
            "license_plate": v.license_plate,
            "make": v.make,
            "model": v.model,
            "year": v.year,
            "category": v.category,
            "total_capacity": v.total_capacity,
            "status": v.status,
            "battery_or_fuel_level": v.battery_or_fuel_level,
            "odometer_km": v.odometer_km,
            "tire_pressure_psi": v.tire_pressure_psi,
            "engine_temp_c": v.engine_temp_c,
            "last_service_date": v.last_service_date,
            "next_service_km": v.next_service_km,
            "maintenance_notes": v.maintenance_notes,
            "driver_name": driver_name,
            "driver_id": driver_id,
            "created_at": v.created_at,
        })
    return results

@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def add_vehicle(
    data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["FLEET_MANAGER", "ADMIN"]))
):
    existing = db.query(Vehicle).filter(Vehicle.license_plate == data.license_plate).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle with this license plate already exists")

    vehicle = Vehicle(
        license_plate=data.license_plate,
        make=data.make,
        model=data.model,
        year=data.year,
        category=data.category,
        total_capacity=data.total_capacity,
        battery_or_fuel_level=data.battery_or_fuel_level,
        odometer_km=data.odometer_km,
        next_service_km=data.next_service_km,
        status="AVAILABLE"
    )
    db.add(vehicle)
    db.add(AuditLog(
        user_id=current_user.id,
        action="VEHICLE_ADDED",
        resource_type="VEHICLE",
        details=f"Added vehicle {vehicle.make} {vehicle.model} ({vehicle.license_plate})"
    ))
    db.commit()
    db.refresh(vehicle)
    return {
        "id": vehicle.id,
        "license_plate": vehicle.license_plate,
        "make": vehicle.make,
        "model": vehicle.model,
        "year": vehicle.year,
        "category": vehicle.category,
        "total_capacity": vehicle.total_capacity,
        "status": vehicle.status,
        "battery_or_fuel_level": vehicle.battery_or_fuel_level,
        "odometer_km": vehicle.odometer_km,
        "tire_pressure_psi": vehicle.tire_pressure_psi,
        "engine_temp_c": vehicle.engine_temp_c,
        "last_service_date": vehicle.last_service_date,
        "next_service_km": vehicle.next_service_km,
        "maintenance_notes": vehicle.maintenance_notes,
        "driver_name": None,
        "driver_id": None,
        "created_at": vehicle.created_at,
    }

@router.put("/vehicles/{id}", response_model=VehicleResponse)
def update_vehicle(
    id: str,
    data: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["FLEET_MANAGER", "ADMIN"]))
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if data.status:
        vehicle.status = data.status
    if data.battery_or_fuel_level is not None:
        vehicle.battery_or_fuel_level = data.battery_or_fuel_level
    if data.odometer_km is not None:
        vehicle.odometer_km = data.odometer_km
    if data.tire_pressure_psi is not None:
        vehicle.tire_pressure_psi = data.tire_pressure_psi
    if data.engine_temp_c is not None:
        vehicle.engine_temp_c = data.engine_temp_c
    if data.maintenance_notes is not None:
        vehicle.maintenance_notes = data.maintenance_notes

    db.add(AuditLog(
        user_id=current_user.id,
        action="VEHICLE_UPDATED",
        resource_type="VEHICLE",
        resource_id=vehicle.id,
        details=f"Updated status to {vehicle.status} for {vehicle.license_plate}"
    ))
    db.commit()
    db.refresh(vehicle)

    driver_name = vehicle.driver_profile.user.full_name if (vehicle.driver_profile and vehicle.driver_profile.user) else None
    driver_id = vehicle.driver_profile.id if vehicle.driver_profile else None

    return {
        "id": vehicle.id,
        "license_plate": vehicle.license_plate,
        "make": vehicle.make,
        "model": vehicle.model,
        "year": vehicle.year,
        "category": vehicle.category,
        "total_capacity": vehicle.total_capacity,
        "status": vehicle.status,
        "battery_or_fuel_level": vehicle.battery_or_fuel_level,
        "odometer_km": vehicle.odometer_km,
        "tire_pressure_psi": vehicle.tire_pressure_psi,
        "engine_temp_c": vehicle.engine_temp_c,
        "last_service_date": vehicle.last_service_date,
        "next_service_km": vehicle.next_service_km,
        "maintenance_notes": vehicle.maintenance_notes,
        "driver_name": driver_name,
        "driver_id": driver_id,
        "created_at": vehicle.created_at,
    }

@router.post("/vehicles/{id}/assign-driver")
def assign_driver_to_vehicle(
    id: str,
    driver_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["FLEET_MANAGER", "ADMIN"]))
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    driver = db.query(DriverProfile).filter(DriverProfile.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.vehicle_id = vehicle.id
    db.add(AuditLog(
        user_id=current_user.id,
        action="DRIVER_ASSIGNED_TO_VEHICLE",
        resource_type="VEHICLE",
        resource_id=vehicle.id,
        details=f"Assigned driver {driver.user.full_name} to vehicle {vehicle.license_plate}"
    ))
    db.commit()
    return {"success": True, "message": f"Driver {driver.user.full_name} assigned to {vehicle.license_plate}"}

@router.get("/maintenance", response_model=List[MaintenanceRecordResponse])
def get_maintenance_records(db: Session = Depends(get_db)):
    return db.query(MaintenanceRecord).order_by(MaintenanceRecord.performed_at.desc()).all()

@router.post("/maintenance", response_model=MaintenanceRecordResponse, status_code=status.HTTP_201_CREATED)
def schedule_maintenance(
    data: MaintenanceRecordCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["FLEET_MANAGER", "ADMIN"]))
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    record = MaintenanceRecord(
        vehicle_id=data.vehicle_id,
        service_type=data.service_type,
        odometer_at_service=data.odometer_at_service,
        cost_amount=data.cost_amount,
        description=data.description,
        next_due_km=data.next_due_km,
        status=data.status
    )
    db.add(record)

    # Set vehicle status to MAINTENANCE if active service
    if data.status in ["SCHEDULED", "IN_PROGRESS"]:
        vehicle.status = "MAINTENANCE"
        vehicle.maintenance_notes = f"{data.service_type}: {data.description or 'Scheduled service'}"

    db.add(AuditLog(
        user_id=current_user.id,
        action="MAINTENANCE_SCHEDULED",
        resource_type="MAINTENANCE",
        resource_id=vehicle.id,
        details=f"Scheduled {data.service_type} for vehicle {vehicle.license_plate}"
    ))

    db.commit()
    db.refresh(record)
    return record
