'use client'

import { useId } from 'react';

interface OmosanyaLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export const OmosanyaLogo = ({
  className = 'h-11 w-11',
  showText = false,
  textClassName = '',
}: OmosanyaLogoProps) => {
  const id = useId();
  const bgId = `${id}-bg`;
  const lineId = `${id}-line`;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <svg
        className={`flex-shrink-0 ${className}`}
        viewBox="0 0 64 64"
        role="img"
        aria-label="Omosanya Home"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={bgId} x1="9" y1="7" x2="55" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#147c72" />
            <stop offset="1" stopColor="#0d3f3a" />
          </linearGradient>
          <linearGradient id={lineId} x1="16" y1="20" x2="50" y2="47" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f8faf6" />
            <stop offset="1" stopColor="#f3b33d" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="14" fill={`url(#${bgId})`} />
        <path
          d="M17 30.5 32 18l15 12.5"
          fill="none"
          stroke={`url(#${lineId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 30v17h22V30"
          fill="none"
          stroke="#f8faf6"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27 47V36h10v11"
          fill="none"
          stroke="#f3b33d"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="39" r="2.2" fill="#f8faf6" />
        <circle cx="32" cy="34" r="2.4" fill="#f8faf6" />
        <circle cx="40" cy="39" r="2.2" fill="#f8faf6" />
        <path
          d="M23 47c2.4-4.1 5.4-6.1 9-6.1s6.6 2 9 6.1"
          fill="none"
          stroke="#f3b33d"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <div className={`min-w-0 ${textClassName}`}>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5f6a64] dark:text-slate-500">Omosanya</p>
          <h2 className="kinboard-serif text-2xl leading-none text-[#18221f] dark:text-slate-100">Home</h2>
        </div>
      )}
    </div>
  );
};

export default OmosanyaLogo;
