import type { UserRole } from '@/types/auth';
import { ROLE_PRIORITY } from '@/types/auth';

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
  { path: '/capacitacion/crehana', roles: ['super_admin', 'admin_rh', 'executive'] },
  { path: '/capacitacion/propuestas', roles: ['super_admin', 'admin_rh'] },
  { path: '/capacitacion/evidencias', roles: ['super_admin', 'admin_rh'] },
  { path: '/capacitacion/presupuestos', roles: ['super_admin', 'admin_rh', 'executive'] },
  { path: '/capacitacion/solicitudes', roles: ['super_admin', 'admin_rh', 'director', 'jefe_area', 'colaborador', 'collaborator'] },
  { path: '/capacitacion/mi-equipo', roles: ['super_admin', 'admin_rh', 'director', 'jefe_area'] },
  { path: '/capacitacion/historial', roles: ['super_admin', 'admin_rh', 'colaborador', 'collaborator'] },
  { path: '/capacitacion/mis-cursos', roles: ['super_admin', 'admin_rh', 'director', 'jefe_area', 'executive', 'colaborador', 'collaborator'] },

  // Compras sub-routes (ver documentation/CLAUDE_COMPRAS.md § Roles y Permisos).
  // Modelo de acceso (junta 2026-09-17): "ver todos, actuar por rol" — TODO el
  // módulo de compras es consulta para cualquier autenticado (generaliza el
  // precedente §15 de Contratos; el backend abre los GET y cierra mutaciones).
  // Los botones de acción los condiciona cada página según el rol.
  // Excepciones: Integraciones (página técnica) y Roles (gestión).
  { path: '/compras/integraciones', roles: ['super_admin', 'lider_procura', 'executive'] },
  // Gestión de roles de Compras (autoservicio): solo líder de procura.
  { path: '/compras/roles', roles: ['super_admin', 'lider_procura'] },
  { path: '/compras/comite', roles: ROLE_PRIORITY },
  { path: '/compras/dashboard', roles: ROLE_PRIORITY },
  { path: '/compras/solicitudes', roles: ROLE_PRIORITY },
  { path: '/compras/aprobaciones', roles: ROLE_PRIORITY },
  { path: '/compras/ordenes', roles: ROLE_PRIORITY },
  { path: '/compras/expeditacion', roles: ROLE_PRIORITY },
  { path: '/compras/contratos', roles: ROLE_PRIORITY },
  { path: '/compras/proveedores', roles: ROLE_PRIORITY },
  { path: '/compras/reportes', roles: ROLE_PRIORITY },

  // Reportes
  { path: '/reportes', roles: ['super_admin', 'admin_rh', 'executive'] },

  // Auditoría
  { path: '/auditoria', roles: ['super_admin', 'admin_rh'] },

  // Personal (colaboradores)
  { path: '/personal', roles: ['super_admin', 'admin_rh'] },
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
