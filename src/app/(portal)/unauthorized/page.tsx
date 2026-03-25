'use client';

import { useAuth } from '@/contexts/AuthContext';
import { HOME_ROUTES } from '@/types/auth';
import Link from 'next/link';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const homeRoute = user ? HOME_ROUTES[user.role] || '/home' : '/login';

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <svg
          className="w-20 h-20 mx-auto text-red-400 mb-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso no autorizado</h1>
        <p className="text-gray-500 mb-6">
          No tienes permisos para acceder a esta sección. Contacta al administrador si crees que es un error.
        </p>
        <Link
          href={homeRoute}
          className="inline-flex px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
