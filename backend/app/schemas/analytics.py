from typing import List, Dict, Any
from pydantic import BaseModel

class RouteDemandItem(BaseModel):
    route_name: str
    origin: str
    destination: str
    request_count: int
    demand_level: str # HIGH, MODERATE, LOW
    peak_hours: str
    avg_fare: float

class FleetUtilization(BaseModel):
    total_vehicles: int
    available_vehicles: int
    on_trip_vehicles: int
    maintenance_vehicles: int
    offline_vehicles: int
    utilization_rate_pct: float
    average_fleet_battery_pct: float
    total_fleet_odometer_km: float

class DashboardKPIs(BaseModel):
    total_rides: int
    active_rides: int
    completed_rides: int
    pending_requests: int
    fleet_utilization: FleetUtilization
    average_matching_time_sec: float
    average_occupancy_rate_pct: float
    co2_saved_total_kg: float
    open_safety_alerts: int
    high_demand_routes: List[RouteDemandItem]
    hourly_demand: List[Dict[str, Any]]
