import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, Radio } from 'lucide-react';

interface SosConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const SosConfirmationModal: React.FC<SosConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="surface-card p-6 sm:p-7 rounded-2xl max-w-lg w-full border-2 border-rose-500/40 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
            <span className="badge-rose font-mono font-bold">
              SIMULATION CONFIRMATION
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-left space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Confirm Emergency SOS Panic Drill
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            You are about to trigger an emergency panic alert simulation. This will activate the safety siren, dispatch simulated distress alerts to campus security & your registered emergency contacts, and stream simulated GPS coordinates.
          </p>
        </div>

        {/* Academic Prototype Notice */}
        <div className="p-3.5 rounded-xl surface-inset border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-700 dark:text-amber-300 block mb-0.5">Academic Prototype Disclaimer:</span>
            All emergency actions operate <strong>strictly in simulation mode</strong>. Zero real cellular phone calls, live SMS texts, or real-world emergency services (911/112/police) will be contacted.
          </div>
        </div>

        {/* Checkbox Acknowledgment */}
        <div className="p-3.5 rounded-xl surface-inset border border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <input
            id="sos-ack-check"
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500"
          />
          <label htmlFor="sos-ack-check" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            I understand this is a <span className="font-bold text-slate-900 dark:text-white">safe educational drill simulation</span> and authorize RIDO to broadcast simulated distress telemetry.
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-1/2 btn-secondary justify-center"
          >
            Cancel Drill
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!acknowledged || loading}
            className="w-full sm:w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{loading ? 'Transmitting...' : 'Confirm & Broadcast SOS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SosConfirmationModal;
