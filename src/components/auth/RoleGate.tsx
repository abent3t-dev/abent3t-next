'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAllowedRoles } from '@/config/permissions';

interface RoleGateProps {
  children: React.ReactNode;
}

/**
 * RoleGate — Protects routes based on the permission map in config/permissions.ts.
 * If the user's role is not in the allowed list for the current path, they are
 * redirected to /unauthorized.  While auth is loading, a spinner is shown.
 */
export default function RoleGate({ children }: RoleGateProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowedRoles = getAllowedRoles(pathname);
  // Verifica contra la lista de roles efectivos (multi-módulo) además del rol primario.
  const userRoles = user ? (user.roles ?? [user.role]) : [];
  const isAllowed =
    !allowedRoles || userRoles.some((r) => allowedRoles.includes(r));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isAllowed) {
      router.replace('/unauthorized');
    }
  }, [loading, user, isAllowed, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          Verificando permisos...
        </div>
      </div>
    );
  }

  if (!user || !isAllowed) {
    return null;
  }

  return <>{children}</>;
}
