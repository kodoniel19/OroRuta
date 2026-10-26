import React from 'react';
import appIcon from '../../assets/app-icon.png';
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
      <img
        src={appIcon}
        alt="OroRuta Logo"
        width={size}
        height={size}
        className="rounded-lg object-contain shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      {showText && (
        <div className="leading-tight">
          <p className={cn('text-[15px] font-semibold tracking-tight', tone === 'light' ? 'text-white' : 'text-fg')}>OroRuta</p>
          <p className={cn('text-[11px] font-medium', tone === 'light' ? 'text-ink-400' : 'text-fg-muted')}>{subtitle}</p>
        </div>
      )}
    </div>
  );
}
