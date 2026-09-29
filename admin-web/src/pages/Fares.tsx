import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BanknoteIcon, PencilIcon, PlusIcon, Trash2Icon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { Field, inputClass, errorInputClass } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import { useData } from '../contexts/DataContext';
import { useSimulatedLoad } from '../hooks/useSimulatedLoad';
import { api } from '../services/api';
import type { FareRule, FareStatus, PassengerCategory, VehicleType } from '../types/transit';
import { formatDate, nowIso, peso } from '../utils/format';
import { delay, nextId } from '../utils/async';
import { cn } from '../utils/cn';

const VEHICLES: VehicleType[] = ['Traditional Jeepney', 'Modern Jeepney'];
const CATEGORIES: PassengerCategory[] = ['Regular', 'Student', 'Senior Citizen', 'PWD'];
const STATUSES: FareStatus[] = ['Current', 'Scheduled', 'Archived'];

function FareFormModal({
  open,
  onClose,
  initial,
  fares,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: FareRule | null;
  fares: FareRule[];
  onSave: (fare: FareRule) => void;
}) {
  const [vehicle, setVehicle] = useState<VehicleType>(initial?.vehicle ?? 'Traditional Jeepney');
  const [category, setCategory] = useState<PassengerCategory>(initial?.category ?? 'Regular');
  const [baseFare, setBaseFare] = useState(String(initial?.baseFare ?? '13'));
  const [perKm, setPerKm] = useState(String(initial?.perKm ?? '1.8'));
  const [effectiveDate, setEffectiveDate] = useState(initial?.effectiveDate ?? '');
  const [status, setStatus] = useState<FareStatus>(initial?.status ?? 'Current');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setVehicle(initial?.vehicle ?? 'Traditional Jeepney');
      setCategory(initial?.category ?? 'Regular');
      setBaseFare(String(initial?.baseFare ?? '13'));
      setPerKm(String(initial?.perKm ?? '1.8'));
      setEffectiveDate(initial?.effectiveDate ?? '');
      setStatus(initial?.status ?? 'Current');
      setErrors({});
    }
  }, [open, initial]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const bf = Number(baseFare);
    const pk = Number(perKm);
    if (isNaN(bf) || bf <= 0) errs.baseFare = 'Enter a valid base fare';
    if (isNaN(pk) || pk <= 0) errs.perKm = 'Enter a valid per-km rate';
    if (!effectiveDate) errs.effectiveDate = 'Select an effective date';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    await delay(600);
    onSave({
      id: initial?.id ?? nextId('F', fares.map((f) => f.id)),
      vehicle,
      category,
      baseFare: bf,
      perKm: pk,
      effectiveDate,
      lastUpdated: nowIso(),
      status,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={initial ? `Edit ${initial.id}` : 'Add fare rule'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="fare-form" loading={saving}>{initial ? 'Save changes' : 'Add fare rule'}</Button>
        </>
      }
    >
      <form id="fare-form" onSubmit={handleSave} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle type" htmlFor="fare-vehicle">
          <Select id="fare-vehicle" value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}>
            {VEHICLES.map(v => <option key={v}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Passenger category" htmlFor="fare-category">
          <Select id="fare-category" value={category} onChange={e => setCategory(e.target.value as PassengerCategory)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Base fare (₱)" htmlFor="fare-base" required error={errors.baseFare}>
          <input id="fare-base" type="number" step="0.01" min="1" value={baseFare}
            onChange={e => setBaseFare(e.target.value)}
            className={cn(inputClass, 'tabular-nums', errors.baseFare && errorInputClass)} />
        </Field>
        <Field label="Rate per km (₱)" htmlFor="fare-km" required error={errors.perKm}>
          <input id="fare-km" type="number" step="0.01" min="0.01" value={perKm}
            onChange={e => setPerKm(e.target.value)}
            className={cn(inputClass, 'tabular-nums', errors.perKm && errorInputClass)} />
        </Field>
        <Field label="Effective date" htmlFor="fare-date" required error={errors.effectiveDate}>
          <input id="fare-date" type="date" value={effectiveDate}
            onChange={e => setEffectiveDate(e.target.value)}
            className={cn(inputClass, errors.effectiveDate && errorInputClass)} />
        </Field>
        <Field label="Status" htmlFor="fare-status">
          <Select id="fare-status" value={status} onChange={e => setStatus(e.target.value as FareStatus)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <div className="col-span-2 rounded-lg bg-canvas p-3 text-xs text-fg-muted">
          Discount passengers (Student, Senior Citizen, PWD) receive a 20% discount as mandated by LTFRB.
          <strong className="text-fg"> Discounted base:</strong> {peso((Number(baseFare) || 0) * 0.8)}
        </div>
      </form>
    </Modal>
  );
}

export function Fares() {
  const { fares, setFares } = useData();
  const loading = useSimulatedLoad();
  const [statusFilter, setStatusFilter] = useState<'All' | FareStatus>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FareRule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FareRule | null>(null);

  const filtered = useMemo(() =>
    statusFilter === 'All' ? fares : fares.filter(f => f.status === statusFilter),
    [fares, statusFilter]);

  const handleSave = (fare: FareRule) => {
    if (editing) {
      setFares(prev => prev.map(f => f.id === editing.id ? fare : f));
      api.fares.update(editing.id, fare).catch(e => console.error('Fare update error:', e));
      toast.success(`${fare.id} updated`);
    } else {
      setFares(prev => [...prev, fare]);
      api.fares.create(fare).catch(e => console.error('Fare create error:', e));
      toast.success(`${fare.id} added`);
    }
  };

  const handleDelete = (fare: FareRule) => {
    setFares(prev => prev.filter(f => f.id !== fare.id));
    api.fares.delete(fare.id).catch(e => console.error('Fare delete error:', e));
    toast.success(`${fare.id} deleted`);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Fare Information"
        description={`${fares.filter(f => f.status === 'Current').length} current fare rules · ${fares.filter(f => f.status === 'Scheduled').length} scheduled`}
        actions={<Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add fare rule</Button>}
      />

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <SegmentedControl label="Filter by status" value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[
            { value: 'All', label: 'All', count: fares.length },
            { value: 'Current', label: 'Current', count: fares.filter(f => f.status === 'Current').length },
            { value: 'Scheduled', label: 'Scheduled', count: fares.filter(f => f.status === 'Scheduled').length },
            { value: 'Archived', label: 'Archived', count: fares.filter(f => f.status === 'Archived').length },
          ]} />
          <p className="ml-auto text-[13px] text-fg-muted">Showing {filtered.length} of {fares.length}</p>
        </div>

        {loading ? <TableSkeleton rows={6} cols={7} /> : fares.length === 0 ? (
          <EmptyState icon={<BanknoteIcon className="h-5 w-5" />} title="No fare rules yet" description="Add LTFRB-approved fare rules for traditional and modern jeepneys." action={<Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>Add fare rule</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<SearchXIcon className="h-5 w-5" />} title="No fares match" description="Try a different status filter." action={<Button variant="secondary" onClick={() => setStatusFilter('All')}>Clear filter</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-left text-xs font-medium text-fg-muted">
                  {['ID', 'Vehicle Type', 'Passenger Category', 'Base Fare', 'Per Km Rate', 'Est. 4 km', 'Effective Date', 'Status', ''].map(h => (
                    <th key={h} scope="col" className="px-4 py-2.5 font-medium">{h || <span className="sr-only">Actions</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(f => (
                  <tr key={f.id} className="transition-colors duration-150 hover:bg-canvas">
                    <td className="px-4 py-3.5 font-mono text-xs font-medium text-fg-muted">{f.id}</td>
                    <td className="px-4 py-3.5 text-fg">{f.vehicle}</td>
                    <td className="px-4 py-3.5 text-fg">{f.category}</td>
                    <td className="px-4 py-3.5 tabular-nums font-semibold text-fg">{peso(f.baseFare)}</td>
                    <td className="px-4 py-3.5 tabular-nums text-fg-muted">{peso(f.perKm)}/km</td>
                    <td className="px-4 py-3.5 tabular-nums text-fg">{peso(f.baseFare + f.perKm * 4)}</td>
                    <td className="px-4 py-3.5 text-fg-muted">{formatDate(f.effectiveDate)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={f.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-0.5 justify-end">
                        <IconButton label={`Edit ${f.id}`} onClick={() => { setEditing(f); setFormOpen(true); }}><PencilIcon className="h-4 w-4" /></IconButton>
                        <IconButton label={`Delete ${f.id}`} tone="danger" onClick={() => setConfirmDelete(f)}><Trash2Icon className="h-4 w-4" /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FareFormModal open={formOpen} onClose={() => setFormOpen(false)} initial={editing} fares={fares} onSave={handleSave} />
      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={`Delete ${confirmDelete?.id}?`}
        message={<>Remove the <strong className="text-fg">{confirmDelete?.category}</strong> fare rule for <strong className="text-fg">{confirmDelete?.vehicle}</strong>? This cannot be undone.</>}
        confirmLabel="Delete fare rule" onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }} />
    </div>
  );
}
