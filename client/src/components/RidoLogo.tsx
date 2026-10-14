import React from 'react';

interface RidoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  badgeText?: string;
}

export const RidoLogo: React.FC<RidoLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
  badgeText,
}) => {
  // Sizing definitions
  const iconSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-13 h-13 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  const svgSizes = {
    sm: 18,
    md: 22,
    lg: 28,
    xl: 36,
  };

  const titleSizes = {
    sm: 'text-base font-black',
    md: 'text-lg font-black',
    lg: 'text-2xl font-black',
    xl: 'text-4xl font-black',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic Emblem / Mark */}
      <div
        className={`${iconSizes[size]} bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 transition-transform hover:scale-105`}
      >
        <svg
          width={svgSizes[size]}
          height={svgSizes[size]}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized Modern Ride Mark */}
          <path
            d="M4 16L9 4L15 4L20 16"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 12H17.5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="9" cy="18" r="2" fill="white" />
          <circle cx="15" cy="18" r="2" fill="white" />
          <circle cx="19" cy="5" r="1.5" fill="#a5f3fc" />
        </svg>
      </div>

      {/* Wordmark Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`${titleSizes[size]} tracking-tight text-slate-900 dark:text-white`}
          >
            RIDO
          </span>

          {badgeText && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/10 dark:bg-cyan-400/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
              {badgeText}
            </span>
          )}
        </div>

        {showTagline && (
          <p
            className={`${taglineSizes[size]} text-slate-500 dark:text-slate-400 font-medium tracking-normal mt-0.5 leading-tight`}
          >
            Smart Rides. Seamless Journeys.
          </p>
        )}
      </div>
    </div>
  );
};

export default RidoLogo;
