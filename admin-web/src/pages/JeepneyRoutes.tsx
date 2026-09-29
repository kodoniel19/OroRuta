import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BusFrontIcon, EyeIcon, PencilIcon, PlusIcon, RouteIcon, SearchXIcon, SplineIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { SearchInput } from '../components/ui/SearchInput';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Select } from '../components/ui/Select';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { RouteChip } from '../components/ui/RouteChip';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RouteFormModal } from '../components/routes/RouteFormModal';
import { RouteDetailDrawer } from '../components/routes/RouteDetailDrawer';
import { RouteDrawModal } from '../components/routes/RouteDrawModal';
import { useData } from '../contexts/DataContext';
import { useSimulatedLoad } from '../hooks/useSimulatedLoad';
import { api } from '../services/api';
import type { Direction, JeepneyRoute, LatLng, RecordStatus } from '../types/transit';
import { formatRelative, nowIso, peso } from '../utils/format';
import { toCoordinates } from '../utils/geo';
import { cn } from '../utils/cn';

type StatusFilter = 'All' | RecordStatus;
const DIRECTIONS: Array<Direction | 'All'> = ['All', 'Northbound', 'Southbound', 'Eastbound', 'Westbound', 'Loop'];

export function JeepneyRoutes() {
  const { routes, setRoutes, locations, logActivity } = useData();
  const loading = useSimulatedLoad();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [direction, setDirection] = useState<Direction | 'All'>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JeepneyRoute | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'deactivate'; route: JeepneyRoute } | null>(null);
  const [mapRoute, setMapRoute] = useState<JeepneyRoute | null>(null);
  const [mapPath, setMapPath] = useState<LatLng[]>([]);
  const [mapOpen, setMapOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return routes.filter(
      (r) =>
        (status === 'All' || r.status === status) &&
        (direction === 'All' || r.direction === direction) &&
        (!q || [r.id, r.name, r.origin, r.destination, ...r.majorRoads].some((v) => v.toLowerCase().includes(q))),
    );
  }, [routes, query, status, direction]);

  const viewing = routes.find((r) => r.id === viewingId) ?? null;
  const hasFilters = query || status !== 'All' || direction !== 'All';

  const clearFilters = () => { setQuery(''); setStatus('All'); setDirection('All'); };

  const openCreate = () => { setEditing(null); setFormOpen(true); };

  const openEdit = (route: JeepneyRoute) => {
    setViewingId(null);
    setEditing(route);
    setFormOpen(true);
  };

  const handleSave = (route: JeepneyRoute) => {
    if (editing) {
      setRoutes((prev) => prev.map((r) => (r.id === editing.id ? route : r)));
      api.routes.update(editing.id, route).catch((e) => console.error('Route update error:', e));
      const rerouted = editing.path !== route.path;
      logActivity({
        routeId: route.id,
        action: rerouted ? 'Rerouted' : editing.fare !== route.fare ? 'Fare updated' : 'Edited',
        detail: rerouted
          ? `Path updated for ${route.name}`
          : editing.fare !== route.fare
          ? `Fare changed from ₱${editing.fare} to ₱${route.fare}`
          : `Details updated for ${route.name}`,
      });
      toast.success(`${route.id} updated`);
    } else {
      setRoutes((prev) => [route, ...prev]);
      api.routes.create(route).catch((e) => console.error('Route create error:', e));
      logActivity({ routeId: route.id, action: 'Created', detail: `${route.name} added` });
      toast.success(`${route.id} created`);
    }
  };

  const handleToggleStatus = (route: JeepneyRoute) => {
    const next: RecordStatus = route.status === 'Active' ? 'Inactive' : 'Active';
    setRoutes((prev) => prev.map((r) => (r.id === route.id ? { ...r, status: next, lastUpdated: nowIso() } : r)));
    api.routes.update(route.id, { status: next }).catch((e) => console.error('Route status error:', e));
    logActivity({ routeId: route.id, action: next === 'Active' ? 'Activated' : 'Deactivated', detail: `${route.name} marked ${next}` });
    toast.success(`${route.id} marked ${next}`);
  };

  const handleDelete = (route: JeepneyRoute) => {
    setRoutes((prev) => prev.filter((r) => r.id !== route.id));
    api.routes.delete(route.id).catch((e) => console.error('Route delete error:', e));
    if (viewingId === route.id) setViewingId(null);
    logActivity({ routeId: route.id, action: 'Deleted', detail: `${route.name} removed from system` });
    toast.success(`${route.id} deleted`);
  };

  const openMap = (route: JeepneyRoute) => {
    setMapRoute(route);
    setMapPath(route.path ?? []);
    setMapOpen(true);
  };

  const handleMapSave = (path: LatLng[]) => {
    if (!mapRoute) return;
    const updated = { ...mapRoute, path, coordinates: toCoordinates(path), lastUpdated: nowIso() };
    setRoutes((prev) => prev.map((r) => (r.id === mapRoute.id ? updated : r)));
    api.routes.update(mapRoute.id, { path, coordinates: toCoordinates(path) }).catch((e) => console.error('Map save error:', e));
    logActivity({ routeId: mapRoute.id, action: 'Rerouted', detail: `Path updated via map editor (${path.length} points)` });
    toast.success(`${mapRoute.id} path saved`);
    setMapOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Jeepney Routes"
        description={`${routes.filter(r => r.status === 'Active').length} active of ${routes.length} routes · Click a row to view details`}
        actions={<Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>Add route</Button>}
      />

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search ID, name, origin, road…" className="w-full sm:w-72" />
          <Select value={direction} onChange={e => setDirection(e.target.value as Direction | 'All')} className="w-40">
            {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
          </Select>
          <SegmentedControl label="Filter by status" value={status} onChange={(v) => setStatus(v as StatusFilter)} options={[
            { value: 'All', label: 'All', count: routes.length },
            { value: 'Active', label: 'Active', count: routes.filter(r => r.status === 'Active').length },
            { value: 'Inactive', label: 'Inactive', count: routes.filter(r => r.status === 'Inactive').length },
          ]} />
          <p className="ml-auto text-[13px] text-fg-muted">Showing {filtered.length} of {routes.length}</p>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : routes.length === 0 ? (
          <EmptyState icon={<BusFrontIcon className="h-5 w-5" />} title="No routes yet"
            description="Add jeepney routes based on the CDO Local Public Transport Route Plan."
            action={<Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>Add route</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<SearchXIcon className="h-5 w-5" />} title="No routes match"
            description="Try a different search or filter."
            action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-left text-xs font-medium text-fg-muted">
                  {['Route', 'Name', 'Origin → Destination', 'Direction', 'Fare', 'Status', 'Updated', ''].map((h, i) => (
                    <th key={i} scope="col" className="px-4 py-2.5 font-medium">
                      {h || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(r => (
                  <tr key={r.id} className="cursor-pointer transition-colors duration-150 hover:bg-canvas"
                    onClick={() => setViewingId(r.id)}>
                    <td className="px-4 py-3.5">
                      <RouteChip id={r.id} color={r.color} />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-[200px] truncate font-medium text-fg">{r.name}</p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">{r.majorRoads.slice(0, 2).join(', ')}</p>
                    </td>
                    <td className="px-4 py-3.5 text-fg-muted">
                      <span className="truncate max-w-[200px] block">{r.origin} → {r.destination}</span>
                    </td>
                    <td className="px-4 py-3.5 text-fg-muted">{r.direction}</td>
                    <td className="px-4 py-3.5 tabular-nums font-medium text-fg">₱{r.fare.toFixed(2)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3.5 text-xs text-fg-subtle">{formatRelative(r.lastUpdated)}</td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5 justify-end">
                        <IconButton label="Edit geometry" onClick={() => openMap(r)}>
                          <SplineIcon className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Edit ${r.id}`} onClick={() => openEdit(r)}>
                          <PencilIcon className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Delete ${r.id}`} tone="danger" onClick={() => setConfirm({ type: 'delete', route: r })}>
                          <Trash2Icon className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RouteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        routes={routes}
        onSave={handleSave}
      />

      <RouteDetailDrawer
        route={viewing}
        onClose={() => setViewingId(null)}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={(r) => setConfirm({ type: 'delete', route: r })}
        onEditMap={openMap}
      />

      {mapRoute && (
        <RouteDrawModal
          open={mapOpen}
          mode="edit"
          route={mapRoute}
          path={mapPath}
          onPathChange={setMapPath}
          onBack={() => setMapOpen(false)}
          onClose={() => setMapOpen(false)}
          onSave={handleMapSave}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'delete' ? `Delete ${confirm.route.id}?` : `Deactivate ${confirm?.route.id}?`}
        message={
          confirm?.type === 'delete'
            ? <>Permanently remove <strong className="text-fg">{confirm.route.name}</strong>? This action cannot be undone.</>
            : <>Mark <strong className="text-fg">{confirm?.route.name}</strong> as inactive? It will no longer appear in the app.</>
        }
        confirmLabel={confirm?.type === 'delete' ? 'Delete route' : 'Deactivate route'}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'delete') handleDelete(confirm.route);
          else handleToggleStatus(confirm.route);
        }}
      />
    </div>
  );
}