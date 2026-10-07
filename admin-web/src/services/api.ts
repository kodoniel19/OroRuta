import type {
  Announcement,
  FareRule,
  JeepneyRoute,
  RouteActivity,
  TransitLocation,
  UserReport,
} from '../types/transit';
import type { AdminUser } from '../contexts/AuthContext';

const API_BASE = '/api/v1';
const TOKEN_KEY = 'ororuta_admin_token';

export function getAdminToken(): string {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || 'change-me-in-production';
}

export function setAdminToken(token: string, remember: boolean = true) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('x-admin-api-key', token);
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.error?.message) errorMsg = data.error.message;
      else if (data?.message) errorMsg = data.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  auth: {
    async login(identifier: string, password: string): Promise<{ ok: boolean; user: AdminUser; token: string }> {
      const res = await fetch(`${API_BASE}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error?.message || 'Invalid credentials');
      }
      return data;
    },
  },

  // Overview / Dashboard KPIs
  overview: {
    get: () => request<any>('/admin/overview'),
  },

  // Routes
  routes: {
    list: () => request<JeepneyRoute[]>('/admin/routes'),
    create: (route: Partial<JeepneyRoute>) =>
      request<{ ok: boolean; id: string }>('/admin/routes', {
        method: 'POST',
        body: JSON.stringify(route),
      }),
    update: (id: string, patch: Partial<JeepneyRoute>) =>
      request<{ ok: boolean }>(`/admin/routes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/admin/routes/${id}`, {
        method: 'DELETE',
      }),
    getDirections: (id: string) => 
      request<any[]>(`/admin/routes/${id}/directions`),
    saveDirections: (id: string, direction: string, street_sequence: string) =>
      request<{ ok: boolean }>(`/admin/routes/${id}/directions`, {
        method: 'POST',
        body: JSON.stringify({ direction, street_sequence }),
      }),
    generateGeometry: (id: string, direction: string) =>
      request<{ ok: boolean, geometry: string }>(`/admin/routes/${id}/generate-geometry`, {
        method: 'POST',
        body: JSON.stringify({ direction }),
      }),
    verify: (id: string, status: string) =>
      request<{ ok: boolean }>(`/admin/routes/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
  },

  // Transit Locations (Terminals, Loading, Unloading, Transfer)
  locations: {
    list: () => request<TransitLocation[]>('/admin/locations'),
    create: (loc: Partial<TransitLocation>) =>
      request<{ ok: boolean; id: string }>('/admin/locations', {
        method: 'POST',
        body: JSON.stringify(loc),
      }),
    update: (id: string, patch: Partial<TransitLocation>) =>
      request<{ ok: boolean }>(`/admin/locations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/admin/locations/${id}`, {
        method: 'DELETE',
      }),
  },

  // Fare Rules
  fares: {
    list: () => request<FareRule[]>('/admin/fares'),
    create: (fare: Partial<FareRule>) =>
      request<{ ok: boolean; id: string }>('/admin/fares', {
        method: 'POST',
        body: JSON.stringify(fare),
      }),
    update: (id: string, patch: Partial<FareRule>) =>
      request<{ ok: boolean }>(`/admin/fares/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/admin/fares/${id}`, {
        method: 'DELETE',
      }),
  },

  // Announcements
  announcements: {
    list: () => request<Announcement[]>('/admin/announcements'),
    create: (ann: Partial<Announcement>) =>
      request<{ ok: boolean; id: string }>('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(ann),
      }),
    update: (id: string, patch: Partial<Announcement>) =>
      request<{ ok: boolean }>(`/admin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/admin/announcements/${id}`, {
        method: 'DELETE',
      }),
  },

  // Reports
  reports: {
    list: () => request<UserReport[]>('/admin/reports'),
    update: (id: string, patch: { status?: string; note?: string; author?: string }) =>
      request<{ ok: boolean }>(`/admin/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/admin/reports/${id}`, {
        method: 'DELETE',
      }),
  },

  // Activity Log
  activity: {
    list: () => request<RouteActivity[]>('/admin/activity'),
    log: (entry: { routeId?: string; action: string; detail: string; by?: string }) =>
      request<{ ok: boolean; id: string }>('/admin/activity', {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
  },

  // Location Verification
  verification: {
    listLocations: (params?: { status?: string; q?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.q) qs.set('q', params.q);
      const query = qs.toString();
      return request<VerificationLocation[]>(`/admin/verification/locations${query ? '?' + query : ''}`);
    },
    geocodeLocation: (name: string) =>
      request<{ originalName: string; candidates: GeocodingCandidate[] }>('/admin/verification/locations/geocode', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    verifyLocation: (id: string, data: {
      latitude: number; longitude: number;
      address?: string; city?: string; barangay?: string;
      geocodingName?: string; confidence?: number;
    }) =>
      request<{ ok: boolean }>(`/admin/verification/locations/${id}/verify`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    createLocation: (data: { name: string; originalName?: string; latitude?: number; longitude?: number; source?: string }) =>
      request<{ ok: boolean; id: string }>('/admin/verification/locations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteLocation: (id: string) =>
      request<{ ok: boolean }>(`/admin/verification/locations/${id}`, {
        method: 'DELETE',
      }),
    bulkValidate: () =>
      request<{ total: number; flagged: number; results: BulkValidationResult[] }>('/admin/verification/locations/bulk-validate', {
        method: 'POST',
      }),
    extractFromRoutes: () =>
      request<{ ok: boolean; newLocationsAdded: number }>('/admin/verification/locations/extract-from-routes', {
        method: 'POST',
      }),
  },
};

// Types for the verification system
export interface VerificationLocation {
  id: string;
  name: string;
  originalName: string;
  geocodingName: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  barangay: string | null;
  source: string | null;
  confidence: number | null;
  verificationStatus: 'DRAFT' | 'NEEDS_COORDINATE_VERIFICATION' | 'VERIFIED' | 'DATA_REVIEW_REQUIRED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
}

export interface GeocodingCandidate {
  latitude: number;
  longitude: number;
  displayName: string;
  address: Record<string, string>;
  city: string;
  barangay: string;
  confidence: number;
  issues: string[];
  osmType: string;
  osmId: number;
  insideCDO: boolean;
}

export interface BulkValidationResult {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  currentStatus: string;
  issues: string[];
}
