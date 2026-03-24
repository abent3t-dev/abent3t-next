'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const catalogs = [
  {
    name: 'Departamentos',
    href: '/catalogos/departamentos',
    description: 'Áreas de la organización',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    name: 'Instituciones',
    href: '/catalogos/instituciones',
    description: 'Proveedores de capacitación',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
  },
  {
    name: 'Tipos de Curso',
    href: '/catalogos/tipos-curso',
    description: 'Clasificación de cursos',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    name: 'Modalidades',
    href: '/catalogos/modalidades',
    description: 'Presencial, en línea, híbrido',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: 'Periodos',
    href: '/catalogos/periodos',
    description: 'Periodos fiscales y de gestión',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function CatalogosPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catálogos del Sistema</h1>
        <p className="text-gray-500">Configuración de datos maestros</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogs.map((catalog) => (
          <Link
            key={catalog.href}
            href={catalog.href}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow group"
          >
            <div className="text-gray-400 group-hover:text-blue-600 transition-colors mb-4">
              {catalog.icon}
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
              {catalog.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{catalog.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
