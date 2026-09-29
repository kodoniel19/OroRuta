import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MegaphoneIcon, PencilIcon, PlusIcon, Trash2Icon, SearchXIcon, MessageCircleIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { SearchInput } from '../components/ui/SearchInput';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RouteChip } from '../components/ui/RouteChip';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { Field, inputClass, errorInputClass } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import { announcementTypes } from '../data/announcementTypes';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSimulatedLoad } from '../hooks/useSimulatedLoad';
import { api } from '../services/api';
import type { Announcement, AnnouncementStatus, AnnouncementType } from '../types/transit';
import { formatDate, formatRelative, nowIso } from '../utils/format';
import { delay, nextId } from '../utils/async';
import { cn } from '../utils/cn';

const ALL_TYPES: AnnouncementType[] = announcementTypes.map(t => t.type);

function AnnouncementForm({
  open, onClose, initial, announcements, routes, onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: Announcement | null;
  announcements: Announcement[];
  routes: { id: string; name: string; color: string }[];
  onSave: (a: Announcement) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AnnouncementType>('General Update');
  const [body, setBody] = useState('');
  const [affectedRoutes, setAffectedRoutes] = useState<string[]>([]);
  const [status, setStatus] = useState<AnnouncementStatus>('Draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setType(initial?.type ?? 'General Update');
      setBody(initial?.body ?? '');
      setAffectedRoutes(initial?.affectedRoutes ?? []);
      setStatus(initial?.status ?? 'Draft');
      setStartDate(initial?.startDate ?? '');
      setEndDate(initial?.endDate ?? '');
      setErrors({});
    }
  }, [open, initial]);

  const toggleRoute = (id: string) =>
    setAffectedRoutes(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  const doSave = async (nextStatus: AnnouncementStatus) => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Enter a title';
    if (body.trim().length < 20) errs.body = 'Body must be at least 20 characters';
    if (!startDate) errs.startDate = 'Select a start date';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    await delay(700);
    onSave({
      id: initial?.id ?? nextId('AN-', announcements.map(a => a.id), 3),
      title: title.trim(),
      type,
      body: body.trim(),
      affectedRoutes,
      status: nextStatus,
      startDate,
      endDate,
      updatedAt: nowIso(),
      author: user?.name ?? 'Administrator',
    });
    setSaving(false);
    onClose();
  };

  const meta = announcementTypes.find(t => t.type === type);

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      size="lg"
      title={initial ? `Edit ${initial.id}` : 'Create announcement'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="ghost" loading={saving} onClick={() => doSave('Draft')}>Save as draft</Button>
          <Button loading={saving} onClick={() => doSave('Published')}>Publish</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="ann-title" required error={errors.title}>
          <input id="ann-title" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Descriptive summary of the announcement"
            className={cn(inputClass, errors.title && errorInputClass)} />
        </Field>

        <Field label="Announcement type" htmlFor="ann-type">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {announcementTypes.map(({ type: t, icon: Icon, className: cls, hint }) => (
              <label key={t} className={cn(
                'flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-2.5 transition-all',
                type === t ? 'border-primary-500 bg-primary-50/50' : 'border-line hover:bg-canvas',
              )}>
                <input type="radio" name="ann-type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                <div className="flex items-center gap-1.5">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded', cls)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-xs font-medium text-fg">{t}</span>
                </div>
                <p className="text-[11px] text-fg-subtle">{hint}</p>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Announcement body" htmlFor="ann-body" required error={errors.body}>
          <textarea id="ann-body" rows={5} value={body} onChange={e => setBody(e.target.value)}
            placeholder="Describe the situation, affected areas, and what commuters should do."
            className={cn(inputClass, 'h-auto resize-none py-2.5', errors.body && errorInputClass)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date" htmlFor="ann-start" required error={errors.startDate}>
            <input id="ann-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className={cn(inputClass, errors.startDate && errorInputClass)} />
          </Field>
          <Field label="End date (leave blank if ongoing)" htmlFor="ann-end">
            <input id="ann-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label={`Affected routes (${affectedRoutes.length})`} htmlFor="ann-routes"
          hint="Leave empty if this applies to all routes">
          <div className="grid max-h-36 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-line p-1.5">
            {routes.map(r => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-canvas">
                <input type="checkbox" checked={affectedRoutes.includes(r.id)} onChange={() => toggleRoute(r.id)}
                  className="h-3.5 w-3.5 rounded border-line accent-primary-600" />
                <RouteChip id={r.id} color={r.color} />
                <span className="truncate text-fg-muted">{r.name}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function AnnouncementDetail({
  announcement, routes, onClose,
}: {
  announcement: Announcement | null;
  routes: { id: string; name: string; color: string }[];
  onClose: () => void;
}) {
  const lastRef = React.useRef<Announcement | null>(null);
  if (announcement) lastRef.current = announcement;
  const shown = announcement ?? lastRef.current;
  const meta = shown ? announcementTypes.find(t => t.type === shown.type) : null;

  return (
    <Drawer open={!!announcement} onClose={onClose} title={shown?.id ?? ''} subtitle={shown?.title}>
      {shown && (
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-3">
            {meta && (
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.className)}>
                <meta.icon className="h-5 w-5" />
              </span>
            )}
            <div>
              <p className="font-semibold text-fg">{shown.type}</p>
              <p className="text-xs text-fg-muted">by {shown.author} · {formatRelative(shown.updatedAt)}</p>
            </div>
            <StatusBadge status={shown.status} className="ml-auto" />
          </div>

          <div className="rounded-lg bg-canvas p-4 text-sm leading-relaxed text-fg">{shown.body}</div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-xs text-fg-muted">Start Date</dt><dd className="mt-1 font-medium">{formatDate(shown.startDate)}</dd></div>
            <div><dt className="text-xs text-fg-muted">End Date</dt><dd className="mt-1 font-medium">{shown.endDate ? formatDate(shown.endDate) : 'Ongoing'}</dd></div>
          </dl>

          {shown.affectedRoutes.length > 0 && (
            <div>
              <p className="text-xs text-fg-muted mb-2">Affected routes</p>
              <div className="flex flex-wrap gap-2">
                {shown.affectedRoutes.map(id => {
                  const r = routes.find(rt => rt.id === id);
                  return <RouteChip key={id} id={id} color={r?.color} />;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

export function Announcements() {
  const { announcements, setAnnouncements, routes } = useData();
  const loading = useSimulatedLoad();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AnnouncementStatus>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return announcements.filter(a =>
      (statusFilter === 'All' || a.status === statusFilter) &&
      (!q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)),
    );
  }, [announcements, query, statusFilter]);

  const viewing = announcements.find(a => a.id === viewingId) ?? null;

  const handleSave = (ann: Announcement) => {
    if (editing) {
      setAnnouncements(prev => prev.map(a => a.id === editing.id ? ann : a));
      api.announcements.update(editing.id, ann).catch(e => console.error('Announcement update error:', e));
      toast.success(`${ann.id} ${ann.status === 'Published' ? 'published' : 'saved as draft'}`);
    } else {
      setAnnouncements(prev => [ann, ...prev]);
      api.announcements.create(ann).catch(e => console.error('Announcement create error:', e));
      toast.success(`${ann.id} ${ann.status === 'Published' ? 'published' : 'created as draft'}`);
    }
  };

  const quickPublish = (ann: Announcement) => {
    setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, status: 'Published' as AnnouncementStatus, updatedAt: nowIso() } : a));
    api.announcements.update(ann.id, { status: 'Published' as AnnouncementStatus }).catch(e => console.error('Announcement publish error:', e));
    toast.success(`${ann.id} published — visible in the Android app`);
  };

  const quickDeactivate = (ann: Announcement) => {
    setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, status: 'Inactive' as AnnouncementStatus, updatedAt: nowIso() } : a));
    api.announcements.update(ann.id, { status: 'Inactive' as AnnouncementStatus }).catch(e => console.error('Announcement deactivate error:', e));
    toast.success(`${ann.id} deactivated`);
  };

  const handleDelete = (ann: Announcement) => {
    setAnnouncements(prev => prev.filter(a => a.id !== ann.id));
    api.announcements.delete(ann.id).catch(e => console.error('Announcement delete error:', e));
    setViewingId(null);
    toast.success(`${ann.id} deleted`);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Announcements"
        description={`${announcements.filter(a => a.status === 'Published').length} published · ${announcements.filter(a => a.status === 'Draft').length} drafts`}
        actions={
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            New announcement
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search title, type, body…" className="w-full sm:w-72" />
          <SegmentedControl label="Filter by status" value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[
            { value: 'All', label: 'All', count: announcements.length },
            { value: 'Published', label: 'Published', count: announcements.filter(a => a.status === 'Published').length },
            { value: 'Draft', label: 'Draft', count: announcements.filter(a => a.status === 'Draft').length },
            { value: 'Inactive', label: 'Inactive', count: announcements.filter(a => a.status === 'Inactive').length },
          ]} />
          <p className="ml-auto text-[13px] text-fg-muted">Showing {filtered.length} of {announcements.length}</p>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : announcements.length === 0 ? (
          <EmptyState icon={<MegaphoneIcon className="h-5 w-5" />} title="No announcements yet"
            description="Create an announcement to notify commuters about reroutes, closures or updates."
            action={<Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>New announcement</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<SearchXIcon className="h-5 w-5" />} title="No announcements match"
            description="Try a different search or status filter."
            action={<Button variant="secondary" onClick={() => { setQuery(''); setStatusFilter('All'); }}>Clear filters</Button>} />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map(a => {
              const meta = announcementTypes.find(t => t.type === a.type) ?? announcementTypes[announcementTypes.length - 1];
              return (
                <li key={a.id}
                  className="flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors duration-150 hover:bg-canvas"
                  onClick={() => setViewingId(a.id)}
                >
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.className)}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-fg-muted">{a.id}</span>
                      <StatusBadge status={a.status} />
                      <span className="text-xs text-fg-subtle">{a.type}</span>
                    </div>
                    <p className="mt-1 font-semibold text-fg">{a.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{a.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-subtle">
                      <span>by {a.author}</span>
                      <span>·</span>
                      <span>{a.startDate}{a.endDate ? ` → ${a.endDate}` : ' (ongoing)'}</span>
                      {a.affectedRoutes.length > 0 && (
                        <>
                          <span>·</span>
                          <div className="flex gap-1">
                            {a.affectedRoutes.slice(0, 3).map(id => (
                              <RouteChip key={id} id={id} color={routes.find(r => r.id === id)?.color} />
                            ))}
                            {a.affectedRoutes.length > 3 && <span>+{a.affectedRoutes.length - 3}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5" onClick={e => e.stopPropagation()}>
                    {a.status === 'Draft' && (
                      <Button size="sm" onClick={() => quickPublish(a)}>Publish</Button>
                    )}
                    {a.status === 'Published' && (
                      <Button size="sm" variant="secondary" onClick={() => quickDeactivate(a)}>Deactivate</Button>
                    )}
                    <IconButton label={`Edit ${a.id}`} onClick={() => { setEditing(a); setFormOpen(true); }}>
                      <PencilIcon className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Delete ${a.id}`} tone="danger" onClick={() => setConfirmDelete(a)}>
                      <Trash2Icon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AnnouncementForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        announcements={announcements}
        routes={routes}
        onSave={handleSave}
      />
      <AnnouncementDetail announcement={viewing} routes={routes} onClose={() => setViewingId(null)} />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.id}?`}
        message={<>Delete <strong className="text-fg">{confirmDelete?.title}</strong>? This cannot be undone.</>}
        confirmLabel="Delete announcement"
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
      />
    </div>
  );
}
