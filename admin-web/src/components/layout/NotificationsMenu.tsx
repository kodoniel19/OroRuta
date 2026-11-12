import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BellIcon,
  CheckCheckIcon,
  MessageSquareWarningIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  SparklesIcon,
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatRelative } from '../../utils/format';
import { StatusBadge } from '../ui/StatusBadge';
import { cn } from '../../utils/cn';

const STORAGE_KEY = 'ororuta_admin_read_reports';

export function NotificationsMenu() {
  const { reports } = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  // Sync read IDs to local storage
  const persistReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
    } catch {}
  };

  const markAsRead = (id: string) => {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    persistReadIds(next);
  };

  const markAllAsRead = () => {
    const next = new Set(readIds);
    reports.forEach((r) => next.add(r.id));
    persistReadIds(next);
  };

  // Close dropdown on outside click or escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  // Unread pending reports count
  const pendingReports = useMemo(() => reports.filter((r) => r.status === 'Pending'), [reports]);
  const unreadPendingCount = useMemo(
    () => pendingReports.filter((r) => !readIds.has(r.id)).length,
    [pendingReports, readIds]
  );

  const displayedReports = useMemo(() => {
    const list = filter === 'pending' ? pendingReports : reports;
    return [...list].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [filter, pendingReports, reports]);

  const handleSelectReport = (id: string) => {
    markAsRead(id);
    setOpen(false);
    navigate(`/reports?id=${id}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadPendingCount > 0 ? `${unreadPendingCount} unread notifications` : 'Notifications'}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg border border-line transition-colors duration-150',
          open ? 'bg-canvas text-fg' : 'bg-white text-fg-muted hover:bg-canvas hover:text-fg'
        )}
      >
        <BellIcon className="h-4 w-4" />
        {unreadPendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadPendingCount > 9 ? '9+' : unreadPendingCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications popover"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full z-[800] mt-2 w-80 sm:w-96 rounded-xl border border-line bg-white shadow-pop overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-fg">Notifications</span>
                {unreadPendingCount > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    {unreadPendingCount} new
                  </span>
                ) : (
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                    Up to date
                  </span>
                )}
              </div>
              {unreadPendingCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  <CheckCheckIcon className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-line px-3 pt-2 gap-2 bg-canvas/40">
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={cn(
                  'pb-2 px-2 text-xs font-medium border-b-2 transition-colors',
                  filter === 'pending'
                    ? 'border-primary-600 text-primary-600 font-semibold'
                    : 'border-transparent text-fg-muted hover:text-fg'
                )}
              >
                Pending ({pendingReports.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  'pb-2 px-2 text-xs font-medium border-b-2 transition-colors',
                  filter === 'all'
                    ? 'border-primary-600 text-primary-600 font-semibold'
                    : 'border-transparent text-fg-muted hover:text-fg'
                )}
              >
                All Reports ({reports.length})
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-line">
              {displayedReports.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
                    <CheckCircle2Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-fg">No pending reports</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    All commuter feedback and reports have been reviewed!
                  </p>
                </div>
              ) : (
                displayedReports.map((r) => {
                  const isUnread = !readIds.has(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectReport(r.id)}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-150',
                        isUnread ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-canvas'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                          r.status === 'Pending'
                            ? 'bg-amber-100 text-amber-700'
                            : r.status === 'Verified'
                            ? 'bg-blue-100 text-blue-700'
                            : r.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-600'
                        )}
                      >
                        {r.status === 'Pending' ? (
                          <AlertTriangleIcon className="h-3.5 w-3.5" />
                        ) : (
                          <MessageSquareWarningIcon className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-semibold text-fg">
                            {r.category}
                          </span>
                          <span className="shrink-0 text-[11px] text-fg-subtle">
                            {formatRelative(r.submittedAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-fg-muted line-clamp-2">
                          {r.message}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          {r.location && (
                            <span className="truncate text-[10px] text-fg-subtle max-w-[140px]">
                              📍 {r.location}
                            </span>
                          )}
                          {isUnread && (
                            <span className="ml-auto inline-block h-2 w-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-line p-2 bg-canvas/30 text-center">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/reports');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-fg hover:text-primary-600 transition-colors"
              >
                <span>View all reports & feedback</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

