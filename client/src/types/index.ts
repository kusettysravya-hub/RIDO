export type UserRole = 'PASSENGER' | 'DRIVER' | 'FLEET_MANAGER' | 'ADMIN';

export type RideStatus =
  | 'REQUESTED'
  | 'MATCHING'
  | 'ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  wallet_balance: number;
  is_verified: boolean;
  college_id?: string;
  department?: string;
  driver_profile_id?: string;
  created_at: string;
}

export interface RidePassenger {
  id: string;
  passenger_id: string;
  passenger_name: string;
  pickup_name: string;
  dropoff_name: string;
  fare_charged: number;
  seats_booked: number;
  status: string;
  joined_at: string;
}

export interface Ride {
  id: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_rating?: number;
  vehicle_id?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  status: RideStatus;
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name: string;
  destination_lat: number;
  destination_lng: number;
  total_distance_km: number;
  estimated_duration_min: number;
  total_fare_amount: number;
  individual_share_amount: number;
  surge_multiplier: number;
  start_otp: string;
  route_polyline?: string;
  scheduled_departure: string;
  created_at: string;
  passengers: RidePassenger[];
}

export interface RideMatchScore {
  ride_id: string;
  driver_name: string;
  driver_rating: number;
  vehicle_model: string;
  license_plate: string;
  origin_name: string;
  destination_name: string;
  available_seats: number;
  total_capacity: number;
  status: string;
  pickup_distance_km: number;
  destination_distance_km: number;
  detour_km: number;
  match_score_pct: number;
  cost_per_seat: number;
  shared_savings_pct: number;
  explanation_reasons: string[];
}

export interface CostExplanation {
  base_fare: number;
  distance_km: number;
  distance_rate_per_km: number;
  distance_cost: number;
  duration_min: number;
  duration_cost: number;
  surge_multiplier: number;
  total_vehicle_fare: number;
  current_passengers: number;
  capacity: number;
  individual_fare: number;
  empty_seats: number;
  shared_savings_pct: number;
  formula_explanation: string;
}

export interface RecurringRide {
  id: string;
  user_id: string;
  title: string;
  origin_name: string;
  destination_name: string;
  departure_time: string;
  frequency: string;
  days_of_week: string;
  seats_needed: number;
  is_active: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  category: string;
  total_capacity: number;
  status: 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE' | 'OFFLINE';
  battery_or_fuel_level: number;
  odometer_km: number;
  tire_pressure_psi: number;
  engine_temp_c: number;
  last_service_date: string;
  next_service_km: number;
  maintenance_notes?: string;
  driver_name?: string;
  driver_id?: string;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  service_type: string;
  odometer_at_service: number;
  cost_amount: number;
  description?: string;
  performed_at: string;
  next_due_km: number;
  status: string;
}

export interface EmergencyContact {
  id: string;
  contact_name: string;
  relationship_type: string;
  phone_number: string;
  is_primary: boolean;
}

export interface SharedContactInfo {
  id: string;
  name: string;
  relationship: string;
  phone_masked: string;
  is_primary: boolean;
  can_view: boolean;
}

export interface LocationSharingStatus {
  is_active: boolean;
  status: 'ACTIVE' | 'STOPPED';
  user_id: string;
  simulated_location: {
    lat: number;
    lng: number;
    location_label: string;
    heading: number;
    speed_kmh: number;
    is_simulation: boolean;
    disclaimer: string;
  };
  shared_with: SharedContactInfo[];
  started_at?: string;
  updated_at: string;
  disclaimer: string;
}

export interface EmergencyRecipient {
  name: string;
  role: string;
  channel: string;
  status: string;
}

export interface MaskedContactAlert {
  id: string;
  name: string;
  relationship: string;
  phone_masked: string;
  delivery_status: string;
}

export interface SOSResponseSummary {
  incident_id: string;
  event_id: string;
  ride_id?: string;
  reporter_name: string;
  status: string;
  timestamp: string;
  intended_recipients: EmergencyRecipient[];
  emergency_contacts: MaskedContactAlert[];
  live_location_sharing: {
    is_active: boolean;
    status: string;
    simulated_coordinates: { lat: number; lng: number };
    location_label: string;
    shared_with: string[];
    disclaimer: string;
  };
  simulated_emergency_call: {
    initiated: boolean;
    intended_recipient: string;
    channel: string;
    call_status: string;
    disclaimer: string;
  };
  system_actions: string[];
  disclaimer: string;
}

export interface SafetyEvent {
  id: string;
  ride_id?: string;
  reported_by_user_id: string;
  reporter_name?: string;
  reporter_role?: string;
  event_type: string;
  severity: string;
  lat: number;
  lng: number;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export interface RouteDemandItem {
  route_name: string;
  origin: string;
  destination: string;
  request_count: number;
  demand_level: string;
  peak_hours: string;
  avg_fare: number;
}

export interface FleetUtilization {
  total_vehicles: number;
  available_vehicles: number;
  on_trip_vehicles: number;
  maintenance_vehicles: number;
  offline_vehicles: number;
  utilization_rate_pct: number;
  average_fleet_battery_pct: number;
  total_fleet_odometer_km: number;
  maintenance_due_count?: number;
}

export interface DashboardKPIs {
  total_rides: number;
  active_rides: number;
  completed_rides: number;
  pending_requests: number;
  fleet_utilization: FleetUtilization;
  average_matching_time_sec: number;
  average_occupancy_rate_pct: number;
  co2_saved_total_kg: number;
  open_safety_alerts: number;
  high_demand_routes: RouteDemandItem[];
  hourly_demand: Array<{ hour: string; requests: number; capacity_utilized_pct: number }>;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: string;
  ip_address: string;
  created_at: string;
}

export type DisruptionType =
  | 'PASSENGER_CANCEL'
  | 'DRIVER_CANCEL'
  | 'PASSENGER_DELAY'
  | 'DRIVER_DELAY'
  | 'VEHICLE_BREAKDOWN'
  | 'ROUTE_CHANGE'
  | 'NEW_PASSENGER_REQUEST'
  | 'SEAT_SHORTAGE'
  | 'ALTERNATIVE_PICKUP';

export interface DisruptionEvent {
  id: string;
  ride_id?: string;
  disruption_type: DisruptionType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'EVALUATING' | 'RESOLVED' | 'FAILED';
  reported_by_id?: string;
  disruption_details?: string;
  created_at: string;
  resolved_at?: string;
}

export interface RecoveryPlan {
  id: string;
  disruption_id: string;
  affected_passenger_id?: string;
  target_ride_id?: string;
  action_type: string;
  detour_delta_km: number;
  wait_delta_min: number;
  fare_delta_inr: number;
  walking_distance_m: number;
  is_feasible: boolean;
  confidence_score: number;
  fairness_score: number;
  explanation_summary: string;
  explanation_bullets: string[];
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'APPLIED';
  created_at: string;
}

export interface PassengerConstraint {
  id: string;
  user_id: string;
  community_segment: string;
  max_wait_time_min: number;
  max_detour_km: number;
  max_fare_tolerance_pct: number;
  max_fare_tolerance_inr: number;
  walking_tolerance_m: number;
  cumulative_delay_min: number;
  historical_burden_min: number;
  updated_at: string;
}

export interface RejectedAlternative {
  plan_id: string;
  action_type: string;
  rejected_constraint: string;
  actual_value: string;
  allowed_value: string;
  rejection_reason: string;
  confidence_score: number;
  fairness_score: number;
}

export interface XAIExplanation {
  selected_plan: any;
  rejected_alternatives: RejectedAlternative[];
  explanation_narrative: string;
}

