export interface DatasetEntry {
  id: string;
  name: string;
  description: string;
  size: string;
  included: boolean;
  required: boolean;
}

export const offlineDatasets: DatasetEntry[] = [
  { id: 'routes', name: 'Route Geometries', description: 'GeoJSON polylines for all active jeepney routes', size: '1.8 MB', included: true, required: true },
  { id: 'stops', name: 'Bus Stops & Terminals', description: 'Named stop locations with coordinates', size: '0.6 MB', included: true, required: true },
  { id: 'fares', name: 'Fare Matrix', description: 'Current LTFRB-approved fares for all vehicle types', size: '0.1 MB', included: true, required: true },
  { id: 'announcements', name: 'Active Announcements', description: 'Published announcements at time of bundle creation', size: '0.3 MB', included: true, required: false },
  { id: 'pois', name: 'Points of Interest', description: 'Landmarks and key destinations along routes', size: '1.2 MB', included: true, required: false },
  { id: 'tiles', name: 'Offline Map Tiles', description: 'CDO city tile cache for offline map display', size: '11.4 MB', included: false, required: false },
];

export interface BundleVersion {
  version: string;
  publishedAt: string;
  size: string;
  changes: number;
  status: 'Published' | 'Superseded' | 'Deprecated';
}

/** Named offlineBundles so DataContext can import it without rename. */
export const offlineBundles: BundleVersion[] = [
  { version: 'v2026.09.3', publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(), size: '4.0 MB', changes: 5, status: 'Published' },
  { version: 'v2026.09.2', publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60000).toISOString(), size: '3.8 MB', changes: 12, status: 'Superseded' },
  { version: 'v2026.09.1', publishedAt: new Date(Date.now() - 18 * 24 * 60 * 60000).toISOString(), size: '3.8 MB', changes: 8, status: 'Superseded' },
  { version: 'v2026.08.4', publishedAt: new Date(Date.now() - 34 * 24 * 60 * 60000).toISOString(), size: '3.7 MB', changes: 3, status: 'Deprecated' },
];

export const deviceAdoption = {
  activeDevices: 8_214,
  latest: 73,
  previous: 19,
  older: 8,
};
