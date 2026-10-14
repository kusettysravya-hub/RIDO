import React, { useState, useEffect } from 'react';
import { Wrench, Calendar, IndianRupee, Gauge, CheckCircle2, Plus, Clock } from 'lucide-react';
import api from '../services/api';
import { MaintenanceRecord, Vehicle } from '../types';
import { useNotification } from '../context/NotificationContext';

export const MaintenancePage: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [serviceType, setServiceType] = useState('OIL_CHANGE');
  const [cost, setCost] = useState('85.00');
  const [odometer, setOdometer] = useState('15000');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useNotification();

  const fetchData = async () => {
    try {
      const [recRes, vehRes] = await Promise.all([
        api.get('/api/fleet/maintenance'),
        api.get('/api/fleet/vehicles'),
      ]);
      setRecords(recRes.data);
      setVehicles(vehRes.data);
      if (vehRes.data.length > 0) setVehicleId(vehRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/fleet/maintenance', {
        vehicle_id: vehicleId,
        service_type: serviceType,
        odometer_at_service: parseFloat(odometer),
        cost_amount: parseFloat(cost),
        description,
        next_due_km: parseFloat(odometer) + 10000,
        status: 'SCHEDULED',
      });
      showToast('Preventative maintenance scheduled successfully!', 'success');
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast('Failed to schedule maintenance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-bold mb-2">
            <Wrench className="w-3.5 h-3.5" />
            <span>RIDO Preventative Care</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Maintenance Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Service history, brake calibrations, EV battery health diagnostics, and upcoming odometer maintenance triggers.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 self-start md:self-auto text-xs font-bold px-4 py-2.5 shadow-md shadow-cyan-500/25"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Service</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 dark:text-slate-400 text-xs font-medium">Loading maintenance records...</div>
      ) : records.length === 0 ? (
        <div className="surface-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Wrench className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Maintenance Records</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            All fleet shuttles are operating within nominal service intervals. Click "Schedule Service" above to record a preventative maintenance event.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {records.map((r) => {
            const vehicle = vehicles.find((v) => v.id === r.vehicle_id);
            return (
              <div
                key={r.id}
                className="surface-card p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {r.service_type.replace(/_/g, ' ')}
                      </h3>
                      <span
                        className={
                          r.status === 'COMPLETED'
                            ? 'badge-emerald font-bold'
                            : 'badge-amber font-bold'
                        }
                      >
                        {r.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Vehicle:{' '}
                      <span className="font-bold text-slate-900 dark:text-white">
                        {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})` : 'Assigned Shuttle'}
                      </span>
                    </p>
                    {r.description && <p className="text-xs text-slate-500 dark:text-slate-400">{r.description}</p>}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                  <div className="font-mono text-cyan-700 dark:text-cyan-400 font-extrabold text-base">
                    ₹{r.cost_amount.toFixed(2)}
                  </div>
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    Service at: <strong className="text-slate-900 dark:text-white">{r.odometer_at_service} km</strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Next due: {r.next_due_km} km
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="surface-card p-6 sm:p-7 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Preventative Service</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Create an inspection, diagnostic, or repair log for a campus fleet vehicle.
              </p>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="input-field"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.license_plate}) - {v.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Service Type</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="input-field"
                  >
                    <option value="OIL_CHANGE">Oil Change</option>
                    <option value="BRAKE_INSPECTION">Brake Pad Inspection</option>
                    <option value="BATTERY_HEALTH">EV Battery Diagnostic</option>
                    <option value="TIRE_ROTATION">Tire Rotation & Balance</option>
                    <option value="FULL_DIAGNOSTIC">Full Annual Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km)</label>
                <input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Notes & Diagnostic Observations</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="input-field"
                  placeholder="e.g. Scheduled 20,000 km routine brake inspection"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Saving...' : 'Record Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
