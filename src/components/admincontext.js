'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AdminDashboardContext = createContext(null);

const API = 'http://localhost:5000';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function AdminDashboardProvider({ children }) {
  const [dashboard, setDashboard] = useState(null);
  const [profiles, setProfiles] = useState(null); // null = ainda não carregou
  const [loadingDash, setLoadingDash] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [error, setError] = useState('');
  const [bootstrapped, setBootstrapped] = useState(false);

  const loadDashboard = useCallback(async (days = 30, force = false) => {
    if (bootstrapped && dashboard && !force) return dashboard;

    setLoadingDash(true);
    setError('');
    try {
      const res = await fetch(`${API}/admins/painel/dashboard/bootstrap?days=${days}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.comment || 'Erro no bootstrap');

      setDashboard(data.dashboard);
      setBootstrapped(true);

      // cache opcional
      try {
        sessionStorage.setItem(
          'admin_dashboard_cache',
          JSON.stringify({ at: Date.now(), data: data.dashboard })
        );
      } catch {}

      return data.dashboard;
    } catch (err) {
      setError(err.message || 'Falha ao carregar dashboard');
      return null;
    } finally {
      setLoadingDash(false);
    }
  }, [bootstrapped, dashboard]);

  const loadProfiles = useCallback(async (force = false) => {
    if (profiles && !force) return profiles;

    setLoadingProfiles(true);
    try {
      const res = await fetch(`${API}/admins/painel/profiles?limit=150`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.comment || 'Erro ao listar contas');

      setProfiles(data.profiles || []);
      return data.profiles || [];
    } catch (err) {
      setError(err.message || 'Falha ao carregar contas');
      return [];
    } finally {
      setLoadingProfiles(false);
    }
  }, [profiles]);

  const value = useMemo(
    () => ({
      dashboard,
      profiles,
      loadingDash,
      loadingProfiles,
      error,
      bootstrapped,
      loadDashboard,
      loadProfiles,
      setProfiles,
      API,
    }),
    [
      dashboard,
      profiles,
      loadingDash,
      loadingProfiles,
      error,
      bootstrapped,
      loadDashboard,
      loadProfiles,
    ]
  );

  return (
    <AdminDashboardContext.Provider value={value}>
      {children}
    </AdminDashboardContext.Provider>
  );
}

export function useAdminDashboard() {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) {
    throw new Error('useAdminDashboard deve ser usado dentro de AdminDashboardProvider');
  }
  return ctx;
}