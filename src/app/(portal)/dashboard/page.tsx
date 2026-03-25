'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type {
  DashboardSummary,
  DepartmentStats,
  InstitutionStats,
  CompletionTimeStats,
} from '@/types/dashboard';

export default function DashboardPage() {
  const summary = useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });
  const departments = useQuery({
    queryKey: queryKeys.dashboard.byDepartment,
    queryFn: () => api.get<DepartmentStats[]>('/dashboard/by-department'),
  });
  const institutions = useQuery({
    queryKey: queryKeys.dashboard.byInstitution,
    queryFn: () => api.get<InstitutionStats[]>('/dashboard/by-institution'),
  });
  const completionTime = useQuery({
    queryKey: queryKeys.dashboard.completionTime,
    queryFn: () => api.get<CompletionTimeStats[]>('/dashboard/completion-time'),
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  if (summary.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center text-gray-500">Cargando dashboard...</div>
      </div>
    );
  }

  const s = summary.data;
  const kpis = s?.kpis;
  const period = s?.period;
  const depts = departments.data ?? [];
  const insts = institutions.data ?? [];
  const ct = completionTime.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Capacitación</h1>
        <p className="text-gray-500">
          {period
            ? `Periodo: ${period.label} (${period.year}${period.semester ? `-S${period.semester}` : ''})`
            : 'Sin periodo vigente configurado'}
        </p>
      </div>

      {!period && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
          No hay un periodo activo cuyas fechas incluyan la fecha de hoy. Configura un periodo en Catálogos → Periodos para ver las métricas.
        </div>
      )}

      {/* KPI Cards — 5 KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Ejecución Presupuestal"
            value={kpis.budgetExecution.formatted}
            subtitle={kpis.budgetExecution.subtitle}
            color="blue"
          />
          <KpiCard
            title="Inversión / Colaborador"
            value={kpis.investmentPerEmployee.formatted}
            subtitle={kpis.investmentPerEmployee.subtitle}
            color="green"
          />
          <KpiCard
            title="Horas / Colaborador"
            value={kpis.hoursPerEmployee.formatted}
            subtitle={kpis.hoursPerEmployee.subtitle}
            color="purple"
          />
          <KpiCard
            title="Cobertura"
            value={kpis.coverageRate.formatted}
            subtitle={kpis.coverageRate.subtitle}
            color="yellow"
          />
          <KpiCard
            title="Tasa de Completación"
            value={kpis.completionRate.formatted}
            subtitle={kpis.completionRate.subtitle}
            color="orange"
          />
        </div>
      )}

      {/* Presupuesto por Área */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Presupuesto por Área</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Asignado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gastado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disponible</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Inscritos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completados</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {depts.map((dept) => (
                <tr key={dept.department_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{dept.department_name}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{formatCurrency(dept.budgetAssigned)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{formatCurrency(dept.totalSpent)}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={dept.budgetRemaining < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(dept.budgetRemaining)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">{dept.enrolledCount}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">{dept.completedCount}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{dept.totalHours}h</td>
                </tr>
              ))}
              {depts.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No hay datos de departamentos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inversión por Institución */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Inversión por Institución</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institución</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cursos Activos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inversión Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {insts.map((inst) => (
                <tr key={inst.institution_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{inst.institution_name}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">{inst.activeCourses}</td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">{formatCurrency(inst.totalInvestment)}</td>
                </tr>
              ))}
              {insts.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No hay datos de instituciones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tiempo de Completación por Modalidad */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tiempo de Completación por Modalidad</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modalidad</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Promedio</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Máximo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Cursos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ct.map((item) => (
                <tr key={item.modality} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.modality}</td>
                  <td className="px-6 py-4 text-sm text-center text-blue-600 font-medium">{item.avgDays} días</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">{item.minDays} días</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">{item.maxDays} días</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">{item.count}</td>
                </tr>
              ))}
              {ct.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay datos de tiempos de completación</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
