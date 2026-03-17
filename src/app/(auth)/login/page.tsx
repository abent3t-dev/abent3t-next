'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { signInWithMicrosoft, loading } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Abent 3T
        </h1>
        <p className="text-gray-500 mb-8">
          Sistema de Gestión de Capacitación
        </p>

        <button
          onClick={signInWithMicrosoft}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#2F2F2F] text-white rounded-md hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
          </svg>
          Iniciar sesión con Microsoft
        </button>

        <p className="mt-6 text-xs text-gray-400">
          Acceso con correo corporativo Microsoft
        </p>
      </div>
    </div>
  );
}
