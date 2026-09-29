import React from 'react';
import { cn } from '../../utils/cn';

interface LogoProps {
  size?: number;
  showText?: boolean;
  tone?: 'dark' | 'light';
  subtitle?: string;
}

export function Logo({ size = 36, showText = true, tone = 'dark', subtitle = 'Admin Portal' }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <rect width="40" height="40" rx="10" fill="#0B6E4F" />
        <path d="M10 29c3.5-7 7.5-3 11-9s6-8 9-8" stroke="#E9A21B" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <circle cx="10" cy="29" r="3.2" fill="#fff" />
        <circle cx="30" cy="12" r="3.2" fill="#fff" />
      </svg>
      {showText && (
        <div className="leading-tight">
          <p className={cn('text-[15px] font-semibold tracking-tight', tone === 'light' ? 'text-white' : 'text-fg')}>OroRuta</p>
          <p className={cn('text-[11px] font-medium', tone === 'light' ? 'text-ink-400' : 'text-fg-muted')}>{subtitle}</p>
        </div>
      )}
    </div>
  );
}

