'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import CourseTimeline from '@/components/capacitacion/CourseTimeline';

interface Enrollment {
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

export default function HistorialPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      try {
        // Cargar TODOS los enrollments (no solo completados)
        // para mostrar historial completo: pasado, presente y futuro
        const data = await api.get<Enrollment[]>(`/enrollments/profile/${user.id}`);
        setEnrollments(data);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">Cargando línea de tiempo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 overflow-visible">
      <div className="max-w-7xl mx-auto space-y-6 overflow-visible pt-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Historial de Capacitación</h1>
          <p className="text-gray-600 mt-2">
            Visualiza todos tus cursos en una línea de tiempo: completados, en progreso y próximos
          </p>
        </div>

        {/* Timeline Component */}
        {enrollments.length > 0 ? (
          <CourseTimeline enrollments={enrollments} />
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No tienes cursos registrados
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Cuando te inscriban en cursos, aparecerán aquí en una línea de tiempo interactiva
              que te permitirá ver tu progreso y detectar conflictos de fechas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
