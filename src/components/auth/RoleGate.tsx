'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';

interface RoleGateProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGate — Only renders children if user has one of the allowed roles.
 *
 * Usage:
 * <RoleGate roles={['admin_rh']}>
 *   <AdminOnlyContent />
 * </RoleGate>
 */
export default function RoleGate({ roles, children, fallback }: RoleGateProps) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || !roles.includes(user.role)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
