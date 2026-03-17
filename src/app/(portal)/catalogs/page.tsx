import Link from 'next/link';

const catalogs = [
  { href: '/catalogs/departments', title: 'Departamentos', description: 'Áreas de la empresa' },
  { href: '/catalogs/institutions', title: 'Instituciones', description: 'Proveedores de capacitación' },
  { href: '/catalogs/course-types', title: 'Tipos de Curso', description: 'Técnico, soft skills, cumplimiento, etc.' },
  { href: '/catalogs/modalities', title: 'Modalidades', description: 'Presencial, en línea, híbrido, autoestudio' },
  { href: '/catalogs/periods', title: 'Periodos', description: 'Periodos presupuestales semestrales' },
];

export default function CatalogsPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {catalogs.map((cat) => (
        <Link
          key={cat.href}
          href={cat.href}
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900">{cat.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{cat.description}</p>
        </Link>
      ))}
    </div>
  );
}
