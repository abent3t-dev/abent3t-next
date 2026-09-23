'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import UserRolesModal from '@/components/auth/UserRolesModal';
import type { UserProfile, UserRole } from '@/types/auth';
import { ROLE_LABELS } from '@/types/auth';

/**
 * Gestión de roles de Compras (autoservicio, junta 2026-09-17): el líder de
 * procura asigna/revoca los roles del módulo compras sin pasar por
 * super_admin. Lista TODOS los perfiles activos (el punto es poder dar rol a
 * quien aún no tiene) y reusa UserRolesModal acotado a compras — mismo
 * patrón con el que RH gestiona capacitación desde /personal.
 *
 * La ruta la restringe ROUTE_PERMISSIONS a super_admin/lider_procura y el
 * backend valida el alcance en cada asignación (resolveRoleManagementScope).
 */

interface ManagedUser {
  id: string;
  full_name: string | null;
  email: string;
  position: string | null;
  department: string | null;
  purchase_roles: string[];
}

interface PaginatedResponse {
  data: ManagedUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const PAGE_SIZE = 20;

/** Roles de compras que el líder de procura puede otorgar desde aquí
 *  (lider_procura queda fuera a propósito: nombrarlo sigue siendo de
 *  super_admin — espejo de resolveRoleManagementScope en el backend). */
const ASSIGNABLE_PURCHASE_ROLES: UserRole[] = [
  'solicitante',
  'comprador',
  'coordinador_compras',
  'aprobador_nivel_1',
  'aprobador_nivel_2',
  'aprobador_nivel_3',
  'director_general',
];

const Icons = {
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  shield: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

export default function ComprasRolesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rolesUser, setRolesUser] = useState<ManagedUser | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['compras-roles-users', search, page],
    queryFn: () =>
      api.get<PaginatedResponse>(`/compras/usuarios/gestion?${queryParams.toString()}`),
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  const handleCloseModal = () => {
    setRolesUser(null);
    // Los chips de la tabla salen de otro endpoint: refrescar tras editar.
    void qc.invalidateQueries({ queryKey: ['compras-roles-users'] });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Roles de Compras</h1>
        <p className="text-gray-500">
          Asigna o revoca los roles del módulo de Compras. Cualquier usuario ya
          puede consultar el módulo; el rol define qué acciones puede realizar.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {Icons.search}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#424846]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Puesto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Departamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Roles de compras</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u, idx) => (
                <tr key={u.id} className={`hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.position || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.department || '—'}</td>
                  <td className="px-4 py-3">
                    {u.purchase_roles.length === 0 ? (
                      <span className="text-sm text-gray-500">Sin rol (solo consulta)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.purchase_roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-[#52AF32]/10 text-[#3d8425]"
                          >
                            {ROLE_LABELS[role as UserRole] ?? role}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <button
                        onClick={() => setRolesUser(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#52AF32] hover:bg-[#52AF32]/10 rounded-lg transition-colors"
                        title="Gestionar roles de compras"
                      >
                        {Icons.shield}
                        <span>Roles</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay usuarios que coincidan con la búsqueda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Mostrando {(meta.page - 1) * meta.limit + 1} -{' '}
              {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!meta.hasPrev}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {meta.page} de {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!meta.hasNext}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de gestión (acotado a compras: los otros módulos se ven como
          solo lectura y el backend rechaza cualquier intento fuera de alcance) */}
      <UserRolesModal
        open={!!rolesUser}
        user={rolesUser as unknown as UserProfile | null}
        onClose={handleCloseModal}
        allowedModules={['compras']}
        allowedRoles={ASSIGNABLE_PURCHASE_ROLES}
      />
    </div>
  );
}
