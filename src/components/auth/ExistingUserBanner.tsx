'use client';

import {
  MODULE_LABELS,
  ROLE_LABELS,
  type UserModule,
  type UserRole,
} from '@/types/auth';
import type { EmailLookupResult } from '@/hooks/useEmailLookup';

interface ExistingUserBannerProps {
  result: EmailLookupResult;
  /** Rol que se va a agregar (lo elige el formulario). */
  newRole: UserRole;
  /** Módulo donde se va a agregar el rol. */
  newModule: UserModule;
}

/**
 * Banner azul que aparece cuando el email tipeado ya pertenece a un usuario
 * del sistema. Le explica al admin qué va a pasar al hacer submit.
 */
export default function ExistingUserBanner({
  result,
  newRole,
  newModule,
}: ExistingUserBannerProps) {
  if (!result.exists || !result.profile) return null;

  const profile = result.profile;
  const existingRoles = result.roles_by_module ?? [];
  const willDuplicate = existingRoles.some(
    (r) => r.module === newModule && r.role === newRole,
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="font-semibold text-blue-900">
            Este email ya pertenece a {profile.full_name}
          </p>

          {existingRoles.length > 0 && (
            <p className="text-blue-800 text-xs mt-1">
              Roles actuales:{' '}
              {existingRoles
                .map(
                  (r) =>
                    `${ROLE_LABELS[r.role] ?? r.role} (${MODULE_LABELS[r.module] ?? r.module})`,
                )
                .join(', ')}
              .
            </p>
          )}

          <p className="text-blue-800 mt-2">
            {willDuplicate ? (
              <>
                <strong>Ya tiene</strong> el rol{' '}
                <strong>{ROLE_LABELS[newRole] ?? newRole}</strong> en{' '}
                <strong>{MODULE_LABELS[newModule]}</strong>. No habrá cambios.
              </>
            ) : (
              <>
                Al guardar se le agregará el rol{' '}
                <strong>{ROLE_LABELS[newRole] ?? newRole}</strong> en{' '}
                <strong>{MODULE_LABELS[newModule]}</strong> como{' '}
                acceso adicional. Los demás campos del formulario (contraseña,
                nombre, posición, departamento) <strong>NO se modificarán</strong>.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
