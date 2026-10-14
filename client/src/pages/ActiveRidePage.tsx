import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Users,
  Play,
  RotateCcw,
  Star,
  Lock,
  Radio,
  Eye,
  FileText,
  X,
  Navigation,
} from 'lucide-react';
import api from '../services/api';
import { Ride, SOSResponseSummary, LocationSharingStatus } from '../types';
import { CampusMap } from '../components/Map/CampusMap';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/audio';
import { SosConfirmationModal } from '../components/SosConfirmationModal';
import { EmergencyResponseSummaryModal } from '../components/EmergencyResponseSummaryModal';

interface Props {
  setCurrentTab: (tab: string) => void;
}

export const ActiveRidePage: React.FC<Props> = ({ setCurrentTab }) => {
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepLoading, setStepLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Real GPS Geolocation States
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [userLiveLocation, setUserLiveLocation] = useState<{ lat: number; lng: number; accuracy: number; timestamp?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Transparent SOS & Location Sharing States
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [sosSummary, setSosSummary] = useState<SOSResponseSummary | null>(null);
  const [showSosSummary, setShowSosSummary] = useState(false);
  const [locationSharing, setLocationSharing] = useState<LocationSharingStatus | null>(null);

  const { showToast } = useNotification();
  const { user, refreshUser } = useAuth();

  const fetchActiveRide = async () => {
    try {
      const [res, locRes] = await Promise.all([
        api.get('/api/rides/active'),
        api.get('/api/safety/location-sharing').catch(() => ({ data: null })),
      ]);
      setActiveRide(res.data);
      if (locRes && locRes.data) {
        setLocationSharing(locRes.data);
      }
      if (res.data && res.data.status === 'COMPLETED') {
        setShowPaymentModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch active ride:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRide();
    const interval = setInterval(fetchActiveRide, 3000);
    return () => clearInterval(interval);
  }, []);

  // Real GPS Geolocation Tracking via navigator.geolocation.watchPosition
  const startLiveLocationTracking = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      const err = 'Geolocation is not supported by your browser.';
      setLocationError(err);
      showToast(err, 'error');
      return;
    }

    setIsTrackingLocation(true);
    showToast('Requesting real GPS location access...', 'info');

    try {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setUserLiveLocation({
            lat: latitude,
            lng: longitude,
            accuracy: accuracy || 15,
            timestamp: position.timestamp,
          });
          setLocationError(null);
        },
        (error) => {
          let errorMsg = 'Failed to retrieve location.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Location permission denied by browser. Please allow location access in your browser settings to track live GPS.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'GPS location unavailable. Satellite or network signal could not be determined.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'Location request timed out. Please retry.';
          }
          setLocationError(errorMsg);
          setIsTrackingLocation(false);
          showToast(errorMsg, 'error');
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 4000,
        }
      );
      watchIdRef.current = id;
    } catch (e: any) {
      const err = e.message || 'Error initializing geolocation';
      setLocationError(err);
      setIsTrackingLocation(false);
      showToast(err, 'error');
    }
  };

  const stopLiveLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingLocation(false);
    showToast('Live GPS tracking stopped.', 'info');
  };

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Simulation step trigger
  const handleAdvanceStatus = async (targetStatus?: string) => {
    if (!activeRide) return;
    setStepLoading(true);
    try {
      const url = targetStatus
        ? `/api/rides/${activeRide.id}/status?new_status=${targetStatus}`
        : `/api/rides/${activeRide.id}/status`;
      const res = await api.post(url);
      setActiveRide(res.data);

      if (res.data.status === 'DRIVER_ARRIVING') {
        sounds.playArrivalSound();
        showToast('Driver has arrived at pickup location!', 'info');
      } else if (res.data.status === 'IN_PROGRESS') {
        showToast('Trip started! En route to destination.', 'success');
      } else if (res.data.status === 'COMPLETED') {
        sounds.playPaymentSound();
        showToast('You have arrived at your destination!', 'success');
        setShowPaymentModal(true);
      }
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    } finally {
      setStepLoading(false);
    }
  };

  // Emergency SOS Drill Simulation (with Confirmation & Summary)
  const handleOpenSosConfirm = () => {
    setShowSosConfirm(true);
  };

  const handleConfirmSos = async () => {
    if (!activeRide) return;
    setShowSosConfirm(false);
    setSosActive(true);
    sounds.playSosSiren();
    try {
      const res = await api.post('/api/safety/sos', {
        ride_id: activeRide.id,
        event_type: 'SOS_SIMULATION',
        lat: activeRide.origin_lat,
        lng: activeRide.origin_lng,
        description: 'Passenger triggered simulated emergency SOS panic alert during active ride.',
        severity: 'HIGH',
      });
      setSosSummary(res.data);
      setShowSosSummary(true);
      showToast('🚨 SOS Broadcast Sent! Emergency response summary generated.', 'error');
    } catch (err) {
      showToast('Error sending SOS broadcast', 'error');
    }
  };

  // Simulated Payment Checkout
  const handleCompletePayment = async () => {
    if (!activeRide) return;
    setPaymentProcessing(true);
    try {
      await api.post(`/api/rides/${activeRide.id}/complete-payment?payment_method=CAMPUS_WALLET`);
      sounds.playPaymentSound();
      showToast(`Payment of ₹${activeRide.individual_share_amount.toFixed(2)} completed via RIDO Wallet!`, 'success');
      await refreshUser();
      setShowPaymentModal(false);
      setRatingSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Payment failed';
      showToast(msg, 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Car className="w-10 h-10 mx-auto mb-3 animate-pulse text-cyan-600 dark:text-cyan-400" />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Connecting to real-time ride tracking...</p>
      </div>
    );
  }

  if (!activeRide) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="surface-card p-10 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <Car className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Active Ride Ongoing</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
            You do not currently have a ride in progress. Search for an available shared campus commute or book a new ride.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setCurrentTab('search')}
              className="btn-primary"
            >
              Find Shared Ride
            </button>
            <button
              onClick={() => setCurrentTab('create-ride')}
              className="btn-secondary"
            >
              Book a Ride
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Parse polyline waypoints if present
  let routePoints: Array<{ lat: number; lng: number }> = [];
  try {
    if (activeRide.route_polyline) {
      routePoints = JSON.parse(activeRide.route_polyline);
    }
  } catch (e) {}

  // Dynamic simulated vehicle location along route
  const getSimulatedVehicleLocation = () => {
    if (!activeRide) return null;
    const origin = { lat: activeRide.origin_lat, lng: activeRide.origin_lng };
    const dest = { lat: activeRide.destination_lat, lng: activeRide.destination_lng };

    if (activeRide.status === 'COMPLETED') {
      return dest;
    }
    if (
      activeRide.status === 'REQUESTED' ||
      activeRide.status === 'MATCHING' ||
      activeRide.status === 'ASSIGNED' ||
      activeRide.status === 'DRIVER_ARRIVING' ||
      activeRide.status === 'STARTED'
    ) {
      return origin;
    }
    if (activeRide.status === 'IN_PROGRESS') {
      if (routePoints && routePoints.length > 0) {
        const midIdx = Math.floor(routePoints.length * 0.55);
        return routePoints[midIdx] || origin;
      }
      return {
        lat: (origin.lat + dest.lat) / 2,
        lng: (origin.lng + dest.lng) / 2,
      };
    }
    return origin;
  };

  const steps = [
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'MATCHING', label: 'Matching' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'DRIVER_ARRIVING', label: 'Arriving' },
    { key: 'STARTED', label: 'Started' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === activeRide.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Simulation Control Bar */}
      <div className="surface-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
          <span className="font-bold text-slate-900 dark:text-white">Live Prototype Engine:</span>
          <span className="text-slate-500 dark:text-slate-400">Ride #{activeRide.id.slice(0, 8)} • Real-Time Simulation Active</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAdvanceStatus()}
            disabled={stepLoading || activeRide.status === 'COMPLETED'}
            className="btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{stepLoading ? 'Advancing...' : 'Simulate Next Step'}</span>
          </button>
          <button
            onClick={() => handleAdvanceStatus('COMPLETED')}
            disabled={activeRide.status === 'COMPLETED'}
            className="btn-secondary text-xs !py-1.5 !px-3.5"
          >
            Instant Complete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map & Route */}
        <div className="lg:col-span-8 space-y-6">
          <div className="surface-card p-2 sm:p-2.5 rounded-2xl overflow-hidden relative isolate z-0 border border-slate-200 dark:border-slate-800 shadow-md">
            <CampusMap
              pickup={{ lat: activeRide.origin_lat, lng: activeRide.origin_lng }}
              dropoff={{ lat: activeRide.destination_lat, lng: activeRide.destination_lng }}
              vehicleLocation={getSimulatedVehicleLocation()}
              userLocation={userLiveLocation}
              routeCoordinates={routePoints}
              vehiclePlate={activeRide.vehicle_plate || 'CAMPUS-EV-01'}
              vehicleModel={activeRide.vehicle_model || 'Tesla Model Y Campus EV'}
              className="h-[340px] sm:h-[350px] w-full rounded-xl overflow-hidden"
            />
          </div>

          {/* Stepper Lifecycle Card */}
          <div className="surface-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
              Integrated Ride Lifecycle Status
            </h3>
            <div className="grid grid-cols-7 gap-2 text-center overflow-x-auto sm:overflow-visible pb-1">
              {steps.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center min-w-[45px]">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/30'
                          : isPassed
                          ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[11px] mt-1.5 font-medium ${
                        isCurrent
                          ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                          : isPassed
                          ? 'text-slate-800 dark:text-slate-200 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trip Completed In-Page Summary Section */}
          {activeRide.status === 'COMPLETED' && (
            <div className="surface-card p-6 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/40 via-white to-cyan-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-cyan-950/20 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Trip Completed!</h3>
                      <span className="badge-emerald font-bold text-xs">Arrived Safely</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Destination reached: {activeRide.destination_name} • Ride concluded successfully
                    </p>
                  </div>
                </div>
                {!ratingSubmitted ? (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="btn-primary text-xs !py-2 !px-4 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pay ₹{activeRide.individual_share_amount.toFixed(2)} & Rate</span>
                  </button>
                ) : (
                  <span className="badge-emerald py-1 px-3 text-xs font-bold">
                    ✓ Fare Paid & Rating Submitted
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Distance Traveled</p>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{activeRide.total_distance_km} km</p>
                </div>
                <div className="p-3.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Group Fare</p>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">₹{activeRide.total_fare_amount.toFixed(2)}</p>
                </div>
                <div className="p-3.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Your Individual Share</p>
                  <p className="text-base font-extrabold text-cyan-600 dark:text-cyan-400 mt-0.5">₹{activeRide.individual_share_amount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Driver Info, OTP, Emergency SOS, Cost */}
        <div className="lg:col-span-4 space-y-6">
          {/* 4-Digit Security Start OTP Card */}
          <div className="surface-card p-6 rounded-2xl border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-50/30 via-white to-blue-50/20 dark:from-[#111a2e] dark:via-[#131f38] dark:to-[#0f243b] shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Security Verification PIN
              </span>
              <span className="badge-cyan font-bold">
                Show to Driver
              </span>
            </div>
            <div className="text-center py-3">
              <span className="text-4xl font-black tracking-widest text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-950 px-6 py-2 rounded-xl border border-cyan-500/40 shadow-inner inline-block">
                {activeRide.start_otp}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
              Driver verifies this 4-digit PIN before the vehicle departs.
            </p>
          </div>

          {/* Driver & Vehicle Details */}
          <div className="surface-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
              Assigned Campus Driver & Shuttle
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-blue-500/20">
                {activeRide.driver_name ? activeRide.driver_name.charAt(0) : 'D'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {activeRide.driver_name || 'Campus Fleet Driver'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeRide.vehicle_model || 'Campus Shuttle'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-amber-500">
                    ★ {activeRide.driver_rating ? activeRide.driver_rating.toFixed(1) : '4.9'}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {activeRide.vehicle_plate || 'CAMPUS-01'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl surface-inset border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Distance</p>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{activeRide.total_distance_km} km</p>
              </div>
              <div className="p-3 rounded-xl surface-inset border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Your Share</p>
                <p className="font-extrabold text-cyan-700 dark:text-cyan-400 text-sm mt-0.5">
                  ₹{activeRide.individual_share_amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Fellow Passenger List (Community Ride Sharing) */}
          <div className="surface-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              Fellow Passengers ({activeRide.passengers.length})
            </h3>
            <div className="space-y-2">
              {activeRide.passengers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{p.passenger_name}</span>
                  <span className="badge-cyan font-mono font-bold">
                    ₹{p.fare_charged.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Location & Real GPS Tracking Card */}
          <div className="surface-card p-5 rounded-2xl border border-blue-500/20 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                <Navigation className={`w-3.5 h-3.5 ${isTrackingLocation ? 'text-emerald-500 animate-spin' : ''}`} />
                Live Location & GPS Tracking
              </span>
              <span className={isTrackingLocation ? 'badge-emerald' : locationError ? 'badge-rose' : 'badge-amber'}>
                {isTrackingLocation ? 'REAL GPS ACTIVE' : locationError ? 'GPS ERROR' : 'GPS IDLE'}
              </span>
            </div>

            {/* Geolocation Status / Details */}
            {isTrackingLocation && userLiveLocation ? (
              <div className="p-3 rounded-xl surface-inset border border-emerald-500/20 space-y-1 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Live Real GPS Active (Browser Sensor)
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-800 dark:text-slate-200">
                  Lat: <span className="font-bold text-cyan-600 dark:text-cyan-400">{userLiveLocation.lat.toFixed(5)}</span> • Lng: <span className="font-bold text-cyan-600 dark:text-cyan-400">{userLiveLocation.lng.toFixed(5)}</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Accuracy: ±{Math.round(userLiveLocation.accuracy)}m • Updating continuously via watchPosition
                </p>
              </div>
            ) : locationError ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs mb-3 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>GPS Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed">{locationError}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                Enable real device GPS to display your live position and accuracy circle on the interactive map alongside the shuttle simulation.
              </p>
            )}

            {/* Real GPS Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {!isTrackingLocation ? (
                <button
                  onClick={startLiveLocationTracking}
                  className="btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 shadow-sm"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Start Real GPS Tracking</span>
                </button>
              ) : (
                <button
                  onClick={stopLiveLocationTracking}
                  className="btn-secondary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 border-rose-500/30"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Stop Live Tracking</span>
                </button>
              )}
            </div>

            {/* Simulated Sharing Status (Emergency Contacts) */}
            <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">Simulated Sharing:</span>
                <span className={locationSharing?.is_active ? 'text-emerald-500 font-semibold' : 'text-slate-400'}>
                  {locationSharing?.is_active ? 'Streaming to Contacts' : 'Idle'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Sector: {locationSharing?.simulated_location?.location_label || 'Campus Tech Corridor'} (Prototype Simulation)
              </p>
            </div>
          </div>

          {/* Emergency SOS Panic Simulation Button */}
          <div className="surface-card p-6 rounded-2xl border-2 border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/20 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Emergency Safety System
              </span>
              <span className="badge-rose font-bold">
                Simulation Drill
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Press to test instant emergency dispatch alert with live coordinates and alarm siren.
            </p>
            <button
              onClick={handleOpenSosConfirm}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                sosActive
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{sosActive ? '🚨 SOS ALARM ACTIVE (DRILL)' : 'TRIGGER SOS PANIC ALERT'}</span>
            </button>

            {sosSummary && (
              <button
                onClick={() => setShowSosSummary(true)}
                className="w-full mt-2.5 py-2.5 rounded-xl btn-secondary text-rose-600 dark:text-rose-300 border-rose-500/30 flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>View Emergency Response Summary</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment & Rating Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="surface-card p-6 sm:p-8 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto my-auto">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Trip Completed!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You have arrived safely at {activeRide.destination_name}.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="surface-inset rounded-xl p-4 space-y-2 text-xs border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Vehicle Commute Fare</span>
                <span className="text-slate-900 dark:text-white font-bold">₹{activeRide.total_fare_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Split with {activeRide.passengers.length} passenger(s)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Empty-Seat Savings Applied</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>Your Individual Share</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-mono">₹{activeRide.individual_share_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="text-center">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Rate Driver & Cleanliness</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-transform hover:scale-125 ${
                      star <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              <button
                onClick={handleCompletePayment}
                disabled={paymentProcessing}
                className="w-full btn-primary !py-3 text-sm flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25"
              >
                <span>{paymentProcessing ? 'Processing...' : `Pay ₹${activeRide.individual_share_amount.toFixed(2)} (RIDO Wallet)`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Confirmation Modal */}
      <SosConfirmationModal
        isOpen={showSosConfirm}
        onClose={() => setShowSosConfirm(false)}
        onConfirm={handleConfirmSos}
      />

      {/* SOS Response Summary Modal */}
      <EmergencyResponseSummaryModal
        isOpen={showSosSummary}
        onClose={() => {
          setShowSosSummary(false);
          setSosActive(false);
        }}
        summary={sosSummary}
      />
    </div>
  );
};

export default ActiveRidePage;
