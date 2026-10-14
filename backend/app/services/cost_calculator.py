import math

def calculate_haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def estimate_trip_duration_min(distance_km: float) -> int:
    avg_speed_kmh = 28.0 # Urban / campus community speed
    duration_hours = distance_km / avg_speed_kmh
    return max(4, round(duration_hours * 60))

def calculate_transparent_cost(
    distance_km: float,
    duration_min: int,
    passengers_count: int,
    capacity: int = 4,
    surge_multiplier: float = 1.0,
    vehicle_category: str = "STANDARD_SEDAN"
) -> dict:
    """
    Transparent shared cost estimation module denominated in Indian Rupees (₹ / INR).
    Explains the exact breakdown and demonstrates empty-seat savings based on
    standardized Indian urban mobility pricing.
    """
    category_rates = {
        "STANDARD_SEDAN": {"base": 40.00, "per_km": 10.00, "per_min": 1.50},
        "COMFORT_HYBRID": {"base": 60.00, "per_km": 14.00, "per_min": 2.00},
        "EV_CAMPUS_SHUTTLE": {"base": 30.00, "per_km": 8.00, "per_min": 1.20},
        "ACCESSIBLE_VAN": {"base": 70.00, "per_km": 16.00, "per_min": 2.50},
    }

    rates = category_rates.get(vehicle_category, category_rates["STANDARD_SEDAN"])
    base_fare = rates["base"]
    distance_rate = rates["per_km"]
    distance_cost = round(distance_km * distance_rate, 2)
    duration_cost = round(duration_min * rates["per_min"], 2)

    raw_total = (base_fare + distance_cost + duration_cost) * surge_multiplier
    total_vehicle_fare = round(raw_total, 2)

    active_passengers = max(1, passengers_count)
    individual_fare = round(total_vehicle_fare / active_passengers, 2)

    # Empty seat savings: compared to a solo rider paying full vehicle fare
    solo_fare = total_vehicle_fare
    savings_pct = round(((solo_fare - individual_fare) / solo_fare) * 100, 1) if solo_fare > 0 else 0.0
    empty_seats = max(0, capacity - active_passengers)

    formula = (
        f"Total Fare = (₹{base_fare:.2f} base + {distance_km:.1f}km * ₹{distance_rate:.2f}/km + "
        f"{duration_min}min * ₹{rates['per_min']:.2f}/min) * {surge_multiplier:.1f}x surge = ₹{total_vehicle_fare:.2f}. "
        f"Split equally among {active_passengers} passenger(s) = ₹{individual_fare:.2f}/seat "
        f"(saving {savings_pct}% vs solo commute)."
    )

    return {
        "currency": "INR",
        "currency_symbol": "₹",
        "base_fare": base_fare,
        "distance_km": distance_km,
        "distance_rate_per_km": distance_rate,
        "distance_cost": distance_cost,
        "duration_min": duration_min,
        "duration_cost": duration_cost,
        "surge_multiplier": surge_multiplier,
        "total_vehicle_fare": total_vehicle_fare,
        "current_passengers": active_passengers,
        "capacity": capacity,
        "individual_fare": individual_fare,
        "empty_seats": empty_seats,
        "shared_savings_pct": savings_pct,
        "formula_explanation": formula,
    }
