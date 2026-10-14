from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import Ride, RidePassenger, User, DriverProfile, Vehicle
from .cost_calculator import calculate_haversine_km, calculate_transparent_cost

def evaluate_ride_matching(
    passenger_pickup_lat: float,
    passenger_pickup_lng: float,
    passenger_dropoff_lat: float,
    passenger_dropoff_lng: float,
    passenger_user: Optional[User],
    available_rides: List[Ride],
    max_acceptable_detour_km: float = 3.0
) -> List[Dict[str, Any]]:
    """
    Intelligent Empty-Seat Optimization & College Community Ride Matching.
    Calculates proximity, detour, destination compatibility, and provides
    clear, explainable matching reasons.
    """
    matches = []

    # Direct passenger trip distance
    direct_trip_dist = calculate_haversine_km(
        passenger_pickup_lat, passenger_pickup_lng,
        passenger_dropoff_lat, passenger_dropoff_lng
    )

    for ride in available_rides:
        # Check active passengers and available seats
        confirmed_passengers = [p for p in ride.passengers if p.status in ("CONFIRMED", "PICKED_UP")]
        total_capacity = ride.vehicle.total_capacity if ride.vehicle else 4
        current_passenger_count = len(confirmed_passengers)
        available_seats = max(0, total_capacity - current_passenger_count)

        if available_seats <= 0:
            continue # No empty seats available in this vehicle

        # Proximity: Pickup distance from Ride's origin
        pickup_dist = calculate_haversine_km(
            passenger_pickup_lat, passenger_pickup_lng,
            ride.origin_lat, ride.origin_lng
        )

        # Proximity: Dropoff distance to Ride's destination
        dropoff_dist = calculate_haversine_km(
            passenger_dropoff_lat, passenger_dropoff_lng,
            ride.destination_lat, ride.destination_lng
        )

        # Detour estimation: difference between combined detour route and direct ride
        driver_direct_dist = ride.total_distance_km
        combined_route_dist = (
            pickup_dist + direct_trip_dist + dropoff_dist
        )
        detour_km = max(0.0, round(combined_route_dist - driver_direct_dist, 2))

        # Disqualify if detour exceeds threshold
        if detour_km > max_acceptable_detour_km and pickup_dist > 4.0:
            continue

        # Explainable Score Calculation (0 - 100%)
        # 1. Pickup proximity score (max 40 pts): closer is better
        pickup_score = max(0.0, 40.0 - (pickup_dist * 8.0))

        # 2. Destination alignment score (max 35 pts)
        dropoff_score = max(0.0, 35.0 - (dropoff_dist * 7.0))

        # 3. Detour penalty (max 15 pts)
        detour_score = max(0.0, 15.0 - (detour_km * 4.0))

        # 4. Community verification bonus (max 10 pts)
        community_bonus = 0.0
        if passenger_user and passenger_user.is_verified:
            community_bonus += 5.0
        if ride.driver and ride.driver.user and ride.driver.user.is_verified:
            community_bonus += 5.0

        total_score = min(99.0, max(25.0, pickup_score + dropoff_score + detour_score + community_bonus))
        match_score_pct = round(total_score, 1)

        # Transparent Cost with this new passenger added
        simulated_count = current_passenger_count + 1
        cost_info = calculate_transparent_cost(
            distance_km=ride.total_distance_km,
            duration_min=ride.estimated_duration_min,
            passengers_count=simulated_count,
            capacity=total_capacity,
            surge_multiplier=ride.surge_multiplier,
            vehicle_category=ride.vehicle.category if ride.vehicle else "STANDARD_SEDAN"
        )

        # Explainable bullet reasons
        reasons = []
        if pickup_dist <= 1.0:
            reasons.append(f"Pickup is within walking distance ({pickup_dist:.1f} km from route start)")
        else:
            reasons.append(f"Pickup is accessible ({pickup_dist:.1f} km)")

        if dropoff_dist <= 1.0:
            reasons.append(f"Destination closely aligned ({dropoff_dist:.1f} km from terminus)")

        reasons.append(f"{available_seats} empty seat(s) available in {ride.vehicle.model if ride.vehicle else 'Vehicle'}")
        reasons.append(f"Adding you reduces individual commute cost to ₹{cost_info['individual_fare']:.2f} ({cost_info['shared_savings_pct']}% saved)")

        if passenger_user and passenger_user.is_verified:
            reasons.append("Verified campus community member verified match")

        driver_user = ride.driver.user if ride.driver else None

        matches.append({
            "ride_id": ride.id,
            "driver_name": driver_user.full_name if driver_user else "Fleet Driver",
            "driver_rating": ride.driver.rating if ride.driver else 4.9,
            "vehicle_model": f"{ride.vehicle.make} {ride.vehicle.model}" if ride.vehicle else "Standard Fleet",
            "license_plate": ride.vehicle.license_plate if ride.vehicle else "CAMPUS-01",
            "origin_name": ride.origin_name,
            "destination_name": ride.destination_name,
            "available_seats": available_seats,
            "total_capacity": total_capacity,
            "status": ride.status,
            "pickup_distance_km": pickup_dist,
            "destination_distance_km": dropoff_dist,
            "detour_km": detour_km,
            "match_score_pct": match_score_pct,
            "cost_per_seat": cost_info["individual_fare"],
            "shared_savings_pct": cost_info["shared_savings_pct"],
            "explanation_reasons": reasons,
        })

    # Sort descending by match score
    matches.sort(key=lambda m: m["match_score_pct"], reverse=True)
    return matches
