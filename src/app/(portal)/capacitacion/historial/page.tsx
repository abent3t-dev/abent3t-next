'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface CompletedCourse {
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
      total_hours: number;
      cost: number;
      course_types: { name: string } | null;
      modalities: { name: string } | null;
      institutions: { name: string } | null;
    };
  };
}

interface YearStats {
  year: number;
  courses: CompletedCourse[];
  totalHours: number;
}

const Icons = {
  clock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  certificate: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

export default function HistorialPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CompletedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      try {
        const data = await api.get<CompletedCourse[]>(`/enrollments/profile/${user.id}`);
        // Filtrar solo los cursos completados
        const completed = data.filter((c) => c.status === 'completo');
        setCourses(completed);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user]);

  // Agrupar cursos por año
  const coursesByYear: YearStats[] = courses.reduce((acc, course) => {
    const year = course.completed_at
      ? new Date(course.completed_at).getFullYear()
      : new Date(course.enrolled_at).getFullYear();

    const existing = acc.find((y) => y.year === year);
    if (existing) {
      existing.courses.push(course);
      existing.totalHours += course.course_editions?.courses?.total_hours || 0;
    } else {
      acc.push({
        year,
        courses: [course],
        totalHours: course.course_editions?.courses?.total_hours || 0,
      });
    }
    return acc;
  }, [] as YearStats[]);

  // Ordenar por año descendente
  coursesByYear.sort((a, b) => b.year - a.year);

  // Obtener años únicos para el filtro
  const years = coursesByYear.map((y) => y.year);

  // Estadísticas totales
  const totalCourses = courses.length;
  const totalHours = courses.reduce((acc, c) => acc + (c.course_editions?.courses?.total_hours || 0), 0);

  // Filtrar por año seleccionado
  const filteredYears = selectedYear === 'all'
    ? coursesByYear
    : coursesByYear.filter((y) => y.year === selectedYear);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Cargando historial...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Capacitación</h1>
        <p className="text-gray-500">Registro de cursos completados</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              {Icons.certificate}
            </div>
            <div>
              <p className="text-sm text-gray-500">Cursos Completados</p>
              <p className="text-2xl font-bold text-gray-900">{totalCourses}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              {Icons.clock}
            </div>
            <div>
              <p className="text-sm text-gray-500">Horas Acumuladas</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours}h</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              {Icons.book}
            </div>
            <div>
              <p className="text-sm text-gray-500">Promedio por Curso</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalCourses > 0 ? Math.round(totalHours / totalCourses) : 0}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Year Filter */}
      {years.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtrar por año:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedYear === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Courses by Year */}
      {filteredYears.length > 0 ? (
        <div className="space-y-6">
          {filteredYears.map((yearData) => (
            <div key={yearData.year} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{yearData.year}</h2>
                  <p className="text-sm text-gray-500">
                    {yearData.courses.length} curso{yearData.courses.length !== 1 ? 's' : ''} • {yearData.totalHours} horas
                  </p>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  {Icons.check}
                  <span className="text-sm font-medium">Completados</span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {yearData.courses.map((course) => {
                  const courseData = course.course_editions?.courses;
                  const edition = course.course_editions;

                  return (
                    <div key={course.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {courseData?.name || 'Curso sin nombre'}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                            {courseData?.institutions?.name && (
                              <span>{courseData.institutions.name}</span>
                            )}
                            {courseData?.modalities?.name && (
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                {courseData.modalities.name}
                              </span>
                            )}
                            {courseData?.course_types?.name && (
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                {courseData.course_types.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {courseData?.total_hours || 0}h
                          </span>
                          {course.completed_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              Completado: {new Date(course.completed_at).toLocaleDateString('es-MX')}
                            </p>
                          )}
                        </div>
                      </div>
                      {edition && (
                        <p className="text-xs text-gray-400 mt-2">
                          Período: {new Date(edition.start_date).toLocaleDateString('es-MX')}
                          {edition.end_date && ` - ${new Date(edition.end_date).toLocaleDateString('es-MX')}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">No tienes cursos completados aún</p>
          <p className="text-sm text-gray-400 mt-1">
            Cuando completes tus cursos, aparecerán aquí
          </p>
        </div>
      )}
    </div>
  );
}
