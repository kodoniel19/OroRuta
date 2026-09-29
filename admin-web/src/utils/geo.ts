import type { LatLng, RouteCoordinate } from '../types/transit';

export function toCoordinates(path: LatLng[]): RouteCoordinate[] {
  return path.map(([latitude, longitude]) => ({ latitude, longitude }));
}

export function fromCoordinates(coords: RouteCoordinate[]): LatLng[] {
  return coords.map((c) => [c.latitude, c.longitude]);
}

/** Haversine formula distance in kilometers between two GPS points */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const sinDlat = Math.sin(dLat / 2);
  const sinDlng = Math.sin(dLng / 2);
  const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlng * sinDlng;
  return 2 * R * Math.asin(Math.sqrt(h));
}
