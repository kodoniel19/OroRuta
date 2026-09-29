import React, { useRef } from 'react';
import { PencilIcon, PowerIcon, Trash2Icon, SplineIcon } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { RouteChip } from '../ui/RouteChip';
import { useData } from '../../contexts/DataContext';
import type { JeepneyRoute } from '../../types/transit';
import { formatDateTime, peso } from '../../utils/format';

interface RouteDetailDrawerProps {
  route: JeepneyRoute | null;
  onClose: () => void;
  onEdit: (route: JeepneyRoute) => void;
  onEditMap: (route: JeepneyRoute) => void;
  onToggleStatus: (route: JeepneyRoute) => void;
  onDelete: (route: JeepneyRoute) => void;
}

export function RouteDetailDrawer({ route, onClose, onEdit, onEditMap, onToggleStatus, onDelete }: RouteDetailDrawerProps) {
  const { locations } = useData();
  const lastRef = useRef<JeepneyRoute | null>(null);
  if (route) lastRef.current = route;
  const shown = route ?? lastRef.current;
  const stops = shown ? locations.filter((l) => l.routeIds.includes(shown.id)) : [];

  return (
    <Drawer
      open={!!route}
      onClose={onClose}
      title={
        shown && (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: shown.color }} aria-hidden />
            <span className="font-mono">{shown.id}</span>
            <span>{shown.name}</span>
          </span>
        )
      }
      subtitle={shown ? `${shown.origin} → ${shown.destination}` : ''}
      footer={
        shown && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<SplineIcon className="h-4 w-4" />} onClick={() => onEditMap(shown)}>
              Edit map
            </Button>
            <Button size="sm" icon={<PencilIcon className="h-4 w-4" />} onClick={() => onEdit(shown)}>
              Edit details
            </Button>
            <Button
              size="sm"
              variant={shown.status === 'Active' ? 'secondary' : 'primary'}
              icon={<PowerIcon className="h-4 w-4" />}
              onClick={() => onToggleStatus(shown)}
            >
              {shown.status === 'Active' ? 'Deactivate' : 'Activate'}
            </Button>
            <Button size="sm" variant="danger" icon={<Trash2Icon className="h-4 w-4" />} onClick={() => onDelete(shown)}>
              Delete
            </Button>
          </div>
        )
      }
    >
      {shown && (
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-3">
            <RouteChip id={shown.id} color={shown.color} />
            <StatusBadge status={shown.status} />
            <span className="ml-auto text-xs text-fg-subtle">{shown.direction}</span>
          </div>

          <p className="text-sm text-fg leading-relaxed">{shown.description}</p>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-fg-muted">Base Fare</dt>
              <dd className="mt-1 font-semibold text-fg tabular-nums">₱{shown.fare.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Travel Time</dt>
              <dd className="mt-1 font-medium text-fg">{shown.travelTime} min</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Origin</dt>
              <dd className="mt-1 font-medium text-fg">{shown.origin}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Destination</dt>
              <dd className="mt-1 font-medium text-fg">{shown.destination}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-fg-muted">Major Roads</dt>
              <dd className="mt-1 text-fg">{shown.majorRoads.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Path Points</dt>
              <dd className="mt-1 font-mono text-sm text-fg-muted">{shown.path.length} pts</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Last Updated</dt>
              <dd className="mt-1 text-fg-muted text-sm">{formatDateTime(shown.lastUpdated)}</dd>
            </div>
          </dl>

          {stops.length > 0 && (
            <div>
              <p className="text-xs text-fg-muted mb-2">Related stops & terminals ({stops.length})</p>
              <div className="space-y-1.5">
                {stops.map(s => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />
                    <span className="font-medium text-fg">{s.name}</span>
                    <span className="text-fg-muted text-xs ml-auto">{s.kind}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}