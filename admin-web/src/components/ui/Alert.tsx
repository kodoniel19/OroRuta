import React from 'react';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

type Tone = 'error' | 'success' | 'info' | 'warn';

const styles: Record<Tone, { box: string; icon: typeof InfoIcon }> = {
  error: { box: 'border-danger-500/30 bg-danger-50 text-danger-700', icon: CircleAlertIcon },
  success: { box: 'border-primary-500/30 bg-primary-50 text-primary-700', icon: CircleCheckIcon },
  info: { box: 'border-info-500/30 bg-info-50 text-info-600', icon: InfoIcon },
  warn: { box: 'border-warn-500/30 bg-warn-50 text-warn-600', icon: TriangleAlertIcon },
};

interface AlertProps {
  tone: Tone;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function Alert({ tone, title, children, className }: AlertProps) {
  const { box, icon: Icon } = styles[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm', box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
    </div>
  );
}

