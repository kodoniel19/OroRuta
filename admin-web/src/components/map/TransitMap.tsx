import React, { useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip as LeafletTooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import { locationKinds } from '../../data/locationKinds';
import type { JeepneyRoute, LatLng, TransitLocation } from '../../types/transit';
import { cn } from '../../utils/cn';

export const CDO_CENTER: LatLng = [8.479, 124.647];

export interface TransitMapProps {
  routes: JeepneyRoute[];
  locations: TransitLocation[];
  selectedRouteId?: string | null;
  highlightedLocationId?: string | null;
  onRouteClick?: (id: string) => void;
  onLocationClick?: (id: string) => void;
  onMapClick?: (point: LatLng) => void;
  draftPath?: LatLng[] | null;
  draftColor?: string;
  /** 'dots' = small vertex dots (default); 'numbered' = A / 1…n / B markers for route drawing. */
  draftMarkers?: 'dots' | 'numbered';
  draftLabels?: { start: string; end: string };
  /** When provided, these control points get numbered markers instead of every draftPath point. */
  draftWaypoints?: LatLng[] | null;
  /** When provided, numbered draft points can be dragged to adjust their position. */
  onDraftPointMove?: (index: number, point: LatLng) => void;
  onDraftPointDelete?: (index: number) => void;
  /** When enabled, clicking and dragging on the map draws points continuously. */
  freehandMode?: boolean;
  onFreehandPoints?: (points: LatLng[]) => void;
  /** Custom landmark/transit pins to display along the route */
  customPins?: Array<{ id: string; point: LatLng; name: string; kind: string; address?: string }>;
  onCustomPinClick?: (id: string) => void;
  /** 'all' fits routes + locations + draft; 'draft' fits only the draft path. */
  fitTarget?: 'all' | 'draft';
  pin?: LatLng | null;
  focus?: LatLng | null;
  fitKey?: string;
  zoom?: number;
  className?: string;
}

function ClickHandler({ onMapClick, disabled }: { onMapClick?: (p: LatLng) => void; disabled?: boolean }) {
  useMapEvents({
    click(e) {
      if (disabled || !onMapClick) return;
      onMapClick([Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))]);
    },
  });
  return null;
}

function FreehandDrawer({
  enabled,
  onPointsAdded,
}: {
  enabled: boolean;
  onPointsAdded?: (pts: LatLng[]) => void;
}) {
  const map = useMap();
  const isDrawing = React.useRef(false);
  const lastPoint = React.useRef<LatLng | null>(null);

  useEffect(() => {
    if (enabled) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
    return () => {
      map.dragging.enable();
    };
  }, [enabled, map]);

  useMapEvents({
    mousedown(e) {
      if (!enabled || !onPointsAdded) return;
      isDrawing.current = true;
      const pt: LatLng = [Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))];
      lastPoint.current = pt;
      onPointsAdded([pt]);
    },
    mousemove(e) {
      if (!enabled || !isDrawing.current || !onPointsAdded) return;
      const pt: LatLng = [Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))];
      if (lastPoint.current) {
        const dLat = pt[0] - lastPoint.current[0];
        const dLng = pt[1] - lastPoint.current[1];
        // Only emit if moved at least ~10-15m to avoid redundant dense duplicates
        if (dLat * dLat + dLng * dLng < 0.000008) return;
      }
      lastPoint.current = pt;
      onPointsAdded([pt]);
    },
    mouseup() {
      if (!enabled) return;
      isDrawing.current = false;
      lastPoint.current = null;
    },
  });

  return null;
}

function Resizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function FlyTo({ focus }: { focus: LatLng | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.flyTo(focus, Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
  }, [focus, map]);
  return null;
}

function AutoFitBounds({
  selectedRoute,
  allPoints,
  fitKey,
  fitTarget,
  draftPath,
}: {
  selectedRoute: JeepneyRoute | null;
  allPoints: LatLng[];
  fitKey?: string;
  fitTarget?: 'all' | 'draft';
  draftPath?: LatLng[] | null;
}) {
  const map = useMap();

  useEffect(() => {
    // 1. If a route is specifically selected, auto-fit to that route's complete geometry
    if (selectedRoute && selectedRoute.path.length > 0) {
      const bounds = latLngBounds(selectedRoute.path);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      return;
    }

    // 2. If fitting draft path
    if (fitTarget === 'draft' && draftPath && draftPath.length >= 2) {
      map.fitBounds(latLngBounds(draftPath), { padding: [50, 50], maxZoom: 16 });
      return;
    }

    // 3. Fit all points if fitKey provided
    if (fitKey && allPoints.length >= 2) {
      map.fitBounds(latLngBounds(allPoints), { padding: [40, 40], maxZoom: 15 });
    } else if (fitKey && allPoints.length === 1) {
      map.setView(allPoints[0], 15);
    }
  }, [selectedRoute, fitKey, fitTarget, draftPath, allPoints, map]);

  return null;
}

function pointIcon(label: string, background: string, size: number) {
  return divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${background};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:${Math.max(
      8,
      size * 0.4
    )}px;font-weight:700;color:white;font-family:system-ui">${label}</div>`,
  });
}

function pinIcon(background: string) {
  return divIcon({
    className: '',
    iconSize: [26, 32],
    iconAnchor: [13, 32],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="32" viewBox="0 0 26 32">
      <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 19 13 19s13-9.25 13-19C26 5.82 20.18 0 13 0z" fill="${background}" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="5" fill="#FFFFFF"/>
    </svg>`,
  });
}

export function TransitMap({
  routes,
  locations,
  selectedRouteId,
  highlightedLocationId,
  onRouteClick,
  onLocationClick,
  onMapClick,
  draftPath,
  draftColor = '#0B6E4F',
  draftMarkers = 'dots',
  draftLabels,
  draftWaypoints,
  onDraftPointMove,
  onDraftPointDelete,
  freehandMode,
  onFreehandPoints,
  customPins,
  onCustomPinClick,
  fitTarget = 'all',
  pin,
  focus,
  fitKey,
  zoom = 13,
  className,
}: TransitMapProps) {
  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const allPoints: LatLng[] = useMemo(() => {
    if (fitTarget === 'draft' && draftPath?.length) {
      return draftPath;
    }
    return [
      ...routes.flatMap((r) => r.path),
      ...locations.map((l) => [l.lat, l.lng] as LatLng),
      ...(customPins?.map((p) => p.point) ?? []),
      ...(draftPath ?? []),
    ];
  }, [routes, locations, customPins, draftPath, fitTarget]);

  return (
    <MapContainer
      center={CDO_CENTER}
      zoom={zoom}
      className={cn('h-full w-full', className)}
      zoomControl={true}
    >
      {/* Authentic Google Maps Roadmap Tiles */}
      <TileLayer
        attribution="&copy; Google Maps"
        url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        subdomains={['0', '1', '2', '3']}
        maxZoom={20}
      />

      <Resizer />
      {onMapClick && <ClickHandler onMapClick={onMapClick} disabled={Boolean(freehandMode)} />}
      <FreehandDrawer enabled={Boolean(freehandMode)} onPointsAdded={onFreehandPoints} />
      {focus && <FlyTo focus={focus} />}
      <AutoFitBounds
        selectedRoute={selectedRoute}
        allPoints={allPoints}
        fitKey={fitKey}
        fitTarget={fitTarget}
        draftPath={draftPath}
      />

      {/* Route Polylines — show only the selected route when one is active */}
      {routes
        .filter((r) => !selectedRouteId || r.id === selectedRouteId)
        .map((r) => {
          const isSelected = selectedRouteId === r.id;
          const strokeColor = isSelected ? '#0B6E4F' : r.color || '#1471B0';
          const weight = isSelected ? 5.5 : 3.0;
          const opacity = isSelected ? 1.0 : 0.85;

          return (
            <Polyline
              key={r.id}
              positions={r.path}
              pathOptions={{
                color: strokeColor,
                weight,
                opacity,
              }}
              eventHandlers={{ click: () => onRouteClick?.(r.id) }}
            >
              <LeafletTooltip sticky>
                <strong>{r.code || r.id}</strong> — {r.name}
                <br />
                <span style={{ fontSize: '11px', color: '#666' }}>
                  {r.origin} &rarr; {r.destination} · {r.path.length} pts
                </span>
              </LeafletTooltip>
            </Polyline>
          );
        })}

      {/* Transit Location Markers */}
      {locations.map((loc) => {
        const kind = locationKinds[loc.kind];
        const isHighlighted = loc.id === highlightedLocationId;
        const color = kind?.color ?? '#0B6E4F';
        return (
          <CircleMarker
            key={loc.id}
            center={[loc.lat, loc.lng]}
            radius={isHighlighted ? 8 : 5.5}
            pathOptions={{
              color: '#FFFFFF',
              fillColor: color,
              fillOpacity: isHighlighted ? 1 : 0.85,
              weight: isHighlighted ? 2.5 : 1.5,
            }}
            eventHandlers={{ click: () => onLocationClick?.(loc.id) }}
          >
            <LeafletTooltip>
              <strong>{loc.name}</strong> ({kind?.title || loc.kind})
              {loc.address && <div style={{ fontSize: '11px' }}>{loc.address}</div>}
            </LeafletTooltip>
          </CircleMarker>
        );
      })}

      {/* Active / Pending Pin Marker */}
      {pin && (
        <Marker position={pin} icon={pinIcon('#0B6E4F')} />
      )}

      {/* Custom Route Pins (Landmarks, Terminals, Stops) */}
      {customPins?.map((cp) => {
        const kindMeta = locationKinds[cp.kind as keyof typeof locationKinds];
        const color = kindMeta?.color || '#6366F1';
        return (
          <Marker
            key={cp.id}
            position={cp.point}
            icon={pinIcon(color)}
            eventHandlers={{
              click: () => onCustomPinClick?.(cp.id),
            }}
          >
            <LeafletTooltip>
              <strong>{cp.name}</strong> ({kindMeta?.title || cp.kind})
              {cp.address && <div style={{ fontSize: '11px' }}>{cp.address}</div>}
              <div style={{ fontSize: '10px', color: '#888' }}>Click to view/remove</div>
            </LeafletTooltip>
          </Marker>
        );
      })}

      {/* Draft Path (Route Drawing) */}
      {draftPath && draftPath.length >= 2 && (
        <Polyline
          positions={draftPath}
          pathOptions={{
            color: draftColor,
            weight: 4.5,
            opacity: 0.95,
          }}
        />
      )}

      {/* Draft Markers (Numbered / Editable Points) */}
      {draftMarkers === 'numbered' &&
        (draftWaypoints || draftPath)?.map((pt, i) => {
          const pts = draftWaypoints || draftPath || [];
          const isFirst = i === 0;
          const isLast = i === pts.length - 1;
          const label = isFirst
            ? draftLabels?.start ?? 'A'
            : isLast
            ? draftLabels?.end ?? 'B'
            : String(i + 1);
          const color = isFirst || isLast ? '#0B6E4F' : '#4F46E5';
          const size = isFirst || isLast ? 24 : 18;

          return (
            <Marker
              key={`wp-${i}`}
              position={pt}
              icon={pointIcon(label, color, size)}
              draggable={Boolean(onDraftPointMove)}
              eventHandlers={{
                dragend: (e) => {
                  const latLng = (e.target as any).getLatLng();
                  onDraftPointMove?.(i, [
                    Number(latLng.lat.toFixed(5)),
                    Number(latLng.lng.toFixed(5)),
                  ]);
                },
                click: () => {
                  onDraftPointDelete?.(i);
                },
              }}
            >
              <LeafletTooltip>
                Point #{i + 1} &bull; Drag to move{onDraftPointDelete ? ', Click to delete' : ''}
              </LeafletTooltip>
            </Marker>
          );
        })}

      {/* Draft Markers (Dots) */}
      {draftPath &&
        draftMarkers === 'dots' &&
        draftPath.map((pt, i) => (
          <CircleMarker
            key={i}
            center={pt}
            radius={4}
            pathOptions={{
              color: '#FFFFFF',
              fillColor: draftColor,
              fillOpacity: 0.85,
              weight: 1.5,
            }}
          />
        ))}
    </MapContainer>
  );
}