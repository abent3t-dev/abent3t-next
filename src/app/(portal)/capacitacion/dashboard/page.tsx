'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type {
  DashboardSummary,
  DepartmentStats,
  InstitutionStats,
} from '@/types/dashboard';

export default function CapacitacionDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, deptData, instData] = await Promise.all([
          api.get<DashboardSummary>('/dashboard/summary'),
          api.get<DepartmentStats[]>('/dashboard/by-department'),
          api.get<InstitutionStats[]>('/dashboard/by-institution'),
        ]);
        setSummary(summaryData);
        setDepartments(deptData);
        setInstitutions(instData);
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
      <div className="p-6">
        <div className="text-center text-gray-500">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Capacitación</h1>
        <p className="text-gray-500">
          {user?.role === 'jefe_area' && user.departments
            ? `Área: ${user.departments.name}`
            : 'Resumen general'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Total Horas"
          value={`${summary?.totalHours || 0}h`}
          subtitle="Capacitación"
          color="blue"
        />
        <KpiCard
          title="Monto Gastado"
          value={formatCurrency(summary?.totalSpent || 0)}
          color="green"
        />
        <KpiCard
          title="Cursos Activos"
          value={summary?.activeCourses || 0}
          color="purple"
        />
        <KpiCard
          title="Inscritos"
          value={summary?.totalEnrolled || 0}
          color="yellow"
        />
        <KpiCard
          title="Completados"
          value={summary?.completedCount || 0}
          color="green"
        />
        <KpiCard
          title="Promedio"
          value={`${summary?.avgCompletionDays || 0} días`}
          subtitle="Completación"
          color="orange"
        />
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Department */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Por Área</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Área
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Gastado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Disponible
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {departments.slice(0, 5).map((dept) => (
                  <tr key={dept.department_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {dept.department_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {formatCurrency(dept.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={dept.budgetRemaining < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(dept.budgetRemaining)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Institution */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Por Institución</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Institución
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Cursos
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Inversión
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {institutions.slice(0, 5).map((inst) => (
                  <tr key={inst.institution_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {inst.institution_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-500">
                      {inst.activeCourses}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {formatCurrency(inst.totalInvestment)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
