'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface Course {
  id: string;
  name: string;
  duration_hours: number;
  cost: number;
  is_active: boolean;
  course_types: { name: string } | null;
  modalities: { name: string } | null;
  institutions: { name: string } | null;
}

export default function CursosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'colaborador') {
      router.replace('/capacitacion/mis-cursos');
      return;
    }

    async function loadCourses() {
      try {
        const data = await api.get<Course[]>('/courses');
        setCourses(data);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, [user, router]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Cargando cursos...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Cursos</h1>
          <p className="text-gray-500">Catálogo de cursos de capacitación</p>
        </div>
        <button
          onClick={() => router.push('/courses')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Administrar Cursos
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Curso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Institución
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Modalidad
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Duración
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Costo
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{course.name}</div>
                  {course.course_types?.name && (
                    <div className="text-sm text-gray-500">{course.course_types.name}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {course.institutions?.name || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {course.modalities?.name || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-center text-gray-500">
                  {course.duration_hours}h
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-500">
                  {formatCurrency(course.cost)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      course.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {course.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay cursos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
