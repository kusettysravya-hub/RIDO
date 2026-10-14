import React, { useState, useEffect } from 'react';
import {
  Car,
  BatteryCharging,
  Gauge,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { Vehicle } from '../types';
import { useNotification } from '../context/NotificationContext';

interface Props {
  setCurrentTab: (tab: string) => void;
}

export const FleetDashboard: React.FC<Props> = ({ setCurrentTab }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { showToast } = useNotification();

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/api/fleet/vehicles');
      setVehicles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    if (filterStatus === 'ALL') return true;
    return v.status === filterStatus;
  });

  const availableCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const onTripCount = vehicles.filter((v) => v.status === 'ON_TRIP').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-cyan-400 text-xs font-bold mb-2">
            <Car className="w-3.5 h-3.5" />
            <span>RIDO Fleet Telematics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Fleet Operations & Telematics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Real-time telematics of campus shuttles, battery charge levels, tire pressures, and preventative maintenance schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setCurrentTab('maintenance')}
            className="btn-secondary flex items-center gap-2 text-xs font-semibold px-4 py-2.5 shadow-sm"
          >
            <Wrench className="w-4 h-4 text-amber-500" />
            <span>Service Records</span>
          </button>
          <button
            onClick={() => setCurrentTab('analytics')}
            className="btn-primary flex items-center gap-2 text-xs font-bold px-4 py-2.5 shadow-md shadow-cyan-500/25"
          >
            <span>Demand Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Fleet Size</span>
            <Car className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{vehicles.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">EV shuttles, sedans & vans</p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Available for Dispatch</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{availableCount}</p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium">Ready for campus commuters</p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Currently on Trip</span>
            <Gauge className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-blue-600 dark:text-cyan-400">{onTripCount}</p>
          <p className="text-xs text-blue-600/80 dark:text-cyan-400/80 font-medium">Active on transit routes</p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>In Maintenance</span>
            <Wrench className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{maintenanceCount}</p>
          <p className="text-xs text-rose-600/80 dark:text-rose-400/80 font-medium">Inspection / diagnostics</p>
        </div>
      </div>

      {/* Filter Tabs & Telematics Table */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL', 'AVAILABLE', 'ON_TRIP', 'MAINTENANCE'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                filterStatus === status
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="surface-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="px-6 py-4">Vehicle & Model</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Battery / Fuel</th>
                  <th className="px-6 py-4">Tire PSI</th>
                  <th className="px-6 py-4">Odometer</th>
                  <th className="px-6 py-4">Assigned Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-sans">
                {filteredVehicles.map((v) => {
                  const isServiceDue = v.odometer_km >= v.next_service_km || v.tire_pressure_psi < 30;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {v.make} {v.model}
                        </div>
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 inline-block mt-0.5">
                          {v.license_plate}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {v.category.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={
                            v.status === 'AVAILABLE'
                              ? 'badge-emerald'
                              : v.status === 'ON_TRIP'
                              ? 'badge-blue'
                              : 'badge-rose'
                          }
                        >
                          {v.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                v.battery_or_fuel_level > 60
                                  ? 'bg-emerald-500'
                                  : v.battery_or_fuel_level > 30
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${v.battery_or_fuel_level}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {v.battery_or_fuel_level.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono">
                        <span className={v.tire_pressure_psi < 30 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {v.tire_pressure_psi.toFixed(1)} PSI
                        </span>
                        {v.tire_pressure_psi < 30 && (
                          <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-bold">Low PSI Alert</span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                        {v.odometer_km.toFixed(0)} km
                        {isServiceDue && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold">Service Due</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {v.driver_name ? (
                          <span className="font-semibold text-slate-900 dark:text-white">{v.driver_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDashboard;
