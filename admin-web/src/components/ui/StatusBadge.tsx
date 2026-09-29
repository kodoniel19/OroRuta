import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'success' | 'neutral' | 'warn' | 'info' | 'danger';

const toneByStatus: Record<string, Tone> = {
  Active: 'success', Published: 'success', Resolved: 'success', Current: 'success', Invited: 'info',
  Inactive: 'neutral', Archived: 'neutral', Draft: 'neutral', Superseded: 'neutral',
  Pending: 'warn', 'Under Review': 'warn', Outdated: 'warn',
  Verified: 'info', Scheduled: 'info', Building: 'info',
  Rejected: 'danger', Failed: 'danger',
};

const toneClasses: Record<Tone, string> = {
  success: 'bg-primary-50 text-primary-700',
  neutral: 'bg-canvas text-fg-muted ring-1 ring-inset ring-line',
  warn: 'bg-warn-50 text-warn-600',
  info: 'bg-info-50 text-info-600',
  danger: 'bg-danger-50 text-danger-600',
};

const dotClasses: Record<Tone, string> = {
  success: 'bg-primary-500',
  neutral: 'bg-fg-subtle',
  warn: 'bg-warn-500',
  info: 'bg-info-500',
  danger: 'bg-danger-500',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = toneByStatus[status] ?? 'neutral';
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', toneClasses[tone], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClasses[tone])} aria-hidden />
      {status}
    </span>
  );
}

