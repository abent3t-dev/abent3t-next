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
  // PURCHASE_TEAM = lider_procura, coordinador_compras, comprador
  // APPROVERS     = aprobador_nivel_1/2/3, director_general
  // PURCHASE_ADMINS = super_admin, lider_procura
  // Integraciones (Fase INT-5): pagina tecnica de estado/corridas/disparo Maximo
  { path: '/compras/integraciones', roles: ['super_admin', 'lider_procura', 'executive'] },
  // Comite de Compras (§16): equipo de procura + cadena de aprobadores + executive
  { path: '/compras/comite', roles: ['super_admin', 'lider_procura', 'coordinador_compras', 'comprador', 'aprobador_nivel_1', 'aprobador_nivel_2', 'aprobador_nivel_3', 'director_general', 'executive'] },
  { path: '/compras/dashboard', roles: ['super_admin', 'lider_procura', 'coordinador_compras', 'comprador', 'aprobador_nivel_1', 'aprobador_nivel_2', 'aprobador_nivel_3', 'director_general', 'executive'] },
  { path: '/compras/solicitudes', roles: ['super_admin', 'lider_procura', 'coordinador_compras', 'comprador', 'solicitante'] },
  { path: '/compras/aprobaciones', roles: ['super_admin', 'lider_procura', 'coordinador_compras', 'comprador', 'aprobador_nivel_1', 'aprobador_nivel_2', 'aprobador_nivel_3', 'director_general'] },
  { path: '/compras/ordenes', roles: ['super_admin', 'lider_procura', 'coordinador_compras', 'comprador'] },
  // El doc también contempla `proveedor_externo`; ese rol aún no existe en UserRole.
  // Expeditación (fase 2026-09): lectura también para aprobadores y executive
  { path: '/compras/expeditacion', roles: ['super_admin', 'lider_procura', 'coordinador_compras', 'comprador', 'aprobador_nivel_1', 'aprobador_nivel_2', 'aprobador_nivel_3', 'director_general', 'executive'] },
  // §15: Contratos es el ÚNICO apartado de compras con consulta para TODA la
  // empresa — regla explícita con todos los roles (no ausencia de regla). Las
  // mutaciones las restringe el backend a PURCHASE_TEAM.
  { path: '/compras/contratos', roles: ROLE_PRIORITY },
  { path: '/compras/proveedores', roles: ['super_admin', 'lider_procura', 'coordinador_compras', 'comprador'] },
  { path: '/compras/reportes', roles: ['super_admin', 'lider_procura', 'coordinador_compras', 'comprador', 'aprobador_nivel_1', 'aprobador_nivel_2', 'aprobador_nivel_3', 'director_general', 'executive'] },

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
