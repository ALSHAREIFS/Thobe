import React from 'react';

interface IconProps {
  className?: string;
  selected?: boolean;
}

// 1. COLLAR ICONS
export const CollarRegularIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Body base */}
    <path d="M20 90 L20 45 L35 30 L65 30 L80 45 L80 90 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Center Placket */}
    <path d="M46 30 L46 90 M54 30 L54 90" stroke={selected ? '#B45309' : '#94A3B8'} strokeWidth="1.5" strokeDasharray="3 2" />
    {/* Traditional Qallab Folded Collar Wings */}
    <path d="M35 30 L50 48 L65 30" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="3" strokeLinejoin="round" />
    <path d="M35 30 L22 18 L50 24 L78 18 L65 30" fill={selected ? '#FEF3C7' : '#FFFFFF'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" strokeLinejoin="round" />
    {/* Buttons */}
    <circle cx="50" cy="38" r="2" fill={selected ? '#92400E' : '#475569'} />
    <circle cx="50" cy="58" r="2" fill={selected ? '#92400E' : '#475569'} />
  </svg>
);

export const CollarMandarinIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 90 L20 45 L35 30 L65 30 L80 45 L80 90 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    <path d="M46 30 L46 90 M54 30 L54 90" stroke={selected ? '#B45309' : '#94A3B8'} strokeWidth="1.5" strokeDasharray="3 2" />
    {/* Mandarin Stand Collar */}
    <path d="M36 30 C36 18, 64 18, 64 30 Z" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" />
    <path d="M49 18 L49 30" stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" />
    <circle cx="53" cy="24" r="2" fill={selected ? '#92400E' : '#475569'} />
  </svg>
);

export const CollarRoyalIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 90 L20 45 L35 30 L65 30 L80 45 L80 90 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Extra High Royal Stand + Wide Fold */}
    <path d="M32 30 L50 54 L68 30" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="3" strokeLinejoin="round" />
    <path d="M32 30 L16 12 L50 20 L84 12 L68 30" fill={selected ? '#FEF3C7' : '#FFFFFF'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="50" cy="38" r="2.5" fill={selected ? '#92400E' : '#475569'} />
    <circle cx="50" cy="46" r="2.5" fill={selected ? '#92400E' : '#475569'} />
  </svg>
);

export const CollarKuwaitiIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 90 L20 45 L35 30 L65 30 L80 45 L80 90 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Kuwaiti Wide angled Collar */}
    <path d="M32 28 C40 38, 60 38, 68 28 L60 14 C50 18, 50 18, 40 14 Z" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" />
    <circle cx="50" cy="46" r="2" fill={selected ? '#92400E' : '#475569'} />
  </svg>
);

export const CollarRoundIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 90 L20 45 L35 30 L65 30 L80 45 L80 90 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Round neck (Emirati Kandora Style) */}
    <path d="M35 30 C35 48, 65 48, 65 30" fill="none" stroke={selected ? '#92400E' : '#334155'} strokeWidth="3" />
    {/* Tassel / Tarboosha */}
    <path d="M50 48 L50 72" stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2" />
    <circle cx="50" cy="74" r="3" fill={selected ? '#B45309' : '#64748B'} />
  </svg>
);

// 2. SLEEVE & CUFF ICONS
export const CuffChamferedIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Sleeve arm */}
    <path d="M25 15 L32 60 L68 60 L75 15 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Chamfered (مشطوف) Cuff */}
    <path d="M28 60 L72 60 L76 75 L70 85 L30 85 L24 75 Z" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" strokeLinejoin="round" />
    {/* Cufflink holes */}
    <rect x="44" y="69" width="12" height="4" rx="2" fill={selected ? '#92400E' : '#475569'} />
  </svg>
);

export const CuffSquareIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M25 15 L32 60 L68 60 L75 15 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Square Cuff */}
    <rect x="26" y="60" width="48" height="25" rx="1" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" />
    <rect x="44" y="70" width="12" height="4" rx="2" fill={selected ? '#92400E' : '#475569'} />
  </svg>
);

export const CuffRoundIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M25 15 L32 60 L68 60 L75 15 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Rounded Edge Cuff */}
    <path d="M28 60 L72 60 L74 72 C74 82, 66 85, 50 85 C34 85, 26 82, 26 72 Z" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" />
    <rect x="44" y="70" width="12" height="4" rx="2" fill={selected ? '#92400E' : '#475569'} />
  </svg>
);

export const SleevePlainIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Straight Plain Sleeve */}
    <path d="M25 15 L30 85 L70 85 L75 15 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Plain hem line */}
    <path d="M30 78 L70 78" stroke={selected ? '#92400E' : '#94A3B8'} strokeWidth="1.5" strokeDasharray="3 2" />
  </svg>
);

export const SleeveElasticIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M25 15 L32 65 L68 65 L75 15 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2.5" />
    {/* Elastic bands */}
    <rect x="33" y="65" width="34" height="18" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" />
    <path d="M35 70 L65 70 M35 75 L65 75 M35 80 L65 80" stroke={selected ? '#92400E' : '#64748B'} strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

// 3. POCKET ICONS
export const PocketChamferedIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Background fabric */}
    <rect x="15" y="15" width="70" height="70" rx="4" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#FDE68A' : '#E2E8F0'} />
    {/* Chamfered Pocket Shape */}
    <path d="M30 30 L70 30 L70 65 L60 78 L40 78 L30 65 Z" fill={selected ? '#FDE68A' : '#FFFFFF'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" strokeLinejoin="round" />
    {/* Pen Slot Divider */}
    <path d="M40 30 L40 50" stroke={selected ? '#B45309' : '#94A3B8'} strokeWidth="1.5" strokeDasharray="2 2" />
  </svg>
);

export const PocketSquareIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="15" y="15" width="70" height="70" rx="4" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#FDE68A' : '#E2E8F0'} />
    {/* Straight Square Pocket */}
    <rect x="30" y="30" width="40" height="45" rx="1" fill={selected ? '#FDE68A' : '#FFFFFF'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2.5" />
    <path d="M40 30 L40 48" stroke={selected ? '#B45309' : '#94A3B8'} strokeWidth="1.5" strokeDasharray="2 2" />
  </svg>
);

export const PocketFlapIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="15" y="15" width="70" height="70" rx="4" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#FDE68A' : '#E2E8F0'} />
    <rect x="30" y="38" width="40" height="38" fill={selected ? '#FDE68A' : '#FFFFFF'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" />
    {/* Flap Cover */}
    <path d="M28 32 L72 32 L68 45 L50 52 L32 45 Z" fill={selected ? '#F59E0B' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" strokeLinejoin="round" />
    <circle cx="50" cy="42" r="2" fill={selected ? '#FFFFFF' : '#475569'} />
  </svg>
);

// 4. CHEST PLACKET (الجبزور) ICONS
export const PlacketVisibleIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="20" y="10" width="60" height="80" rx="3" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#FDE68A' : '#E2E8F0'} />
    {/* Placket Band */}
    <rect x="42" y="10" width="16" height="65" fill={selected ? '#FDE68A' : '#FFFFFF'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" />
    {/* Visible Buttons */}
    <circle cx="50" cy="22" r="2.5" fill={selected ? '#92400E' : '#334155'} />
    <circle cx="50" cy="38" r="2.5" fill={selected ? '#92400E' : '#334155'} />
    <circle cx="50" cy="54" r="2.5" fill={selected ? '#92400E' : '#334155'} />
    <path d="M42 75 L50 82 L58 75 Z" fill={selected ? '#FDE68A' : '#FFFFFF'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" />
  </svg>
);

export const PlacketHiddenIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="20" y="10" width="60" height="80" rx="3" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#FDE68A' : '#E2E8F0'} />
    {/* Hidden Placket with smooth fly */}
    <rect x="42" y="10" width="16" height="65" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" />
    <path d="M50 15 L50 68" stroke={selected ? '#B45309' : '#94A3B8'} strokeWidth="1.5" strokeDasharray="3 2" />
    <path d="M42 75 L50 82 L58 75 Z" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" />
  </svg>
);

// 5. BOTTOM / HEM ICONS
export const BottomWideHemIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 15 L25 85 L75 85 L80 15 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2" />
    {/* Wide Hem band */}
    <rect x="24" y="68" width="52" height="17" fill={selected ? '#FDE68A' : '#E2E8F0'} stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" />
    <path d="M24 68 L76 68" stroke={selected ? '#92400E' : '#334155'} strokeWidth="2" strokeDasharray="3 2" />
  </svg>
);

export const BottomSlitsIcon: React.FC<IconProps> = ({ className = 'w-16 h-16', selected }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 15 L25 85 L75 85 L80 15 Z" fill={selected ? '#FEF3C7' : '#F8FAFC'} stroke={selected ? '#B45309' : '#64748B'} strokeWidth="2" />
    {/* Side slit cuts */}
    <path d="M25 60 L28 85 M75 60 L72 85" stroke={selected ? '#DC2626' : '#E11D48'} strokeWidth="3" />
    <circle cx="25" cy="60" r="2" fill="#DC2626" />
    <circle cx="75" cy="60" r="2" fill="#DC2626" />
  </svg>
);
