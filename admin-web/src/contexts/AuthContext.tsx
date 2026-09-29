import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { delay } from '../utils/async';
import { api, setAdminToken, clearAdminToken } from '../services/api';

export interface AdminUser {
  name: string;
  email: string;
  role: string;
  phone: string;
}

type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid'; attemptsLeft: number }
  | { ok: false; reason: 'locked' };

interface AuthContextValue {
  user: AdminUser | null;
  login: (identifier: string, password: string, remember: boolean) => Promise<LoginResult>;
  logout: () => void;
  updateUser: (patch: Partial<AdminUser>) => void;
  clearLock: () => void;
}

const STORAGE_KEY = 'ororuta_admin_session';
const MAX_ATTEMPTS = 5;

export const DEMO_CREDENTIALS = {
  email: 'admin@ororuta.ph',
  username: 'admin',
  password: 'OroRuta@2026',
};

const DEFAULT_ADMIN: AdminUser = {
  name: 'Maria Santos',
  email: 'admin@ororuta.ph',
  role: 'Super Admin',
  phone: '+63 917 555 0142',
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): AdminUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(readSession);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const login = useCallback(
    async (identifier: string, password: string, remember: boolean): Promise<LoginResult> => {
      await delay(1100);
      if (failedAttempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };

      try {
        const res = await api.auth.login(identifier, password);
        setFailedAttempts(0);
        setAdminToken(res.token, remember);
        (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(res.user));
        setUser(res.user);
        return { ok: true };
      } catch {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };
        return { ok: false, reason: 'invalid', attemptsLeft: MAX_ATTEMPTS - next };
      }
    },
    [failedAttempts],
  );

  const logout = useCallback(() => {
    clearAdminToken();
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AdminUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const store = localStorage.getItem(STORAGE_KEY) ? localStorage : sessionStorage;
      store.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearLock = useCallback(() => setFailedAttempts(0), []);

  const value = useMemo(
    () => ({ user, login, logout, updateUser, clearLock }),
    [user, login, logout, updateUser, clearLock],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

