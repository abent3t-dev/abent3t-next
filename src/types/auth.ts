// Todos los roles del sistema (deben coincidir con el enum user_role en Supabase)
export type UserRole =
  | 'super_admin'           // Superusuario - acceso total al sistema
  | 'admin_rh'              // Administrador de RRHH - gestiona capacitacion
  | 'jefe_area'             // Jefe de area - gestiona su departamento
  | 'director'              // Director (alias de jefe_area)
  | 'colaborador'           // Colaborador (espanol)
  | 'collaborator'          // Collaborator (ingles, legacy)
  | 'executive'             // Ejecutivo - solo consulta/reportes
  // Roles de Compras
  | 'comprador'             // Comprador del equipo de procura
  | 'coordinador_compras'   // Coordinador de Compras
  | 'lider_procura'         // Lider de Procura
  | 'aprobador_nivel_1'     // Primer nivel aprobacion (David)
  | 'aprobador_nivel_2'     // Segundo nivel (Gilberto)
  | 'aprobador_nivel_3'     // Tercer nivel (Uriel)
  | 'director_general'      // Aprobacion final
  | 'solicitante';          // Usuario que solicita compras

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  is_active: boolean;
  position: string | null;
  departments: { id: string; name: string } | null;
}

/** Modulos del sistema organizados por area */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  children?: NavItem[];
}

// ==========================================
// GRUPOS DE ROLES - CAPACITACION/RRHH
// ==========================================

// Roles con acceso de administracion
const ADMIN_ROLES: UserRole[] = ['super_admin'];

// Roles con acceso a RRHH/Capacitacion completo
const HR_ADMIN_ROLES: UserRole[] = ['super_admin', 'admin_rh'];

// Roles con acceso de gestion de area
const MANAGER_ROLES: UserRole[] = ['super_admin', 'admin_rh', 'jefe_area', 'director'];

// Roles de empleados regulares
const EMPLOYEE_ROLES: UserRole[] = ['colaborador', 'collaborator'];

// Roles con acceso de consulta/ejecutivo
const EXEC_ROLES: UserRole[] = ['super_admin', 'executive'];

// Todos los roles de RRHH
const ALL_HR_ROLES: UserRole[] = ['super_admin', 'admin_rh', 'jefe_area', 'director', 'colaborador', 'collaborator', 'executive'];

// ==========================================
// GRUPOS DE ROLES - COMPRAS
// ==========================================

// Equipo de compras
const PURCHASE_TEAM: UserRole[] = ['lider_procura', 'coordinador_compras', 'comprador'];

// Cadena de aprobadores
const APPROVERS: UserRole[] = ['aprobador_nivel_1', 'aprobador_nivel_2', 'aprobador_nivel_3', 'director_general'];

// Acceso a compras (lectura)
const PURCHASE_VIEWERS: UserRole[] = [...PURCHASE_TEAM, ...APPROVERS, 'solicitante'];

// Administracion de compras
const PURCHASE_ADMINS: UserRole[] = ['super_admin', 'lider_procura'];

// Todos los roles de compras
const ALL_PURCHASE_ROLES: UserRole[] = [...PURCHASE_TEAM, ...APPROVERS, 'solicitante'];

/** Navegacion principal del sidebar */
export const SIDEBAR_NAV: NavItem[] = [
  // Administracion del Sistema (Solo Super Admin)
  {
    label: 'Administracion',
    href: '/admin',
    icon: 'settings',
    roles: ADMIN_ROLES,
    children: [
      { label: 'Usuarios', href: '/admin/users', icon: 'users', roles: ADMIN_ROLES },
      { label: 'Roles y Permisos', href: '/admin/roles', icon: 'shield', roles: ADMIN_ROLES },
    ],
  },
  // Modulo RRHH - Capacitacion
  {
    label: 'Capacitacion',
    href: '/dashboard',
    icon: 'graduation',
    roles: ALL_HR_ROLES,
    children: [
      { label: 'Dashboard', href: '/dashboard', icon: 'chart', roles: [...HR_ADMIN_ROLES, ...EXEC_ROLES] },
      { label: 'Cursos', href: '/courses', icon: 'book', roles: HR_ADMIN_ROLES },
      { label: 'Mis Cursos', href: '/capacitacion/mis-cursos', icon: 'user-check', roles: [...EMPLOYEE_ROLES, 'jefe_area', 'director'] },
      { label: 'Mi Equipo', href: '/capacitacion/mi-equipo', icon: 'users', roles: ['jefe_area', 'director'] },
      { label: 'Historial', href: '/capacitacion/historial', icon: 'clock', roles: EMPLOYEE_ROLES },
      { label: 'Presupuestos', href: '/capacitacion/presupuestos', icon: 'wallet', roles: HR_ADMIN_ROLES },
      { label: 'Evidencias', href: '/capacitacion/evidencias', icon: 'file-check', roles: HR_ADMIN_ROLES },
      { label: 'Propuestas', href: '/capacitacion/propuestas', icon: 'lightbulb', roles: HR_ADMIN_ROLES },
      { label: 'Solicitudes', href: '/capacitacion/solicitudes', icon: 'file-text', roles: [...HR_ADMIN_ROLES, ...EMPLOYEE_ROLES, 'jefe_area', 'director'] },
    ],
  },
  // ==========================================
  // MODULO DE COMPRAS
  // ==========================================
  {
    label: 'Compras',
    href: '/compras/dashboard',
    icon: 'shopping-cart',
    roles: [...PURCHASE_VIEWERS, ...EXEC_ROLES],
    children: [
      { label: 'Dashboard', href: '/compras/dashboard', icon: 'chart', roles: [...PURCHASE_TEAM, ...APPROVERS, ...EXEC_ROLES] },
      { label: 'Solicitudes (RQ)', href: '/compras/solicitudes', icon: 'file-text', roles: [...PURCHASE_TEAM, 'solicitante'] },
      { label: 'Aprobaciones', href: '/compras/aprobaciones', icon: 'check-circle', roles: [...PURCHASE_TEAM, ...APPROVERS] },
      { label: 'Ordenes (PO)', href: '/compras/ordenes', icon: 'clipboard', roles: PURCHASE_TEAM },
      { label: 'Proveedores', href: '/compras/proveedores', icon: 'truck', roles: PURCHASE_TEAM },
      { label: 'Reportes', href: '/compras/reportes', icon: 'bar-chart', roles: [...PURCHASE_TEAM, ...APPROVERS, ...EXEC_ROLES] },
    ],
  },
  // Catalogos (solo admins de RRHH)
  {
    label: 'Catalogos',
    href: '/catalogs',
    icon: 'database',
    roles: HR_ADMIN_ROLES,
    children: [
      { label: 'Departamentos', href: '/catalogs/departments', icon: 'building', roles: HR_ADMIN_ROLES },
      { label: 'Instituciones', href: '/catalogs/institutions', icon: 'landmark', roles: HR_ADMIN_ROLES },
      { label: 'Tipos de Curso', href: '/catalogs/course-types', icon: 'tag', roles: HR_ADMIN_ROLES },
      { label: 'Modalidades', href: '/catalogs/modalities', icon: 'layers', roles: HR_ADMIN_ROLES },
      { label: 'Periodos', href: '/catalogs/periods', icon: 'calendar', roles: HR_ADMIN_ROLES },
    ],
  },
  // Personal (colaboradores)
  {
    label: 'Personal',
    href: '/personal',
    icon: 'users',
    roles: HR_ADMIN_ROLES,
  },
  // Reportes (ejecutivos y admins)
  {
    label: 'Reportes',
    href: '/reportes',
    icon: 'chart',
    roles: [...HR_ADMIN_ROLES, ...EXEC_ROLES],
  },
  // Auditoria (solo admins)
  {
    label: 'Auditoria',
    href: '/auditoria',
    icon: 'shield',
    roles: HR_ADMIN_ROLES,
  },
];

/** Etiquetas de rol para mostrar en UI */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrador',
  admin_rh: 'Administrador RRHH',
  jefe_area: 'Jefe de Area',
  director: 'Director',
  colaborador: 'Colaborador',
  collaborator: 'Colaborador',
  executive: 'Ejecutivo',
  // Roles de Compras
  comprador: 'Comprador',
  coordinador_compras: 'Coordinador de Compras',
  lider_procura: 'Lider de Procura',
  aprobador_nivel_1: 'Aprobador Nivel 1',
  aprobador_nivel_2: 'Aprobador Nivel 2',
  aprobador_nivel_3: 'Aprobador Nivel 3',
  director_general: 'Director General',
  solicitante: 'Solicitante',
};

/** Pagina de inicio por rol */
export const HOME_ROUTES: Record<UserRole, string> = {
  super_admin: '/admin',
  admin_rh: '/dashboard',
  jefe_area: '/capacitacion/mis-cursos',
  director: '/capacitacion/mis-cursos',
  colaborador: '/capacitacion/mis-cursos',
  collaborator: '/capacitacion/mis-cursos',
  executive: '/dashboard',
  // Roles de Compras
  lider_procura: '/compras/dashboard',
  coordinador_compras: '/compras/dashboard',
  comprador: '/compras/solicitudes',
  aprobador_nivel_1: '/compras/aprobaciones',
  aprobador_nivel_2: '/compras/aprobaciones',
  aprobador_nivel_3: '/compras/aprobaciones',
  director_general: '/compras/aprobaciones',
  solicitante: '/compras/solicitudes',
};

/** Roles que pueden gestionar usuarios */
export const CAN_MANAGE_USERS: UserRole[] = ['super_admin'];

/** Roles que pueden gestionar catalogos */
export const CAN_MANAGE_CATALOGS: UserRole[] = ['super_admin', 'admin_rh'];

/** Roles que pueden ver todos los departamentos */
export const CAN_VIEW_ALL_DEPARTMENTS: UserRole[] = ['super_admin', 'admin_rh', 'executive'];

/** Roles del equipo de compras (para exportar) */
export const PURCHASE_TEAM_ROLES = PURCHASE_TEAM;

/** Roles de aprobadores (para exportar) */
export const APPROVER_ROLES = APPROVERS;

/** Roles de administradores de compras (para exportar) */
export const PURCHASE_ADMIN_ROLES = PURCHASE_ADMINS;
