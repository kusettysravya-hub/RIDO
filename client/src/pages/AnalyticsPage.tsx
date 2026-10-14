import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Flame,
  Leaf,
  Users,
  Car,
  Clock,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { DashboardKPIs } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/analytics/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-9 h-9 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aggregating mobility demand analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-300 text-xs font-bold mb-2">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>RIDO Fleet Analytics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Mobility Demand & Fleet Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Analyzing route demand density, peak lecture hours, vehicle occupancy rates, and environmental CO₂ savings across campus transit corridors.
        </p>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-3 font-semibold">
            <span>Fleet Utilization Rate</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-cyan-400">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
            {data.fleet_utilization.utilization_rate_pct}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="text-blue-600 dark:text-cyan-400 font-bold">{data.fleet_utilization.available_vehicles + data.fleet_utilization.on_trip_vehicles}</span> of {data.fleet_utilization.total_vehicles} vehicles active
          </p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-3 font-semibold">
            <span>Avg. Seat Occupancy</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
            {data.average_occupancy_rate_pct}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Seats filled per shared trip</p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-3 font-semibold">
            <span>CO₂ Emissions Prevented</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
            {data.co2_saved_total_kg} <span className="text-lg font-bold text-slate-500">kg</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Campus green mobility impact</p>
        </div>

        <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-3 font-semibold">
            <span>Avg. Dispatch Latency</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
            {data.average_matching_time_sec}<span className="text-lg font-bold text-slate-500">s</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Real-time matching evaluation</p>
        </div>
      </div>

      {/* High-Demand Corridors & Hourly Demand Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* High Demand Corridors */}
        <div className="lg:col-span-7 surface-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">High-Demand Campus Corridors</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Prioritized for autonomous empty-seat aggregation</p>
              </div>
            </div>
            <span className="badge-rose font-bold">
              Fleet Priority
            </span>
          </div>

          <div className="space-y-3">
            {data.high_demand_routes.map((route, i) => (
              <div
                key={i}
                className="surface-inset p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 dark:hover:border-cyan-400/40 transition-all flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{route.route_name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Peak Hours: <span className="text-slate-800 dark:text-slate-200 font-semibold">{route.peak_hours}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      route.demand_level === 'HIGH'
                        ? 'badge-rose'
                        : 'badge-amber'
                    }`}
                  >
                    {route.demand_level} DEMAND
                  </span>
                  <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400 mt-1 font-bold">
                    {route.request_count} req/day
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Peak Time Distribution Bar Graph */}
        <div className="lg:col-span-5 surface-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Campus Hourly Travel Peaks</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Identifies class changeover rushes to proactively position empty shuttles.
            </p>

            <div className="space-y-3">
              {data.hourly_demand.slice(0, 8).map((slot, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-mono text-slate-600 dark:text-slate-400 text-xs shrink-0 font-semibold">{slot.hour}</span>
                  <div className="flex-1 h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        slot.capacity_utilized_pct > 80
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                      }`}
                      style={{ width: `${slot.capacity_utilized_pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-slate-800 dark:text-slate-200 text-xs font-bold">
                    {slot.capacity_utilized_pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              Normal Traffic (≤ 80%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Peak Surge (&gt; 80%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
