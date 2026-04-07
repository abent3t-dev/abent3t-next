'use client';

import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="flex flex-col items-center gap-4">
            {/* Spinner verde A3T */}
            <div className="w-12 h-12 border-4 border-a3t-green border-t-transparent rounded-full animate-spin" />

            {/* Mensaje de carga */}
            <div>
              <p className="text-gray-700 font-medium text-lg">Cargando...</p>
              <p className="text-gray-500 text-sm mt-1">Preparando tu espacio de trabajo</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar oscuro con identidad A3T */}
      <Sidebar />

      {/* Área principal de contenido */}
      <main className="flex-1 overflow-auto">
        {/* Contenedor con padding y altura completa */}
        <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
          {/* Contenido con fondo blanco y bordes sutiles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
