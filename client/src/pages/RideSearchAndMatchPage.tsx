import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Sparkles,
  Users,
  IndianRupee,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { RideMatchScore, CostExplanation } from '../types';
import { useNotification } from '../context/NotificationContext';
import { sounds } from '../utils/audio';

interface Props {
  setCurrentTab: (tab: string) => void;
}

const CAMPUS_PRESETS = [
  { name: 'Metro Transit Station', lat: 37.7844, lng: -122.4080 },
  { name: 'University Main Campus Gate', lat: 37.7749, lng: -122.4194 },
  { name: 'Science & Tech Complex', lat: 37.7749, lng: -122.4194 },
  { name: 'South Student Residences', lat: 37.7602, lng: -122.4199 },
  { name: 'Central University Library', lat: 37.7780, lng: -122.4160 },
];

export const RideSearchAndMatchPage: React.FC<Props> = ({ setCurrentTab }) => {
  const [pickup, setPickup] = useState(CAMPUS_PRESETS[0]);
  const [dropoff, setDropoff] = useState(CAMPUS_PRESETS[1]);
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<RideMatchScore[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [costBreakdown, setCostBreakdown] = useState<CostExplanation | null>(null);
  const [joiningRideId, setJoiningRideId] = useState<string | null>(null);

  const { showToast } = useNotification();

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      // 1. Search matching shared rides with empty seat optimization
      const searchRes = await api.post('/api/rides/search', {
        origin_lat: pickup.lat,
        origin_lng: pickup.lng,
        destination_lat: dropoff.lat,
        destination_lng: dropoff.lng,
        seats_needed: seatsNeeded,
      });
      setMatches(searchRes.data);

      // 2. Fetch transparent cost estimation
      const costRes = await api.post(
        `/api/rides/estimate-cost?origin_lat=${pickup.lat}&origin_lng=${pickup.lng}&dest_lat=${dropoff.lat}&dest_lng=${dropoff.lng}&passengers_count=2`
      );
      setCostBreakdown(costRes.data);

      if (searchRes.data.length > 0) {
        sounds.playMatchSound();
        showToast(`Found ${searchRes.data.length} compatible shared ride(s)!`, 'success');
      } else {
        showToast('No active shared rides found. You can create a new ride offer!', 'info');
      }
    } catch (err: any) {
      showToast('Error searching for rides', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const handleJoinRide = async (rideId: string) => {
    setJoiningRideId(rideId);
    try {
      await api.post(
        `/api/rides/${rideId}/join?pickup_name=${encodeURIComponent(pickup.name)}&dropoff_name=${encodeURIComponent(
          dropoff.name
        )}&seats_booked=${seatsNeeded}`
      );
      sounds.playMatchSound();
      showToast('Successfully joined shared ride! Directing to live tracking...', 'success');
      setTimeout(() => {
        setCurrentTab('active-ride');
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to join ride';
      showToast(msg, 'error');
    } finally {
      setJoiningRideId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-cyan-400 text-xs font-bold mb-2">
            <Search className="w-3.5 h-3.5" />
            <span>RIDO Corridor Pool Matching</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Find & Match Shared Rides
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Optimizes vehicle capacity by grouping campus community members traveling along the same route corridor.
          </p>
        </div>

        {/* Flagship SHRP Quick Link */}
        <button
          onClick={() => setCurrentTab('recovery')}
          className="btn-secondary flex items-center gap-2 text-xs font-semibold self-start md:self-auto shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Self-Healing Engine (SHRP)</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Search Input Card */}
      <div className="surface-card p-6 sm:p-7 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Pickup Selection */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Pickup Location</span>
            </label>
            <select
              value={pickup.name}
              onChange={(e) => {
                const found = CAMPUS_PRESETS.find((p) => p.name === e.target.value);
                if (found) setPickup(found);
              }}
              className="input-field"
            >
              {CAMPUS_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropoff Selection */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Destination Point</span>
            </label>
            <select
              value={dropoff.name}
              onChange={(e) => {
                const found = CAMPUS_PRESETS.find((p) => p.name === e.target.value);
                if (found) setDropoff(found);
              }}
              className="input-field"
            >
              {CAMPUS_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Seats Needed */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Seats</span>
            </label>
            <select
              value={seatsNeeded}
              onChange={(e) => setSeatsNeeded(parseInt(e.target.value))}
              className="input-field"
            >
              <option value={1}>1 Seat</option>
              <option value={2}>2 Seats</option>
              <option value={3}>3 Seats</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 py-2.5 shadow-md shadow-cyan-500/25"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Find Matches'}</span>
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Frequent Routes:</span>
          <button
            onClick={() => {
              setPickup(CAMPUS_PRESETS[0]);
              setDropoff(CAMPUS_PRESETS[1]);
              handleSearch();
            }}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium transition-all shadow-sm"
          >
            Metro Station ➔ Main Campus Gate
          </button>
          <button
            onClick={() => {
              setPickup(CAMPUS_PRESETS[3]);
              setDropoff(CAMPUS_PRESETS[2]);
              handleSearch();
            }}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium transition-all shadow-sm"
          >
            South Hostels ➔ Science Complex
          </button>
        </div>
      </div>

      {/* Transparent Shared Cost Breakdown Card */}
      {costBreakdown && (
        <div className="surface-card p-5 sm:p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Shared Cost Transparency Model
                </span>
                <span className="badge-emerald font-bold">Save up to 75%</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                {costBreakdown.formula_explanation}
              </p>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Estimated Share</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{costBreakdown.individual_fare.toFixed(2)}
                </p>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-6">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Corridor Distance</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {costBreakdown.distance_km} km
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matched Shared Rides List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Compatible Shared Rides</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-slate-800 text-xs font-mono font-bold text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-slate-700">
              {matches.length} Available
            </span>
          </div>
          <button
            onClick={() => setCurrentTab('create-ride')}
            className="text-xs text-blue-600 dark:text-cyan-400 hover:underline font-bold flex items-center gap-1 transition-colors"
          >
            <span>Offer new ride</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {matches.length === 0 && hasSearched && !loading && (
          <div className="surface-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Active Shared Rides</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
              No shuttles currently matching this corridor. Create a new commute request to allow other community members to join.
            </p>
            <button
              onClick={() => setCurrentTab('create-ride')}
              className="btn-primary"
            >
              Create New Ride Offer
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {matches.map((m) => (
            <div
              key={m.ride_id}
              className="surface-card p-5 sm:p-6 rounded-2xl hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-lg transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
            >
              {/* Match Score & Driver Info */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex flex-col items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <span className="text-base font-black">{Math.round(m.match_score_pct)}%</span>
                  <span className="text-[9px] font-bold tracking-wider uppercase opacity-90">MATCH</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{m.driver_name}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 flex items-center gap-1">
                      ★ {m.driver_rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {m.license_plate}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vehicle: <span className="font-semibold text-slate-700 dark:text-slate-200">{m.vehicle_model}</span>
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{m.origin_name}</span>
                    </span>
                    <span className="text-slate-400">➔</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>{m.destination_name}</span>
                    </span>
                  </div>

                  {/* Explainable Matching Factors List */}
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {m.explanation_reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700"
                      >
                        <CheckCircle2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span>{reason}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Join Button */}
              <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800 shrink-0">
                <div className="md:text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Per-Seat Split Fare</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-cyan-700 dark:text-cyan-400 font-mono">
                      ₹{m.cost_per_seat.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({m.available_seats} seat{m.available_seats !== 1 ? 's' : ''} left)
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinRide(m.ride_id)}
                  disabled={joiningRideId === m.ride_id}
                  className="btn-primary"
                >
                  <span>{joiningRideId === m.ride_id ? 'Joining...' : 'Join Shared Ride'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RideSearchAndMatchPage;
