import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MessageSquareWarningIcon, SearchXIcon, CheckCircleIcon, XCircleIcon, CheckIcon, MessageCircleIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { RouteChip } from '../components/ui/RouteChip';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Drawer } from '../components/ui/Drawer';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSimulatedLoad } from '../hooks/useSimulatedLoad';
import { api } from '../services/api';
import type { ReportNote, ReportStatus, UserReport } from '../types/transit';
import { formatRelative, formatDateTime, nowIso } from '../utils/format';
import { cn } from '../utils/cn';

const STATUS_ACTIONS: Array<{ from: ReportStatus; to: ReportStatus; label: string; variant: 'primary' | 'danger' | 'secondary' }> = [
  { from: 'Pending', to: 'Verified', label: 'Mark Verified', variant: 'primary' },
  { from: 'Pending', to: 'Rejected', label: 'Reject', variant: 'danger' },
  { from: 'Verified', to: 'Resolved', label: 'Mark Resolved', variant: 'primary' },
  { from: 'Verified', to: 'Rejected', label: 'Reject', variant: 'danger' },
];

function ReportDetailDrawer({
  report,
  routes,
  onClose,
  onStatusChange,
  onAddNote,
}: {
  report: UserReport | null;
  routes: { id: string; name: string; color: string }[];
  onClose: () => void;
  onStatusChange: (id: string, status: ReportStatus) => void;
  onAddNote: (id: string, text: string) => void;
}) {
  const { user } = useAuth();
  const lastRef = useRef<UserReport | null>(null);
  if (report) lastRef.current = report;
  const shown = report ?? lastRef.current;
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddNote = async () => {
    if (!noteText.trim() || !shown) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    onAddNote(shown.id, noteText.trim());
    setNoteText('');
    setSaving(false);
  };

  const actions = shown ? STATUS_ACTIONS.filter(a => a.from === shown.status) : [];
  const servedRoute = shown?.routeId ? routes.find(r => r.id === shown.routeId) : null;

  return (
    <Drawer
      open={!!report}
      onClose={onClose}
      title={shown?.id ?? ''}
      subtitle={shown ? `${shown.category} · ${shown.location}` : ''}
      footer={
        shown && actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map(a => (
              <Button key={a.to} size="sm" variant={a.variant === 'danger' ? 'danger' : 'primary'}
                icon={a.to === 'Verified' ? <CheckIcon className="h-4 w-4" /> : a.to === 'Rejected' ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                onClick={() => onStatusChange(shown.id, a.to)}>
                {a.label}
              </Button>
            ))}
          </div>
        )
      }
    >
      {shown && (
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <StatusBadge status={shown.status} />
            <span className="text-xs text-fg-subtle">Device: {shown.deviceRef}</span>
          </div>

          <div>
            <p className="text-xs text-fg-muted mb-1">Category</p>
            <span className="rounded-full bg-canvas px-3 py-1 text-sm font-medium text-fg ring-1 ring-inset ring-line">{shown.category}</span>
          </div>

          <div>
            <p className="text-xs text-fg-muted mb-1">Message</p>
            <div className="rounded-lg bg-canvas p-4 text-sm leading-relaxed text-fg">{shown.message}</div>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-xs text-fg-muted">Location</dt><dd className="mt-1 font-medium text-fg">{shown.location}</dd></div>
            <div><dt className="text-xs text-fg-muted">Submitted</dt><dd className="mt-1 font-medium text-fg">{formatDateTime(shown.submittedAt)}</dd></div>
            {servedRoute && (
              <div className="col-span-2">
                <dt className="text-xs text-fg-muted mb-1">Related Route</dt>
                <dd><RouteChip id={servedRoute.id} color={servedRoute.color} /></dd>
              </div>
            )}
          </dl>

          <div>
            <p className="text-xs text-fg-muted mb-2">Admin Notes ({shown.notes.length})</p>
            {shown.notes.length === 0 ? (
              <p className="text-sm text-fg-subtle">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {shown.notes.map((note, i) => (
                  <div key={i} className="rounded-lg border border-line bg-canvas/60 p-3">
                    <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                      <span className="font-medium text-fg">{note.author}</span>
                      <span>{formatRelative(note.at)}</span>
                    </div>
                    <p className="text-sm text-fg">{note.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add an internal note…"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
              <Button size="sm" variant="secondary" disabled={!noteText.trim() || saving} loading={saving}
                icon={<MessageCircleIcon className="h-4 w-4" />} onClick={handleAddNote}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export function Reports() {
  const { reports, setReports, routes } = useData();
  const { user } = useAuth();
  const loading = useSimulatedLoad();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ReportStatus>('All');
  const [viewingId, setViewingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return reports.filter(r =>
      (statusFilter === 'All' || r.status === statusFilter) &&
      (!q || r.category.toLowerCase().includes(q) || r.message.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) ||
        (r.routeId?.toLowerCase().includes(q) ?? false))
    ).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [reports, query, statusFilter]);

  const viewing = reports.find(r => r.id === viewingId) ?? null;

  const handleStatusChange = (id: string, status: ReportStatus) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    api.reports.update(id, { status }).catch(e => console.error('Report status error:', e));
    toast.success(`Report ${id} marked as ${status.toLowerCase()}`);
  };

  const handleAddNote = (id: string, text: string) => {
    const note: ReportNote = { author: user?.name ?? 'Admin', text, at: nowIso() };
    setReports(prev => prev.map(r => r.id === id ? { ...r, notes: [...r.notes, note] } : r));
    api.reports.update(id, { note: text, author: user?.name ?? 'Admin' }).catch(e => console.error('Report note error:', e));
    toast.success('Note added');
  };

  const pending = reports.filter(r => r.status === 'Pending').length;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Reports & Feedback"
        description={`${reports.length} total reports — ${pending} pending review from commuter app submissions`}
      />

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search category, message, location, route…" className="w-full sm:w-80" />
          <SegmentedControl label="Filter by status" value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[
            { value: 'All', label: 'All', count: reports.length },
            { value: 'Pending', label: 'Pending', count: reports.filter(r => r.status === 'Pending').length },
            { value: 'Verified', label: 'Verified', count: reports.filter(r => r.status === 'Verified').length },
            { value: 'Resolved', label: 'Resolved', count: reports.filter(r => r.status === 'Resolved').length },
            { value: 'Rejected', label: 'Rejected', count: reports.filter(r => r.status === 'Rejected').length },
          ]} />
          <p className="ml-auto text-[13px] text-fg-muted">Showing {filtered.length} of {reports.length}</p>
        </div>

        {loading ? <TableSkeleton rows={6} cols={6} /> : reports.length === 0 ? (
          <EmptyState icon={<MessageSquareWarningIcon className="h-5 w-5" />}
            title="No reports yet"
            description="Reports submitted through the OroRuta Android app will appear here for review." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<SearchXIcon className="h-5 w-5" />}
            title="No reports match"
            description="Try a different search or filter."
            action={<Button variant="secondary" onClick={() => { setQuery(''); setStatusFilter('All'); }}>Clear filters</Button>} />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map(r => {
              const route = r.routeId ? routes.find(rt => rt.id === r.routeId) : null;
              return (
                <li key={r.id} onClick={() => setViewingId(r.id)}
                  className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-canvas transition-colors duration-150">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-fg-muted">{r.id}</span>
                      <StatusBadge status={r.status} />
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-fg ring-1 ring-inset ring-line">{r.category}</span>
                      {route && <RouteChip id={route.id} color={route.color} />}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-fg line-clamp-2">{r.message}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-fg-subtle flex-wrap">
                      <span>{r.location}</span>
                      <span>·</span>
                      <span>{formatRelative(r.submittedAt)}</span>
                      {r.notes.length > 0 && <><span>·</span><span className="flex items-center gap-1"><MessageCircleIcon className="h-3 w-3" />{r.notes.length} note{r.notes.length > 1 ? 's' : ''}</span></>}
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-xs text-fg-subtle sm:block">Device: {r.deviceRef}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ReportDetailDrawer report={viewing} routes={routes} onClose={() => setViewingId(null)}
        onStatusChange={handleStatusChange} onAddNote={handleAddNote} />
    </div>
  );
}
