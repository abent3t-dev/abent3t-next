'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function SolicitudesPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Capacitación</h1>
        <p className="text-gray-500">
          {user?.role === 'colaborador'
            ? 'Solicita cursos y da seguimiento a tus peticiones'
            : 'Gestiona las solicitudes de capacitación de tu equipo'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Módulo en desarrollo
        </h3>
        <p className="text-gray-500">
          El sistema de solicitudes de capacitación estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}
