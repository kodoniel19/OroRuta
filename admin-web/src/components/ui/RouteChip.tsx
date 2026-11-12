import React from 'react';
import { cn } from '../../utils/cn';

export function RouteChip({
  id,
  code,
  label,
  color,
  className,
}: {
  id?: string;
  code?: string;
  label?: string;
  color?: string;
  className?: string;
}) {
  const display = label ?? code ?? id ?? '';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[11px] font-medium text-fg ring-1 ring-inset ring-line', className)}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color ?? '#8A93A3' }} aria-hidden />
      {display}
    </span>
  );
}

