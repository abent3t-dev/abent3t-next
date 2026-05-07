'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import {
  ALL_MODULES,
  MODULE_LABELS,
  MODULE_ROLES,
  ROLE_LABELS,
  type UserModule,
  type UserProfile,
  type UserRole,
} from '@/types/auth';

interface UserRoleAssignmentRow {
  id: string;
  profile_id: string;
  module: UserModule;
  role: UserRole;
  granted_at: string;
  revoked_at: string | null;
  is_active: boolean;
}

interface UserRolesModalProps {
  open: boolean;
  user: UserProfile | null;
  onClose: () => void;
  /**
   * Si se pasa, solo se muestran y permiten editar los módulos en esta lista.
   * Útil para que admin_rh solo vea Capacitación.
   */
  allowedModules?: UserModule[];
  /**
   * Si se pasa, el dropdown de "agregar rol" y los botones de "revocar" solo
   * actúan sobre estos roles. Útil para que admin_rh solo pueda asignar/revocar
   * Colaborador o Jefe de Área (no admin_rh ni director).
   */
  allowedRoles?: UserRole[];
}

export default function UserRolesModal({
  open,
  user,
  onClose,
  allowedModules,
  allowedRoles,
}: UserRolesModalProps) {
  const qc = useQueryClient();
  const { user: currentUser, refreshUser } = useAuth();
  const isSelf = !!user && currentUser?.id === user.id;

  const rolesQuery = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: () =>
      api.get<UserRoleAssignmentRow[]>(`/auth/users/${user?.id}/roles`),
    enabled: open && !!user?.id,
  });

  const afterChange = () => {
    qc.invalidateQueries({ queryKey: ['user-roles', user?.id] });
    qc.invalidateQueries({ queryKey: ['users'] });
    // Si el super_admin se cambió roles a sí mismo, refrescar el AuthContext
    // para que el sidebar y los permisos se actualicen sin reload.
    if (isSelf) refreshUser();
  };

  const assignMutation = useMutation({
    mutationFn: (input: { module: UserModule; role: UserRole }) =>
      api.post(`/auth/users/${user?.id}/roles`, input),
    onSuccess: () => {
      afterChange();
      notify.success('Rol asignado correctamente');
    },
    onError: (err: Error) => notify.error(err.message || 'Error al asignar rol'),
  });

  const revokeMutation = useMutation({
    mutationFn: (roleId: string) =>
      api.put(`/auth/users/${user?.id}/roles/${roleId}/revoke`, {}),
    onSuccess: () => {
      afterChange();
      notify.success('Rol revocado correctamente');
    },
    onError: (err: Error) => notify.error(err.message || 'Error al revocar rol'),
  });

  if (!open || !user) return null;

  const activeAssignments = (rolesQuery.data ?? []).filter((r) => r.is_active);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#52AF32] to-[#67B52E] px-6 py-4 text-white">
            <h2 className="text-lg font-semibold">Gestión de roles por módulo</h2>
            <p className="text-sm text-green-50/90 mt-1">
              {user.full_name} · {user.email}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              Asigna o revoca roles del usuario por módulo. Cada módulo puede
              tener uno o varios roles activos al mismo tiempo.
            </div>

            {rolesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52AF32]" />
              </div>
            ) : (
              <div className="space-y-4">
                {(allowedModules ?? ALL_MODULES).map((mod) => (
                  <ModuleSection
                    key={mod}
                    module={mod}
                    assignments={activeAssignments.filter((a) => a.module === mod)}
                    onAssign={(role) => assignMutation.mutate({ module: mod, role })}
                    onRevoke={(roleId) => revokeMutation.mutate(roleId)}
                    isWorking={assignMutation.isPending || revokeMutation.isPending}
                    allowedRoles={allowedRoles}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-3 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// SECCIÓN POR MÓDULO
// =====================================================

function ModuleSection({
  module,
  assignments,
  onAssign,
  onRevoke,
  isWorking,
  allowedRoles,
}: {
  module: UserModule;
  assignments: UserRoleAssignmentRow[];
  onAssign: (role: UserRole) => void;
  onRevoke: (roleId: string) => void;
  isWorking: boolean;
  /** Si se pasa, solo se permiten asignar/revocar roles dentro de esta lista. */
  allowedRoles?: UserRole[];
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  // Roles válidos según el módulo, opcionalmente restringidos por allowedRoles
  const validRoles = allowedRoles
    ? MODULE_ROLES[module].filter((r) => allowedRoles.includes(r))
    : MODULE_ROLES[module];
  const assignedRoles = new Set(assignments.map((a) => a.role));
  const availableRoles = validRoles.filter((r) => !assignedRoles.has(r));
  const canRevoke = (role: UserRole) => !allowedRoles || allowedRoles.includes(role);

  const handleAssign = () => {
    if (!selectedRole) return;
    onAssign(selectedRole);
    setSelectedRole('');
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {MODULE_LABELS[module]}
        </span>
        <span className="text-xs text-gray-500">
          {assignments.length}{' '}
          {assignments.length === 1 ? 'rol asignado' : 'roles asignados'}
        </span>
      </div>

      {/* Lista de roles asignados */}
      <div className="px-4 py-3 space-y-2">
        {assignments.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin roles en este módulo.</p>
        ) : (
          assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-100 rounded-md"
            >
              <div>
                <span className="text-sm font-medium text-green-900">
                  {ROLE_LABELS[a.role] ?? a.role}
                </span>
                <span className="text-xs text-green-700/70 ml-2">
                  asignado {new Date(a.granted_at).toLocaleDateString('es-MX')}
                </span>
              </div>
              {canRevoke(a.role) ? (
                <button
                  type="button"
                  onClick={() => onRevoke(a.id)}
                  disabled={isWorking}
                  className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
                >
                  Revocar
                </button>
              ) : (
                <span
                  className="text-xs text-gray-400"
                  title="No tienes permiso para gestionar este rol"
                >
                  Solo lectura
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Agregar nuevo rol */}
      {availableRoles.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-transparent bg-white"
          >
            <option value="">Seleccionar rol para agregar...</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role] ?? role}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedRole || isWorking}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[#52AF32] rounded-md hover:bg-[#67B52E] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Agregar
          </button>
        </div>
      )}
    </div>
  );
}
