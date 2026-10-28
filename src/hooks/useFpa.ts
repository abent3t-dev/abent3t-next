'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import type {
  FpaAreaRow,
  FpaBudgetDetail,
  FpaBudgetFlow,
  FpaPendingItem,
  FpaBudgetSummary,
  FpaCatalog,
  FpaConsolidated,
  FpaContext,
  FpaGroupBy,
  FpaSigners,
  FpaVersion,
  FpaVersionDetail,
} from '@/types/fpa';

/**
 * FP&A (A3) — consultas del módulo. Todas cuelgan de ['fpa', …] para poder
 * refrescar el módulo completo; al guardar una línea se invalidan el detalle,
 * la lista de presupuestos (totales) y el consolidado.
 */
export const fpaKeys = {
  all: ['fpa'] as const,
  context: ['fpa', 'contexto'] as const,
  versions: ['fpa', 'versiones'] as const,
  catalog: ['fpa', 'catalogo'] as const,
  budgetsAll: ['fpa', 'presupuestos'] as const,
  budgets: (versionId: string | null) => ['fpa', 'presupuestos', versionId] as const,
  budgetAll: ['fpa', 'presupuesto'] as const,
  budget: (id: string | undefined) => ['fpa', 'presupuesto', id] as const,
  consolidatedAll: ['fpa', 'consolidado'] as const,
  consolidated: (versionId: string | null, groupBy: FpaGroupBy) =>
    ['fpa', 'consolidado', versionId, groupBy] as const,
  areas: ['fpa', 'areas'] as const,
  directory: (term: string) => ['fpa', 'directorio', term] as const,
  supplier: (id: string | null | undefined) => ['fpa', 'proveedor', id] as const,
  /** Vista previa del cálculo de una línea (B1): la llave es lo capturado. */
  calc: (budgetId: string, input: string | null) => ['fpa', 'calcular', budgetId, input] as const,
  /** B2: detalle de una versión y firmantes generales. */
  versionAll: ['fpa', 'version'] as const,
  version: (id: string | null) => ['fpa', 'version', id] as const,
  signers: ['fpa', 'firmantes'] as const,
  /** B3: flujo de aprobación de un presupuesto y bandeja de pendientes. */
  flowAll: ['fpa', 'flujo'] as const,
  flow: (id: string | undefined) => ['fpa', 'flujo', id] as const,
  pending: ['fpa', 'pendientes'] as const,
};

/** Lo que cambia mientras las áreas capturan: se vuelve a pedir a los 30 s. */
const LIVE_STALE_MS = 30_000;

/** Un 403 o 404 no se arregla reintentando: solo se reintentan fallas del servidor. */
function retryServerErrors(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 2;
}

export function useFpaContext() {
  return useQuery({
    queryKey: fpaKeys.context,
    queryFn: () => api.get<FpaContext>('/fpa/contexto'),
    retry: retryServerErrors,
  });
}

export function useFpaVersions() {
  return useQuery({
    queryKey: fpaKeys.versions,
    queryFn: () => api.get<FpaVersion[]>('/fpa/versiones'),
    retry: retryServerErrors,
  });
}

export function useFpaCatalog(enabled = true) {
  return useQuery({
    queryKey: fpaKeys.catalog,
    queryFn: () => api.get<FpaCatalog>('/fpa/catalogo'),
    enabled,
    retry: retryServerErrors,
  });
}

export function useFpaBudgets(versionId: string | null) {
  return useQuery({
    queryKey: fpaKeys.budgets(versionId),
    queryFn: () =>
      api.get<FpaBudgetSummary[]>(`/fpa/presupuestos?version_id=${encodeURIComponent(versionId ?? '')}`),
    enabled: !!versionId,
    staleTime: LIVE_STALE_MS,
    retry: retryServerErrors,
  });
}

export function useFpaBudget(id: string | undefined) {
  return useQuery({
    queryKey: fpaKeys.budget(id),
    queryFn: () => api.get<FpaBudgetDetail>(`/fpa/presupuestos/${encodeURIComponent(id ?? '')}`),
    enabled: !!id,
    staleTime: LIVE_STALE_MS,
    retry: retryServerErrors,
  });
}

export function useFpaConsolidated(versionId: string | null, groupBy: FpaGroupBy) {
  return useQuery({
    queryKey: fpaKeys.consolidated(versionId, groupBy),
    queryFn: () =>
      api.get<FpaConsolidated>(
        `/fpa/consolidado?version_id=${encodeURIComponent(versionId ?? '')}&agrupar=${groupBy}`,
      ),
    enabled: !!versionId,
    staleTime: LIVE_STALE_MS,
    retry: retryServerErrors,
  });
}

export function useFpaAreas(enabled = true) {
  return useQuery({
    queryKey: fpaKeys.areas,
    queryFn: () => api.get<FpaAreaRow[]>('/fpa/areas'),
    enabled,
    retry: retryServerErrors,
  });
}

/** B2: detalle de una versión con sus parámetros, visto bueno e historial. */
export function useFpaVersion(id: string | null) {
  return useQuery({
    queryKey: fpaKeys.version(id),
    queryFn: () => api.get<FpaVersionDetail>(`/fpa/versiones/${encodeURIComponent(id ?? '')}`),
    enabled: !!id,
    staleTime: LIVE_STALE_MS,
    retry: retryServerErrors,
  });
}

/** B2: firmantes de planeación y del CFO (planeación y super_admin). */
export function useFpaSigners(enabled = true) {
  return useQuery({
    queryKey: fpaKeys.signers,
    queryFn: () => api.get<FpaSigners>('/fpa/firmantes'),
    enabled,
    retry: retryServerErrors,
  });
}

/** B3: flujo de un presupuesto (turno, qué puede hacer la persona y las rondas con qué cambió). */
export function useFpaFlow(id: string | undefined) {
  return useQuery({
    queryKey: fpaKeys.flow(id),
    queryFn: () => api.get<FpaBudgetFlow>(`/fpa/presupuestos/${encodeURIComponent(id ?? '')}/flujo`),
    enabled: !!id,
    staleTime: LIVE_STALE_MS,
    retry: retryServerErrors,
  });
}

/**
 * B3: lo que espera a la persona (firmas y devueltos), para la bandeja y el
 * contador del menú. Mientras el correo de prod siga en simulación es el
 * aviso principal: se refresca cada minuto y con el aviso en pantalla
 * (fpa:pending, por user:{id}), que también refresca los presupuestos.
 */
export function useFpaPendientes() {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  // El socket es estado del contexto: al cargar la página llega después que el
  // usuario, así que la suscripción espera a que exista (y se repite si se recrea)
  const { socket } = useSocket();
  const enabled = !!user && hasRole('super_admin', 'fpa_area', 'fpa_planeacion', 'fpa_cfo');

  useEffect(() => {
    if (!enabled || !socket) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: fpaKeys.pending });
      void qc.invalidateQueries({ queryKey: fpaKeys.flowAll });
      void qc.invalidateQueries({ queryKey: fpaKeys.budgetAll });
      void qc.invalidateQueries({ queryKey: fpaKeys.budgetsAll });
    };
    socket.on('fpa:pending', refresh);
    return () => {
      socket.off('fpa:pending', refresh);
    };
  }, [enabled, socket, qc]);

  return useQuery({
    queryKey: fpaKeys.pending,
    queryFn: () => api.get<FpaPendingItem[]>('/fpa/pendientes'),
    enabled,
    refetchInterval: 60_000,
    retry: retryServerErrors,
  });
}
