import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  PhoneCall,
  MapPin,
  Radio,
  VolumeX,
  X,
  FileText,
  UserCheck,
  AlertOctagon,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { SOSResponseSummary } from '../types';
import { sounds } from '../utils/audio';

interface EmergencyResponseSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SOSResponseSummary | null;
}

export const EmergencyResponseSummaryModal: React.FC<EmergencyResponseSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  if (!isOpen || !summary) return null;

  const handleStopAudio = () => {
    sounds.stopSosSiren();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="surface-card p-6 sm:p-8 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl my-8 space-y-6">
        {/* Header with Incident ID & Status */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="badge-rose font-mono font-bold flex items-center gap-1">
                <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
                {summary.status}
              </span>
              <span className="badge-amber font-mono font-bold">
                SIMULATION HARNESS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Emergency Response Summary
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              Tracking Incident ID:{' '}
              <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                #{summary.incident_id}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* 1. Timestamp & Dispatch Overview Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Alert Trigger Timestamp</p>
                <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{summary.timestamp}</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Reporter Identity</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{summary.reporter_name} (Verified)</p>
              </div>
            </div>
          </div>

          {/* 2. Intended Operational Recipients */}
          <div className="p-4 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              <span>Who Received The SOS Alert Broadcast</span>
            </h3>
            <div className="space-y-2">
              {summary.intended_recipients.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{rec.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{rec.role}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge-emerald text-[9px] font-mono font-bold">
                      {rec.status}
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{rec.channel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Verified Emergency Contacts & Masked Phone Numbers */}
          <div className="p-4 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Emergency Contacts Notified (Masked Verification)</span>
            </h3>
            {summary.emergency_contacts.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No personal emergency contacts registered yet. Institutional security received the broadcast.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {summary.emergency_contacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{c.name}</p>
                        <span className="badge-emerald text-[9px] font-bold">
                          {c.delivery_status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{c.relationship}</p>
                    </div>
                    <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-2">{c.phone_masked}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Live Simulated Location Sharing Status */}
          <div className="p-4 rounded-xl surface-inset border border-emerald-500/25 space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                <span>Live Location Sharing Telemetry</span>
              </h3>
              <span className="badge-emerald font-mono text-[9px] font-bold">
                {summary.live_location_sharing.status}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">
              Coordinates: {summary.live_location_sharing.simulated_coordinates.lat.toFixed(4)}° N,{' '}
              {summary.live_location_sharing.simulated_coordinates.lng.toFixed(4)}° E
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sector: <span className="text-slate-800 dark:text-slate-200 font-semibold">{summary.live_location_sharing.location_label}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actively Viewing:{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {summary.live_location_sharing.shared_with.join(', ')}
              </span>
            </p>
          </div>

          {/* 5. Simulated Emergency Call Status */}
          <div className="p-4 rounded-xl surface-inset border border-blue-500/25 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PhoneCall className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-blue-700 dark:text-cyan-400">Simulated Emergency Helpline Call</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {summary.simulated_emergency_call.intended_recipient}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Channel: {summary.simulated_emergency_call.channel}
              </p>
            </div>
            <span className="badge-blue font-mono text-[10px] shrink-0 font-bold">
              {summary.simulated_emergency_call.call_status}
            </span>
          </div>

          {/* 6. Step-by-Step System Action Log */}
          <div className="p-4 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Autonomous System Actions Executed</span>
            </h3>
            <div className="space-y-1.5">
              {summary.system_actions.map((act, i) => (
                <div key={i} className="text-xs text-slate-700 dark:text-slate-300 font-mono bg-white dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Academic Prototype Disclaimer Box */}
          <div className="p-3.5 rounded-xl surface-inset border border-rose-500/30 text-xs text-rose-800 dark:text-rose-200 leading-relaxed flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-700 dark:text-rose-300 block mb-0.5">Academic Prototype Notice:</span>
              {summary.disclaimer}
            </div>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleStopAudio}
            className="w-full sm:w-auto btn-secondary text-xs flex items-center justify-center gap-2"
          >
            <VolumeX className="w-4 h-4 text-rose-500" />
            <span>Mute Siren Synthesizer</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto btn-primary text-xs"
          >
            Acknowledge & Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyResponseSummaryModal;
