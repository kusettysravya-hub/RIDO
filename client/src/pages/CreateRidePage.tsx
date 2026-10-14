import React, { useState } from 'react';
import { PlusCircle, MapPin, Users, IndianRupee, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { sounds } from '../utils/audio';

interface Props {
  setCurrentTab: (tab: string) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Metro Transit Station (Powell St)', lat: 37.7844, lng: -122.4080 },
  { name: 'University Main Campus Gate', lat: 37.7749, lng: -122.4194 },
  { name: 'Science & Engineering Complex', lat: 37.7749, lng: -122.4194 },
  { name: 'South Student Residences', lat: 37.7602, lng: -122.4199 },
  { name: 'University Central Library', lat: 37.7780, lng: -122.4160 },
  { name: 'City Airport Transit Terminal', lat: 37.6213, lng: -122.3790 },
];

export const CreateRidePage: React.FC<Props> = ({ setCurrentTab }) => {
  const [originIndex, setOriginIndex] = useState(0);
  const [destIndex, setDestIndex] = useState(1);
  const [category, setCategory] = useState('STANDARD_SEDAN');
  const [creating, setCreating] = useState(false);

  const { showToast } = useNotification();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const origin = PRESET_LOCATIONS[originIndex];
      const destination = PRESET_LOCATIONS[destIndex];

      await api.post('/api/rides/create', {
        origin_name: origin.name,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destination.name,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
      });

      sounds.playMatchSound();
      showToast('Shared ride created and queued for student/staff matching!', 'success');
      setTimeout(() => {
        setCurrentTab('active-ride');
      }, 1000);
    } catch (err: any) {
      showToast('Failed to create ride', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-300 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>RIDO Commute Pooling</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Create New Shared Ride
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Publish a new commute trip. Other campus community members traveling along this corridor will be matched automatically to optimize vehicle capacity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Column */}
        <div className="lg:col-span-7">
          <div className="surface-card p-6 sm:p-7 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Trip Route & Vehicle Selection</span>
            </h2>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Pickup Origin Point
                  </label>
                  <select
                    value={originIndex}
                    onChange={(e) => setOriginIndex(parseInt(e.target.value))}
                    className="input-field"
                  >
                    {PRESET_LOCATIONS.map((loc, i) => (
                      <option key={loc.name} value={i}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Dropoff Destination Point
                  </label>
                  <select
                    value={destIndex}
                    onChange={(e) => setDestIndex(parseInt(e.target.value))}
                    className="input-field"
                  >
                    {PRESET_LOCATIONS.map((loc, i) => (
                      <option key={loc.name} value={i}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                  Vehicle Category Preference
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setCategory('STANDARD_SEDAN')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      category === 'STANDARD_SEDAN'
                        ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 text-blue-700 dark:text-cyan-300 shadow-sm'
                        : 'surface-inset border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-1.5">🚗</div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Standard Sedan</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Everyday fuel efficient</p>
                  </div>

                  <div
                    onClick={() => setCategory('EV_CAMPUS_SHUTTLE')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      category === 'EV_CAMPUS_SHUTTLE'
                        ? 'bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-sm'
                        : 'surface-inset border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-cyan-300'
                    }`}
                  >
                    <div className="text-2xl mb-1.5">⚡</div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Campus EV Shuttle</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Zero-emission electric</p>
                  </div>

                  <div
                    onClick={() => setCategory('ACCESSIBLE_VAN')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      category === 'ACCESSIBLE_VAN'
                        ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500 text-blue-700 dark:text-cyan-300 shadow-sm'
                        : 'surface-inset border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-1.5">🚐</div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Accessible Transit</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Wheelchair & extra baggage</p>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Seats auto-allocated per rider</span>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex items-center gap-2 py-2.5 px-5 shadow-md shadow-cyan-500/25"
                >
                  <span>{creating ? 'Publishing Ride...' : 'Publish Shared Ride'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Info Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="surface-card p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Smart Dynamic Route Aggregation</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              When you post a shared ride, RIDO's matching engine evaluates other riders traveling along identical campus corridors within a 15-minute departure window.
            </p>

            <div className="surface-inset p-4 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Corridor Selected</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {PRESET_LOCATIONS[originIndex]?.name.split(' ')[0]} ➔ {PRESET_LOCATIONS[destIndex]?.name.split(' ')[0]}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Expected Fare Split</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Up to 40% Off Solo Fare</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Est. Carbon Reduction</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">~1.2 kg CO₂ Saved</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Restricted strictly to verified campus community riders.</span>
            </div>
          </div>

          <div className="surface-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">Need a recurring class schedule?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5 leading-snug">
                  Automate repeated morning lectures and evening return trips automatically.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('recurring')}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline transition-colors"
                >
                  Configure Recurring Commute →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRidePage;
