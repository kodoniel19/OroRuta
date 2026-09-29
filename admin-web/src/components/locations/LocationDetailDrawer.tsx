import React, { useRef } from 'react';
import { PencilIcon, PowerIcon, Trash2Icon, MapPinIcon } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { RouteChip } from '../ui/RouteChip';
import { TransitMap } from '../map/TransitMap';
import { locationKinds } from '../../data/locationKinds';
import type { JeepneyRoute, TransitLocation } from '../../types/transit';
import { formatDateTime } from '../../utils/format';

interface LocationDetailDrawerProps {
  location: TransitLocation | null;
  routes: JeepneyRoute[];
  onClose: () => void;
  onEdit: (location: TransitLocation) => void;
  onToggleStatus: (location: TransitLocation) => void;
  onDelete: (location: TransitLocation) => void;
}

export function LocationDetailDrawer({
  location,
  routes,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
}: LocationDetailDrawerProps) {
  const lastRef = useRef<TransitLocation | null>(null);
  if (location) lastRef.current = location;
  const shown = location ?? lastRef.current;
  const config = shown ? locationKinds[shown.kind] : null;

  const servedRoutes = shown ? routes.filter((r) => shown.routeIds.includes(r.id)) : [];

  return (
    <Drawer
      open={!!location}
      onClose={onClose}
      title={
        shown && (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: config?.color }} aria-hidden />
            <span className="font-mono">{shown.id}</span>
            <span>{shown.name}</span>
          </span>
        )
      }
      subtitle={shown && `${shown.address} · Brgy. ${shown.barangay}`}
      footer={
        shown && (
          <>
            <Button
              variant="dangerGhost"
              icon={<Trash2Icon className="h-4 w-4" />}
              onClick={() => onDelete(shown)}
            >
              Delete
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant="secondary"
                icon={<PowerIcon className="h-4 w-4" />}
                onClick={() => onToggleStatus(shown)}
              >
                {shown.status === 'Active' ? 'Deactivate' : 'Activate'}
              </Button>
              <Button icon={<PencilIcon className="h-4 w-4" />} onClick={() => onEdit(shown)}>
                Edit {config?.singular ?? 'location'}
              </Button>
            </div>
          </>
        )
      }
    >
      {shown && (
        <>
          <div className="relative h-60 border-b border-line">
            <TransitMap
              routes={servedRoutes}
              locations={[shown]}
              highlightedLocationId={shown.id}
              focus={[shown.lat, shown.lng]}
              fitKey={shown.id}
              className="h-full w-full"
            />
          </div>

          <div className="space-y-6 px-6 py-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ['Type', config?.title],
                ['Status', <StatusBadge key="s" status={shown.status} />],
                ['Barangay', shown.barangay],
                ['GPS Coordinates', `${shown.lat.toFixed(5)}, ${shown.lng.toFixed(5)}`],
                ['Assigned Routes', `${shown.routeIds.length} routes`],
                ['Last Updated', formatDateTime(shown.lastUpdated)],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs text-fg-muted">{label}</dt>
                  <dd className="mt-1 font-medium text-fg">{value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <h3 className="text-xs text-fg-muted">Street Address</h3>
              <p className="mt-1 text-sm text-fg">{shown.address}</p>
            </div>

            <div>
              <h3 className="text-xs text-fg-muted">Assigned Routes ({servedRoutes.length})</h3>
              {servedRoutes.length === 0 ? (
                <p className="mt-1.5 text-sm text-fg-muted">No routes assigned.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {servedRoutes.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-line bg-canvas/60 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <RouteChip id={r.id} color={r.color} />
                        <span className="font-medium text-fg">{r.name}</span>
                      </div>
                      <span className="text-xs text-fg-muted">
                        {r.origin} &rarr; {r.destination}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {shown.notes && (
              <div>
                <h3 className="text-xs text-fg-muted">Operational Notes</h3>
                <p className="mt-1.5 rounded-lg bg-canvas p-3 text-xs leading-relaxed text-fg-muted">
                  {shown.notes}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
