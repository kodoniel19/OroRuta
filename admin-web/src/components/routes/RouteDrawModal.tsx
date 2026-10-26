import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RotateCcwIcon,
  Trash2Icon,
  Undo2Icon,
  ArrowLeftIcon,
  CheckIcon,
  MapPinIcon,
  PencilIcon,
  HandIcon,
  PenToolIcon,
  XIcon,
  PlusIcon,
  InfoIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TransitMap } from '../map/TransitMap';
import { locationKinds } from '../../data/locationKinds';
import { pathDistanceKm } from '../../utils/geo';
import type { LatLng, LocationKind, TransitLocation } from '../../types/transit';

export interface RoutePinItem {
  id: string;
  name: string;
  kind: LocationKind;
  address?: string;
  point: LatLng;
  isNew?: boolean;
}

interface RouteDrawModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  route: {
    id: string;
    code?: string;
    name: string;
    origin: string;
    destination: string;
    color: string;
  };
  path: LatLng[];
  initialPins?: TransitLocation[];
  onPathChange: (path: LatLng[]) => void;
  onBack: () => void;
  backLabel?: string;
  onClose: () => void;
  onSave: (path: LatLng[], pins: RoutePinItem[]) => Promise<void> | void;
}

type DrawTool = 'click' | 'freehand' | 'navigate';
type ModalStage = 'draw' | 'pins';

export function RouteDrawModal({
  open,
  mode,
  route,
  path,
  initialPins = [],
  onPathChange,
  onBack,
  backLabel = 'Back to details',
  onClose,
  onSave,
}: RouteDrawModalProps) {
  // Stage 1: 'draw' (draw route geometry) -> Stage 2: 'pins' (place landmark pins)
  const [stage, setStage] = useState<ModalStage>('draw');

  // Drawing state
  const [points, setPoints] = useState<LatLng[]>(path || []);
  const [history, setHistory] = useState<LatLng[][]>([]);
  const [drawTool, setDrawTool] = useState<DrawTool>('click');

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Landmark pins state (loaded initially from initialPins)
  const [pins, setPins] = useState<RoutePinItem[]>([]);
  const [pendingPin, setPendingPin] = useState<LatLng | null>(null);
  const [pinForm, setPinForm] = useState<{
    name: string;
    kind: LocationKind;
    address: string;
  }>({
    name: '',
    kind: 'landmark',
    address: '',
  });

  const [saving, setSaving] = useState(false);

  // Sync state whenever modal opens or route/path changes
  useEffect(() => {
    if (open) {
      setPoints(path || []);
      setHistory([]);
      setStage('draw');
      setPendingPin(null);
      setPinForm({ name: '', kind: 'landmark', address: '' });

      // Reload existing saved pins for this route
      const loaded: RoutePinItem[] = initialPins.map((loc) => ({
        id: loc.id,
        name: loc.name,
        kind: loc.kind,
        address: loc.address,
        point: [loc.lat, loc.lng] as LatLng,
        isNew: false,
      }));
      setPins(loaded);
    }
  }, [open, path, initialPins]);

  // Compute total route distance
  const distance = useMemo(() => pathDistanceKm(points), [points]);

  // ─────────────────────────────────────────────
  // ROUTE DRAWING ACTIONS
  // ─────────────────────────────────────────────

  // Add points to history before modifying
  const pushHistory = useCallback((currentPoints: LatLng[]) => {
    setHistory((prev) => [...prev.slice(-30), currentPoints]);
  }, []);

  // Map Click in DRAW stage: add point along street
  const handleMapClickDraw = useCallback(
    (point: LatLng) => {
      if (drawTool === 'navigate') return;
      pushHistory(points);
      const next = [...points, point];
      setPoints(next);
      onPathChange(next);
    },
    [drawTool, points, pushHistory, onPathChange]
  );

  // Freehand drag drawing in DRAW stage: stream points continuously
  const handleFreehandPoints = useCallback(
    (newPts: LatLng[]) => {
      if (drawTool !== 'freehand') return;
      setPoints((prev) => {
        pushHistory(prev);
        const next = [...prev, ...newPts];
        onPathChange(next);
        return next;
      });
    },
    [drawTool, pushHistory, onPathChange]
  );

  // Move point (drag vertex marker)
  const handlePointMove = useCallback(
    (index: number, newPoint: LatLng) => {
      pushHistory(points);
      const next = [...points];
      next[index] = newPoint;
      setPoints(next);
      onPathChange(next);
    },
    [points, pushHistory, onPathChange]
  );

  // Delete specific point
  const handlePointDelete = useCallback(
    (index: number) => {
      pushHistory(points);
      const next = points.filter((_, i) => i !== index);
      setPoints(next);
      onPathChange(next);
      toast.info(`Point #${index + 1} removed`);
    },
    [points, pushHistory, onPathChange]
  );

  // Undo last action
  const handleUndo = useCallback(() => {
    if (history.length === 0) {
      if (points.length > 0) {
        const next = points.slice(0, -1);
        setPoints(next);
        onPathChange(next);
      }
      return;
    }
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setPoints(previous);
    onPathChange(previous);
  }, [history, points, onPathChange]);

  // Clear all points
  const handleClear = useCallback(() => {
    pushHistory(points);
    setPoints([]);
    onPathChange([]);
    setClearDialogOpen(false);
  }, [points, pushHistory, onPathChange]);

  // ─────────────────────────────────────────────
  // CONFIRM ROUTE GEOMETRY
  // ─────────────────────────────────────────────

  const handleOpenConfirmDialog = () => {
    if (points.length < 2) {
      toast.error('Please draw at least 2 points to define the route geometry.');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmGeometry = () => {
    setConfirmDialogOpen(false);
    setStage('pins');
    setPendingPin(null);
    toast.success('Route geometry confirmed! You can now place landmark pins and transit stops.');
  };

  // ─────────────────────────────────────────────
  // LANDMARK PIN PLACEMENT (Stage 2)
  // ─────────────────────────────────────────────

  // Map Click in PINS stage: pick coordinate for new pin
  const handleMapClickPins = useCallback((point: LatLng) => {
    setPendingPin(point);
  }, []);

  // Save new pin
  const handleAddPin = () => {
    if (!pendingPin) return;
    if (!pinForm.name.trim()) {
      toast.error('Please enter a landmark or stop name.');
      return;
    }

    const newPin: RoutePinItem = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: pinForm.name.trim(),
      kind: pinForm.kind,
      address: pinForm.address.trim(),
      point: pendingPin,
      isNew: true,
    };

    setPins((prev) => [...prev, newPin]);
    toast.success(`${locationKinds[pinForm.kind]?.title || pinForm.kind} "${newPin.name}" added`);
    setPendingPin(null);
    setPinForm({ name: '', kind: 'landmark', address: '' });
  };

  // Delete placed pin
  const handleDeletePin = (pinId: string) => {
    setPins((prev) => prev.filter((p) => p.id !== pinId));
    toast.info('Pin removed from route');
  };

  // ─────────────────────────────────────────────
  // FINAL SAVE (Route Geometry + Pins)
  // ─────────────────────────────────────────────

  const handleFinalSave = async () => {
    if (points.length < 2) {
      toast.error('Route must have at least 2 points.');
      return;
    }

    setSaving(true);
    try {
      await onSave(points, pins);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save route geometry and pins');
    } finally {
      setSaving(false);
    }
  };

  // Determine what to display as custom pins
  const customPinsForMap = useMemo(() => {
    return pins.map((p) => ({
      id: p.id,
      point: p.point,
      name: p.name,
      kind: p.kind,
      address: p.address,
    }));
  }, [pins]);

  return (
    <>
      <Modal
        open={open}
        onClose={saving ? () => undefined : onClose}
        size="xl"
        title={
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: route.color }} />
            <span>
              {stage === 'draw' ? 'Draw Route Geometry' : 'Place Landmark Pins'}:{' '}
              <strong className="font-mono text-fg">{route.code || route.id}</strong> · {route.name}
            </span>
          </div>
        }
        description={
          stage === 'draw'
            ? 'Click or drag directly along actual streets to draw the manual route polyline. Drag points to adjust, click points to delete, or undo.'
            : 'Route geometry confirmed. Click on the map along the route to place landmark pins, terminals, loading/unloading zones, or verified stops.'
        }
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {stage === 'draw' ? (
                <Button variant="ghost" size="sm" icon={<ArrowLeftIcon className="h-4 w-4" />} onClick={onBack}>
                  {backLabel}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowLeftIcon className="h-4 w-4" />}
                  onClick={() => setStage('draw')}
                >
                  Edit route line
                </Button>
              )}
              <span className="text-xs text-fg-muted">
                {stage === 'draw'
                  ? `${points.length} point${points.length === 1 ? '' : 's'} · ${distance} km`
                  : `${pins.length} pin${pins.length === 1 ? '' : 's'} placed along route`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {stage === 'draw' ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Undo2Icon className="h-4 w-4" />}
                    disabled={points.length === 0}
                    onClick={handleUndo}
                  >
                    Undo
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcwIcon className="h-4 w-4" />}
                    disabled={points.length === 0}
                    onClick={() => setClearDialogOpen(true)}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<CheckIcon className="h-4 w-4" />}
                    disabled={points.length < 2}
                    onClick={handleOpenConfirmDialog}
                  >
                    Confirm Route Geometry
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setStage('draw')}
                  >
                    Back to geometry
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    loading={saving}
                    icon={<CheckIcon className="h-4 w-4" />}
                    onClick={handleFinalSave}
                  >
                    Save Route & {pins.length} Landmark Pins
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-2.5">
          {/* Stage Progress Tabs / Indicator */}
          <div className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 text-xs border border-line">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-1.5 font-medium ${
                  stage === 'draw' ? 'text-primary-600 font-semibold' : 'text-fg-muted'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    stage === 'draw'
                      ? 'bg-primary-600 text-white font-bold'
                      : points.length >= 2
                      ? 'bg-emerald-100 text-emerald-700 font-bold'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {points.length >= 2 && stage !== 'draw' ? '✓' : '1'}
                </span>
                <span>1. Draw Manual Route</span>
              </div>

              <span className="text-fg-subtle">&rarr;</span>

              <div
                className={`flex items-center gap-1.5 font-medium ${
                  stage === 'pins' ? 'text-primary-600 font-semibold' : 'text-fg-muted'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    stage === 'pins'
                      ? 'bg-primary-600 text-white font-bold'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  2
                </span>
                <span>2. Place Landmark Pins & Stops ({pins.length})</span>
              </div>
            </div>

            {/* Drawing tool selection in Draw Stage */}
            {stage === 'draw' ? (
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-line shadow-xs">
                <button
                  type="button"
                  onClick={() => setDrawTool('click')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    drawTool === 'click'
                      ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs'
                      : 'text-fg-muted hover:text-fg hover:bg-canvas'
                  }`}
                  title="Click on the map along streets to place points"
                >
                  <PencilIcon className="h-3 w-3" />
                  Click to Draw
                </button>
                <button
                  type="button"
                  onClick={() => setDrawTool('freehand')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    drawTool === 'freehand'
                      ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs'
                      : 'text-fg-muted hover:text-fg hover:bg-canvas'
                  }`}
                  title="Hold mouse down and drag along streets to draw continuously"
                >
                  <PenToolIcon className="h-3 w-3" />
                  Freehand Drag
                </button>
                <button
                  type="button"
                  onClick={() => setDrawTool('navigate')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    drawTool === 'navigate'
                      ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs'
                      : 'text-fg-muted hover:text-fg hover:bg-canvas'
                  }`}
                  title="Pan and zoom map without adding points"
                >
                  <HandIcon className="h-3 w-3" />
                  Pan Map
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                  ✓ Route line confirmed ({distance} km)
                </span>
              </div>
            )}
          </div>

          {/* Interactive instruction banner */}
          {stage === 'draw' ? (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800 flex items-center justify-between">
              <div>
                {drawTool === 'click' && (
                  <span>
                    <strong>Click Mode:</strong> Click along actual streets to place route points. Drag numbered markers to move points, or click a point to remove it.
                  </span>
                )}
                {drawTool === 'freehand' && (
                  <span>
                    <strong>Freehand Drag Mode:</strong> Press and drag mouse along streets to draw the line smoothly. Release mouse to finish segment.
                  </span>
                )}
                {drawTool === 'navigate' && (
                  <span>
                    <strong>Pan Mode:</strong> Freely drag and zoom map without adding points. Switch back to Click or Drag mode to continue drawing.
                  </span>
                )}
              </div>
              <div className="font-mono text-[11px] font-semibold text-blue-900 shrink-0 ml-2">
                {points.length} pts · {distance} km
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center justify-between">
              <div>
                <strong>Landmark Pin Mode:</strong> Click anywhere on the map to drop a pin for a landmark, terminal, loading point, unloading point, or verified stop.
              </div>
              <span className="font-semibold text-amber-900">{pins.length} pin(s) on route</span>
            </div>
          )}

          {/* Map Container */}
          <div className="relative h-[490px] overflow-hidden rounded-xl border border-line">
            <TransitMap
              routes={[]}
              locations={[]}
              draftPath={points}
              draftColor={route.color}
              draftMarkers={stage === 'draw' && points.length <= 60 ? 'numbered' : 'dots'}
              onDraftPointMove={stage === 'draw' ? handlePointMove : undefined}
              onDraftPointDelete={stage === 'draw' ? handlePointDelete : undefined}
              freehandMode={stage === 'draw' && drawTool === 'freehand'}
              onFreehandPoints={stage === 'draw' && drawTool === 'freehand' ? handleFreehandPoints : undefined}
              onMapClick={stage === 'draw' ? handleMapClickDraw : handleMapClickPins}
              pin={pendingPin}
              customPins={customPinsForMap}
              onCustomPinClick={(id) => {
                const target = pins.find((p) => p.id === id);
                if (target) {
                  toast.info(`${locationKinds[target.kind]?.title || target.kind}: "${target.name}"`);
                }
              }}
              fitTarget={points.length >= 2 ? 'draft' : 'all'}
              fitKey={`pts-${points.length}-stage-${stage}`}
              className="h-full w-full"
            />

            {/* Landmark Pin Form Overlay (in 'pins' stage when map clicked) */}
            {stage === 'pins' && pendingPin && (
              <div className="absolute top-4 left-4 z-[600] w-80 rounded-xl border border-line bg-white p-4 shadow-pop">
                <div className="flex items-center justify-between mb-3 border-b border-line pb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="h-4 w-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-fg">Place Landmark / Stop</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingPin(null)}
                    className="text-fg-muted hover:text-fg"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-fg-muted mb-1">
                      Name of landmark or stop *
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={pinForm.name}
                      onChange={(e) => setPinForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Gaisano City Mall, Cogon Loading Point"
                      className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-fg-muted mb-1">
                      Point Type
                    </label>
                    <select
                      value={pinForm.kind}
                      onChange={(e) =>
                        setPinForm((prev) => ({ ...prev, kind: e.target.value as LocationKind }))
                      }
                      className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-fg focus:border-primary-500 focus:outline-none"
                    >
                      <option value="landmark">Landmark / Place of Interest</option>
                      <option value="terminal">Jeepney Terminal</option>
                      <option value="loading">Loading Point (Boarding)</option>
                      <option value="unloading">Unloading Point (Drop-off)</option>
                      <option value="verified_stop">Verified Stop</option>
                      <option value="transfer">Transfer Point</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-fg-muted mb-1">
                      Address / Description (optional)
                    </label>
                    <input
                      type="text"
                      value={pinForm.address}
                      onChange={(e) => setPinForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Street, landmark details, or barangay"
                      className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-lg bg-canvas px-2.5 py-1.5 text-[11px] text-fg-subtle font-mono flex items-center justify-between">
                    <span>📍 {pendingPin[0].toFixed(5)}, {pendingPin[1].toFixed(5)}</span>
                    <span className="text-primary-600 font-semibold">{route.code || route.id}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPendingPin(null)}
                      className="flex-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-fg hover:bg-line"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPin}
                      disabled={!pinForm.name.trim()}
                      className="flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Add Pin to Route
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of placed pins overlay (in 'pins' stage) */}
            {stage === 'pins' && pins.length > 0 && !pendingPin && (
              <div className="absolute top-4 left-4 z-[500] max-h-72 w-72 overflow-y-auto rounded-xl border border-line bg-white/95 p-3 shadow-pop backdrop-blur">
                <div className="flex items-center justify-between border-b border-line pb-1.5 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                    Route Pins ({pins.length})
                  </span>
                  <span className="text-[10px] text-fg-subtle">Click map to add more</span>
                </div>
                <div className="space-y-1.5">
                  {pins.map((p) => {
                    const kindMeta = locationKinds[p.kind];
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-canvas/80 p-2 text-xs border border-line/60"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: kindMeta?.color || '#6366F1' }}
                          />
                          <div className="truncate">
                            <p className="font-medium text-fg truncate">{p.name}</p>
                            <p className="text-[10px] text-fg-muted">
                              {kindMeta?.singular || p.kind} · {p.point[0].toFixed(4)}, {p.point[1].toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePin(p.id)}
                          className="ml-2 text-fg-muted hover:text-danger-600 p-1 rounded transition-colors"
                          title="Remove pin"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog: Finalize Route Geometry */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        tone="primary"
        title="Confirm Route Geometry"
        message={
          <div className="space-y-2">
            <p>
              Is the drawn line the final route geometry for{' '}
              <strong className="text-fg">{route.code || route.id} — {route.name}</strong>?
            </p>
            <div className="rounded-lg bg-canvas p-2.5 text-xs text-fg-muted">
              <div>Total Distance: <strong className="text-fg">{distance} km</strong></div>
              <div>Points in Polyline: <strong className="text-fg">{points.length} points</strong></div>
            </div>
            <p className="text-xs text-fg-subtle">
              After confirming, you will proceed to placing landmark pins, terminals, loading/unloading points, and verified stops along this confirmed route path.
            </p>
          </div>
        }
        confirmLabel="Confirm & Place Landmark Pins →"
        onConfirm={handleConfirmGeometry}
      />

      {/* Confirmation Dialog: Clear All Points */}
      <ConfirmDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        tone="danger"
        title="Clear Drawn Geometry?"
        message="Are you sure you want to clear all drawn points for this route? You will have to draw the route line again."
        confirmLabel="Clear drawing"
        onConfirm={handleClear}
      />
    </>
  );
}
