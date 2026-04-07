'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Enrollment {
  id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    position: string | null;
    departments: { id: string; name: string } | null;
  };
  course_editions: {
    id: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    instructor: string | null;
    courses: {
      id: string;
      name: string;
      total_hours: number;
      cost: number;
      description: string | null;
      course_types: { id: string; name: string } | null;
      modalities: { id: string; name: string } | null;
      institutions: { id: string; name: string } | null;
    };
  };
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  position: string | null;
  enrollments: Enrollment[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    totalHours: number;
    completedHours: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  inscrito: { label: 'Inscrito', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  en_curso: { label: 'En Curso', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  completo: { label: 'Completado', color: 'text-green-700', bgColor: 'bg-green-100' },
  pendiente_evidencia: { label: 'Pendiente Evidencia', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  cancelado: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const Icons = {
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
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
  progress: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  chevronUp: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
};

export default function MiEquipoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'en_curso' | 'completo' | 'pendiente'>('all');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // Redirect if not jefe_area or director
  if (user && !['jefe_area', 'director', 'admin_rh', 'super_admin'].includes(user.role)) {
    router.replace('/capacitacion/mis-cursos');
    return null;
  }

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', 'department', user?.department_id],
    queryFn: () => api.get<Enrollment[]>(`/enrollments/department/${user?.department_id}`),
    enabled: !!user?.department_id,
  });

  // Agrupar inscripciones por colaborador
  const teamMembers = useMemo(() => {
    const membersMap = new Map<string, TeamMember>();

    enrollments.forEach((enrollment) => {
      const profile = enrollment.profiles;
      if (!profile) return;

      // Excluir al propio jefe de área de la lista
      if (profile.id === user?.id) return;

      if (!membersMap.has(profile.id)) {
        membersMap.set(profile.id, {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          position: profile.position,
          enrollments: [],
          stats: {
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            totalHours: 0,
            completedHours: 0,
          },
        });
      }

      const member = membersMap.get(profile.id)!;
      member.enrollments.push(enrollment);
      member.stats.total++;

      const hours = enrollment.course_editions?.courses?.total_hours || 0;
      member.stats.totalHours += hours;

      if (enrollment.status === 'completo') {
        member.stats.completed++;
        member.stats.completedHours += hours;
      } else if (enrollment.status === 'en_curso') {
        member.stats.inProgress++;
      } else if (enrollment.status === 'pendiente_evidencia') {
        member.stats.pending++;
      }
    });

    return Array.from(membersMap.values()).sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );
  }, [enrollments, user?.id]);

  // Filtrar miembros según el filtro seleccionado
  const filteredMembers = useMemo(() => {
    if (filter === 'all') return teamMembers;

    return teamMembers.filter((member) => {
      if (filter === 'en_curso') return member.stats.inProgress > 0;
      if (filter === 'completo') return member.stats.completed > 0;
      if (filter === 'pendiente') return member.stats.pending > 0;
      return true;
    });
  }, [teamMembers, filter]);

  // Estadísticas generales del equipo
  const teamStats = useMemo(() => {
    return {
      totalMembers: teamMembers.length,
      totalEnrollments: enrollments.filter(e => e.profiles?.id !== user?.id).length,
      completedCourses: enrollments.filter(e => e.status === 'completo' && e.profiles?.id !== user?.id).length,
      inProgressCourses: enrollments.filter(e => e.status === 'en_curso' && e.profiles?.id !== user?.id).length,
      totalHours: enrollments
        .filter(e => e.status === 'completo' && e.profiles?.id !== user?.id)
        .reduce((acc, e) => acc + (e.course_editions?.courses?.total_hours || 0), 0),
    };
  }, [enrollments, teamMembers, user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEffectiveStatus = (enrollment: Enrollment) => {
    const today = new Date();
    const startDate = new Date(enrollment.course_editions?.start_date);
    const endDate = enrollment.course_editions?.end_date
      ? new Date(enrollment.course_editions.end_date)
      : null;

    if (enrollment.status === 'inscrito' && today >= startDate) {
      return 'en_curso';
    }
    if ((enrollment.status === 'inscrito' || enrollment.status === 'en_curso') && endDate && today > endDate) {
      return 'pendiente_evidencia';
    }
    return enrollment.status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52AF32]"></div>
        </div>
      </div>
    );
  }

  if (!user?.department_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Sin departamento asignado</h3>
          <p className="text-gray-500">
            No tienes un departamento asignado. Contacta al administrador para configurar tu perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Equipo</h1>
          <p className="text-gray-500 mt-1">
            Seguimiento de capacitación de colaboradores de{' '}
            <span className="font-medium text-gray-700">{user?.departments?.name || 'tu área'}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Colaboradores</p>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                {Icons.users}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{teamStats.totalMembers}</p>
            <p className="text-xs text-gray-400 mt-1">En tu equipo</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Cursos Completados</p>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                {Icons.check}
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600 mt-2">{teamStats.completedCourses}</p>
            <p className="text-xs text-gray-400 mt-1">Finalizados con éxito</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">En Progreso</p>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                {Icons.progress}
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{teamStats.inProgressCourses}</p>
            <p className="text-xs text-gray-400 mt-1">Cursos activos</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Horas Completadas</p>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                {Icons.clock}
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-600 mt-2">{teamStats.totalHours}h</p>
            <p className="text-xs text-gray-400 mt-1">Del equipo</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtrar:</span>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'en_curso', label: 'En Curso' },
              { value: 'completo', label: 'Completados' },
              { value: 'pendiente', label: 'Pendientes' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as typeof filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === f.value
                    ? 'bg-[#52AF32] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Team Members List */}
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {Icons.users}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {teamMembers.length === 0
                ? 'No hay colaboradores con cursos'
                : 'No hay colaboradores que coincidan con el filtro'}
            </h3>
            <p className="text-gray-500">
              {teamMembers.length === 0
                ? 'Cuando los colaboradores de tu área sean inscritos en cursos, aparecerán aquí'
                : 'Prueba con otro filtro para ver más colaboradores'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Member Header */}
                <button
                  onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.position || member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Mini stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-gray-600">{member.stats.completed} completados</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span className="text-gray-600">{member.stats.inProgress} en curso</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span className="text-gray-600">{member.stats.completedHours}h</span>
                      </div>
                    </div>

                    <div className="text-gray-400">
                      {expandedMember === member.id ? Icons.chevronUp : Icons.chevronDown}
                    </div>
                  </div>
                </button>

                {/* Member Enrollments (Expanded) */}
                {expandedMember === member.id && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <div className="divide-y divide-gray-100">
                      {member.enrollments.map((enrollment) => {
                        const effectiveStatus = getEffectiveStatus(enrollment);
                        const statusInfo = statusConfig[effectiveStatus] || statusConfig.inscrito;
                        const course = enrollment.course_editions?.courses;
                        const edition = enrollment.course_editions;

                        return (
                          <div key={enrollment.id} className="px-5 py-4 bg-white">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900">
                                    {course?.name || 'Curso sin nombre'}
                                  </h4>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                                    {statusInfo.label}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                                  {course?.institutions?.name && (
                                    <span>{course.institutions.name}</span>
                                  )}
                                  {course?.modalities?.name && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                      {course.modalities.name}
                                    </span>
                                  )}
                                  {course?.total_hours && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                      {course.total_hours}h
                                    </span>
                                  )}
                                </div>
                                {edition && (
                                  <p className="text-xs text-gray-400 mt-2">
                                    {formatDate(edition.start_date)}
                                    {edition.end_date && ` - ${formatDate(edition.end_date)}`}
                                    {edition.instructor && ` | Instructor: ${edition.instructor}`}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium ${
                                  effectiveStatus === 'completo'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {course?.total_hours || 0}h
                                </span>
                                {enrollment.completed_at && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Completado: {formatDate(enrollment.completed_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
