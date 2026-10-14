import React from 'react';
import {
  Users,
  ShieldCheck,
  Calendar,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Activity,
  Car,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { RidoLogo } from '../components/RidoLogo';

interface LandingPageProps {
  setCurrentTab: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setCurrentTab }) => {
  const { demoLogin } = useAuth();

  const handleLaunchRole = async (role: UserRole, targetTab: string) => {
    await demoLogin(role);
    setCurrentTab(targetTab);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-blue-500/10 via-cyan-400/10 to-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Prominent RIDO Wordmark Logo */}
            <div className="flex justify-center mb-6">
              <RidoLogo size="xl" badgeText="SHRP 2.0" showTagline={false} />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
              Smart Rides. Seamless Journeys.
            </h1>

            <p className="mt-3 text-xs sm:text-sm font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 font-mono">
              Real-Time Ride Sharing & Fleet Management Platform
            </p>

            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
              A resilient corridor transit and fleet operations system featuring{' '}
              <span className="text-blue-600 dark:text-cyan-400 font-semibold">Self-Healing Ride Recovery (SHRP)</span>,{' '}
              <span className="text-cyan-600 dark:text-cyan-300 font-semibold">multi-factor confidence scoring</span>,{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">fairness budgets</span>, and{' '}
              <span className="text-amber-600 dark:text-amber-400 font-semibold">transparent XAI explanations</span>.
            </p>

            {/* Quick Demo Launchers */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleLaunchRole('PASSENGER', 'recovery')}
                className="btn-primary px-6 py-3.5 text-sm shadow-lg shadow-cyan-500/25 flex items-center gap-2.5 font-bold"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Launch Self-Healing Recovery</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleLaunchRole('PASSENGER', 'search')}
                className="btn-secondary px-4 py-3.5 text-sm font-semibold"
              >
                <span>Passenger Portal</span>
              </button>

              <button
                onClick={() => handleLaunchRole('DRIVER', 'driver')}
                className="btn-secondary px-4 py-3.5 text-sm font-semibold"
              >
                <span>Driver Console</span>
              </button>

              <button
                onClick={() => handleLaunchRole('FLEET_MANAGER', 'fleet')}
                className="btn-secondary px-4 py-3.5 text-sm font-semibold"
              >
                <span>Fleet Telematics</span>
              </button>

              <button
                onClick={() => handleLaunchRole('ADMIN', 'admin')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold text-sm transition-all shadow-sm"
              >
                <span>Admin Mission Control</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Novel Engineering Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Integrated Mobility Innovations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Engineered to eliminate empty-seat inefficiency, coordinate recurring commutes, and autonomously resolve live trip disruptions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Flagship Novelty Card: Self-Healing Ride Pooling */}
          <div className="surface-card p-6 sm:p-8 md:col-span-2 lg:col-span-3 border-2 border-cyan-500/40 dark:border-cyan-400/40 bg-gradient-to-br from-cyan-50/30 via-white to-blue-50/20 dark:from-[#111a2e] dark:via-[#131f38] dark:to-[#0f243b] shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Self-Healing Ride Pooling & Autonomous Recovery (SHRP)
                    </h3>
                    <span className="badge-cyan font-bold font-mono">
                      Flagship Core Innovation
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Multi-Objective Dynamic Resilience Framework with Explainable AI Decision Making
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleLaunchRole('PASSENGER', 'recovery')}
                className="btn-primary text-xs py-2.5 px-4 shrink-0 shadow-md shadow-cyan-500/25"
              >
                <span>Open Recovery Suite</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="surface-inset p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-blue-600 dark:text-cyan-400 font-bold block mb-1">Dynamic Confidence Scoring</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Multi-objective weighting (Deadline 0.35, Walking 0.30, Fare 0.20, Constraint 0.15) with strict bounded metrics.
                </p>
              </div>
              <div className="surface-inset p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-1">Multi-Trip Fairness Budget</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Historical delay burden tracking with exponential recency decay (λ = 0.8) preventing repeated passenger inconvenience.
                </p>
              </div>
              <div className="surface-inset p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-purple-600 dark:text-purple-400 font-bold block mb-1">Explainable AI (XAI)</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  Quantitative tradeoff justifications for accepted plans and explicit rule-based rejection diagnostics for discarded alternatives.
                </p>
              </div>
            </div>
          </div>

          {/* Card 1: Multi-Community Matching */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Community-Agnostic Matching</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              University students, faculty, tech park commuters, and travelers find compatible shared corridors based on route similarity, hubs, and institutional verification.
            </p>
          </div>

          {/* Card 2: Empty Seat Optimization */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Intelligent Empty-Seat Optimization</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Transparent multi-factor scoring evaluates pickup proximity and detour penalties while splitting vehicle costs equitably—saving up to 75% for passengers.
            </p>
          </div>

          {/* Card 3: Recurring Commute Planning */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Recurring Commute Planning</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Automated recurring schedules for daily lectures, lab shifts, and weekend shuttles with calendar management and automated seat reservations.
            </p>
          </div>

          {/* Card 4: Demand-Aware Fleet Allocation */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Demand-Aware Fleet Allocation</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Real-time analytics dashboard monitors high-demand campus corridors, peak lecture rush hours, and dynamically dispatches empty shuttles ahead of time.
            </p>
          </div>

          {/* Card 5: Full Telematics & Maintenance Lifecycle */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Integrated Vehicle Telematics</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tracks EV battery state of charge, tire pressure (PSI), engine temperatures, and odometer mileage with automated preventative maintenance triggers.
            </p>
          </div>

          {/* Card 6: Safety & Accountability Suite */}
          <div className="surface-card p-6 border border-slate-200 dark:border-slate-800">
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Safety & SOS Simulation Suite</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Cryptographic 4-digit start PIN verification, live simulated GPS tracking with access controls, audible emergency SOS panic drill, and 8-point dispatch transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Academic Disclaimer Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#090e1a]/80 py-6 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <RidoLogo size="sm" showTagline={true} />
        </div>
        <p className="font-semibold text-slate-700 dark:text-slate-400">
          © {new Date().getFullYear()} RIDO • Smart Rides. Seamless Journeys.
        </p>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Autonomous Corridor Transit & Fleet Operations Platform
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
