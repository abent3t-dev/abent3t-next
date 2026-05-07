'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { UserModule, UserRole } from '@/types/auth';

export interface EmailLookupResult {
  exists: boolean;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    position: string | null;
    role: UserRole;
    is_active: boolean;
    departments: { id: string; name: string } | null;
  };
  roles_by_module?: { module: UserModule; role: UserRole }[];
}

/**
 * Hook para chequear si un email ya pertenece a un usuario del sistema.
 *
 * Devuelve `result` con `{exists, profile, roles_by_module}` cuando se ha
 * resuelto la búsqueda, `null` cuando todavía no se ha hecho ninguna o cuando
 * el email no es válido.
 *
 * Uso típico:
 *   const { result, checking, check, reset } = useEmailLookup();
 *   <input onBlur={() => check(email)} ... />
 *   {result?.exists && <Banner ... />}
 */
export function useEmailLookup() {
  const [result, setResult] = useState<EmailLookupResult | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (email: string) => {
    const trimmed = email.trim();
    // Validación mínima: tiene que parecerse a un email
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setResult(null);
      return null;
    }
    setChecking(true);
    try {
      const data = await api.get<EmailLookupResult>(
        `/auth/lookup-email?email=${encodeURIComponent(trimmed)}`,
      );
      setResult(data);
      return data;
    } catch {
      setResult(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return { result, checking, check, reset };
}
