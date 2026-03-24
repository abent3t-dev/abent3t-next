'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type {
  DashboardSummary,
  DepartmentStats,
  InstitutionStats,
  CompletionTimeStats,
} from '@/types/dashboard';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionStats[]>([]);
  const [completionTime, setCompletionTime] = useState<CompletionTimeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, deptData, instData, timeData] = await Promise.all([
          api.get<DashboardSummary>('/dashboard/summary'),
          api.get<DepartmentStats[]>('/dashboard/by-department'),
          api.get<InstitutionStats[]>('/dashboard/by-institution'),
          api.get<CompletionTimeStats[]>('/dashboard/completion-time'),
        ]);
        setSummary(summaryData);
        setDepartments(deptData);
        setInstitutions(instData);
        setCompletionTime(timeData);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center text-gray-500">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Capacitación</h1>
        <p className="text-gray-500">Resumen de indicadores clave</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Total Horas"
          value={`${summary?.totalHours || 0}h`}
          subtitle="Cursos completados"
          color="blue"
        />
        <KpiCard
          title="Monto Gastado"
          value={formatCurrency(summary?.totalSpent || 0)}
          subtitle="Inversión total"
          color="green"
        />
        <KpiCard
          title="Cursos Activos"
          value={summary?.activeCourses || 0}
          color="purple"
        />
        <KpiCard
          title="Personas Inscritas"
          value={summary?.totalEnrolled || 0}
          color="yellow"
        />
        <KpiCard
          title="Cursos Completados"
          value={summary?.completedCount || 0}
          color="green"
        />
        <KpiCard
          title="Tiempo Promedio"
          value={`${summary?.avgCompletionDays || 0} días`}
          subtitle="Para completar"
          color="orange"
        />
      </div>

      {/* Presupuesto por Área */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Presupuesto por Área</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Área
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Asignado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Gastado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Disponible
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Inscritos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Completados
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Horas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments.map((dept) => (
                <tr key={dept.department_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {dept.department_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {formatCurrency(dept.budgetAssigned)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {formatCurrency(dept.totalSpent)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span
                      className={
                        dept.budgetRemaining < 0 ? 'text-red-600' : 'text-green-600'
                      }
                    >
                      {formatCurrency(dept.budgetRemaining)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {dept.enrolledCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {dept.completedCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {dept.totalHours}h
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay datos de departamentos
                  </td>
                </tr>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Institución
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Cursos Activos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Inversión Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {institutions.map((inst) => (
                <tr key={inst.institution_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {inst.institution_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {inst.activeCourses}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">
                    {formatCurrency(inst.totalInvestment)}
                  </td>
                </tr>
              ))}
              {institutions.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No hay datos de instituciones
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tiempo de Completación por Modalidad */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Tiempo de Completación por Modalidad
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Modalidad
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Promedio
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Mínimo
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Máximo
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Total Cursos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {completionTime.map((ct) => (
                <tr key={ct.modality} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {ct.modality}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-blue-600 font-medium">
                    {ct.avgDays} días
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {ct.minDays} días
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {ct.maxDays} días
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {ct.count}
                  </td>
                </tr>
              ))}
              {completionTime.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay datos de tiempos de completación
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
