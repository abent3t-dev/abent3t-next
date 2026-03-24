export type UserRole = 'super_admin' | 'jefe_area' | 'colaborador';

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

/** Navegación principal del sidebar */
export const SIDEBAR_NAV: NavItem[] = [
  // Administración del Sistema (Solo Super Admin)
  {
    label: 'Administración',
    href: '/admin',
    icon: 'settings',
    roles: ['super_admin'],
    children: [
      { label: 'Usuarios', href: '/admin/users', icon: 'users', roles: ['super_admin'] },
      { label: 'Roles y Permisos', href: '/admin/roles', icon: 'shield', roles: ['super_admin'] },
    ],
  },
  // Módulo RRHH - Capacitación
  {
    label: 'Capacitación',
    href: '/capacitacion',
    icon: 'graduation',
    roles: ['super_admin', 'jefe_area', 'colaborador'],
    children: [
      { label: 'Dashboard', href: '/capacitacion/dashboard', icon: 'chart', roles: ['super_admin', 'jefe_area'] },
      { label: 'Cursos', href: '/capacitacion/cursos', icon: 'book', roles: ['super_admin', 'jefe_area'] },
      { label: 'Mis Cursos', href: '/capacitacion/mis-cursos', icon: 'user-check', roles: ['colaborador'] },
      { label: 'Presupuestos', href: '/capacitacion/presupuestos', icon: 'wallet', roles: ['super_admin', 'jefe_area'] },
      { label: 'Participantes', href: '/capacitacion/participantes', icon: 'users', roles: ['super_admin', 'jefe_area'] },
      { label: 'Solicitudes', href: '/capacitacion/solicitudes', icon: 'file-text', roles: ['super_admin', 'jefe_area', 'colaborador'] },
    ],
  },
  // Catálogos
  {
    label: 'Catálogos',
    href: '/catalogos',
    icon: 'database',
    roles: ['super_admin', 'jefe_area'],
    children: [
      { label: 'Departamentos', href: '/catalogos/departamentos', icon: 'building', roles: ['super_admin', 'jefe_area'] },
      { label: 'Instituciones', href: '/catalogos/instituciones', icon: 'landmark', roles: ['super_admin', 'jefe_area'] },
      { label: 'Tipos de Curso', href: '/catalogos/tipos-curso', icon: 'tag', roles: ['super_admin', 'jefe_area'] },
      { label: 'Modalidades', href: '/catalogos/modalidades', icon: 'layers', roles: ['super_admin', 'jefe_area'] },
      { label: 'Periodos', href: '/catalogos/periodos', icon: 'calendar', roles: ['super_admin', 'jefe_area'] },
    ],
  },
];

/** Route access map per role */
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  super_admin: ['*'], // Acceso total
  jefe_area: [
    '/capacitacion',
    '/catalogos',
    '/reportes',
  ],
  colaborador: [
    '/capacitacion/mis-cursos',
    '/capacitacion/solicitudes',
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrador',
  jefe_area: 'Jefe de Área',
  colaborador: 'Colaborador',
};

/** Página de inicio por rol */
export const HOME_ROUTES: Record<UserRole, string> = {
  super_admin: '/admin',
  jefe_area: '/capacitacion/dashboard',
  colaborador: '/capacitacion/mis-cursos',
};
