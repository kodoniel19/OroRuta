import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { RequireAuth } from './components/auth/RequireAuth';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { JeepneyRoutes } from './pages/JeepneyRoutes';
import { Locations } from './pages/Locations';
import { LocationVerification } from './pages/LocationVerification';
import { RouteMaps } from './pages/RouteMaps';
import { Fares } from './pages/Fares';
import { Announcements } from './pages/Announcements';
import { Reports } from './pages/Reports';
import { SearchAnalytics } from './pages/SearchAnalytics';
import { OfflineData } from './pages/OfflineData';
import { Settings } from './pages/Settings';
import { Account } from './pages/Account';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <Toaster position="top-right" richColors closeButton />
            <Routes>
              <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
              <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
              <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/routes" element={<JeepneyRoutes />} />
                <Route path="/verification" element={<LocationVerification />} />
                <Route path="/terminals" element={<Locations key="terminal" kind="terminal" />} />
                <Route path="/loading-points" element={<Locations key="loading" kind="loading" />} />
                <Route path="/unloading-points" element={<Locations key="unloading" kind="unloading" />} />
                <Route path="/transfer-points" element={<Locations key="transfer" kind="transfer" />} />
                <Route path="/route-maps" element={<RouteMaps />} />
                <Route path="/fares" element={<Fares />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/analytics" element={<SearchAnalytics />} />
                <Route path="/offline-data" element={<OfflineData />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/account" element={<Account />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}

