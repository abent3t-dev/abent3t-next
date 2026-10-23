'use client';

import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type {
  FpaAreaRow,
  FpaBudgetDetail,
  FpaBudgetSummary,
  FpaCatalog,
  FpaConsolidated,
  FpaContext,
  FpaGroupBy,
  FpaVersion,
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
