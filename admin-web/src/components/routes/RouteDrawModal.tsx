import React from 'react';
import { RotateCcwIcon, Trash2Icon, Undo2Icon, ArrowLeftIcon, CheckIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TransitMap } from '../map/TransitMap';
import type { LatLng } from '../../types/transit';

interface RouteDrawModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  route: {
    id: string;
    name: string;
    origin: string;
    destination: string;
    color: string;
  };
  path: LatLng[];
  onPathChange: (path: LatLng[]) => void;
  onBack: () => void;
  backLabel?: string;
  onClose: () => void;
  onSave: (path: LatLng[]) => void;
}

export function RouteDrawModal({
  open,
  mode,
  route,
  path,
  onPathChange,
  onBack,
  backLabel = 'Back to details',
  onClose,
  onSave,
}: RouteDrawModalProps) {
  const handleMapClick = (p: LatLng) => {
    onPathChange([...path, p]);
  };

  const handlePointMove = (index: number, newPoint: LatLng) => {
    const next = [...path];
    next[index] = newPoint;
    onPathChange(next);
  };

  const handleUndo = () => {
    if (path.length > 0) {
      onPathChange(path.slice(0, -1));
    }
  };

  const handleClear = () => {
    onPathChange([]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Draw Route Geometry: ${route.id} · ${route.name}`}
      description={`Click on the map along the jeepney's travel path from ${route.origin} to ${route.destination}. Drag any numbered point to reposition.`}
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<ArrowLeftIcon className="h-4 w-4" />} onClick={onBack}>
              {backLabel}
            </Button>
            <span className="text-xs text-fg-muted">
              {path.length} {path.length === 1 ? 'waypoint' : 'waypoints'} placed
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Undo2Icon className="h-4 w-4" />}
              disabled={path.length === 0}
              onClick={handleUndo}
            >
              Undo point
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcwIcon className="h-4 w-4" />}
              disabled={path.length === 0}
              onClick={handleClear}
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<CheckIcon className="h-4 w-4" />}
              disabled={path.length < 2}
              onClick={() => onSave(path)}
            >
              Save route geometry ({path.length} pts)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 text-xs text-fg-muted">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: route.color }} />
            <span className="font-mono font-medium text-fg">{route.id}</span>
            <span>
              <strong>Point A (Green):</strong> {route.origin} &rarr; <strong>Point B (Red):</strong> {route.destination}
            </span>
          </div>
          <span className="text-fg-subtle">
            {path.length < 2 ? 'Place at least 2 points along the roads' : 'Geometry ready to save'}
          </span>
        </div>

        <div className="relative h-[480px] overflow-hidden rounded-xl border border-line">
          <TransitMap
            routes={[]}
            locations={[]}
            draftPath={path}
            draftColor={route.color}
            draftMarkers="numbered"
            draftLabels={{ start: route.origin, end: route.destination }}
            onDraftPointMove={handlePointMove}
            onMapClick={handleMapClick}
            fitTarget="draft"
            fitKey={path.length === 0 ? 'empty' : `pts-${path.length}`}
            className="h-full w-full"
          />
        </div>
      </div>
    </Modal>
  );
}
