import React, { useState, useEffect } from 'react';
import {
  Car,
  Power,
  IndianRupee,
  TrendingUp,
  Star,
  CheckCircle2,
  KeyRound,
  Navigation,
  ArrowRight,
  Battery,
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { sounds } from '../utils/audio';

interface Props {
  setCurrentTab: (tab: string) => void;
}

export const DriverDashboard: React.FC<Props> = ({ setCurrentTab }) => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [toggling, setToggling] = useState(false);

  const { showToast } = useNotification();

  const fetchDriverData = async () => {
    try {
      const res = await api.get('/api/drivers/dashboard');
      setDashboard(res.data);
    } catch (err) {
      console.error('Failed to load driver dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  const handleToggleOnline = async () => {
    if (!dashboard) return;
    setToggling(true);
    try {
      const newStatus = !dashboard.is_online;
      const res = await api.post(`/api/drivers/toggle-availability?is_online=${newStatus}`);
      setDashboard((prev: any) => ({ ...prev, is_online: res.data.is_online }));
      showToast(res.data.message, 'info');
    } catch (err) {
      showToast('Failed to toggle status', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboard?.active_ride_id) return;
    setVerifyingOtp(true);
    try {
      await api.post(`/api/drivers/verify-otp?ride_id=${dashboard.active_ride_id}&otp=${otpInput.trim()}`);
      sounds.playArrivalSound();
      showToast('Start PIN verified! Trip is now unlocked.', 'success');
      setOtpInput('');
      setCurrentTab('active-ride');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid OTP';
      showToast(msg, 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-9 h-9 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading driver telematics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Driver Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-cyan-400 text-xs font-bold mb-2">
            <Car className="w-3.5 h-3.5" />
            <span>RIDO Driver Telematics Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {dashboard?.full_name || 'Driver Console'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
            License: {dashboard?.license_number} • Certified Campus Operator
          </p>
        </div>

        {/* Online/Offline Power Switch */}
        <button
          onClick={handleToggleOnline}
          disabled={toggling}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-xs border transition-all self-start sm:self-auto shadow-sm ${
            dashboard?.is_online
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20'
              : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{dashboard?.is_online ? 'ONLINE (READY FOR DISPATCH)' : 'OFFLINE (TAP TO GO ONLINE)'}</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-3 font-semibold">
            <span>Simulated Earnings</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">₹{dashboard?.total_earnings.toFixed(2)}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">80% driver share applied</p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-3 font-semibold">
            <span>Completed Trips</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{dashboard?.total_trips}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Zero route deviations</p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-3 font-semibold">
            <span>Driver Rating</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-500">★ {dashboard?.rating.toFixed(1)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Top rated campus operator</p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-3 font-semibold">
            <span>Assigned Vehicle</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white truncate">
            {dashboard?.assigned_vehicle ? dashboard.assigned_vehicle.model : 'None Assigned'}
          </p>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
            {dashboard?.assigned_vehicle ? `Plate: ${dashboard.assigned_vehicle.plate} • ${dashboard.assigned_vehicle.battery_or_fuel}% Batt` : 'Visit Fleet Manager'}
          </p>
        </div>
      </div>

      {/* Active Trip & OTP Verification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 surface-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Navigation className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Current Trip Assignment</h3>
            </div>
            {dashboard?.active_ride_id && (
              <button
                onClick={() => setCurrentTab('active-ride')}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-bold flex items-center gap-1 transition-colors"
              >
                <span>Open Live Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {dashboard?.active_ride_id ? (
            <div className="surface-inset p-5 rounded-xl border border-cyan-500/30">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-700 dark:text-cyan-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active Dispatch Assigned (#{dashboard.active_ride_id.slice(0, 8)})</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                You have passengers waiting or in transit. Proceed to the live navigation view to monitor waypoints and complete this commute.
              </p>
              <button
                onClick={() => setCurrentTab('active-ride')}
                className="btn-primary"
              >
                <Navigation className="w-4 h-4" />
                <span>Launch Navigation Console</span>
              </button>
            </div>
          ) : (
            <div className="py-14 text-center surface-inset rounded-xl border border-slate-200 dark:border-slate-800">
              <Car className="w-10 h-10 mx-auto mb-2 text-slate-400" />
              <p className="text-slate-800 dark:text-slate-200 text-sm font-bold">Ready for next assignment</p>
              <p className="text-xs text-slate-500 mt-1">Keep status Online to receive student and faculty dispatch requests.</p>
            </div>
          )}
        </div>

        {/* Enter 4-Digit Passenger PIN Card */}
        <div className="lg:col-span-4 surface-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-2">
              <KeyRound className="w-4 h-4" />
              <span>Passenger PIN Verification</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed font-normal">
              Ask the boarded passenger for their 4-digit security code before initiating trip transit.
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="e.g. 4821"
                  className="input-field text-center tracking-widest text-3xl font-mono font-black py-3.5"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={verifyingOtp || !dashboard?.active_ride_id}
                className="w-full btn-primary disabled:opacity-40 py-2.5 shadow-md shadow-cyan-500/25"
              >
                {verifyingOtp ? 'Verifying PIN...' : 'Verify PIN & Unlock Ride'}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center font-mono">
            Zero-knowledge cryptographic OTP protects passenger identity.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
