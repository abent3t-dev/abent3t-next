'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AlmacenCorte, AlmacenCorteDetalle, AlmacenDevoluciones, AlmacenExistencia } from '@/types/almacen';

/**
 * Almacén (0026 y 0027) — consultas del módulo, todas de solo lectura. Un corte
 * no cambia una vez cargado (si piden cambios se carga otro), así que no hace
 * falta volver a pedirlo seguido. `ubicacion` es la clave de un almacén o el
 * nombre de un grupo; vacía, todo el corte.
 */
export const almacenKeys = {
  all: ['almacen'] as const,
  cortes: ['almacen', 'cortes'] as const,
  corte: (id: string | null, ubicacion: string) => ['almacen', 'corte', id, ubicacion] as const,
  existencias: (id: string | null, ubicacion: string) => ['almacen', 'existencias', id, ubicacion] as const,
  devoluciones: (id: string | null) => ['almacen', 'devoluciones', id] as const,
};

const CINCO_MINUTOS = 5 * 60 * 1000;
const filtro = (ubicacion: string) => (ubicacion ? `?ubicacion=${encodeURIComponent(ubicacion)}` : '');

export function useAlmacenCortes() {
  return useQuery({
    queryKey: almacenKeys.cortes,
    queryFn: () => api.get<AlmacenCorte[]>('/almacen/cortes'),
    staleTime: CINCO_MINUTOS,
  });
}

export function useAlmacenCorte(id: string | null, ubicacion = '') {
  return useQuery({
    queryKey: almacenKeys.corte(id, ubicacion),
    queryFn: () => api.get<AlmacenCorteDetalle>(`/almacen/cortes/${id}${filtro(ubicacion)}`),
    enabled: !!id,
    staleTime: CINCO_MINUTOS,
    placeholderData: (anterior) => anterior,
  });
}

export function useAlmacenExistencias(id: string | null, ubicacion = '') {
  return useQuery({
    queryKey: almacenKeys.existencias(id, ubicacion),
    queryFn: () => api.get<AlmacenExistencia[]>(`/almacen/cortes/${id}/existencias${filtro(ubicacion)}`),
    enabled: !!id,
    staleTime: CINCO_MINUTOS,
    placeholderData: (anterior) => anterior,
  });
}

export function useAlmacenDevoluciones(id: string | null) {
  return useQuery({
    queryKey: almacenKeys.devoluciones(id),
    queryFn: () => api.get<AlmacenDevoluciones>(`/almacen/cortes/${id}/devoluciones`),
    enabled: !!id,
    staleTime: CINCO_MINUTOS,
  });
}
