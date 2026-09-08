'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Fase §16 (T7) — Directorio de usuarios de compras para selects
 * (GET /compras/usuarios). Sustituye a /auth/users?role=..., que respondia
 * 403 a todo PURCHASE_TEAM. Campos minimos, sin datos sensibles.
 */

export interface PurchaseUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

export function usePurchaseUsers(role?: string, enabled = true) {
  return useQuery({
    queryKey: ['purchase-users', role ?? 'all'],
    queryFn: () =>
      api.get<PurchaseUser[]>(
        `/compras/usuarios${role ? `?role=${encodeURIComponent(role)}` : ''}`,
      ),
    enabled,
    retry: false,
  });
}
