import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { routes as initialRoutes } from '../data/routes';
import { locations as initialLocations } from '../data/locations';
import { fares as initialFares } from '../data/fares';
import { announcements as initialAnnouncements } from '../data/announcements';
import { reports as initialReports } from '../data/reports';
import { routeActivity as initialActivity } from '../data/activity';
import { offlineBundles as initialBundles } from '../data/offline';
import { useAuth } from './AuthContext';
import { nowIso } from '../utils/format';
import { toCoordinates } from '../utils/geo';
import { api } from '../services/api';
import type {
  Announcement,
  FareRule,
  JeepneyRoute,
  RouteActivity,
  TransitLocation,
  UserReport,
} from '../types/transit';

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
export type OfflineBundle = (typeof initialBundles)[number];

interface DataContextValue {
  routes: JeepneyRoute[];
  setRoutes: Setter<JeepneyRoute[]>;
  locations: TransitLocation[];
  setLocations: Setter<TransitLocation[]>;
  fares: FareRule[];
  setFares: Setter<FareRule[]>;
  announcements: Announcement[];
  setAnnouncements: Setter<Announcement[]>;
  reports: UserReport[];
  setReports: Setter<UserReport[]>;
  activity: RouteActivity[];
  logActivity: (entry: Pick<RouteActivity, 'routeId' | 'action' | 'detail'>) => void;
  bundles: OfflineBundle[];
  setBundles: Setter<OfflineBundle[]>;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<JeepneyRoute[]>(() =>
    initialRoutes.map((r) => ({ ...r, coordinates: r.coordinates ?? toCoordinates(r.path) })),
  );
  const [locations, setLocations] = useState(initialLocations);
  const [fares, setFares] = useState(initialFares);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [reports, setReports] = useState(initialReports);
  const [activity, setActivity] = useState(initialActivity);
  const [bundles, setBundles] = useState<OfflineBundle[]>(initialBundles);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [rData, lData, fData, aData, repData, actData] = await Promise.allSettled([
        api.routes.list(),
        api.locations.list(),
        api.fares.list(),
        api.announcements.list(),
        api.reports.list(),
        api.activity.list(),
      ]);

      if (rData.status === 'fulfilled' && Array.isArray(rData.value) && rData.value.length > 0) {
        setRoutes(rData.value.map((r) => ({ ...r, coordinates: r.coordinates ?? toCoordinates(r.path) })));
      }
      if (lData.status === 'fulfilled' && Array.isArray(lData.value) && lData.value.length > 0) {
        setLocations(lData.value);
      }
      if (fData.status === 'fulfilled' && Array.isArray(fData.value) && fData.value.length > 0) {
        setFares(fData.value);
      }
      if (aData.status === 'fulfilled' && Array.isArray(aData.value) && aData.value.length > 0) {
        setAnnouncements(aData.value);
      }
      if (repData.status === 'fulfilled' && Array.isArray(repData.value) && repData.value.length > 0) {
        setReports(repData.value);
      }
      if (actData.status === 'fulfilled' && Array.isArray(actData.value) && actData.value.length > 0) {
        setActivity(actData.value);
      }
    } catch (err) {
      console.warn('Backend API sync fallback to local store:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const logActivity = useCallback(
    (entry: Pick<RouteActivity, 'routeId' | 'action' | 'detail'>) => {
      const by = user?.name ?? 'Admin';
      const at = nowIso();
      const id = `ACT-${Date.now()}`;
      setActivity((prev) => [
        {
          ...entry,
          id,
          by,
          at,
        },
        ...prev.slice(0, 49),
      ]);
      api.activity.log({ routeId: entry.routeId, action: entry.action, detail: entry.detail, by }).catch(() => {});
    },
    [user],
  );

  const value = useMemo(
    () => ({
      routes, setRoutes,
      locations, setLocations,
      fares, setFares,
      announcements, setAnnouncements,
      reports, setReports,
      activity, logActivity,
      bundles, setBundles,
      loading,
      refreshData,
    }),
    [routes, locations, fares, announcements, reports, activity, logActivity, bundles, loading, refreshData],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}