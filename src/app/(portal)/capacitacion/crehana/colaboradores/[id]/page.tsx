'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  CrehanaUserDetail,
  PLATFORM_ENROLLMENT_STATUS_LABELS,
  PLATFORM_ENROLLMENT_STATUS_COLORS,
} from '@/types/platforms';
import { Avatar, ProgressBar } from '@/components/platforms/CrehanaUI';

export default function CrehanaUserDetailPage() {
  const params = useParams<{ id: string }>();
  const externalUserId = params?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['crehana-user-detail', externalUserId],
    queryFn: () => api.get<CrehanaUserDetail>(`/platforms/crehana/users/${externalUserId}`),
    enabled: !!externalUserId,
  });

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
          {error instanceof Error ? error.message : 'No se pudo cargar la información del colaborador.'}
        </div>
      </div>
    );
  }

  const { user, enrollments } = data;
  const linkedProfile = user.profiles;
  const displayName =
    linkedProfile?.full_name ?? user.external_username ?? user.external_email ?? '—';

  const stats = {
    total: enrollments.length,
    completed: enrollments.filter((e) => e.status === 'completed').length,
    inProgress: enrollments.filter((e) => e.status === 'in_progress').length,
    hours: enrollments.reduce((acc, e) => acc + (Number(e.hours_completed) || 0), 0),
    certificates: enrollments.filter((e) => e.certificate_url).length,
  };
  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <BackLink />

      {/* Hero card */}
      <div className="relative bg-gradient-to-br from-[#424846] via-[#4a5050] to-[#52AF32] rounded-2xl p-6 md:p-8 text-white shadow-lg overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#67B52E]/30 rounded-full blur-2xl" />

        <div className="relative flex flex-wrap items-start gap-5">
          <Avatar name={displayName} linked={!!linkedProfile} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">{displayName}</h1>
                <p className="text-sm text-white/80 mt-1 break-all">{user.external_email}</p>
                {linkedProfile && (
                  <div className="mt-2 text-sm text-white/90 flex flex-wrap gap-x-4 gap-y-1">
                    {linkedProfile.position && (
                      <span className="inline-flex items-center gap-1.5">
                        <IconBriefcase /> {linkedProfile.position}
                      </span>
                    )}
                    {linkedProfile.departments && (
                      <span className="inline-flex items-center gap-1.5">
                        <IconBuilding /> {linkedProfile.departments.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  linkedProfile
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/10 text-white/80 border border-white/20'
                }`}
              >
                {linkedProfile ? '✓ Enlazado a ABENT' : 'Sin match en ABENT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Cursos" value={stats.total} accent="text-gray-900" />
        <StatCard label="Completados" value={stats.completed} accent="text-green-700" />
        <StatCard label="En curso" value={stats.inProgress} accent="text-yellow-700" />
        <StatCard
          label="Horas"
          value={Math.round(stats.hours * 10) / 10}
          accent="text-gray-900"
        />
        <StatCard label="Certificados" value={stats.certificates} accent="text-amber-700" />
      </div>

      {/* Tasa de completación */}
      {stats.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Tasa de completación</span>
            <span className="text-sm font-bold text-[#52AF32]">{completionRate}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#52AF32] to-[#67B52E] transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabla de inscripciones */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Cursos en Crehana ({enrollments.length})
        </h2>
        {enrollments.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            Este colaborador no tiene cursos en Crehana.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Curso</Th>
                    <Th>Estado</Th>
                    <Th>Avance</Th>
                    <Th align="right">Horas</Th>
                    <Th>Inicio</Th>
                    <Th>Última actividad</Th>
                    <Th>Certificado</Th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                        {e.course?.course_url ? (
                          <a
                            href={e.course.course_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline inline-flex items-center gap-1"
                          >
                            {e.course.name}
                            <IconExternal />
                          </a>
                        ) : (
                          <span className="font-medium">{e.course?.name ?? '—'}</span>
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
                        {e.started_at
                          ? new Date(e.started_at).toLocaleDateString('es-MX')
                          : e.enrolled_at
                            ? new Date(e.enrolled_at).toLocaleDateString('es-MX')
                            : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {e.last_activity_at
                          ? new Date(e.last_activity_at).toLocaleDateString('es-MX')
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {e.certificate_url ? (
                          <a
                            href={e.certificate_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-700 hover:underline font-medium"
                          >
                            <IconAward /> Ver
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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

function IconBriefcase() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
