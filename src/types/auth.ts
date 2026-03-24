// Todos los roles del sistema (deben coincidir con el enum user_role en Supabase)
export type UserRole =
  | 'super_admin'    // Superusuario - acceso total al sistema
  | 'admin_rh'       // Administrador de RRHH - gestiona capacitación
  | 'jefe_area'      // Jefe de área - gestiona su departamento
  | 'director'       // Director (alias de jefe_area)
  | 'colaborador'    // Colaborador (español)
  | 'collaborator'   // Collaborator (inglés, legacy)
  | 'executive';     // Ejecutivo - solo consulta/reportes

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

/** Módulos del sistema organizados por área */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  children?: NavItem[];
}

// Roles con acceso de administración
const ADMIN_ROLES: UserRole[] = ['super_admin'];

// Roles con acceso a RRHH/Capacitación completo
const HR_ADMIN_ROLES: UserRole[] = ['super_admin', 'admin_rh'];

// Roles con acceso de gestión de área
const MANAGER_ROLES: UserRole[] = ['super_admin', 'admin_rh', 'jefe_area', 'director'];

// Roles de empleados regulares
const EMPLOYEE_ROLES: UserRole[] = ['colaborador', 'collaborator'];

// Roles con acceso de consulta/ejecutivo
const EXEC_ROLES: UserRole[] = ['super_admin', 'executive'];

// Todos los roles
const ALL_ROLES: UserRole[] = ['super_admin', 'admin_rh', 'jefe_area', 'director', 'colaborador', 'collaborator', 'executive'];

/** Navegación principal del sidebar */
export const SIDEBAR_NAV: NavItem[] = [
  // Administración del Sistema (Solo Super Admin)
  {
    label: 'Administración',
    href: '/admin',
    icon: 'settings',
    roles: ADMIN_ROLES,
    children: [
      { label: 'Usuarios', href: '/admin/users', icon: 'users', roles: ADMIN_ROLES },
      { label: 'Roles y Permisos', href: '/admin/roles', icon: 'shield', roles: ADMIN_ROLES },
    ],
  },
  // Módulo RRHH - Capacitación
  {
    label: 'Capacitación',
    href: '/dashboard',
    icon: 'graduation',
    roles: ALL_ROLES,
    children: [
      { label: 'Dashboard', href: '/dashboard', icon: 'chart', roles: [...HR_ADMIN_ROLES, ...EXEC_ROLES] },
      { label: 'Cursos', href: '/courses', icon: 'book', roles: HR_ADMIN_ROLES },
      { label: 'Mis Cursos', href: '/capacitacion/mis-cursos', icon: 'user-check', roles: [...EMPLOYEE_ROLES, 'jefe_area', 'director'] },
      { label: 'Presupuestos', href: '/capacitacion/presupuestos', icon: 'wallet', roles: HR_ADMIN_ROLES },
      { label: 'Solicitudes', href: '/capacitacion/solicitudes', icon: 'file-text', roles: [...HR_ADMIN_ROLES, ...EMPLOYEE_ROLES, 'jefe_area', 'director'] },
    ],
  },
  // Catálogos (solo admins de RRHH)
  {
    label: 'Catálogos',
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
  // Reportes (ejecutivos y admins)
  {
    label: 'Reportes',
    href: '/reportes',
    icon: 'chart',
    roles: EXEC_ROLES,
    children: [
      { label: 'Capacitación', href: '/reportes/capacitacion', icon: 'graduation', roles: EXEC_ROLES },
    ],
  },
];

/** Etiquetas de rol para mostrar en UI */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrador',
  admin_rh: 'Administrador RRHH',
  jefe_area: 'Jefe de Área',
  director: 'Director',
  colaborador: 'Colaborador',
  collaborator: 'Colaborador',
  executive: 'Ejecutivo',
};

/** Página de inicio por rol */
export const HOME_ROUTES: Record<UserRole, string> = {
  super_admin: '/admin',
  admin_rh: '/dashboard',
  jefe_area: '/capacitacion/mis-cursos',
  director: '/capacitacion/mis-cursos',
  colaborador: '/capacitacion/mis-cursos',
  collaborator: '/capacitacion/mis-cursos',
  executive: '/dashboard',
};

/** Roles que pueden gestionar usuarios */
export const CAN_MANAGE_USERS: UserRole[] = ['super_admin'];

/** Roles que pueden gestionar catálogos */
export const CAN_MANAGE_CATALOGS: UserRole[] = ['super_admin', 'admin_rh'];

/** Roles que pueden ver todos los departamentos */
export const CAN_VIEW_ALL_DEPARTMENTS: UserRole[] = ['super_admin', 'admin_rh', 'executive'];
