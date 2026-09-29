import React, { useState } from 'react';
import { LayersIcon, MapIcon, RouteIcon, EyeIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { RouteChip } from '../components/ui/RouteChip';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TransitMap } from '../components/map/TransitMap';
import { useData } from '../contexts/DataContext';
import { locationKinds } from '../data/locationKinds';
import { peso } from '../utils/format';

export function RouteMaps() {
  const { routes, locations } = useData();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showStops, setShowStops] = useState(true);
  const [selectedKind, setSelectedKind] = useState<string>('all');

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  const visibleLocations = locations.filter((l) => {
    if (!showStops) return false;
    if (selectedKind !== 'all' && l.kind !== selectedKind) return false;
    if (selectedRouteId) return l.routeIds.includes(selectedRouteId);
    return true;
  });

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
            {routes.map((r) => {
              const active = selectedRouteId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRouteId(active ? null : r.id)}
                  className={`w-full p-3 text-left transition-colors duration-150 ${
                    active ? 'bg-primary-50/70 border-l-4 border-l-primary-600' : 'hover:bg-canvas'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RouteChip id={r.id} color={r.color} />
                      <span className="font-medium text-sm text-fg">{r.name}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    {r.origin} &rarr; {r.destination}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-fg-subtle">
                    <span>{r.direction}</span>
                    <span>{peso(r.fare)} · {r.travelTime}m</span>
                    <span className="font-mono">{r.path.length} pts</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRoute && (
            <div className="border-t border-line bg-canvas p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg">{selectedRoute.name}</span>
                <StatusBadge status={selectedRoute.status} />
              </div>
              <p className="mt-1 text-fg-muted">{selectedRoute.description}</p>
              <div className="mt-2 text-fg-subtle">
                Major corridors: {selectedRoute.majorRoads.join(', ')}
              </div>
            </div>
          )}
        </aside>

        {/* Main Map Canvas */}
        <main className="relative flex-1">
          <TransitMap
            routes={routes}
            locations={visibleLocations}
            selectedRouteId={selectedRouteId}
            onRouteClick={(id) => setSelectedRouteId(id === selectedRouteId ? null : id)}
            fitKey={selectedRouteId ?? 'all-routes'}
            className="h-full w-full"
          />

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
