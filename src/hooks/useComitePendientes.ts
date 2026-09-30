'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { APPROVER_ROLES, type UserRole } from '@/types/auth';
import type { PurchaseCommittee } from '@/types/purchases';

/** Roles que pueden firmar en el comité (el guard de `pendientes/me`). */
export const COMMITTEE_SIGNER_ROLES: UserRole[] = [
  'super_admin',
  'lider_procura',
  ...APPROVER_ROLES,
];

/**
 * H3 (2026-09-29) — Comités que esperan MI firma. Mientras no haya correo
 * (falta Mail.Send), el aviso es el contador "Comité (N)" del menú y el de
 * "Mis pendientes". Misma llave que la página del comité: aprobar o rechazar
 * invalida ['committees'] y el contador se actualiza solo.
 */
export function useComitePendientes() {
  const { user, hasRole } = useAuth();
  return useQuery({
    queryKey: ['committees', 'pendientes-me'],
    queryFn: () => api.get<PurchaseCommittee[]>('/compras/comite/pendientes/me'),
    enabled: !!user && hasRole(...COMMITTEE_SIGNER_ROLES),
    refetchInterval: 60_000,
    retry: false,
  });
}
