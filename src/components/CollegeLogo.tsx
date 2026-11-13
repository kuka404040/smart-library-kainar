import React, { useState } from 'react';
import { BookOpen, GraduationCap, Sparkles } from 'lucide-react';

interface CollegeLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

export const CollegeLogo: React.FC<CollegeLogoProps> = ({
  className = '',
  size = 'md',
  showLabel = false,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  // Preferred logo paths that user can place in /public/images/
  // The system checks /images/kainar-logo.png first.
  const logoSrc = '/images/kainar-logo.png';

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title="Қайнар жоғары колледжі — Семей"
    >
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#13223d] via-[#0c1628] to-[#070d18] border border-[#d4af37]/45 shadow-[0_0_20px_rgba(212,175,55,0.2)] group-hover:border-[#d4af37] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.35)] transition-all overflow-hidden shrink-0 ${sizeClasses[size]}`}
      >
        {/* Subtle golden ambient background glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#d4af37]/15 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

        {!imageError ? (
          <img
            src={logoSrc}
            alt="Қайнар жоғары колледжі логотипі"
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
          />
        ) : (
          /* Neutral, high-fidelity college emblem placeholder when user hasn't added kainar-logo.png yet */
          <div className="relative flex flex-col items-center justify-center w-full h-full p-1 select-none">
            {/* Laurel/Academic Crest Icon */}
            <div className="relative flex items-center justify-center">
              <BookOpen className={`${iconSizes[size]} text-[#f3c68f] group-hover:scale-110 transition-transform`} />
              <GraduationCap className="w-2.5 h-2.5 text-[#d4af37] absolute -top-1 -right-1" />
            </div>
            {size !== 'sm' && (
              <span className="text-[8px] font-extrabold tracking-widest text-[#d4af37] font-mono leading-none mt-0.5">
                LOGO
              </span>
            )}
          </div>
        )}

        {/* Live indicator pip */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]" />
        </span>
      </div>

      {showLabel && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-serif-title text-sm sm:text-base font-bold text-white tracking-wide">
              ҚАЙНАР КОЛЛЕДЖІ
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#182846] text-[#d4af37] border border-[#d4af37]/30 font-semibold uppercase">
              Семей
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-light">
            Smart Library · Цифрлық қор
          </p>
        </div>
      )}
    </div>
  );
};
