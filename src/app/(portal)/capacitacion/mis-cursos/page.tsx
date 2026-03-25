'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';

interface MyCourse {
  id: string;
  course_edition_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  course_editions: {
    id: string;
    start_date: string;
    end_date: string;
    courses: {
      id: string;
      name: string;
      duration_hours: number;
      course_types: { name: string } | null;
      modalities: { name: string } | null;
      institutions: { name: string } | null;
    };
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  inscrito: { label: 'Inscrito', color: 'bg-blue-100 text-blue-800' },
  en_curso: { label: 'En Curso', color: 'bg-yellow-100 text-yellow-800' },
  completo: { label: 'Completado', color: 'bg-green-100 text-green-800' },
  pendiente_evidencia: { label: 'Pendiente Evidencia', color: 'bg-orange-100 text-orange-800' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export default function MisCursosPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    async function loadCourses() {
      if (!user) return;
      try {
        const data = await api.get<MyCourse[]>(`/enrollments?profile_id=${user.id}`);
        setCourses(data);
      } catch (error) {
        notify.error('Error al cargar tus cursos');
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, [user]);

  const filteredCourses = courses.filter((course) => {
    if (filter === 'active') return ['inscrito', 'en_curso'].includes(course.status);
    if (filter === 'completed') return course.status === 'completo';
    return true;
  });

  const activeCourses = courses.filter((c) => ['inscrito', 'en_curso'].includes(c.status)).length;
  const completedCourses = courses.filter((c) => c.status === 'completo').length;
  const totalHours = courses
    .filter((c) => c.status === 'completo')
    .reduce((acc, c) => acc + (c.course_editions?.courses?.duration_hours || 0), 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Cargando mis cursos...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
        <p className="text-gray-500">Seguimiento de tu capacitación</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Cursos Activos</p>
          <p className="text-2xl font-bold text-blue-600">{activeCourses}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Completados</p>
          <p className="text-2xl font-bold text-green-600">{completedCourses}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Horas de Capacitación</p>
          <p className="text-2xl font-bold text-purple-600">{totalHours}h</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos ({courses.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Activos ({activeCourses})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completados ({completedCourses})
        </button>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {filteredCourses.map((course) => {
          const courseData = course.course_editions?.courses;
          const edition = course.course_editions;
          const status = statusLabels[course.status] || statusLabels.inscrito;

          return (
            <div key={course.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {courseData?.name || 'Curso sin nombre'}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
                    {courseData?.institutions?.name && (
                      <span>{courseData.institutions.name}</span>
                    )}
                    {courseData?.modalities?.name && (
                      <span>• {courseData.modalities.name}</span>
                    )}
                    {courseData?.duration_hours && (
                      <span>• {courseData.duration_hours}h</span>
                    )}
                  </div>
                  {edition && (
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(edition.start_date).toLocaleDateString('es-MX')} -{' '}
                      {new Date(edition.end_date).toLocaleDateString('es-MX')}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No tienes cursos {filter === 'active' ? 'activos' : filter === 'completed' ? 'completados' : 'registrados'}
          </div>
        )}
      </div>
    </div>
  );
}
