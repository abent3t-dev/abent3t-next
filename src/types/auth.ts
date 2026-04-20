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
  | 'solicitante'           // Usuario que solicita compras
  // Roles de Contabilidad y Fiscal
  | 'contabilidad'          // Equipo de contabilidad (Irene, Henry)
  | 'fiscal'                // Especialista fiscal (Francisco)
  | 'director_financiero'   // Director financiero
  | 'accionista';           // Accionista (solo lectura)

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

// Acceso a compras (lectura) - super_admin tiene acceso total
const PURCHASE_VIEWERS: UserRole[] = ['super_admin', ...PURCHASE_TEAM, ...APPROVERS, 'solicitante'];

// Administracion de compras
const PURCHASE_ADMINS: UserRole[] = ['super_admin', 'lider_procura'];

// Todos los roles de compras (incluyendo super_admin para acceso completo)
const ALL_PURCHASE_ROLES: UserRole[] = ['super_admin', ...PURCHASE_TEAM, ...APPROVERS, 'solicitante'];

// ==========================================
// GRUPOS DE ROLES - CONTABILIDAD Y FISCAL
// ==========================================

// Equipo de contabilidad y fiscal
const ACCOUNTING_TEAM: UserRole[] = ['contabilidad', 'fiscal'];

// Roles con acceso de lectura a contabilidad
const ACCOUNTING_VIEWERS: UserRole[] = ['super_admin', ...ACCOUNTING_TEAM, 'director_financiero', 'accionista', 'executive'];

// Roles con acceso de edicion a contabilidad
const ACCOUNTING_EDITORS: UserRole[] = ['super_admin', 'contabilidad', 'fiscal'];

// Todos los roles de contabilidad
const ALL_ACCOUNTING_ROLES: UserRole[] = ['super_admin', ...ACCOUNTING_TEAM, 'director_financiero', 'accionista'];

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
      { label: 'Dashboard', href: '/compras/dashboard', icon: 'chart', roles: ['super_admin', ...PURCHASE_TEAM, ...APPROVERS, ...EXEC_ROLES] },
      { label: 'Solicitudes (RQ)', href: '/compras/solicitudes', icon: 'file-text', roles: ['super_admin', ...PURCHASE_TEAM, 'solicitante'] },
      { label: 'Aprobaciones', href: '/compras/aprobaciones', icon: 'check-circle', roles: ['super_admin', ...PURCHASE_TEAM, ...APPROVERS] },
      { label: 'Ordenes (PO)', href: '/compras/ordenes', icon: 'clipboard', roles: ['super_admin', ...PURCHASE_TEAM] },
      { label: 'Proveedores', href: '/compras/proveedores', icon: 'truck', roles: ['super_admin', ...PURCHASE_TEAM] },
      { label: 'Reportes', href: '/compras/reportes', icon: 'bar-chart', roles: ['super_admin', ...PURCHASE_TEAM, ...APPROVERS, ...EXEC_ROLES] },
    ],
  },
  // ==========================================
  // MODULO DE CONTABILIDAD Y COMPLIANCE FISCAL
  // ==========================================
  {
    label: 'Contabilidad',
    href: '/contabilidad/dashboard',
    icon: 'calculator',
    roles: ACCOUNTING_VIEWERS,
    children: [
      { label: 'Dashboard', href: '/contabilidad/dashboard', icon: 'chart', roles: ACCOUNTING_VIEWERS },
      { label: 'EBITDA', href: '/contabilidad/ebitda', icon: 'trending-up', roles: ACCOUNTING_VIEWERS },
      { label: 'Costos', href: '/contabilidad/costos', icon: 'dollar', roles: ACCOUNTING_VIEWERS },
      { label: 'Utilidad', href: '/contabilidad/utilidad', icon: 'pie-chart', roles: ACCOUNTING_VIEWERS },
      { label: 'Perdidas Fiscales', href: '/contabilidad/perdidas-fiscales', icon: 'alert-triangle', roles: [...ACCOUNTING_EDITORS, 'director_financiero'] },
      { label: 'No Deducibles', href: '/contabilidad/no-deducibles', icon: 'x-circle', roles: [...ACCOUNTING_EDITORS, 'director_financiero'] },
      { label: 'Financiamiento', href: '/contabilidad/financiamiento', icon: 'credit-card', roles: ACCOUNTING_VIEWERS },
      { label: 'Tenencia', href: '/contabilidad/tenencia', icon: 'users', roles: ['super_admin', 'director_financiero', 'accionista'] },
      { label: 'OKRs', href: '/contabilidad/okrs', icon: 'target', roles: ACCOUNTING_EDITORS },
      { label: 'Complementos Pago', href: '/contabilidad/complementos-pago', icon: 'file-check', roles: ACCOUNTING_EDITORS },
      { label: 'Compliance', href: '/contabilidad/compliance', icon: 'shield', roles: ACCOUNTING_EDITORS },
      { label: 'Configuracion', href: '/contabilidad/configuracion', icon: 'settings', roles: ['super_admin'] },
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
      { label: 'Plataformas', href: '/catalogs/platforms', icon: 'link', roles: HR_ADMIN_ROLES },
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
  // Roles de Contabilidad
  contabilidad: 'Contabilidad',
  fiscal: 'Fiscal',
  director_financiero: 'Director Financiero',
  accionista: 'Accionista',
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
  // Roles de Contabilidad
  contabilidad: '/contabilidad/dashboard',
  fiscal: '/contabilidad/dashboard',
  director_financiero: '/contabilidad/dashboard',
  accionista: '/contabilidad/tenencia',
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

/** Roles del equipo de contabilidad (para exportar) */
export const ACCOUNTING_TEAM_ROLES = ACCOUNTING_TEAM;

/** Roles con acceso de lectura a contabilidad (para exportar) */
export const ACCOUNTING_VIEWER_ROLES = ACCOUNTING_VIEWERS;

/** Roles con acceso de edicion a contabilidad (para exportar) */
export const ACCOUNTING_EDITOR_ROLES = ACCOUNTING_EDITORS;
