'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, SIDEBAR_NAV, type UserRole } from '@/types/auth';

export default function RolesPage() {
  const { loading, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.replace('/home');
    }
  }, [loading, isSuperAdmin, router]);

  if (loading || !isSuperAdmin) {
    return <div className="p-6 text-center text-gray-500">Cargando...</div>;
  }

  const roles: UserRole[] = ['super_admin', 'admin_rh', 'jefe_area', 'director', 'executive', 'colaborador', 'collaborator'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles y Permisos</h1>
        <p className="text-gray-500">Configuración de acceso por rol</p>
      </div>

      <div className="space-y-6">
        {roles.map((role) => {
          const accessibleModules = SIDEBAR_NAV.filter((item) => item.roles.includes(role));

          return (
            <div key={role} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {ROLE_LABELS[role]}
              </h2>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase">
                  Módulos con acceso
                </h3>
                <div className="flex flex-wrap gap-2">
                  {accessibleModules.map((module) => (
                    <div key={module.href} className="flex flex-col">
                      <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {module.label}
                      </span>
                      {module.children && (
                        <div className="ml-4 mt-1 space-y-1">
                          {module.children
                            .filter((child) => child.roles.includes(role))
                            .map((child) => (
                              <span
                                key={child.href}
                                className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                              >
                                {child.label}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Los permisos están definidos en el código del sistema. Para modificarlos, contacta al equipo de desarrollo.
        </p>
      </div>
    </div>
  );
}
