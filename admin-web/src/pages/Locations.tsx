import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EyeIcon, MapPinIcon, PencilIcon, PlusIcon, SearchXIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { SearchInput } from '../components/ui/SearchInput';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RouteChip } from '../components/ui/RouteChip';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LocationFormModal } from '../components/locations/LocationFormModal';
import { LocationDetailDrawer } from '../components/locations/LocationDetailDrawer';
import { locationKinds } from '../data/locationKinds';
import { useData } from '../contexts/DataContext';
import { useSimulatedLoad } from '../hooks/useSimulatedLoad';
import { api } from '../services/api';
import type { LocationKind, LocationStatus, TransitLocation } from '../types/transit';
import { formatRelative, nowIso } from '../utils/format';

interface LocationsProps {
  kind: LocationKind;
}

export function Locations({ kind }: LocationsProps) {
  const config = locationKinds[kind];
  const { locations, setLocations, routes, logActivity } = useData();
  const loading = useSimulatedLoad();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | LocationStatus>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransitLocation | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'deactivate'; item: TransitLocation } | null>(null);

  const kindLocations = useMemo(() => locations.filter((l) => l.kind === kind), [locations, kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kindLocations.filter((l) => {
      const matchStatus = status === 'All' || l.status === status;
      const matchQuery =
        !q ||
        l.id.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.barangay.toLowerCase().includes(q) ||
        l.routeIds.some((r) => r.toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [kindLocations, query, status]);

  const viewing = kindLocations.find((l) => l.id === viewingId) ?? null;

  const handleSave = (location: TransitLocation) => {
    if (editing) {
      setLocations((prev) => prev.map((l) => (l.id === editing.id ? location : l)));
      api.locations.update(editing.id, location).catch((e) => console.error('Location update error:', e));
      logActivity({
        routeId: location.routeIds[0] ?? 'N/A',
        action: 'Edited',
        detail: `Updated ${config.singular} ${location.name} (${location.id})`,
      });
      toast.success(`${location.name} updated`);
    } else {
      setLocations((prev) => [location, ...prev]);
      api.locations.create(location).catch((e) => console.error('Location create error:', e));
      logActivity({
        routeId: location.routeIds[0] ?? 'N/A',
        action: 'Created',
        detail: `Added new ${config.singular} ${location.name} (${location.id})`,
      });
      toast.success(`${location.name} created`);
    }
  };

  const handleToggle = (item: TransitLocation) => {
    const nextStatus: LocationStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    setLocations((prev) =>
      prev.map((l) => (l.id === item.id ? { ...l, status: nextStatus, lastUpdated: nowIso() } : l)),
    );
    api.locations.update(item.id, { status: nextStatus }).catch((e) => console.error('Location toggle error:', e));
    toast.success(`${item.name} set to ${nextStatus}`);
  };

  const handleDelete = (item: TransitLocation) => {
    setLocations((prev) => prev.filter((l) => l.id !== item.id));
    api.locations.delete(item.id).catch((e) => console.error('Location delete error:', e));
    logActivity({
      routeId: item.routeIds[0] ?? 'N/A',
      action: 'Deleted',
      detail: `Deleted ${config.singular} ${item.name} (${item.id})`,
    });
    setViewingId(null);
    toast.success(`${item.name} deleted`);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={config.title}
        description={`${kindLocations.length} ${config.title.toLowerCase()} in Cagayan de Oro City. ${config.description}`}
        actions={
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add {config.singular}
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={`Search ${config.title.toLowerCase()}, address, barangay, route…`}
            className="w-full sm:w-80"
            label={`Search ${config.title}`}
          />
          <SegmentedControl
            label="Filter by status"
            value={status}
            onChange={(v) => setStatus(v as any)}
            options={[
              { value: 'All', label: 'All', count: kindLocations.length },
              {
                value: 'Active',
                label: 'Active',
                count: kindLocations.filter((l) => l.status === 'Active').length,
              },
              {
                value: 'Under Review',
                label: 'Under Review',
                count: kindLocations.filter((l) => l.status === 'Under Review').length,
              },
              {
                value: 'Inactive',
                label: 'Inactive',
                count: kindLocations.filter((l) => l.status === 'Inactive').length,
              },
            ]}
          />
          <p className="ml-auto text-[13px] text-fg-muted">
            Showing {filtered.length} of {kindLocations.length}
          </p>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : kindLocations.length === 0 ? (
          <EmptyState
            icon={<MapPinIcon className="h-5 w-5" />}
            title={`No ${config.title.toLowerCase()} yet`}
            description={`Add the first ${config.singular} for the jeepney network.`}
            action={
              <Button
                icon={<PlusIcon className="h-4 w-4" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add {config.singular}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchXIcon className="h-5 w-5" />}
            title="No locations match your search"
            description="Try changing your search terms or filters."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setStatus('All');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-left text-xs font-medium text-fg-muted">
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Name & ID
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Location & Barangay
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Assigned Routes
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    GPS Coordinates
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Last updated
                  </th>
                  <th scope="col" className="px-5 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setViewingId(item.id)}
                    className="cursor-pointer transition-colors duration-150 hover:bg-canvas"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                          aria-hidden
                        />
                        <div>
                          <p className="font-mono text-xs font-medium text-fg-muted">{item.id}</p>
                          <p className="font-medium text-fg">{item.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-fg-muted">
                      <p className="text-fg">{item.address}</p>
                      <p className="text-xs text-fg-subtle">Brgy. {item.barangay}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {item.routeIds.slice(0, 4).map((rid) => {
                          const r = routes.find((rt) => rt.id === rid);
                          return <RouteChip key={rid} id={rid} color={r?.color} />;
                        })}
                        {item.routeIds.length > 4 && (
                          <span className="rounded bg-canvas px-1.5 py-0.5 text-xs text-fg-muted">
                            +{item.routeIds.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-fg-muted">
                      {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-fg-muted">
                      {formatRelative(item.lastUpdated)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <IconButton label={`View ${item.name}`} onClick={() => setViewingId(item.id)}>
                          <EyeIcon className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={`Edit ${item.name}`}
                          onClick={() => {
                            setEditing(item);
                            setFormOpen(true);
                          }}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={`Delete ${item.name}`}
                          tone="danger"
                          onClick={() => setConfirm({ type: 'delete', item })}
                        >
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

      <LocationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        kind={kind}
        initial={editing}
        locations={locations}
        routes={routes}
        onSave={handleSave}
      />

      <LocationDetailDrawer
        location={viewing}
        routes={routes}
        onClose={() => setViewingId(null)}
        onEdit={(l) => {
          setViewingId(null);
          setEditing(l);
          setFormOpen(true);
        }}
        onToggleStatus={handleToggle}
        onDelete={(l) => setConfirm({ type: 'delete', item: l })}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'delete' ? `Delete ${confirm.item.name}?` : 'Confirm action'}
        message={
          confirm?.type === 'delete' ? (
            <>
              Are you sure you want to remove <strong className="text-fg">{confirm.item.name}</strong> ({confirm.item.id})? This stop will be unlinked from {confirm.item.routeIds.length} assigned routes.
            </>
          ) : (
            'Are you sure you want to proceed?'
          )
        }
        confirmLabel="Delete location"
        onConfirm={() => {
          if (confirm?.type === 'delete') handleDelete(confirm.item);
        }}
      />
    </div>
  );
}
