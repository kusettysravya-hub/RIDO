import React, { useState, useEffect } from 'react';
import { History, Car, CheckCircle2, IndianRupee, Calendar, MapPin } from 'lucide-react';
import api from '../services/api';
import { Ride } from '../types';

export const RideHistoryPage: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/rides/history')
      .then((res) => setRides(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-cyan-400 text-xs font-bold mb-2">
          <History className="w-3.5 h-3.5" />
          <span>Commute Archives</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Ride & Commute History
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Review your past campus commutes, fare receipts, and empty-seat shared pooling logs.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-xs text-slate-500 dark:text-slate-400 font-medium">Loading trip history...</div>
      ) : rides.length === 0 ? (
        <div className="surface-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Car className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Past Trips Recorded</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your completed campus rides and receipts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => (
            <div
              key={ride.id}
              className="surface-card p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5 text-xs"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-blue-500/20">
                  🚗
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {ride.origin_name} <span className="text-cyan-600 dark:text-cyan-400">➔</span> {ride.destination_name}
                    </span>
                    <span
                      className={
                        ride.status === 'COMPLETED'
                          ? 'badge-emerald'
                          : 'badge-blue'
                      }
                    >
                      {ride.status}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-xs">
                    Driver:{' '}
                    <strong className="text-slate-900 dark:text-slate-200">{ride.driver_name || 'Campus Operator'}</strong> •{' '}
                    {ride.vehicle_model || 'Campus Shuttle'} ({ride.vehicle_plate || 'CAMPUS-01'})
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400 text-xs pt-1">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      {new Date(ride.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span>•</span>
                    <span>{ride.total_distance_km} km</span>
                    <span>•</span>
                    <span>{ride.passengers.length} passenger{ride.passengers.length > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800 flex md:flex-col justify-between md:justify-center items-end">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Your Share</p>
                <p className="text-2xl font-black text-cyan-700 dark:text-cyan-400 font-mono">
                  ₹{ride.individual_share_amount.toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Paid via RIDO Wallet</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RideHistoryPage;
