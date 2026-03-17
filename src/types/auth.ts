export type UserRole = 'admin_rh' | 'director' | 'collaborator' | 'executive';

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

/** Route access map per role */
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin_rh: [
    '/catalogs',
    '/courses',
    '/personnel',
    '/budget',
    '/certificates',
    '/requests',
    '/reports',
    '/dashboard',
  ],
  director: ['/dashboard', '/my-courses', '/budget', '/requests'],
  collaborator: ['/dashboard', '/my-courses', '/certificates'],
  executive: ['/dashboard', '/reports'],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin_rh: 'Administrador RH',
  director: 'Director de Área',
  collaborator: 'Colaborador',
  executive: 'Dirección / Consulta',
};
