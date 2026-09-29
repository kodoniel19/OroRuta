import React from 'react';
import { CircleAlertIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export const inputClass =
  'w-full h-10 rounded-lg border border-line bg-white px-3 text-sm text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 disabled:bg-canvas disabled:text-fg-muted';

export const errorInputClass = 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;

  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-fg">
        {label}
        {required && <span className="ml-0.5 text-danger-600" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-danger-600">
          <CircleAlertIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[12px] text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}