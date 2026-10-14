import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  Repeat,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { RecurringRide } from '../types';
import { useNotification } from '../context/NotificationContext';

export const RecurringCommutePage: React.FC = () => {
  const [recurringRides, setRecurringRides] = useState<RecurringRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('Morning Lecture Commute');
  const [origin, setOrigin] = useState('South Park Student Residences');
  const [destination, setDestination] = useState('Computer Science Department Hall');
  const [departureTime, setDepartureTime] = useState('08:30');
  const [frequency, setFrequency] = useState('WEEKDAYS');
  const [daysOfWeek, setDaysOfWeek] = useState('Mon,Tue,Wed,Thu,Fri');
  const [seats, setSeats] = useState(1);
  const [saving, setSaving] = useState(false);

  const { showToast } = useNotification();

  const fetchRecurring = async () => {
    try {
      const res = await api.get('/api/passengers/recurring-rides');
      setRecurringRides(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/passengers/recurring-rides', {
        title,
        origin_name: origin,
        origin_lat: 37.7820,
        origin_lng: -122.3950,
        destination_name: destination,
        destination_lat: 37.7749,
        destination_lng: -122.4194,
        departure_time: departureTime,
        frequency,
        days_of_week: daysOfWeek,
        seats_needed: seats,
      });
      showToast('Recurring commute schedule created successfully!', 'success');
      setShowAddModal(false);
      fetchRecurring();
    } catch (err: any) {
      showToast('Failed to create recurring commute schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/passengers/recurring-rides/${id}`);
      showToast('Recurring commute schedule removed', 'info');
      setRecurringRides((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      showToast('Failed to delete schedule', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-cyan-400 text-xs font-bold mb-2">
            <Repeat className="w-3.5 h-3.5" />
            <span>Automated Routine Transit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Recurring Commute Planning
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Schedule automated daily and weekday shared rides to campus so you never have to search and book manually before class.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary self-start md:self-auto flex items-center gap-2 py-2.5 px-4 shadow-md shadow-cyan-500/25 font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>New Recurring Schedule</span>
        </button>
      </div>

      {/* Mechanism Explanation Banner */}
      <div className="surface-card p-5 sm:p-6 rounded-2xl border border-blue-500/25 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">How Automated Recurring Commuting Operates</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
              RIDO aggregates students and faculty commuting from identical campus residences and residential corridors at matching class times (e.g., 08:30 AM). Vehicle capacity is pre-allocated automatically each weekday, guaranteeing the shared pool discount without daily manual bookings.
            </p>
          </div>
        </div>
      </div>

      {/* Recurring Schedules Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-xs font-medium">Loading recurring commute plans...</div>
      ) : recurringRides.length === 0 ? (
        <div className="surface-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Recurring Commute Schedules</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
            Set up your repeated schedule for morning lectures or evening returns to automate your daily commute.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Schedule</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recurringRides.map((ride) => (
            <div
              key={ride.id}
              className="surface-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 dark:hover:border-cyan-400/40 hover:shadow-md transition-all space-y-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="badge-cyan font-mono font-bold">
                    {ride.frequency}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{ride.departure_time}</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{ride.title}</h3>

                <div className="space-y-2 text-xs surface-inset p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300 truncate">From: <strong className="text-slate-900 dark:text-white font-semibold">{ride.origin_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300 truncate">To: <strong className="text-slate-900 dark:text-white font-semibold">{ride.destination_name}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span>Days: <strong className="text-slate-800 dark:text-slate-200">{ride.days_of_week}</strong></span>
                  <span>Seats: <strong className="text-slate-800 dark:text-slate-200">{ride.seats_needed}</strong></span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Auto-Dispatch Active</span>
                </span>

                <button
                  onClick={() => handleDelete(ride.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                  title="Cancel Recurring Schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="surface-card p-6 sm:p-7 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Recurring Commute Schedule</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Set up an automated recurring ride for routine campus travel.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Schedule Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Departure Time</label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Frequency Pattern</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="input-field"
                  >
                    <option value="WEEKDAYS">Mon - Fri (Weekdays)</option>
                    <option value="DAILY">Daily (All Days)</option>
                    <option value="WEEKLY">Weekly (Custom Days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pickup Origin</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Dropoff Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringCommutePage;
