import React, { useEffect, useState } from 'react';
import { CrosshairIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, inputClass, errorInputClass } from '../ui/Field';
import { Select } from '../ui/Select';
import { TransitMap, CDO_CENTER } from '../map/TransitMap';
import { locationKinds } from '../../data/locationKinds';
import type { JeepneyRoute, LatLng, LocationKind, LocationStatus, TransitLocation } from '../../types/transit';
import { delay, nextId } from '../../utils/async';
import { nowIso } from '../../utils/format';
import { cn } from '../../utils/cn';

interface LocationFormModalProps {
  open: boolean;
  onClose: () => void;
  kind: LocationKind;
  initial: TransitLocation | null;
  locations: TransitLocation[];
  routes: JeepneyRoute[];
  onSave: (location: TransitLocation) => void;
}

type FormState = {
  name: string;
  address: string;
  barangay: string;
  lat: string;
  lng: string;
  routeIds: string[];
  status: LocationStatus;
  notes: string;
};
type Errors = Partial<Record<keyof FormState | 'coords', string>>;

const BOUNDS = { latMin: 8.35, latMax: 8.6, lngMin: 124.5, lngMax: 124.85 };

function toForm(l: TransitLocation | null): FormState {
  return l
    ? {
        name: l.name,
        address: l.address,
        barangay: l.barangay,
        lat: String(l.lat),
        lng: String(l.lng),
        routeIds: l.routeIds,
        status: l.status,
        notes: l.notes,
      }
    : { name: '', address: '', barangay: '', lat: '', lng: '', routeIds: [], status: 'Active', notes: '' };
}

export function LocationFormModal({
  open,
  onClose,
  kind,
  initial,
  locations,
  routes,
  onSave,
}: LocationFormModalProps) {
  const config = locationKinds[kind];
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [focus, setFocus] = useState<LatLng | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toForm(initial));
      setErrors({});
      setFocus(initial ? [initial.lat, initial.lng] : null);
    }
  }, [open, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, coords: key === 'lat' || key === 'lng' ? undefined : e.coords }));
  };

  const lat = parseFloat(form.lat);
  const lng = parseFloat(form.lng);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);
  const pin: LatLng | null = hasCoords ? [lat, lng] : null;

  const toggleRoute = (id: string) =>
    set(
      'routeIds',
      form.routeIds.includes(id) ? form.routeIds.filter((r) => r !== id) : [...form.routeIds, id],
    );

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = 'Enter a name';
    if (!form.address.trim()) e.address = 'Enter a street address';
    if (!form.barangay.trim()) e.barangay = 'Enter the barangay';
    if (!hasCoords) e.coords = 'Click the map or type coordinates';
    else if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lng < BOUNDS.lngMin || lng > BOUNDS.lngMax)
      e.coords = 'Coordinates fall outside Cagayan de Oro City';
    if (form.routeIds.length === 0) e.routeIds = 'Assign at least one route';
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    await delay(700);
    onSave({
      id: initial?.id ?? nextId(config.prefix, locations.map((l) => l.id)),
      kind,
      name: form.name.trim(),
      address: form.address.trim(),
      barangay: form.barangay.trim(),
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      routeIds: form.routeIds,
      status: form.status,
      notes: form.notes.trim(),
      lastUpdated: nowIso(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      size="xl"
      title={initial ? `Edit ${initial.name}` : `Add ${config.singular}`}
      description="Set the GPS position by clicking on the map, then assign the routes that stop here."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="location-form" loading={saving}>
            {initial ? 'Save changes' : `Add ${config.singular}`}
          </Button>
        </>
      }
    >
      <form id="location-form" onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Name" htmlFor="loc-name" required error={errors.name}>
            <input
              id="loc-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Limketkai Center Loading Bay"
              className={cn(inputClass, errors.name && errorInputClass)}
            />
          </Field>
          <Field label="Street address" htmlFor="loc-address" required error={errors.address}>
            <input
              id="loc-address"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="e.g. Limketkai Drive, Lapasan"
              className={cn(inputClass, errors.address && errorInputClass)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Barangay" htmlFor="loc-brgy" required error={errors.barangay}>
              <input
                id="loc-brgy"
                value={form.barangay}
                onChange={(e) => set('barangay', e.target.value)}
                placeholder="Lapasan"
                className={cn(inputClass, errors.barangay && errorInputClass)}
              />
            </Field>
            <Field label="Status" htmlFor="loc-status">
              <Select
                id="loc-status"
                value={form.status}
                onChange={(e) => set('status', e.target.value as LocationStatus)}
              >
                <option value="Active">Active</option>
                <option value="Under Review">Under Review</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
          </div>

          <Field
            label={`Assigned routes (${form.routeIds.length})`}
            htmlFor="loc-routes"
            required
            error={errors.routeIds}
          >
            <div
              id="loc-routes"
              className={cn(
                'grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-lg border p-1.5',
                errors.routeIds ? 'border-danger-500' : 'border-line',
              )}
            >
              {routes.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-canvas"
                >
                  <input
                    type="checkbox"
                    checked={form.routeIds.includes(r.id)}
                    onChange={() => toggleRoute(r.id)}
                    className="h-3.5 w-3.5 rounded border-line accent-primary-600"
                  />
                  <span className="font-mono font-medium text-fg">{r.id}</span>
                  <span className="truncate text-fg-muted">{r.name}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Notes / Operation details" htmlFor="loc-notes">
            <textarea
              id="loc-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="e.g. Bugo-bound units load at Bay 4. Heavy student volume 6–8 AM."
              className={cn(inputClass, 'h-auto resize-none py-2 text-xs')}
            />
          </Field>
        </div>

        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13px] font-medium text-fg">
              Map Location <span className="text-danger-600">*</span>
            </label>
            <button
              type="button"
              onClick={() => setFocus(pin ?? CDO_CENTER)}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
            >
              <CrosshairIcon className="h-3.5 w-3.5" /> Center on pin
            </button>
          </div>

          <div className="relative h-64 overflow-hidden rounded-lg border border-line">
            <TransitMap
              routes={routes}
              locations={locations.filter((l) => l.id !== initial?.id)}
              pin={pin}
              focus={focus}
              onMapClick={(p) => {
                set('lat', p[0].toFixed(5));
                set('lng', p[1].toFixed(5));
              }}
              className="h-full w-full"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Latitude" htmlFor="loc-lat" error={errors.coords}>
              <input
                id="loc-lat"
                value={form.lat}
                onChange={(e) => set('lat', e.target.value)}
                placeholder="8.48570"
                className={cn(inputClass, 'font-mono text-xs tabular-nums', errors.coords && errorInputClass)}
              />
            </Field>
            <Field label="Longitude" htmlFor="loc-lng">
              <input
                id="loc-lng"
                value={form.lng}
                onChange={(e) => set('lng', e.target.value)}
                placeholder="124.65890"
                className={cn(inputClass, 'font-mono text-xs tabular-nums', errors.coords && errorInputClass)}
              />
            </Field>
          </div>
          <p className="mt-1 text-xs text-fg-subtle">
            Tip: Click anywhere on the map to pin this transit stop.
          </p>
        </div>
      </form>
    </Modal>
  );
}