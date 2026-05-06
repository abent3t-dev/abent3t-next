'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  CrehanaCourseDetail,
  PLATFORM_ENROLLMENT_STATUS_LABELS,
  PLATFORM_ENROLLMENT_STATUS_COLORS,
} from '@/types/platforms';
import { Avatar, ProgressBar, normalizeExternalUrl } from '@/components/platforms/CrehanaUI';

export default function CrehanaCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const externalCourseId = params?.id;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['crehana-course-detail', externalCourseId],
    queryFn: () => api.get<CrehanaCourseDetail>(`/platforms/crehana/courses/${externalCourseId}`),
    enabled: !!externalCourseId,
  });

  const filteredEnrollments = useMemo(() => {
    if (!data) return [];
    let list = data.enrollments;
    if (statusFilter !== 'all') {
      list = list.filter((e) => e.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.user.external_email?.toLowerCase().includes(q) ||
          e.user.external_username?.toLowerCase().includes(q) ||
          e.user.profile?.full_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52AF32]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <BackLink />
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 text-center">
          {error instanceof Error ? error.message : 'No se pudo cargar la información del curso.'}
        </div>
      </div>
    );
  }

  const { course, stats, enrollments } = data;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <BackLink />

      {/* Hero card del curso */}
      <div className="relative bg-gradient-to-br from-[#424846] via-[#4a5050] to-[#52AF32] rounded-2xl p-6 md:p-8 text-white shadow-lg overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#67B52E]/30 rounded-full blur-2xl" />

        <div className="relative flex flex-wrap items-start gap-5">
          {course.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnail_url}
              alt={course.name}
              className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover ring-2 ring-white/40 shadow-lg shrink-0"
            />
          ) : (
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <IconBook />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/70 mb-1">
              Curso de Crehana
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{course.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <IconClock /> {course.total_hours} horas
              </span>
              {course.instructor && (
                <span className="inline-flex items-center gap-1.5">
                  <IconUser /> {course.instructor}
                </span>
              )}
              {course.total_modules > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <IconLayers /> {course.total_modules} módulos
                </span>
              )}
            </div>
            {normalizeExternalUrl(course.course_url) && (
              <a
                href={normalizeExternalUrl(course.course_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                Abrir en Crehana <IconExternal />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Inscritos" value={stats.total_enrollments} accent="text-gray-900" />
        <StatCard label="Completados" value={stats.completed} accent="text-green-700" />
        <StatCard label="En curso" value={stats.in_progress} accent="text-yellow-700" />
        <StatCard label="Sin iniciar" value={stats.not_started} accent="text-gray-700" />
        <StatCard
          label="Certificados"
          value={stats.certificates_issued}
          accent="text-amber-700"
        />
      </div>

      {/* Avance promedio */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Avance promedio del curso</span>
          <span className="text-sm font-bold text-[#52AF32]">{stats.average_progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#52AF32] to-[#67B52E] transition-all"
            style={{ width: `${stats.average_progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {stats.total_hours_studied} horas estudiadas en total
        </div>
      </div>

      {/* Tabla de inscritos */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Colaboradores inscritos ({enrollments.length})
          </h2>
        </div>

        {enrollments.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            Nadie está inscrito en este curso todavía.
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-64 max-w-md">
                <IconSearch />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar colaborador..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                />
              </div>

              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <FilterChip
                  active={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                  label={`Todos (${stats.total_enrollments})`}
                />
                <FilterChip
                  active={statusFilter === 'completed'}
                  onClick={() => setStatusFilter('completed')}
                  label={`Completados (${stats.completed})`}
                />
                <FilterChip
                  active={statusFilter === 'in_progress'}
                  onClick={() => setStatusFilter('in_progress')}
                  label={`En curso (${stats.in_progress})`}
                />
                <FilterChip
                  active={statusFilter === 'not_started'}
                  onClick={() => setStatusFilter('not_started')}
                  label={`Sin iniciar (${stats.not_started})`}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Colaborador</Th>
                      <Th>Departamento</Th>
                      <Th>Estado</Th>
                      <Th>Avance</Th>
                      <Th align="right">Horas</Th>
                      <Th>Última actividad</Th>
                      <Th>Certificado</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredEnrollments.map((e) => {
                      const displayName =
                        e.user.profile?.full_name ??
                        e.user.external_username ??
                        e.user.external_email ??
                        '—';
                      const targetUserId = e.user.external_user_id;
                      const clickable = !!targetUserId;

                      return (
                        <tr
                          key={e.id}
                          onClick={
                            clickable
                              ? () =>
                                  router.push(
                                    `/capacitacion/crehana/colaboradores/${targetUserId}`,
                                  )
                              : undefined
                          }
                          className={`transition-colors ${
                            clickable
                              ? 'hover:bg-[#52AF32]/5 cursor-pointer'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-3">
                              <Avatar name={displayName} linked={e.user.is_linked} />
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {displayName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {e.user.external_email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {e.user.profile?.departments?.name ?? (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                PLATFORM_ENROLLMENT_STATUS_COLORS[e.status]
                              }`}
                            >
                              {PLATFORM_ENROLLMENT_STATUS_LABELS[e.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 w-44">
                            <ProgressBar value={Number(e.progress_percentage) || 0} />
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {Number(e.hours_completed) || 0}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {e.last_activity_at ? (
                              new Date(e.last_activity_at).toLocaleDateString('es-MX')
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {normalizeExternalUrl(e.certificate_url) ? (
                              <a
                                href={normalizeExternalUrl(e.certificate_url)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(ev) => ev.stopPropagation()}
                                className="inline-flex items-center gap-1 text-amber-700 hover:underline font-medium"
                              >
                                <IconAward /> Ver
                              </a>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Mostrando <span className="font-medium text-gray-900">{filteredEnrollments.length}</span> de{' '}
              {enrollments.length} colaboradores
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function BackLink() {
  return (
    <Link
      href="/capacitacion/crehana"
      className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#52AF32]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Volver a Crehana
    </Link>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent}`}>
        {value.toLocaleString('es-MX')}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? 'bg-white text-[#52AF32] shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

// Iconos
function IconClock() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg className="w-12 h-12 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
function IconAward() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
