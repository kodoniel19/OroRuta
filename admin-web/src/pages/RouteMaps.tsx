import React, { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { MapPinIcon, XIcon, ArrowLeftRightIcon } from 'lucide-react';
import { RouteChip } from '../components/ui/RouteChip';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TransitMap } from '../components/map/TransitMap';
import { useData } from '../contexts/DataContext';
import { locationKinds } from '../data/locationKinds';
import { peso } from '../utils/format';
import { api } from '../services/api';
import type { LatLng, LocationKind, TransitLocation, JeepneyRoute } from '../types/transit';

export function RouteMaps() {
  const { routes, locations, setLocations, logActivity } = useData();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeDirections, setRouteDirections] = useState<Record<string, 'Inbound' | 'Outbound'>>({});
  const [showStops, setShowStops] = useState(true);
  const [selectedKind, setSelectedKind] = useState<string>('all');

  const getDirection = useCallback((routeId: string): 'Inbound' | 'Outbound' => {
    return routeDirections[routeId] ?? 'Inbound';
  }, [routeDirections]);

  const setDirection = useCallback((routeId: string, dir: 'Inbound' | 'Outbound', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRouteDirections((prev) => ({
      ...prev,
      [routeId]: dir,
    }));
  }, []);

  const getRouteGeometry = useCallback((route: JeepneyRoute, direction: 'Inbound' | 'Outbound'): { path: LatLng[]; distanceKm: number | null } => {
    if (route.geometries && route.geometries.length > 0) {
      const match = route.geometries.find((g: any) => g.direction?.toLowerCase() === direction.toLowerCase());
      if (match?.geometry?.coordinates && Array.isArray(match.geometry.coordinates) && match.geometry.coordinates.length > 0) {
        const coords: LatLng[] = match.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        return { path: coords, distanceKm: match.distance_km ? parseFloat(match.distance_km) : null };
      }
    }
    const dist = direction === 'Inbound' ? route.inboundDistanceKm : route.outboundDistanceKm;
    return { path: route.path, distanceKm: dist ?? null };
  }, []);

  const displayedRoutes = useMemo(() => {
    return routes.map((r) => {
      const dir = routeDirections[r.id] ?? 'Inbound';
      const { path } = getRouteGeometry(r, dir);
      return {
        ...r,
        direction: dir,
        path,
      };
    });
  }, [routes, routeDirections, getRouteGeometry]);

  // Landmark pin placement state
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<LatLng | null>(null);
  const [pinForm, setPinForm] = useState<{
    name: string;
    kind: LocationKind;
    address: string;
  }>({ name: '', kind: 'loading', address: '' });
  const [savingPin, setSavingPin] = useState(false);

  const selectedRoute = displayedRoutes.find((r) => r.id === selectedRouteId) ?? null;

  const visibleLocations = locations.filter((l) => {
    if (!showStops) return false;
    if (selectedKind !== 'all' && l.kind !== selectedKind) return false;
    if (selectedRouteId) {
      const code = selectedRoute?.code;
      const matchId = l.routeIds.includes(selectedRouteId);
      const matchCode = code
        ? l.routeIds.some(
            (rid) =>
              rid.toLowerCase() === code.toLowerCase() ||
              rid.replace(/^R0?/, 'R') === code.replace(/^R0?/, 'R')
          )
        : false;
      return matchId || matchCode;
    }
    return true;
  });

  const handleMapClick = useCallback((point: LatLng) => {
    if (pinMode) {
      setPendingPin(point);
    }
  }, [pinMode]);

  const handleSavePin = useCallback(async () => {
    if (!pendingPin || !pinForm.name.trim()) return;

    setSavingPin(true);
    try {
      const newLocation: Partial<TransitLocation> = {
        name: pinForm.name.trim(),
        kind: pinForm.kind,
        address: pinForm.address.trim(),
        lat: pendingPin[0],
        lng: pendingPin[1],
        routeIds: selectedRouteId ? [selectedRouteId] : [],
        status: 'Active',
        notes: '',
        barangay: '',
      };

      const result = await api.locations.create(newLocation as TransitLocation);
      if (result) {
        // Add to local state
        const created: TransitLocation = {
          id: (result as any).id || `loc-${Date.now()}`,
          ...newLocation as TransitLocation,
          lastUpdated: new Date().toISOString(),
        };
        setLocations(prev => [...prev, created]);
        logActivity({
          routeId: selectedRouteId || '-',
          action: 'Created',
          detail: `${pinForm.kind} point "${pinForm.name}" added at [${pendingPin[0].toFixed(5)}, ${pendingPin[1].toFixed(5)}]`,
        });
        toast.success(`${pinForm.kind} point "${pinForm.name}" added`);
        setPendingPin(null);
        setPinForm({ name: '', kind: 'loading', address: '' });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save pin');
    } finally {
      setSavingPin(false);
    }
  }, [pendingPin, pinForm, selectedRouteId, setLocations, logActivity]);

  const handleCancelPin = useCallback(() => {
    setPendingPin(null);
    setPinForm({ name: '', kind: 'loading', address: '' });
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <div className="border-b border-line bg-white px-6 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-fg">Route Maps & Spatial Geometry</h1>
            <p className="text-xs text-fg-muted">
              Live visualization of Cagayan de Oro LPTRP jeepney alignments and transit stops.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-fg-muted">
              <input
                type="checkbox"
                checked={showStops}
                onChange={(e) => setShowStops(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-line accent-primary-600"
              />
              Show Stops
            </label>

            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              disabled={!showStops}
              className="h-8 rounded-lg border border-line bg-white px-2.5 text-xs text-fg focus:border-primary-500 focus:outline-none disabled:opacity-50"
            >
              <option value="all">All stop types</option>
              <option value="terminal">Terminals only</option>
              <option value="loading">Loading points only</option>
              <option value="unloading">Unloading points only</option>
              <option value="transfer">Transfer points only</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setPinMode(!pinMode);
                if (pinMode) {
                  setPendingPin(null);
                  setPinForm({ name: '', kind: 'loading', address: '' });
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                pinMode
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'border border-line bg-canvas text-fg hover:bg-line'
              }`}
            >
              <MapPinIcon className="h-3.5 w-3.5" />
              {pinMode ? 'Pin Mode ON' : 'Place Pin'}
            </button>

            {selectedRoute && (
              <div className="flex items-center rounded-lg border border-line bg-canvas p-0.5">
                <button
                  type="button"
                  onClick={() => setDirection(selectedRoute.id, 'Inbound')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    getDirection(selectedRoute.id) === 'Inbound'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Inbound
                </button>
                <button
                  type="button"
                  onClick={() => setDirection(selectedRoute.id, 'Outbound')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    getDirection(selectedRoute.id) === 'Outbound'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Outbound
                </button>
              </div>
            )}

            {selectedRouteId && (
              <button
                type="button"
                onClick={() => setSelectedRouteId(null)}
                className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-medium text-fg hover:bg-line"
              >
                Reset selection
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Route Selector Sidebar */}
        <aside className="z-10 flex w-80 flex-col border-r border-line bg-white shadow-card">
          <div className="border-b border-line bg-canvas/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Jeepney Routes ({routes.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {displayedRoutes.map((r) => {
              const active = selectedRouteId === r.id;
              const dir = getDirection(r.id);
              const geom = getRouteGeometry(r, dir);
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRouteId(active ? null : r.id)}
                  className={`w-full p-3 text-left transition-colors duration-150 cursor-pointer ${
                    active ? 'bg-primary-50/70 border-l-4 border-l-primary-600' : 'hover:bg-canvas'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RouteChip id={r.code || r.id} color={r.color} />
                      <span className="font-medium text-sm text-fg truncate max-w-[180px]">{r.name}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted truncate">
                    {dir === 'Inbound' ? `${r.origin} → ${r.destination}` : `${r.destination} → ${r.origin}`}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-fg-subtle">
                    <span>{dir}</span>
                    <span>{peso(r.fare)} · {r.travelTime}m</span>
                    <span className="font-mono">{geom.path.length} pts</span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedRoute && (() => {
            const selectedDir = getDirection(selectedRoute.id);
            const geom = getRouteGeometry(selectedRoute, selectedDir);
            const distance = selectedDir === 'Inbound' ? selectedRoute.inboundDistanceKm : selectedRoute.outboundDistanceKm;

            return (
              <div className="border-t border-line bg-canvas p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">{selectedRoute.name}</span>
                  <StatusBadge status={selectedRoute.status} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-fg-muted">
                  <span className="font-medium">{selectedDir} Alignment</span>
                  <span className="font-mono text-[11px]">{geom.path.length} pts {distance ? `· ${distance} km` : ''}</span>
                </div>
                <p className="mt-2 text-fg-muted">{selectedRoute.description}</p>
                <div className="mt-2 text-fg-subtle">
                  Major corridors: {selectedRoute.majorRoads.join(', ')}
                </div>
              </div>
            );
          })()}
        </aside>

        {/* Main Map Canvas */}
        <main className="relative flex-1">
          <TransitMap
            routes={displayedRoutes}
            locations={visibleLocations}
            selectedRouteId={selectedRouteId}
            onRouteClick={(id) => setSelectedRouteId(id === selectedRouteId ? null : id)}
            onMapClick={pinMode ? handleMapClick : undefined}
            pin={pendingPin}
            fitKey={`${selectedRouteId ?? 'all-routes'}-${routeDirections[selectedRouteId ?? ''] ?? 'Inbound'}`}
            className="h-full w-full"
          />

          {/* Pin placement form overlay */}
          {pinMode && pendingPin && (
            <div className="absolute top-4 left-4 z-[600] w-72 rounded-xl border border-line bg-white p-4 shadow-pop">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-fg">New Location Pin</h3>
                <button type="button" onClick={handleCancelPin} className="text-fg-muted hover:text-fg">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-fg-muted mb-1">Name *</label>
                  <input
                    type="text"
                    value={pinForm.name}
                    onChange={(e) => setPinForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Gaisano City Mall"
                    className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-fg-muted mb-1">Type</label>
                  <select
                    value={pinForm.kind}
                    onChange={(e) => setPinForm(prev => ({ ...prev, kind: e.target.value as LocationKind }))}
                    className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-fg focus:border-primary-500 focus:outline-none"
                  >
                    <option value="terminal">Terminal</option>
                    <option value="loading">Loading Point</option>
                    <option value="unloading">Unloading Point</option>
                    <option value="transfer">Transfer Point</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-fg-muted mb-1">Address</label>
                  <input
                    type="text"
                    value={pinForm.address}
                    onChange={(e) => setPinForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Street address (optional)"
                    className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-lg bg-canvas px-2.5 py-1.5 text-[11px] text-fg-subtle font-mono">
                  📍 {pendingPin[0].toFixed(5)}, {pendingPin[1].toFixed(5)}
                  {selectedRouteId && (
                    <span className="ml-1 text-primary-600">→ Route {selectedRoute?.code || selectedRouteId}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelPin}
                    className="flex-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-fg hover:bg-line"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePin}
                    disabled={!pinForm.name.trim() || savingPin}
                    className="flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {savingPin ? 'Saving...' : 'Save Pin'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pin mode instruction overlay */}
          {pinMode && !pendingPin && (
            <div className="absolute top-4 left-4 z-[600] rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 shadow-sm">
              <p className="text-xs text-amber-800 font-medium">
                📍 Click on the map to place a location pin
              </p>
            </div>
          )}

          {/* Map legend overlay */}
          <div className="absolute bottom-4 right-4 z-[500] rounded-xl border border-line bg-white/95 p-3 shadow-pop backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted mb-2">Legend</p>
            <div className="space-y-1.5 text-xs">
              {Object.entries(locationKinds).map(([k, meta]) => (
                <div key={k} className="flex items-center gap-2 text-fg-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span>{meta.title}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 border-t border-line text-fg-muted">
                <span className="h-1 w-4 rounded-full bg-primary-600" />
                <span>Active Route Line</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
