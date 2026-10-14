import React, { useState } from 'react';
import { Sparkles, Zap, ShieldCheck, Clock, MapPin, Coffee, Car } from 'lucide-react';

interface AnimatedCommuterSceneProps {
  activeCharacter?: 'passenger' | 'driver' | 'carpool' | 'all';
  compact?: boolean;
}

export const AnimatedCommuterScene: React.FC<AnimatedCommuterSceneProps> = ({
  activeCharacter = 'all',
  compact = false,
}) => {
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [reactionBubble, setReactionBubble] = useState<string | null>(null);

  const triggerBoost = () => {
    setIsAccelerating(true);
    setReactionBubble('⚡ Express Route Activated: +14 mins saved!');
    setTimeout(() => {
      setIsAccelerating(false);
      setTimeout(() => setReactionBubble(null), 3000);
    }, 1500);
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-[#0b1329] to-[#070b14] border border-cyan-500/30 text-white shadow-xl ${compact ? 'h-48' : 'h-64 sm:h-72'}`}>
      {/* Night/Sunrise Sky with City Skyline Silhouette */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Glowing Aurora / Cyan Ambient Lighting */}
        <div className="absolute -top-12 left-1/3 w-80 h-32 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-8 right-10 w-60 h-28 bg-blue-600/20 rounded-full blur-2xl" />

        {/* City Skyline Silhouette SVG */}
        <svg
          viewBox="0 0 1000 180"
          className="absolute bottom-16 sm:bottom-20 w-full h-24 opacity-25 text-slate-700"
          preserveAspectRatio="none"
        >
          {/* Tech Park Buildings */}
          <rect x="20" y="80" width="40" height="100" fill="currentColor" />
          <rect x="70" y="50" width="55" height="130" fill="currentColor" />
          <rect x="135" y="90" width="35" height="90" fill="currentColor" />
          <rect x="180" y="30" width="70" height="150" fill="currentColor" />
          <rect x="260" y="70" width="45" height="110" fill="currentColor" />
          <rect x="315" y="100" width="50" height="80" fill="currentColor" />
          <rect x="375" y="40" width="60" height="140" fill="currentColor" />
          <rect x="445" y="60" width="80" height="120" fill="currentColor" />
          <rect x="535" y="20" width="65" height="160" fill="currentColor" />
          <rect x="610" y="85" width="50" height="95" fill="currentColor" />
          <rect x="670" y="45" width="75" height="135" fill="currentColor" />
          <rect x="755" y="75" width="45" height="105" fill="currentColor" />
          <rect x="810" y="35" width="70" height="145" fill="currentColor" />
          <rect x="890" y="90" width="90" height="90" fill="currentColor" />
        </svg>

        {/* Distant Stars / Transit Signal Dots */}
        <div className="absolute top-4 left-1/4 w-1 h-1 rounded-full bg-cyan-300 animate-ping" />
        <div className="absolute top-8 right-1/3 w-1.5 h-1.5 rounded-full bg-blue-400 opacity-60" />
        <div className="absolute top-12 right-1/4 w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* Floating Interactive Scenario Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-cyan-500/40 text-[10px] sm:text-xs font-mono font-bold text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Campus Corridor Telematics</span>
        </span>
        {reactionBubble && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white font-bold text-[10px] animate-bounce shadow-md">
            {reactionBubble}
          </span>
        )}
      </div>

      {/* Speed / Boost Action Button */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={triggerBoost}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-[10px] sm:text-xs font-bold text-cyan-200 transition-all shadow-sm active:scale-95"
          title="Simulate instant Rerouting Acceleration"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Speed Match</span>
        </button>
      </div>

      {/* Road & Sidewalk Environment */}
      <div className="absolute bottom-0 inset-x-0 h-20 sm:h-24 bg-gradient-to-t from-slate-950 to-slate-900 border-t border-slate-700/80">
        {/* Pedestrian Sidewalk with Street Tile Texture */}
        <div className="absolute top-0 inset-x-0 h-6 sm:h-7 bg-slate-800/90 border-b border-slate-700/60 flex items-center overflow-hidden">
          {/* Animated Sidewalk Streetlamp Posts */}
          <div className="flex w-[200%] animate-road-scroll">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 flex items-center justify-between px-6 opacity-40">
                <div className="w-0.5 h-4 bg-slate-600" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm shadow-amber-300/50" />
              </div>
            ))}
          </div>
        </div>

        {/* Asphalt Road Lane with Moving White Dashes */}
        <div className="absolute bottom-3 inset-x-0 h-10 sm:h-12 flex items-center overflow-hidden">
          <div className={`flex w-[200%] ${isAccelerating ? 'animate-road-fast' : 'animate-road-scroll'}`}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex-1 flex justify-center">
                <div className="w-8 sm:w-12 h-1 bg-cyan-400/80 rounded-full shadow-sm shadow-cyan-400/40" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ANIMATED COMMUTING CHARACTERS SCENE */}
      <div className="absolute bottom-3 sm:bottom-4 inset-x-0 z-10 pointer-events-none">
        {/* 1. ANIMATED ELECTRIC RIDESHARE SHUTTLE (RIDO-EV) */}
        <div
          className={`absolute left-4 sm:left-12 bottom-0 transition-transform duration-700 ${
            isAccelerating ? 'scale-105 translate-x-12 sm:translate-x-24' : 'translate-x-0'
          }`}
        >
          {/* Speech Bubble over the Shuttle */}
          <div className="absolute -top-12 left-10 sm:left-14 whitespace-nowrap px-2.5 py-1 rounded-xl bg-cyan-600/90 backdrop-blur-md text-[10px] font-bold text-white shadow-lg border border-cyan-300/40 animate-bounce">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-200" />
              <span>RIDO EV-04 • Picking up Alex</span>
            </span>
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-cyan-600/90 rotate-45" />
          </div>

          {/* Sleek Vector Car with Driver & Passenger Silhouettes */}
          <svg
            viewBox="0 0 240 100"
            className="w-44 sm:w-56 h-20 sm:h-24 drop-shadow-[0_10px_15px_rgba(6,182,212,0.35)]"
          >
            {/* Cyan Vehicle Underglow */}
            <ellipse cx="120" cy="85" rx="80" ry="8" fill="#06b6d4" opacity="0.4" />

            {/* Car Body Main Shape */}
            <path
              d="M 25 75 L 35 50 Q 55 35 90 32 L 155 32 Q 185 34 205 52 L 225 75 Q 230 82 220 84 L 30 84 Q 20 82 25 75 Z"
              fill="#0284c7"
            />
            {/* Aerodynamic Roof Accent & Gradient overlay */}
            <path
              d="M 60 48 L 95 34 L 150 34 L 180 48 Z"
              fill="#06b6d4"
              opacity="0.85"
            />

            {/* Car Windows (Driver & Passengers Inside) */}
            <path
              d="M 65 48 L 95 36 L 120 36 L 120 50 L 65 50 Z"
              fill="#0f172a"
              opacity="0.8"
            />
            <path
              d="M 125 50 L 125 36 L 150 36 L 175 48 L 125 50 Z"
              fill="#0f172a"
              opacity="0.8"
            />

            {/* DRIVER SILHOUETTE (in front window) */}
            <g className="animate-driver-bob">
              <circle cx="102" cy="42" r="5" fill="#fbcfe8" />
              <path d="M 96 50 C 96 46 108 46 108 50 Z" fill="#38bdf8" />
              {/* Hands steering */}
              <circle cx="112" cy="48" r="2" fill="#fbcfe8" />
            </g>

            {/* PASSENGER SILHOUETTE (in rear window) */}
            <g className="animate-passenger-bob">
              <circle cx="140" cy="43" r="4.5" fill="#fed7aa" />
              <path d="M 134 50 C 134 47 146 47 146 50 Z" fill="#34d399" />
              {/* Phone glowing screen */}
              <rect x="146" y="44" width="3" height="5" rx="0.5" fill="#38bdf8" />
            </g>

            {/* Car Doors & Chrome Detail Lines */}
            <line x1="122" y1="48" x2="122" y2="78" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
            <circle cx="115" cy="58" r="1.5" fill="#ffffff" />
            <circle cx="132" cy="58" r="1.5" fill="#ffffff" />

            {/* RIDO Wordmark on Vehicle Door */}
            <text
              x="125"
              y="72"
              fill="#ffffff"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
              letterSpacing="1"
            >
              RIDO
            </text>

            {/* Headlights casting forward beam */}
            <polygon
              points="225,65 240,60 240,78 220,78"
              fill="#ffffff"
            />
            <polygon
              points="225,65 260,50 260,85 220,78"
              fill="#38bdf8"
              opacity="0.25"
            />

            {/* Taillights */}
            <rect x="23" y="66" width="6" height="8" rx="2" fill="#f43f5e" />

            {/* FRONT WHEEL with Alloy Rim and Spinning Spokes */}
            <g transform="translate(180, 80)">
              <circle cx="0" cy="0" r="14" fill="#0f172a" />
              <circle cx="0" cy="0" r="10" fill="#334155" />
              <circle cx="0" cy="0" r="4" fill="#06b6d4" />
              <g className="animate-spin-wheel">
                <line x1="-8" y1="0" x2="8" y2="0" stroke="#94a3b8" strokeWidth="2" />
                <line x1="0" y1="-8" x2="0" y2="8" stroke="#94a3b8" strokeWidth="2" />
              </g>
            </g>

            {/* REAR WHEEL with Alloy Rim and Spinning Spokes */}
            <g transform="translate(60, 80)">
              <circle cx="0" cy="0" r="14" fill="#0f172a" />
              <circle cx="0" cy="0" r="10" fill="#334155" />
              <circle cx="0" cy="0" r="4" fill="#06b6d4" />
              <g className="animate-spin-wheel">
                <line x1="-8" y1="0" x2="8" y2="0" stroke="#94a3b8" strokeWidth="2" />
                <line x1="0" y1="-8" x2="0" y2="8" stroke="#94a3b8" strokeWidth="2" />
              </g>
            </g>
          </svg>
        </div>

        {/* 2. ANIMATED COMMUTER RUNNING ON SIDEWALK (Running Late to Work/Class) */}
        <div className="absolute right-6 sm:right-16 bottom-8 sm:bottom-9">
          {/* Speech Bubble above Commuter */}
          <div className="absolute -top-11 -left-12 sm:-left-16 whitespace-nowrap px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-[10px] shadow-lg border border-amber-300 animate-pulse">
            <span>🏃‍♂️ Late for 9:00 AM!</span>
            <div className="absolute -bottom-1 right-5 w-2 h-2 bg-amber-500 rotate-45" />
          </div>

          {/* Vector Running Commuter Character */}
          <svg viewBox="0 0 60 70" className="w-10 sm:w-12 h-14 sm:h-16 animate-runner-stride">
            {/* Backpack on back */}
            <rect x="14" y="24" width="10" height="15" rx="3" fill="#1e293b" />
            <rect x="15" y="28" width="8" height="3" rx="1" fill="#0284c7" />

            {/* Head & Hair */}
            <circle cx="30" cy="14" r="7" fill="#fed7aa" />
            <path d="M 23 13 Q 28 6 36 10 Q 38 14 36 17 L 30 15 Z" fill="#334155" />

            {/* Torso / Jacket */}
            <path d="M 23 21 L 37 21 L 34 38 L 26 38 Z" fill="#0284c7" />

            {/* Left Arm with Watch */}
            <path d="M 24 23 L 16 30 L 20 34" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="18" cy="32" r="1.5" fill="#f59e0b" />

            {/* Right Arm Holding Glowing Smartphone */}
            <path d="M 36 23 L 44 26 L 46 22" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="44" y="18" width="4" height="7" rx="1" fill="#06b6d4" className="animate-pulse" />

            {/* Legs with Athletic Running Cycle */}
            <g className="origin-[30px_38px] animate-leg-left">
              <path d="M 28 38 L 22 50 L 16 58" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <rect x="13" y="56" width="6" height="3.5" rx="1" fill="#f8fafc" />
            </g>
            <g className="origin-[30px_38px] animate-leg-right">
              <path d="M 32 38 L 40 48 L 46 56" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <rect x="44" y="54" width="6" height="3.5" rx="1" fill="#f8fafc" />
            </g>
          </svg>
        </div>
      </div>

      {/* Embedded Animation Styles */}
      <style>{`
        @keyframes roadScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes roadFast {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes spinWheel {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes runnerStride {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-4px) rotate(-2deg); }
        }
        @keyframes legLeft {
          0%, 100% { transform: rotate(25deg); }
          50% { transform: rotate(-30deg); }
        }
        @keyframes legRight {
          0%, 100% { transform: rotate(-25deg); }
          50% { transform: rotate(30deg); }
        }
        @keyframes driverBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes passengerBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        .animate-road-scroll {
          animation: roadScroll 4s linear infinite;
        }
        .animate-road-fast {
          animation: roadFast 1.5s linear infinite;
        }
        .animate-spin-wheel {
          animation: spinWheel 0.6s linear infinite;
        }
        .animate-runner-stride {
          animation: runnerStride 0.4s ease-in-out infinite;
        }
        .animate-leg-left {
          animation: legLeft 0.4s ease-in-out infinite;
        }
        .animate-leg-right {
          animation: legRight 0.4s ease-in-out infinite;
        }
        .animate-driver-bob {
          animation: driverBob 1.2s ease-in-out infinite;
        }
        .animate-passenger-bob {
          animation: passengerBob 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
