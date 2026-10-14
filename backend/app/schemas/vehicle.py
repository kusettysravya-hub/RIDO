from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class VehicleCreate(BaseModel):
    license_plate: str
    make: str
    model: str
    year: int
    category: str = "STANDARD_SEDAN"
    total_capacity: int = 4
    battery_or_fuel_level: float = 100.0
    odometer_km: float = 10000.0
    next_service_km: float = 15000.0

class VehicleUpdate(BaseModel):
    status: Optional[str] = None
    battery_or_fuel_level: Optional[float] = None
    odometer_km: Optional[float] = None
    tire_pressure_psi: Optional[float] = None
    engine_temp_c: Optional[float] = None
    maintenance_notes: Optional[str] = None

class MaintenanceRecordCreate(BaseModel):
    vehicle_id: str
    service_type: str # OIL_CHANGE, BRAKE_INSPECTION, BATTERY_HEALTH, TIRE_ROTATION
    odometer_at_service: float
    cost_amount: float
    description: Optional[str] = None
    next_due_km: float
    status: str = "SCHEDULED"

class MaintenanceRecordResponse(BaseModel):
    id: str
    vehicle_id: str
    service_type: str
    odometer_at_service: float
    cost_amount: float
    description: Optional[str]
    performed_at: datetime
    next_due_km: float
    status: str

    class Config:
        from_attributes = True

class VehicleResponse(BaseModel):
    id: str
    license_plate: str
    make: str
    model: str
    year: int
    category: str
    total_capacity: int
    status: str
    battery_or_fuel_level: float
    odometer_km: float
    tire_pressure_psi: float
    engine_temp_c: float
    last_service_date: datetime
    next_service_km: float
    maintenance_notes: Optional[str] = None
    driver_name: Optional[str] = None
    driver_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
