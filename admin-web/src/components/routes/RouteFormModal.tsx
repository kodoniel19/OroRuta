import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SplineIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, inputClass, errorInputClass } from '../ui/Field';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';
import { routePalette } from '../../data/routes';
import { RouteDrawModal } from './RouteDrawModal';
import type { Direction, JeepneyRoute, LatLng, RecordStatus } from '../../types/transit';
import { delay, nextId } from '../../utils/async';
import { toCoordinates } from '../../utils/geo';
import { nowIso } from '../../utils/format';
import { cn } from '../../utils/cn';

interface RouteFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: JeepneyRoute | null;
  routes: JeepneyRoute[];
  onSave: (route: JeepneyRoute) => void;
}

type FormState = {
  id: string;
  name: string;
  direction: Direction;
  origin: string;
  destination: string;
  majorRoads: string;
  description: string;
  fare: string;
  travelTime: string;
  status: RecordStatus;
};
type Errors = Partial<Record<keyof FormState, string>>;

const DIRECTIONS: Direction[] = ['Northbound', 'Southbound', 'Eastbound', 'Westbound', 'Loop'];

function toForm(route: JeepneyRoute | null, routes: JeepneyRoute[]): FormState {
  if (route) {
    return {
      id: route.id, name: route.name, direction: route.direction, origin: route.origin, destination: route.destination,
      majorRoads: route.majorRoads.join(', '), description: route.description, fare: String(route.fare),
      travelTime: String(route.travelTime), status: route.status,
    };
  }
  return {
    id: nextId('R', routes.map((r) => r.id)), name: '', direction: 'Eastbound', origin: '', destination: '',
    majorRoads: '', description: '', fare: '13', travelTime: '', status: 'Active',
  };
}

export function RouteFormModal({ open, onClose, initial, routes, onSave }: RouteFormModalProps) {
  const [form, setForm] = useState<FormState>(() => toForm(initial, routes));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'details' | 'draw'>('details');
  const [drawnPath, setDrawnPath] = useState<LatLng[]>([]);

  useEffect(() => {
    if (open) {
      setForm(toForm(initial, routes));
      setErrors({});
      setStep('details');
      setDrawnPath(initial?.path ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const roads = form.majorRoads.split(',').map((s) => s.trim()).filter(Boolean);

  const validate = (): Errors => {
    const e: Errors = {};
    const id = form.id.trim().toUpperCase();
    if (!/^R\d{2,3}$/.test(id)) e.id = 'Use the format R01';
    else if (!initial && routes.some((r) => r.id === id)) e.id = 'This route ID already exists';
    if (!form.name.trim()) e.name = 'Enter a route name';
    if (!form.origin.trim()) e.origin = 'Enter the origin';
    if (!form.destination.trim()) e.destination = 'Enter the destination';
    else if (form.destination.trim().toLowerCase() === form.origin.trim().toLowerCase()) e.destination = 'Destination must differ from origin';
    if (roads.length === 0) e.majorRoads = 'Add at least one major road';
    if (form.description.trim().length < 20) e.description = 'Describe the route in at least 20 characters';
    const fare = Number(form.fare);
    if (!form.fare || Number.isNaN(fare) || fare <= 0 || fare > 200) e.fare = 'Enter a fare between ₱1 and ₱200';
    const time = Number(form.travelTime);
    if (!form.travelTime || !Number.isInteger(time) || time <= 0 || time > 240) e.travelTime = 'Enter minutes between 1 and 240';
    return e;
  };

  const routeColor = initial?.color ?? routePalette[routes.length % routePalette.length];

  const buildRoute = (path: LatLng[]): JeepneyRoute => ({
    id: form.id.trim().toUpperCase(),
    name: form.name.trim(),
    direction: form.direction,
    origin: form.origin.trim(),
    destination: form.destination.trim(),
    majorRoads: roads,
    description: form.description.trim(),
    fare: Number(form.fare),
    travelTime: Number(form.travelTime),
    status: form.status,
    lastUpdated: nowIso(),
    color: routeColor,
    path,
    coordinates: toCoordinates(path),
  });

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    // New routes continue to the map step so the admin draws the line first.
    if (!initial) {
      setStep('draw');
      return;
    }

    setSaving(true);
    await delay(700);
    onSave(buildRoute(drawnPath));
    setSaving(false);
    onClose();
  };

  const handleDrawSave = (path: LatLng[]) => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      setStep('details');
      toast.error('Please fix the route details before saving.');
      return;
    }
    onSave(buildRoute(path));
    onClose();
  };

  const err = (k: keyof FormState) => cn(inputClass, errors[k] && errorInputClass);

  return (
    <>
      <RouteDrawModal
        open={open && step === 'draw'}
        mode={initial ? 'edit' : 'create'}
        onClose={onClose}
        route={{
          id: form.id.trim().toUpperCase(),
          name: form.name.trim(),
          origin: form.origin.trim(),
          destination: form.destination.trim(),
          color: routeColor,
        }}
        path={drawnPath}
        onPathChange={setDrawnPath}
        onBack={() => setStep('details')}
        onSave={handleDrawSave}
      />
      <Modal
        open={open && step === 'details'}
        onClose={saving ? () => undefined : onClose}
        size="lg"
        title={initial ? `Edit ${initial.id}` : 'Add route'}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" form="route-form" loading={saving}>
              {initial ? 'Save changes' : 'Next: Draw route →'}
            </Button>
          </>
        }
      >
        <form id="route-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Route ID" htmlFor="rf-id" required error={errors.id} hint="Format: R01, R12">
            <input id="rf-id" value={form.id} onChange={e => set('id', e.target.value.toUpperCase())}
              placeholder="R01" className={err('id')} />
          </Field>
          <Field label="Route name" htmlFor="rf-name" required error={errors.name}>
            <input id="rf-name" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Agora – Bulua" className={err('name')} />
          </Field>
          <Field label="Direction" htmlFor="rf-dir">
            <Select id="rf-dir" value={form.direction} onChange={e => set('direction', e.target.value as Direction)}>
              {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Status" htmlFor="rf-status">
            <Select id="rf-status" value={form.status} onChange={e => set('status', e.target.value as RecordStatus)}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </Field>
          <Field label="Origin" htmlFor="rf-origin" required error={errors.origin}>
            <input id="rf-origin" value={form.origin} onChange={e => set('origin', e.target.value)}
              placeholder="Agora Terminal" className={err('origin')} />
          </Field>
          <Field label="Destination" htmlFor="rf-dest" required error={errors.destination}>
            <input id="rf-dest" value={form.destination} onChange={e => set('destination', e.target.value)}
              placeholder="Bulua" className={err('destination')} />
          </Field>
          <Field label="Major roads (comma-separated)" htmlFor="rf-roads" required error={errors.majorRoads} className="col-span-2">
            <input id="rf-roads" value={form.majorRoads} onChange={e => set('majorRoads', e.target.value)}
              placeholder="C.M. Recto Ave, Corrales Ave, Hayes St" className={err('majorRoads')} />
          </Field>
          <Field label="Description" htmlFor="rf-desc" required error={errors.description} className="col-span-2">
            <textarea id="rf-desc" rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Brief description of the route coverage and key landmarks."
              className={cn(inputClass, 'h-auto resize-none py-2.5', errors.description && errorInputClass)} />
          </Field>
          <Field label="Base fare (₱)" htmlFor="rf-fare" required error={errors.fare}>
            <input id="rf-fare" type="number" step="0.50" min="1" value={form.fare}
              onChange={e => set('fare', e.target.value)} className={cn(err('fare'), 'tabular-nums')} />
          </Field>
          <Field label="Travel time (minutes)" htmlFor="rf-time" required error={errors.travelTime}>
            <input id="rf-time" type="number" min="1" value={form.travelTime}
              onChange={e => set('travelTime', e.target.value)} className={cn(err('travelTime'), 'tabular-nums')} />
          </Field>
        </form>
      </Modal>
    </>
  );
}