import React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { inputClass, errorInputClass } from './Field';
import { cn } from '../../utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  wrapperClassName?: string;
}

export function Select({ invalid, className, wrapperClassName, children, ...rest }: SelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select className={cn(inputClass, 'appearance-none pr-9', invalid && errorInputClass, className)} {...rest}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  );
}

