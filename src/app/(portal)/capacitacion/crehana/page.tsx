'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  CrehanaDashboard,
  CrehanaCourseRow,
  CrehanaUserRow,
} from '@/types/platforms';
import { Avatar, ProgressBar, normalizeExternalUrl } from '@/components/platforms/CrehanaUI';

type Tab = 'resumen' | 'cursos' | 'colaboradores';

export default function CrehanaPage() {
  const [tab, setTab] = useState<Tab>('resumen');

  const dashboardQuery = useQuery({
    queryKey: ['crehana-dashboard'],
    queryFn: () => api.get<CrehanaDashboard>('/platforms/crehana/dashboard'),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header con badge de sync */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#52AF32] to-[#67B52E] flex items-center justify-center text-white">
              <IconLink className="w-5 h-5" />
            </span>
            Crehana
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-3xl">
            Datos sincronizados desde la plataforma Crehana: catálogo de cursos donde hay
            colaboradores inscritos, progreso por usuario y certificados emitidos.
          </p>
        </div>
        {dashboardQuery.data?.last_sync_at && (
          <SyncBadge
            at={dashboardQuery.data.last_sync_at}
            status={dashboardQuery.data.last_sync_status}
          />
        )}
      </div>

      {dashboardQuery.data && !dashboardQuery.data.integration_active && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No hay una integración activa con Crehana. Configúrala en{' '}
            <Link href="/catalogs/platforms" className="underline font-medium">
              Catálogos → Plataformas
            </Link>
            .
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <TabButton current={tab} value="resumen" onClick={setTab}>
            Resumen
          </TabButton>
          <TabButton current={tab} value="cursos" onClick={setTab}>
            Cursos
          </TabButton>
          <TabButton current={tab} value="colaboradores" onClick={setTab}>
            Colaboradores
          </TabButton>
        </nav>
      </div>

      {tab === 'resumen' && (
        <ResumenTab
          dashboard={dashboardQuery.data}
          loading={dashboardQuery.isLoading}
          error={dashboardQuery.error}
          onRetry={() => dashboardQuery.refetch()}
        />
      )}
      {tab === 'cursos' && <CursosTab />}
      {tab === 'colaboradores' && <ColaboradoresTab />}
    </div>
  );
}

// =====================================================
// TAB BUTTON
// =====================================================

function TabButton({
  current,
  value,
  onClick,
  children,
}: {
  current: Tab;
  value: Tab;
  onClick: (v: Tab) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
        active
          ? 'border-[#52AF32] text-[#52AF32]'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

// =====================================================
// SYNC BADGE
// =====================================================

function SyncBadge({ at, status }: { at: string; status: string | null }) {
  const date = new Date(at);
  const ok = status === 'completed';
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
      <span
        className={`w-2 h-2 rounded-full ${
          ok ? 'bg-green-500' : status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <div className="text-xs">
        <div className="text-gray-500">Última sincronización</div>
        <div className="text-gray-900 font-medium">
          {date.toLocaleString('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// TAB: RESUMEN (KPIs)
// =====================================================

function ResumenTab({
  dashboard,
  loading,
  error,
  onRetry,
}: {
  dashboard?: CrehanaDashboard;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!dashboard) return <EmptyState message="Sin datos." />;
  if (!dashboard.integration_active) return null;

  const completionRate =
    dashboard.total_enrollments > 0
      ? Math.round((dashboard.completed_enrollments / dashboard.total_enrollments) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top: 4 stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<IconUsers />}
          iconBg="bg-blue-50 text-blue-600"
          label="Colaboradores"
          value={dashboard.total_users}
          hint={`${dashboard.users_linked_to_abent} enlazados a ABENT`}
        />
        <KpiCard
          icon={<IconBook />}
          iconBg="bg-purple-50 text-purple-600"
          label="Cursos sincronizados"
          value={dashboard.total_courses}
          hint="con al menos una inscripción"
        />
        <KpiCard
          icon={<IconClock />}
          iconBg="bg-emerald-50 text-emerald-600"
          label="Horas de estudio"
          value={dashboard.total_hours_completed}
          hint="acumuladas"
        />
        <KpiCard
          icon={<IconAward />}
          iconBg="bg-amber-50 text-amber-600"
          label="Certificados"
          value={dashboard.total_certificates}
          hint="emitidos"
        />
      </div>

      {/* Panel de inscripciones con progreso */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Inscripciones totales</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {dashboard.total_enrollments.toLocaleString('es-MX')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Tasa de completación</div>
            <div className="text-3xl font-bold text-[#52AF32]">{completionRate}%</div>
          </div>
        </div>

        <SegmentedBar
          segments={[
            {
              value: dashboard.completed_enrollments,
              color: 'bg-green-500',
              label: 'Completadas',
            },
            {
              value: dashboard.in_progress_enrollments,
              color: 'bg-yellow-400',
              label: 'En progreso',
            },
            {
              value: dashboard.not_started_enrollments,
              color: 'bg-gray-300',
              label: 'Sin iniciar',
            },
          ]}
          total={dashboard.total_enrollments}
        />

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
          <Stat
            label="Completadas"
            value={dashboard.completed_enrollments}
            color="text-green-700"
            dot="bg-green-500"
          />
          <Stat
            label="En progreso"
            value={dashboard.in_progress_enrollments}
            color="text-yellow-700"
            dot="bg-yellow-400"
          />
          <Stat
            label="Sin iniciar"
            value={dashboard.not_started_enrollments}
            color="text-gray-700"
            dot="bg-gray-400"
          />
        </div>
      </div>

      {/* Promedio global de avance */}
      <div className="bg-gradient-to-br from-[#52AF32] to-[#67B52E] rounded-xl p-7 md:p-8 text-white shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="space-y-1.5">
            <div className="text-sm font-medium text-green-50 opacity-90">
              Avance promedio en todos los cursos
            </div>
            <div className="text-4xl md:text-5xl font-bold tracking-tight">
              {dashboard.average_progress}%
            </div>
            <div className="text-xs text-green-50 opacity-80">
              calculado sobre {dashboard.total_enrollments.toLocaleString('es-MX')} inscripciones
            </div>
          </div>
          <div className="w-24 h-24 shrink-0">
            <CircularProgress value={dashboard.average_progress} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  iconBg,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
        </div>
        <div className="text-sm font-medium text-gray-700 mt-1">{label}</div>
        {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  dot,
}: {
  label: string;
  value: number;
  color: string;
  dot: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        {label}
      </div>
      <div className={`text-xl font-bold mt-0.5 ${color}`}>{value.toLocaleString('es-MX')}</div>
    </div>
  );
}

function SegmentedBar({
  segments,
  total,
}: {
  segments: { value: number; color: string; label: string }[];
  total: number;
}) {
  if (total === 0) {
    return <div className="h-3 bg-gray-100 rounded-full" />;
  }
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
      {segments.map((s, i) => {
        const pct = (s.value / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={i}
            className={`${s.color} transition-all`}
            style={{ width: `${pct}%` }}
            title={`${s.label}: ${s.value} (${Math.round(pct)}%)`}
          />
        );
      })}
    </div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (v / 100) * circumference;
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full">
      <circle
        cx="40"
        cy="40"
        r={radius}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="6"
        fill="none"
      />
      <circle
        cx="40"
        cy="40"
        r={radius}
        stroke="white"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
        className="transition-all duration-500"
      />
      <text
        x="40"
        y="46"
        textAnchor="middle"
        className="fill-white font-bold text-base"
      >
        {v}%
      </text>
    </svg>
  );
}

// =====================================================
// TAB: CURSOS
// =====================================================

function CursosTab() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: courses = [], isLoading, error, refetch } = useQuery({
    queryKey: ['crehana-courses'],
    queryFn: () => api.get<CrehanaCourseRow[]>('/platforms/crehana/courses'),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter((c) => c.name.toLowerCase().includes(q));
  }, [courses, search]);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (courses.length === 0) {
    return <EmptyState message="No hay cursos sincronizados todavía. Ejecuta una sincronización en Catálogos → Plataformas." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar curso..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
          />
        </div>
        <span className="text-xs text-gray-500">
          Mostrando <span className="font-medium text-gray-900">{filtered.length}</span> de{' '}
          {courses.length} cursos
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Curso</Th>
                <Th align="right">Horas</Th>
                <Th align="right">Inscritos</Th>
                <Th align="right">Completados</Th>
                <Th align="right">En curso</Th>
                <Th>Avance</Th>
                <Th>Enlace</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() =>
                    router.push(`/capacitacion/crehana/cursos/${c.external_course_id}`)
                  }
                  className="hover:bg-[#52AF32]/5 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                    <div className="font-medium leading-snug">{c.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{c.total_hours}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className="font-semibold text-gray-900">{c.total_enrollments}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <CountBadge value={c.completed_enrollments} variant="green" />
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <CountBadge value={c.in_progress_enrollments} variant="yellow" />
                  </td>
                  <td className="px-4 py-3 text-sm w-48">
                    <ProgressBar value={c.average_progress} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {normalizeExternalUrl(c.course_url) ? (
                      <a
                        href={normalizeExternalUrl(c.course_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[#52AF32] hover:underline font-medium"
                      >
                        Abrir <IconExternal className="w-3 h-3" />
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
    </div>
  );
}

// =====================================================
// TAB: COLABORADORES
// =====================================================

function ColaboradoresTab() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showOnlyLinked, setShowOnlyLinked] = useState(false);

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['crehana-users'],
    queryFn: () => api.get<CrehanaUserRow[]>('/platforms/crehana/users'),
  });

  const filtered = useMemo(() => {
    let list = users;
    if (showOnlyLinked) list = list.filter((u) => u.is_linked);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.external_email?.toLowerCase().includes(q) ||
          u.external_username?.toLowerCase().includes(q) ||
          u.profile?.full_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, search, showOnlyLinked]);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (users.length === 0) {
    return <EmptyState message="No hay colaboradores sincronizados todavía." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-64 max-w-md">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOnlyLinked}
              onChange={(e) => setShowOnlyLinked(e.target.checked)}
              className="rounded border-gray-300 text-[#52AF32] focus:ring-[#52AF32]"
            />
            Solo enlazados a ABENT
          </label>
        </div>
        <span className="text-xs text-gray-500">
          Mostrando <span className="font-medium text-gray-900">{filtered.length}</span> de{' '}
          {users.length} colaboradores
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Colaborador</Th>
                <Th>Departamento</Th>
                <Th align="right">Cursos</Th>
                <Th align="right">Completados</Th>
                <Th align="right">Horas</Th>
                <Th align="right">Certif.</Th>
                <Th>Avance</Th>
                <Th>Última actividad</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr
                  key={u.external_user_id}
                  onClick={() =>
                    router.push(`/capacitacion/crehana/colaboradores/${u.external_user_id}`)
                  }
                  className="hover:bg-[#52AF32]/5 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={u.profile?.full_name ?? u.external_username ?? u.external_email ?? '?'}
                        linked={u.is_linked}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {u.profile?.full_name ?? u.external_username ?? '—'}
                        </div>
                        <div className="text-xs text-gray-500 truncate flex items-center gap-2">
                          <span className="truncate">{u.external_email}</span>
                          {!u.is_linked && (
                            <span className="shrink-0 text-[10px] uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                              sin match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {u.profile?.departments?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    {u.total_enrollments}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <CountBadge value={u.completed_enrollments} variant="green" />
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {u.total_hours_completed}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <CountBadge value={u.total_certificates} variant="amber" />
                  </td>
                  <td className="px-4 py-3 text-sm w-44">
                    <ProgressBar value={u.average_progress} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.last_activity_at
                      ? new Date(u.last_activity_at).toLocaleDateString('es-MX')
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className="inline-flex items-center gap-1 text-[#52AF32] font-medium">
                      Ver <IconArrowRight className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// HELPERS DE UI
// =====================================================

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

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52AF32]"></div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
      <IconInbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
      {message}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof Error ? error.message : 'No se pudo cargar la información.';
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p className="text-red-800 font-medium mb-1">Error al cargar datos</p>
      <p className="text-sm text-red-700 mb-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 text-sm bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium"
      >
        Reintentar
      </button>
    </div>
  );
}

function CountBadge({
  value,
  variant,
}: {
  value: number;
  variant: 'green' | 'yellow' | 'amber' | 'gray';
}) {
  if (value === 0) return <span className="text-gray-300">—</span>;
  const styles: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}
    >
      {value}
    </span>
  );
}

// =====================================================
// ICONOS
// =====================================================

function IconLink({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconAward() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}
function IconSearch({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function IconExternal({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
function IconArrowRight({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}
function IconInbox({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-3.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 007.586 13H4" />
    </svg>
  );
}
