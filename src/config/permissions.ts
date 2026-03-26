import type { UserRole } from '@/types/auth';

/**
 * Route permission rules.
 * Matched top-down: the first rule whose `path` is a prefix of the current
 * pathname wins.  Put more-specific paths before less-specific ones.
 */
export interface RoutePermission {
  path: string;
  roles: UserRole[];
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin — super_admin only
  { path: '/admin', roles: ['super_admin'] },

  // Catalogs — HR admins
  { path: '/catalogs', roles: ['super_admin', 'admin_rh'] },

  // Courses (CRUD + participants)
  { path: '/courses', roles: ['super_admin', 'admin_rh', 'director', 'jefe_area'] },

  // Dashboard
  { path: '/dashboard', roles: ['super_admin', 'admin_rh', 'director', 'jefe_area', 'executive'] },

  // Capacitación sub-routes (most-specific first)
  { path: '/capacitacion/presupuestos', roles: ['super_admin', 'admin_rh', 'executive'] },
  { path: '/capacitacion/solicitudes', roles: ['super_admin', 'admin_rh', 'director', 'jefe_area', 'colaborador', 'collaborator'] },
  { path: '/capacitacion/mis-cursos', roles: ['super_admin', 'admin_rh', 'director', 'jefe_area', 'executive', 'colaborador', 'collaborator'] },

  // Reportes
  { path: '/reportes', roles: ['super_admin', 'admin_rh', 'executive'] },

  // Auditoría
  { path: '/auditoria', roles: ['super_admin', 'admin_rh'] },
];

/**
 * Returns the allowed roles for a given pathname, or null if no rule matches
 * (meaning the route is accessible to any authenticated user).
 */
export function getAllowedRoles(pathname: string): UserRole[] | null {
  const match = ROUTE_PERMISSIONS.find((rule) => pathname.startsWith(rule.path));
  return match ? match.roles : null;
}

/** Roles that can create/edit/delete catalog data */
export const CAN_MANAGE_DATA: UserRole[] = ['super_admin', 'admin_rh'];
