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
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#424846]/70">Cargando dashboard...</p>
          </div>
        </div>
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
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-[#424846] tracking-tight">
            Dashboard de Capacitacion
          </h1>
          <p className="text-[#424846]/60 mt-1">
            {period
              ? `Periodo: ${period.label} (${period.year}${period.semester ? `-S${period.semester}` : ''})`
              : 'Sin periodo vigente configurado'}
          </p>
        </div>
        {period && (
          <div className="flex items-center gap-2 text-sm text-[#52AF32] font-medium">
            <span className="w-2 h-2 bg-[#52AF32] rounded-full animate-pulse"></span>
            Periodo activo
          </div>
        )}
      </div>

      {/* Alert for no period */}
      {!period && (
        <div className="bg-[#DFA922]/10 border border-[#DFA922]/30 text-[#424846] p-4 rounded-xl text-sm flex items-start gap-3">
          <svg className="w-5 h-5 text-[#DFA922] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium">Sin periodo activo</p>
            <p className="text-[#424846]/70 mt-1">No hay un periodo activo cuyas fechas incluyan la fecha de hoy. Configura un periodo en Catalogos &rarr; Periodos para ver las metricas.</p>
          </div>
        </div>
      )}

      {/* KPI Cards - 5 KPIs with A3T colors */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Ejecucion Presupuestal"
            value={kpis.budgetExecution.formatted}
            subtitle={kpis.budgetExecution.subtitle}
            color="navy"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <KpiCard
            title="Inversion / Colaborador"
            value={kpis.investmentPerEmployee.formatted}
            subtitle={kpis.investmentPerEmployee.subtitle}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KpiCard
            title="Horas / Colaborador"
            value={kpis.hoursPerEmployee.formatted}
            subtitle={kpis.hoursPerEmployee.subtitle}
            color="green-light"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KpiCard
            title="Cobertura"
            value={kpis.coverageRate.formatted}
            subtitle={kpis.coverageRate.subtitle}
            color="gold"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <KpiCard
            title="Tasa de Completacion"
            value={kpis.completionRate.formatted}
            subtitle={kpis.completionRate.subtitle}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Presupuesto por Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#424846]">Presupuesto por Area</h2>
          <p className="text-sm text-[#424846]/50 mt-0.5">Distribucion y consumo de presupuesto por departamento</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#424846]">
                <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Area</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Asignado</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Gastado</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Disponible</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Inscritos</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Completados</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {depts.map((dept, index) => {
                const isLowBudget = dept.budgetRemaining < dept.budgetAssigned * 0.2;
                const isNegative = dept.budgetRemaining < 0;

                return (
                  <tr
                    key={dept.department_id}
                    className={`
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      hover:bg-[#52AF32]/5 transition-colors duration-150
                    `}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-[#424846]">{dept.department_name}</td>
                    <td className="px-6 py-4 text-sm text-right text-[#424846]/70">{formatCurrency(dept.budgetAssigned)}</td>
                    <td className="px-6 py-4 text-sm text-right text-[#424846]/70">{formatCurrency(dept.totalSpent)}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span
                        className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${isNegative
                            ? 'bg-red-100 text-red-700'
                            : isLowBudget
                              ? 'bg-[#DFA922]/15 text-[#DFA922]'
                              : 'bg-[#52AF32]/15 text-[#52AF32]'
                          }
                        `}
                      >
                        {formatCurrency(dept.budgetRemaining)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#222D59]/10 text-[#222D59] font-semibold text-xs">
                        {dept.enrolledCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#52AF32]/10 text-[#52AF32] font-semibold text-xs">
                        {dept.completedCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-[#424846]/70 font-medium">{dept.totalHours}h</td>
                  </tr>
                );
              })}
              {depts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-[#424846]/40">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p>No hay datos de departamentos</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid for bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inversion por Institucion */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#424846]">Inversion por Institucion</h2>
            <p className="text-sm text-[#424846]/50 mt-0.5">Cursos activos y total invertido</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#424846]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Institucion</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Cursos</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Inversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {insts.map((inst, index) => (
                  <tr
                    key={inst.institution_id}
                    className={`
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      hover:bg-[#52AF32]/5 transition-colors duration-150
                    `}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-[#424846]">{inst.institution_name}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#222D59]/10 text-[#222D59] font-semibold text-xs">
                        {inst.activeCourses}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="text-[#52AF32] font-semibold">{formatCurrency(inst.totalInvestment)}</span>
                    </td>
                  </tr>
                ))}
                {insts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="text-[#424846]/40">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                        </svg>
                        <p>No hay datos de instituciones</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tiempo de Completacion por Modalidad */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#424846]">Tiempo de Completacion por Modalidad</h2>
            <p className="text-sm text-[#424846]/50 mt-0.5">Dias promedio para completar cursos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#424846]">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Modalidad</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Promedio</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Min</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Max</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ct.map((item, index) => (
                  <tr
                    key={item.modality}
                    className={`
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      hover:bg-[#52AF32]/5 transition-colors duration-150
                    `}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-[#424846]">{item.modality}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#222D59]/10 text-[#222D59] font-semibold">
                        {item.avgDays} dias
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-[#424846]/60">{item.minDays} dias</td>
                    <td className="px-6 py-4 text-sm text-center text-[#424846]/60">{item.maxDays} dias</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#67B52E]/10 text-[#67B52E] font-semibold text-xs">
                        {item.count}
                      </span>
                    </td>
                  </tr>
                ))}
                {ct.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-[#424846]/40">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No hay datos de tiempos de completacion</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
