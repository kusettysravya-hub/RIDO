import json
import math
from typing import List, Dict, Any

def generate_simulated_polyline(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
    steps: int = 15
) -> str:
    """
    Generates a realistic sequence of intermediate GPS coordinates
    connecting pickup and dropoff with natural campus street bends.
    """
    waypoints = []

    mid_lat = (origin_lat + dest_lat) / 2
    mid_lng = (origin_lng + dest_lng) / 2
    jitter_lat = (dest_lng - origin_lng) * 0.12
    jitter_lng = (origin_lat - dest_lat) * 0.12

    corner_lat = mid_lat + jitter_lat
    corner_lng = mid_lng + jitter_lng

    half = steps // 2
    for i in range(half + 1):
        t = i / half
        lat = origin_lat + (corner_lat - origin_lat) * t
        lng = origin_lng + (corner_lng - origin_lng) * t
        waypoints.append({"lat": round(lat, 6), "lng": round(lng, 6)})

    for i in range(1, steps - half + 1):
        t = i / (steps - half)
        lat = corner_lat + (dest_lat - corner_lat) * t
        lng = corner_lng + (dest_lng - corner_lng) * t
        waypoints.append({"lat": round(lat, 6), "lng": round(lng, 6)})

    return json.dumps(waypoints)

def get_next_ride_status(current_status: str) -> str:
    """
    State machine progression for the ride lifecycle:
    REQUESTED -> MATCHING -> ASSIGNED -> DRIVER_ARRIVING -> STARTED -> IN_PROGRESS -> COMPLETED
    """
    transitions = {
        "REQUESTED": "MATCHING",
        "MATCHING": "ASSIGNED",
        "ASSIGNED": "DRIVER_ARRIVING",
        "DRIVER_ARRIVING": "STARTED",
        "STARTED": "IN_PROGRESS",
        "IN_PROGRESS": "COMPLETED",
    }
    return transitions.get(current_status, current_status)
