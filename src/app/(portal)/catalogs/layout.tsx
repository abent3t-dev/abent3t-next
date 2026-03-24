export const dynamic = 'force-dynamic';

import Link from 'next/link';

const catalogLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/catalogs/departments', label: 'Departamentos' },
  { href: '/catalogs/institutions', label: 'Instituciones' },
  { href: '/catalogs/course-types', label: 'Tipos de Curso' },
  { href: '/catalogs/modalities', label: 'Modalidades' },
  { href: '/catalogs/periods', label: 'Periodos' },
  { href: '/catalogs/budgets', label: 'Presupuestos' },
  { href: '/courses', label: 'Cursos' },
];

export default function CatalogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Catálogos del Sistema
        </h1>
        <nav className="mt-3 flex gap-2">
          {catalogLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
