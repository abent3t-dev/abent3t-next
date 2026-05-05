'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { api } from '@/lib/api';

export type SidebarBadgeSection = 'solicitudes' | 'propuestas' | 'evidencias';

interface SidebarCountsResponse {
  solicitudes: number;
  propuestas: number;
  evidencias: number;
}

const LAST_SEEN_PREFIX = 'a3t:sidebar-last-seen:';
const REFRESH_INTERVAL_MS = 60_000; // 60s
const SOCKET_DEBOUNCE_MS = 800;

const isBrowser = () => typeof window !== 'undefined';

const lsKey = (section: SidebarBadgeSection) => `${LAST_SEEN_PREFIX}${section}`;

export function getLastSeen(section: SidebarBadgeSection): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(lsKey(section));
  } catch {
    return null;
  }
}

export function markSectionAsSeen(section: SidebarBadgeSection) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(lsKey(section), new Date().toISOString());
    // Notifica a otros componentes (ej. Sidebar) para refrescar el badge.
    window.dispatchEvent(
      new CustomEvent('a3t:sidebar-badges:refresh', { detail: { section } }),
    );
  } catch {
    // localStorage podría estar deshabilitado; el badge sólo se quedará desfasado.
  }
}

/**
 * Hook que devuelve cuántos items "nuevos" tiene el usuario por sección
 * desde su última visita (almacenada en localStorage).
 *
 * - Hace refetch al montar, cada 60s, al recibir eventos de socket relevantes
 *   y al disparar `a3t:sidebar-badges:refresh` desde otra parte de la app.
 */
export function useSidebarBadges() {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const [counts, setCounts] = useState<SidebarCountsResponse>({
    solicitudes: 0,
    propuestas: 0,
    evidencias: 0,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    const params = new URLSearchParams();
    const sinceSolicitudes = getLastSeen('solicitudes');
    const sincePropuestas = getLastSeen('propuestas');
    const sinceEvidencias = getLastSeen('evidencias');
    if (sinceSolicitudes) params.append('since_solicitudes', sinceSolicitudes);
    if (sincePropuestas) params.append('since_propuestas', sincePropuestas);
    if (sinceEvidencias) params.append('since_evidencias', sinceEvidencias);

    try {
      const data = await api.get<SidebarCountsResponse>(
        `/notifications/sidebar-counts?${params.toString()}`,
      );
      setCounts(data);
    } catch {
      // Silencioso: si falla, mantenemos el último valor.
    }
  }, [user]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCounts();
    }, SOCKET_DEBOUNCE_MS);
  }, [fetchCounts]);

  // Initial fetch + interval
  useEffect(() => {
    if (!user) return;
    fetchCounts();
    const interval = setInterval(fetchCounts, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, fetchCounts]);

  // Refetch on local "marked as seen" event
  useEffect(() => {
    if (!isBrowser()) return;
    const handler = () => fetchCounts();
    window.addEventListener('a3t:sidebar-badges:refresh', handler);
    return () => window.removeEventListener('a3t:sidebar-badges:refresh', handler);
  }, [fetchCounts]);

  // Refetch on relevant socket events
  useEffect(() => {
    if (!user) return;
    const handler = () => scheduleRefetch();
    on('request:pending', handler);
    on('request:update', handler);
    on('proposal:pending', handler);
    on('proposal:update', handler);
    on('evidence:pending', handler);
    on('evidence:update', handler);

    return () => {
      off('request:pending', handler);
      off('request:update', handler);
      off('proposal:pending', handler);
      off('proposal:update', handler);
      off('evidence:pending', handler);
      off('evidence:update', handler);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [user, on, off, scheduleRefetch]);

  return counts;
}
