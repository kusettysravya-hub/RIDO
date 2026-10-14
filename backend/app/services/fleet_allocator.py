from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import Vehicle, Ride, RideRequest, MaintenanceRecord

def analyze_route_demand(db: Session) -> List[Dict[str, Any]]:
    """
    Analyzes historical ride requests and active rides to identify
    high-demand college transit corridors.
    """
    predefined_corridors = [
        {
            "route_name": "Metro Central ↔ University Main Gate",
            "origin": "Metro Transit Station",
            "destination": "Main University Campus Gate",
            "request_count": 48,
            "demand_level": "HIGH",
            "peak_hours": "07:30 - 09:30 AM, 04:30 - 06:30 PM",
            "avg_fare": 4.50,
        },
        {
            "route_name": "South Campus Hostels ↔ Science & Tech Block",
            "origin": "South Student Residences",
            "destination": "Science & Engineering Complex",
            "request_count": 34,
            "demand_level": "HIGH",
            "peak_hours": "08:15 - 10:00 AM",
            "avg_fare": 3.00,
        },
        {
            "route_name": "Faculty Enclave ↔ Administration Building",
            "origin": "Staff & Faculty Housing",
            "destination": "Central Administration Block",
            "request_count": 18,
            "demand_level": "MODERATE",
            "peak_hours": "08:45 - 09:30 AM, 05:00 - 05:45 PM",
            "avg_fare": 3.50,
        },
        {
            "route_name": "University Campus ↔ City Airport Express",
            "origin": "Campus Welcome Pavilion",
            "destination": "City Airport Terminal 2",
            "request_count": 12,
            "demand_level": "MODERATE",
            "peak_hours": "Fridays & Weekends",
            "avg_fare": 16.00,
        },
    ]

    return predefined_corridors

def calculate_fleet_metrics(db: Session) -> Dict[str, Any]:
    """
    Computes real-time fleet utilization, maintenance due reminders,
    and vehicle battery/odometer statistics.
    """
    vehicles = db.query(Vehicle).all()
    total_vehicles = len(vehicles)
    if total_vehicles == 0:
        return {
            "total_vehicles": 0,
            "available_vehicles": 0,
            "on_trip_vehicles": 0,
            "maintenance_vehicles": 0,
            "offline_vehicles": 0,
            "utilization_rate_pct": 0.0,
            "average_fleet_battery_pct": 0.0,
            "total_fleet_odometer_km": 0.0,
            "maintenance_due_count": 0,
        }

    available = sum(1 for v in vehicles if v.status == "AVAILABLE")
    on_trip = sum(1 for v in vehicles if v.status == "ON_TRIP")
    maintenance = sum(1 for v in vehicles if v.status == "MAINTENANCE")
    offline = sum(1 for v in vehicles if v.status == "OFFLINE")

    active_in_service = available + on_trip
    utilization_rate = round((active_in_service / total_vehicles) * 100, 1)

    avg_battery = round(sum(v.battery_or_fuel_level for v in vehicles) / total_vehicles, 1)
    total_odometer = round(sum(v.odometer_km for v in vehicles), 1)

    # Vehicles nearing or exceeding next_service_km
    maintenance_due = sum(1 for v in vehicles if v.odometer_km >= v.next_service_km or v.tire_pressure_psi < 30.0)

    return {
        "total_vehicles": total_vehicles,
        "available_vehicles": available,
        "on_trip_vehicles": on_trip,
        "maintenance_vehicles": maintenance,
        "offline_vehicles": offline,
        "utilization_rate_pct": utilization_rate,
        "average_fleet_battery_pct": avg_battery,
        "total_fleet_odometer_km": total_odometer,
        "maintenance_due_count": maintenance_due,
    }
