import React from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { navigation } from '../../data/navigation';
import { useData } from '../../contexts/DataContext';
import { cn } from '../../utils/cn';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const { reports } = useData();
  const pending = reports.filter((r) => r.status === 'Pending').length;

  return (
    <aside className={cn('flex h-full w-64 shrink-0 flex-col bg-ink', className)}>
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
        <Logo tone="light" size={32} />
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((section) => (
          <div key={section.group} className="mb-5 last:mb-0">
            <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
              {section.group}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors duration-150',
                        isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-gold-400' : 'text-white/40 group-hover:text-white')}
                          aria-hidden
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.to === '/reports' && pending > 0 && (
                          <span
                            className="rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold tabular-nums text-ink"
                            aria-label={`${pending} pending reports`}
                          >
                            {pending}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

    </aside>
  );
}