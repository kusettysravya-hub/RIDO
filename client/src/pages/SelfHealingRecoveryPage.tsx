import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Navigation,
  IndianRupee,
  Sliders,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  MapPin,
  TrendingDown,
  Info,
  Check,
  X,
  ArrowRight,
  Cpu,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DisruptionEvent,
  RecoveryPlan,
  PassengerConstraint,
  XAIExplanation,
} from '../types';

export const SelfHealingRecoveryPage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [activeDisruption, setActiveDisruption] = useState<DisruptionEvent | null>(null);
  const [candidatePlans, setCandidatePlans] = useState<RecoveryPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<RecoveryPlan | null>(null);
  const [xaiReport, setXaiReport] = useState<XAIExplanation | null>(null);
  const [constraints, setConstraints] = useState<PassengerConstraint | null>(null);
  const [showConstraintDrawer, setShowConstraintDrawer] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Constraint edit state
  const [editWaitMin, setEditWaitMin] = useState(12);
  const [editDetourKm, setEditDetourKm] = useState(3.0);
  const [editFareInr, setEditFareInr] = useState(50.0);
  const [editWalkM, setEditWalkM] = useState(300);
  const [editCommunity, setEditCommunity] = useState('CORPORATE_EMPLOYEE');

  // Load initial constraints & recent disruptions
  useEffect(() => {
    fetchConstraints();
    fetchRecentDisruptions();
  }, []);

  const fetchConstraints = async () => {
    try {
      const res = await api.get('/api/recovery/constraints');
      setConstraints(res.data);
      setEditWaitMin(res.data.max_wait_time_min);
      setEditDetourKm(res.data.max_detour_km);
      setEditFareInr(res.data.max_fare_tolerance_inr);
      setEditWalkM(res.data.walking_tolerance_m);
      setEditCommunity(res.data.community_segment);
    } catch (err) {
      console.error('Error loading passenger constraints', err);
    }
  };

  const fetchRecentDisruptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/recovery/disruptions?limit=1');
      if (res.data && res.data.length > 0) {
        const latest = res.data[0];
        setActiveDisruption(latest);
        await fetchPlansForDisruption(latest.id);
      } else {
        // Auto-seed a demonstration disruption so faculty immediately sees the full UI
        await handleSimulateDisruption(
          'DRIVER_CANCEL',
          'HIGH',
          'Driver cancelled mid-commute due to vehicle mechanical fault'
        );
      }
    } catch (err) {
      console.error('Error loading disruptions', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlansForDisruption = async (disruptionId: string) => {
    try {
      const res = await api.get(`/api/recovery/disruptions/${disruptionId}/plans`);
      setCandidatePlans(res.data.plans || []);
      setSelectedPlan(res.data.selected_plan || (res.data.plans ? res.data.plans[0] : null));
      setXaiReport(res.data.xai_explanation || null);
    } catch (err) {
      console.error('Error fetching recovery plans', err);
    }
  };

  // Trigger on-demand disruption simulation
  const handleSimulateDisruption = async (type: string, severity: string, details: string) => {
    setLoading(true);
    setActionSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await api.post('/api/recovery/disruptions', {
        disruption_type: type,
        severity: severity,
        details: details,
      });

      setActiveDisruption(res.data.disruption);
      setCandidatePlans(res.data.plans || []);
      setSelectedPlan(res.data.selected_plan || (res.data.plans ? res.data.plans[0] : null));
      if (res.data.xai_explanation) {
        setXaiReport(res.data.xai_explanation);
      }
      setActionSuccessMessage(`Disruption '${type}' injected and evaluated. Self-healing plans generated.`);

      if (!res.data.xai_explanation && res.data.disruption?.id) {
        await fetchPlansForDisruption(res.data.disruption.id);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to simulate disruption');
    } finally {
      setLoading(false);
    }
  };

  // Accept a recovery plan
  const handleAcceptPlan = async (planId: string) => {
    try {
      setLoading(true);
      const res = await api.post(`/api/recovery/plans/${planId}/accept`);
      setActionSuccessMessage(res.data.message || 'Recovery plan activated successfully.');
      if (activeDisruption) {
        fetchPlansForDisruption(activeDisruption.id);
      }
      fetchConstraints();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Error accepting plan');
    } finally {
      setLoading(false);
    }
  };

  // Reject a recovery plan
  const handleRejectPlan = async (planId: string) => {
    try {
      setLoading(true);
      const res = await api.post(`/api/recovery/plans/${planId}/reject`);
      setActionSuccessMessage(res.data.message || 'Plan rejected. Emergency solo voucher prepared.');
      if (activeDisruption) {
        fetchPlansForDisruption(activeDisruption.id);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Error rejecting plan');
    } finally {
      setLoading(false);
    }
  };

  // Save updated constraints
  const handleSaveConstraints = async () => {
    try {
      const res = await api.put('/api/recovery/constraints', {
        max_wait_time_min: editWaitMin,
        max_detour_km: editDetourKm,
        max_fare_tolerance_inr: editFareInr,
        walking_tolerance_m: editWalkM,
        community_segment: editCommunity,
      });
      setConstraints(res.data);
      setShowConstraintDrawer(false);
      setActionSuccessMessage('Personal tolerance limits updated in INR (₹).');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to update constraints');
    }
  };

  // Helper for severity styling
  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="badge-rose font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block mr-1" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="badge-rose font-semibold">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="badge-amber font-semibold">
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="badge-emerald font-semibold">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Flagship Hero Header */}
      <div className="surface-card p-6 sm:p-8 rounded-2xl relative overflow-hidden border-2 border-cyan-500/20 dark:border-cyan-400/20 bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/40 dark:from-[#111a2e] dark:via-[#111a2e] dark:to-[#0d2238] shadow-lg">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-400/10 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold shadow-sm shadow-blue-500/30">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>FLAGSHIP INNOVATION: SHRP PROTOCOL</span>
              </div>
              <span className="badge-blue font-mono text-[11px] font-bold">
                RIDO SHRP 2.0 Engine
              </span>
              <span className="badge-cyan font-mono text-[11px] font-bold">
                Explainable AI (XAI)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Self-Healing Disruption & Recovery Center
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Autonomous multi-agent recovery engine for university campus and urban commute corridors.
              Detects vehicle breakdowns, driver cancellations, and traffic surges in real-time—dynamically
              rebalancing shared ride pools within strict passenger tolerance boundaries.
            </p>
          </div>

          {/* Tolerance Configuration Button & Status Controls */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <button
              onClick={() => setShowConstraintDrawer(true)}
              className="btn-secondary flex items-center gap-2 text-xs font-semibold px-4 py-2.5 shadow-sm"
            >
              <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Tolerance Limits</span>
            </button>
            <button
              onClick={() => fetchRecentDisruptions()}
              disabled={loading}
              className="btn-secondary p-2.5 shadow-sm"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`} />
            </button>
          </div>
        </div>

        {/* Real-Time Visual Workflow Pipeline Indicator */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Autonomous Recovery Lifecycle: 5-Stage Execution Pipeline</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {[
              { step: '1. DETECT', desc: 'Anomaly Sensing', active: true, color: 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10' },
              { step: '2. GENERATE', desc: 'Candidate Reroutes', active: true, color: 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10' },
              { step: '3. EVALUATE', desc: 'Tolerance Bounds', active: true, color: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
              { step: '4. EXPLAIN', desc: 'Transparent XAI', active: true, color: 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10' },
              { step: '5. APPLY', desc: 'Dynamic Dispatch', active: selectedPlan?.status === 'ACCEPTED', color: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
            ].map((st, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col justify-between ${
                  st.active
                    ? `${st.color} shadow-sm`
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] font-bold tracking-tight">
                    {st.step}
                  </span>
                  {st.active ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  {st.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-medium animate-in fade-in duration-200 shadow-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-medium animate-in fade-in duration-200 shadow-sm">
          <XCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 9 Disruption Scenario Simulation Toolbar */}
      <div className="surface-card p-6 sm:p-7 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Disruption Simulation Engine (9 Real-World Scenarios)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trigger real-time incidents to test autonomous multi-agent healing:
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold bg-cyan-50 dark:bg-cyan-950/30 px-2.5 py-1 rounded-md border border-cyan-500/20 self-start sm:self-auto">
            Interactive Testbed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {/* 1. Passenger Cancel */}
          <button
            onClick={() => handleSimulateDisruption('PASSENGER_CANCEL', 'MEDIUM', 'Passenger cancelled 2 minutes before pickup')}
            className="p-4 rounded-xl surface-inset hover:border-amber-400 dark:hover:border-amber-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                1. Passenger Cancel
              </span>
              <span className="badge-amber text-[10px]">MEDIUM</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Seat substitution & fare lock protection
            </p>
          </button>

          {/* 2. Driver Cancel */}
          <button
            onClick={() => handleSimulateDisruption('DRIVER_CANCEL', 'HIGH', 'Driver cancelled due to mechanical issue')}
            className="p-4 rounded-xl surface-inset hover:border-rose-400 dark:hover:border-rose-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                2. Driver Cancel
              </span>
              <span className="badge-rose text-[10px]">HIGH</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Adjacent shuttle transfer protocol
            </p>
          </button>

          {/* 3. Vehicle Breakdown */}
          <button
            onClick={() => handleSimulateDisruption('VEHICLE_BREAKDOWN', 'CRITICAL', 'EV battery inverter temperature alert near Outer Ring Road')}
            className="p-4 rounded-xl surface-inset hover:border-rose-500 dark:hover:border-rose-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                3. Vehicle Breakdown
              </span>
              <span className="badge-rose text-[10px] font-bold">CRITICAL</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Emergency campus fleet partition
            </p>
          </button>

          {/* 4. Passenger Delay */}
          <button
            onClick={() => handleSimulateDisruption('PASSENGER_DELAY', 'MEDIUM', 'Co-rider notified 4 min delay at pickup')}
            className="p-4 rounded-xl surface-inset hover:border-amber-400 dark:hover:border-amber-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                4. Passenger Delay
              </span>
              <span className="badge-amber text-[10px]">MEDIUM</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Slack check vs class arrival deadline
            </p>
          </button>

          {/* 5. Driver Delay */}
          <button
            onClick={() => handleSimulateDisruption('DRIVER_DELAY', 'MEDIUM', 'Traffic congestion on arterial flyover (+6 min)')}
            className="p-4 rounded-xl surface-inset hover:border-amber-400 dark:hover:border-amber-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                5. Driver Delay
              </span>
              <span className="badge-amber text-[10px]">MEDIUM</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Secondary corridor detour calculation
            </p>
          </button>

          {/* 6. Road Closure */}
          <button
            onClick={() => handleSimulateDisruption('ROUTE_CHANGE', 'MEDIUM', 'Metro construction roadwork blocked sector gate')}
            className="p-4 rounded-xl surface-inset hover:border-blue-400 dark:hover:border-blue-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                6. Road Closure
              </span>
              <span className="badge-blue text-[10px]">MEDIUM</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Waypoint re-clustering & path detour
            </p>
          </button>

          {/* 7. On-Route Pooling */}
          <button
            onClick={() => handleSimulateDisruption('NEW_PASSENGER_REQUEST', 'LOW', 'En-route pickup requested along corridor')}
            className="p-4 rounded-xl surface-inset hover:border-emerald-400 dark:hover:border-emerald-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                7. On-Route Pooling
              </span>
              <span className="badge-emerald text-[10px]">LOW / POOL</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Inserts passenger, reduces split fare
            </p>
          </button>

          {/* 8. Seat Shortage */}
          <button
            onClick={() => handleSimulateDisruption('SEAT_SHORTAGE', 'HIGH', 'Peak shift surge exceeded 4-seat capacity')}
            className="p-4 rounded-xl surface-inset hover:border-amber-500 dark:hover:border-amber-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                8. Seat Shortage
              </span>
              <span className="badge-rose text-[10px]">HIGH</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Synchronized multi-vehicle pool split
            </p>
          </button>

          {/* 9. Meetup Optimization */}
          <button
            onClick={() => handleSimulateDisruption('ALTERNATIVE_PICKUP', 'LOW', 'U-turn would add 2.2 km: 190m walking suggested')}
            className="p-4 rounded-xl surface-inset hover:border-cyan-400 dark:hover:border-cyan-500 text-left transition-all group hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                9. Meetup Optimization
              </span>
              <span className="badge-cyan text-[10px]">MICRO-WALK</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Walking meetup with rebate discount
            </p>
          </button>
        </div>
      </div>

      {/* Disruption Status & Self-Healing Decision Center */}
      {activeDisruption ? (
        <div className="surface-card p-6 sm:p-7 rounded-2xl space-y-6">
          {/* Active Disruption Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeDisruption.disruption_type.replace(/_/g, ' ')}
                  </span>
                  {getSeverityBadge(activeDisruption.severity)}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Status: <span className="badge-emerald">{activeDisruption.status}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                  {activeDisruption.disruption_details || 'Operational disruption detected along commute trajectory.'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <div>Incident Ref: <span className="font-mono font-bold text-slate-900 dark:text-slate-200">#{activeDisruption.id.slice(0, 8)}</span></div>
              <div className="text-[11px] mt-0.5">{new Date(activeDisruption.created_at).toLocaleTimeString()}</div>
            </div>
          </div>

          {/* Selected / Recommended Recovery Plan Card - Prominent Showcase */}
          {selectedPlan && (
            <div className="surface-card p-6 sm:p-7 rounded-2xl border-2 border-cyan-500/50 dark:border-cyan-400/50 bg-gradient-to-br from-cyan-50/20 via-white to-blue-50/20 dark:from-[#111a2e] dark:via-[#131f38] dark:to-[#0f243b] shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20 dark:border-cyan-400/20">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>RECOMMENDED PLAN: {selectedPlan.action_type.replace(/_/g, ' ')}</span>
                  </div>
                  {selectedPlan.is_feasible ? (
                    <span className="badge-emerald font-semibold">
                      <Check className="w-3.5 h-3.5 mr-1" /> Constraints Satisfied
                    </span>
                  ) : (
                    <span className="badge-rose font-semibold">
                      <X className="w-3.5 h-3.5 mr-1" /> Constraint Violation
                    </span>
                  )}
                </div>

                {/* Acceptance & Rejection Actions */}
                <div className="flex items-center gap-2.5">
                  {selectedPlan.status === 'PROPOSED' && (
                    <>
                      <button
                        onClick={() => handleAcceptPlan(selectedPlan.id)}
                        disabled={loading}
                        className="btn-primary text-xs flex items-center gap-2 shadow-md shadow-cyan-500/30"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accept & Apply Plan</span>
                      </button>
                      <button
                        onClick={() => handleRejectPlan(selectedPlan.id)}
                        disabled={loading}
                        className="btn-secondary text-xs"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {selectedPlan.status === 'ACCEPTED' && (
                    <span className="badge-emerald text-xs px-3 py-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Activated & Dispatched
                    </span>
                  )}
                  {selectedPlan.status === 'REJECTED' && (
                    <span className="badge-rose text-xs px-3 py-1 font-bold">
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Rejected (Solo Voucher Issued)
                    </span>
                  )}
                </div>
              </div>

              {/* 4 Quantitative Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl surface-inset space-y-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Wait Delta</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                    +{selectedPlan.wait_delta_min} min
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tolerance: ≤{constraints?.max_wait_time_min || 12}m
                  </div>
                </div>

                <div className="p-4 rounded-xl surface-inset space-y-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <Navigation className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Detour Added</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {selectedPlan.detour_delta_km > 0 ? `+${selectedPlan.detour_delta_km.toFixed(1)}` : selectedPlan.detour_delta_km.toFixed(1)} km
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tolerance: ≤{constraints?.max_detour_km || 3.0}km
                  </div>
                </div>

                <div className="p-4 rounded-xl surface-inset space-y-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Fare Delta</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {selectedPlan.fare_delta_inr <= 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">-₹{Math.abs(selectedPlan.fare_delta_inr).toFixed(2)}</span>
                    ) : (
                      <span className="text-slate-900 dark:text-slate-200">+₹{selectedPlan.fare_delta_inr.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tolerance: ≤₹{constraints?.max_fare_tolerance_inr || 50.0}
                  </div>
                </div>

                <div className="p-4 rounded-xl surface-inset space-y-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Walking Meetup</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {selectedPlan.walking_distance_m} m
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tolerance: ≤{constraints?.walking_tolerance_m || 300}m
                  </div>
                </div>
              </div>

              {/* Dynamic Confidence & Multi-Trip Fairness Progress Bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl surface-inset space-y-2.5 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Dynamic Confidence Score
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {Math.round(selectedPlan.confidence_score * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.round(selectedPlan.confidence_score * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between font-mono">
                    <span>Deadline: 35% | Walking: 30%</span>
                    <span>Fare: 20% | Constraints: 15%</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl surface-inset space-y-2.5 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Multi-Trip Fairness Index (Recency Decay)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {Math.round(selectedPlan.fairness_score * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.round(selectedPlan.fairness_score * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between font-mono">
                    <span>Prior Delay Burden: {constraints?.historical_burden_min || 0}m</span>
                    <span>Decay Factor λ: 0.8/day</span>
                  </div>
                </div>
              </div>

              {/* Explainable AI Transparent Narrative */}
              <div className="p-4 sm:p-5 rounded-xl surface-inset space-y-3 border border-cyan-500/20 dark:border-cyan-400/20 bg-cyan-50/30 dark:bg-cyan-950/20">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                  <Info className="w-4 h-4" />
                  <span>Explainable Decision Rationale (XAI Engine)</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {xaiReport?.explanation_narrative || selectedPlan.explanation_summary}
                </p>

                {/* Bullets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  {selectedPlan.explanation_bullets?.map((bullet, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <ChevronRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rejected / Alternative Plans Comparison */}
          {xaiReport && xaiReport.rejected_alternatives && xaiReport.rejected_alternatives.length > 0 && (
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Evaluated Alternative Options ({xaiReport.rejected_alternatives.length} Candidate Plans)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {xaiReport.rejected_alternatives.map((alt, idx) => (
                  <div key={idx} className="p-4 rounded-xl surface-inset space-y-2.5 text-xs border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-200">
                        {alt.action_type.replace(/_/g, ' ')}
                      </span>
                      <span className="badge-rose text-[10px] font-mono font-bold">
                        REJECTED: {alt.rejected_constraint.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Reason: </span>
                      {alt.rejection_reason}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span>Actual: <strong className="text-slate-800 dark:text-slate-200">{alt.actual_value}</strong></span>
                      <span>Allowed: <strong className="text-slate-800 dark:text-slate-200">{alt.allowed_value}</strong></span>
                      <span>Score: <strong className="text-cyan-600 dark:text-cyan-400">{Math.round(alt.confidence_score * 100)}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="surface-card p-12 text-center rounded-2xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">System in Dynamic Equilibrium</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            No active disruptions detected across the mobility network. Shuttles and shared pools are operating on scheduled trajectories. Use the simulation toolbar above to trigger a test disruption.
          </p>
        </div>
      )}

      {/* Passenger Constraint Configurator Modal */}
      {showConstraintDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="surface-card p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Personal Tolerance Limits (INR ₹)</h3>
              </div>
              <button
                onClick={() => setShowConstraintDrawer(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Max Wait Time */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Max Acceptable Waiting Time:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{editWaitMin} min</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={editWaitMin}
                  onChange={(e) => setEditWaitMin(Number(e.target.value))}
                  className="w-full accent-cyan-600"
                />
              </div>

              {/* Max Detour */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Max Acceptable Detour Distance:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{editDetourKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={editDetourKm}
                  onChange={(e) => setEditDetourKm(Number(e.target.value))}
                  className="w-full accent-cyan-600"
                />
              </div>

              {/* Max Fare Tolerance in INR */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Max Fare Change Tolerance (₹ INR):</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">₹{editFareInr.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={editFareInr}
                  onChange={(e) => setEditFareInr(Number(e.target.value))}
                  className="w-full accent-cyan-600"
                />
              </div>

              {/* Walking Distance */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Max Meetup Walking Distance:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{editWalkM} m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="800"
                  step="50"
                  value={editWalkM}
                  onChange={(e) => setEditWalkM(Number(e.target.value))}
                  className="w-full accent-cyan-600"
                />
              </div>

              {/* Community Segment */}
              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-medium">Community Commute Segment:</label>
                <select
                  value={editCommunity}
                  onChange={(e) => setEditCommunity(e.target.value)}
                  className="input-field"
                >
                  <option value="GENERAL_PUBLIC">General Urban Commuter</option>
                  <option value="CORPORATE_EMPLOYEE">Corporate / Tech Park Employee</option>
                  <option value="CAMPUS_STUDENT">Higher-Ed Student / Faculty</option>
                  <option value="AIRPORT_TRAVELER">Airport & Transit Traveler</option>
                </select>
              </div>

              {/* Historical Delay Burden display */}
              {constraints && (
                <div className="p-3.5 surface-inset rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Past Cumulative Delay:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{constraints.cumulative_delay_min.toFixed(1)} min</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Recency Decayed Burden:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{constraints.historical_burden_min.toFixed(1)} min</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3.5 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowConstraintDrawer(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConstraints}
                className="btn-primary"
              >
                Save Limits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfHealingRecoveryPage;
