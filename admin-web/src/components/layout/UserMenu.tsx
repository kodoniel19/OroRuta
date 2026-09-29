import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react';
import { LogoutDialog } from './LogoutDialog';
import { useAuth } from '../../contexts/AuthContext';

export function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-fg transition-colors duration-150 hover:bg-canvas';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors duration-150 hover:bg-canvas"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium text-fg">{user.name}</span>
          <span className="block text-xs text-fg-muted">{user.role}</span>
        </span>
        <ChevronDownIcon className="h-4 w-4 text-fg-subtle" aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full z-[800] mt-2 w-64 rounded-xl border border-line bg-white p-1.5 shadow-pop"
          >
            <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
              <p className="text-sm font-medium text-fg">{user.name}</p>
              <p className="truncate text-xs text-fg-muted">{user.email}</p>
            </div>
            <div className="py-1">
              <button role="menuitem" className={itemClass} onClick={() => go('/account')}>
                <UserIcon className="h-4 w-4 text-fg-muted" /> Account
              </button>
              <button role="menuitem" className={itemClass} onClick={() => go('/settings')}>
                <SettingsIcon className="h-4 w-4 text-fg-muted" /> Settings
              </button>
            </div>
            <div className="border-t border-line pt-1">
              <button
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-danger-600 transition-colors duration-150 hover:bg-danger-50"
                onClick={() => { setOpen(false); setLogoutOpen(true); }}
              >
                <LogOutIcon className="h-4 w-4" /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}