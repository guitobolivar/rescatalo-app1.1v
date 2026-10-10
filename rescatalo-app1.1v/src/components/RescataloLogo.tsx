import React from 'react';

interface RescataloLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  withTagline?: boolean;
  className?: string;
}

export const RescataloLogo: React.FC<RescataloLogoProps> = ({
  size = 'md',
  withText = false,
  withTagline = false,
  className = '',
}) => {
  // Dimension definitions
  const dimensions = {
    xs: { box: 'w-7 h-7', svg: 20, text: 'text-sm', badge: 'text-[9px]' },
    sm: { box: 'w-9 h-9', svg: 24, text: 'text-base', badge: 'text-[10px]' },
    md: { box: 'w-11 h-11', svg: 30, text: 'text-lg', badge: 'text-[11px]' },
    lg: { box: 'w-14 h-14', svg: 38, text: 'text-2xl', badge: 'text-xs' },
    xl: { box: 'w-20 h-20', svg: 54, text: 'text-3xl', badge: 'text-xs' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* CREATIVE MINIMALIST 'R' EMBLEM WITH VIBRANT DYNAMIC GRADIENTS */}
      <div
        className={`${dimensions.box} relative rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 p-[2px] shadow-lg shadow-cyan-500/25 shrink-0 group transition-transform duration-300 hover:scale-105`}
      >
        <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center relative overflow-hidden backdrop-blur-xl">
          {/* Luminous dynamic ambient glow */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-400/30 blur-md rounded-full pointer-events-none" />
          <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-cyan-400/35 blur-md rounded-full pointer-events-none" />

          {/* Minimalist Geometric 'R' Vector with Speed & Delivery Flow */}
          <svg
            width={dimensions.svg}
            height={dimensions.svg}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transform transition-transform duration-300 group-hover:scale-105"
          >
            <defs>
              {/* Vibrant Emerald-Teal-Cyan Gradient */}
              <linearGradient id="r_main_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="45%" stopColor="#14B8A6" />
                <stop offset="80%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>

              {/* Dynamic Speed Leg Gradient */}
              <linearGradient id="r_leg_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A7F3D0" />
                <stop offset="60%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>

              {/* Glowing Bevel Highlight */}
              <linearGradient id="r_sheen_gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Aerodynamic Spine of the R */}
            <path
              d="M10 9C10 7.34315 11.3431 6 13 6H19C20.6569 6 22 7.34315 22 9V39C22 40.6569 20.6569 42 19 42H13C11.3431 42 10 40.6569 10 39V9Z"
              fill="url(#r_main_gradient)"
            />

            {/* Upper Loop of the R - Smooth Precision Curve */}
            <path
              d="M19 6H28C33.5228 6 38 10.4772 38 16C38 21.5228 33.5228 26 28 26H19V6Z"
              fill="url(#r_main_gradient)"
            />

            {/* Aerodynamic loop inner cutout */}
            <path
              d="M22 12H27.5C29.7091 12 31.5 13.7909 31.5 16C31.5 18.2091 29.7091 20 27.5 20H22V12Z"
              fill="#070b14"
            />

            {/* Dynamic Speed Kick Leg of the R - Swooshing Forward Like an Arrow / Moto Trail */}
            <path
              d="M23 23L33.2 39.5C33.8 40.5 35 41.2 36.2 41.2H39.5C40.8 41.2 41.6 39.8 40.9 38.7L30.2 22.2C28.2 22 25.4 22.4 23 23Z"
              fill="url(#r_leg_gradient)"
            />

            {/* Luminous speed spark / chevron accent */}
            <circle cx="36" cy="10" r="2" fill="#6EE7B7" />
            <path
              d="M32 8L35 11L38 8"
              stroke="#A7F3D0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          </svg>
        </div>
      </div>

      {/* TYPOGRAPHY WITH CUSTOM VIBRANT STYLING */}
      {withText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={`${dimensions.text} font-black tracking-tight text-white flex items-center font-sans drop-shadow-sm`}
            >
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                Rescátalo
              </span>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-black ml-0.5">
                .
              </span>
            </span>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-950/80 to-cyan-950/80 text-emerald-300 border border-emerald-500/40 uppercase tracking-widest shadow-xs">
              Oficial
            </span>
          </div>

          {withTagline && (
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
              Movilidad & Mandados · Venezuela
            </span>
          )}
        </div>
      )}
    </div>
  );
};
