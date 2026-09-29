import React from 'react';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  CircleMarker, MapContainer, Marker, Polyline, TileLayer,
  Tooltip as LeafletTooltip, useMap, useMapEvents,
} from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import { locationKinds } from '../../data/locationKinds';
import type { JeepneyRoute, LatLng, TransitLocation } from '../../types/transit';
import { cn } from '../../utils/cn';

export const CDO_CENTER: LatLng = [8.479, 124.647];

interface TransitMapProps {
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
  /** When provided, numbered draft points can be dragged to adjust their position. */
  onDraftPointMove?: (index: number, point: LatLng) => void;
  /** 'all' fits routes + locations + draft; 'draft' fits only the draft path. */
  fitTarget?: 'all' | 'draft';
  pin?: LatLng | null;
  focus?: LatLng | null;
  fitKey?: string;
  zoom?: number;
  className?: string;
}

function ClickHandler({ onMapClick }: { onMapClick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick([Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))]);
    },
  });
  return null;
}

function Resizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 280);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function FlyTo({ focus }: { focus: LatLng | null | undefined }) {
  const map = useMap();
  const key = focus ? focus.join(',') : '';
  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 15), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function FitBounds({ points, fitKey }: { points: LatLng[]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) map.fitBounds(latLngBounds(points), { padding: [36, 36], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);
  return null;
}

function pointIcon(label: string, background: string, size: number) {
  return divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${background};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:${Math.max(8, size * 0.4)}px;font-weight:700;color:white;font-family:system-ui">${label}</div>`,
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
  onDraftPointMove,
  fitTarget = 'all',
  pin,
  focus,
  fitKey,
  zoom = 13,
  className,
}: TransitMapProps) {
  const allPoints: LatLng[] = fitTarget === 'draft' && draftPath?.length
    ? draftPath
    : [
        ...routes.flatMap((r) => r.path),
        ...locations.map((l) => [l.lat, l.lng] as LatLng),
        ...(draftPath ?? []),
      ];

  return (
    <MapContainer
      center={CDO_CENTER}
      zoom={zoom}
      className={cn('h-full w-full', className)}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Resizer />
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      {focus && <FlyTo focus={focus} />}
      {fitKey && <FitBounds points={allPoints} fitKey={fitKey} />}

      {/* Route polylines */}
      {routes.map((r) => (
        <Polyline
          key={r.id}
          positions={r.path}
          pathOptions={{
            color: r.color,
            weight: selectedRouteId === r.id ? 5 : 3,
            opacity: selectedRouteId && selectedRouteId !== r.id ? 0.3 : 0.9,
          }}
          eventHandlers={{ click: () => onRouteClick?.(r.id) }}
        >
          <LeafletTooltip sticky>{r.id} — {r.name}</LeafletTooltip>
        </Polyline>
      ))}

      {/* Location dots */}
      {locations.map((loc) => {
        const kind = locationKinds[loc.kind];
        const isHighlighted = loc.id === highlightedLocationId;
        return (
          <CircleMarker
            key={loc.id}
            center={[loc.lat, loc.lng]}
            radius={isHighlighted ? 8 : 5}
            pathOptions={{
              color: kind?.color ?? '#888',
              fillColor: kind?.color ?? '#888',
              fillOpacity: isHighlighted ? 1 : 0.7,
              weight: isHighlighted ? 2.5 : 1.5,
            }}
            eventHandlers={{ click: () => onLocationClick?.(loc.id) }}
          >
            <LeafletTooltip>{loc.name}</LeafletTooltip>
          </CircleMarker>
        );
      })}

      {/* Pin marker */}
      {pin && (
        <Marker
          position={pin}
          icon={pointIcon('●', '#0B6E4F', 20)}
        />
      )}

      {/* Draft path */}
      {draftPath && draftPath.length >= 2 && (
        <Polyline
          positions={draftPath}
          pathOptions={{ color: draftColor, weight: 3.5, opacity: 0.9, dashArray: '6 4' }}
        />
      )}

      {/* Draft markers */}
      {draftPath && draftMarkers === 'numbered' && draftPath.map((pt, i) => {
        const isFirst = i === 0;
        const isLast = i === draftPath.length - 1;
        const label = isFirst
          ? (draftLabels?.start ?? 'A')
          : isLast
          ? (draftLabels?.end ?? 'B')
          : String(i);
        return (
          <Marker
            key={i}
            position={pt}
            icon={pointIcon(label, isFirst || isLast ? '#0B6E4F' : '#6B7280', isFirst || isLast ? 22 : 16)}
            draggable={!!onDraftPointMove}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = (e.target as any).getLatLng();
                onDraftPointMove?.(i, [Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
              },
            }}
          />
        );
      })}

      {draftPath && draftMarkers === 'dots' && draftPath.map((pt, i) => (
        <CircleMarker
          key={i}
          center={pt}
          radius={4}
          pathOptions={{ color: draftColor, fillColor: draftColor, fillOpacity: 0.8, weight: 1.5 }}
        />
      ))}
    </MapContainer>
  );
}