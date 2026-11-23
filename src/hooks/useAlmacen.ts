'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AlmacenCorte, AlmacenCorteDetalle, AlmacenExistencia } from '@/types/almacen';

/**
 * Almacén (0026) — consultas del módulo, todas de solo lectura. Un corte no
 * cambia una vez cargado (si piden cambios se carga otro), así que no hace
 * falta volver a pedirlo seguido.
 */
export const almacenKeys = {
  all: ['almacen'] as const,
  cortes: ['almacen', 'cortes'] as const,
  corte: (id: string | null) => ['almacen', 'corte', id] as const,
  existencias: (id: string | null) => ['almacen', 'existencias', id] as const,
};

const CINCO_MINUTOS = 5 * 60 * 1000;

export function useAlmacenCortes() {
  return useQuery({
    queryKey: almacenKeys.cortes,
    queryFn: () => api.get<AlmacenCorte[]>('/almacen/cortes'),
    staleTime: CINCO_MINUTOS,
  });
}

export function useAlmacenCorte(id: string | null) {
  return useQuery({
    queryKey: almacenKeys.corte(id),
    queryFn: () => api.get<AlmacenCorteDetalle>(`/almacen/cortes/${id}`),
    enabled: !!id,
    staleTime: CINCO_MINUTOS,
  });
}

export function useAlmacenExistencias(id: string | null) {
  return useQuery({
    queryKey: almacenKeys.existencias(id),
    queryFn: () => api.get<AlmacenExistencia[]>(`/almacen/cortes/${id}/existencias`),
    enabled: !!id,
    staleTime: CINCO_MINUTOS,
  });
}
