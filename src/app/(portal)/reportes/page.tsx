'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';
import { BarChart, PieChart, LineChart, DateRangePicker } from '@/components/charts';
import { Department } from '@/types/catalogs';

interface PersonReport {
  profile_id: string;
  full_name: string;
  email: string;
  position: string | null;
  department: string;
  total_hours: number;
  completed_hours: number;
  total_investment: number;
  courses_enrolled: number;
  courses_completed: number;
}

interface DepartmentReport {
  department_id: string;
  department_name: string;
  period: string;
  assigned_amount: number;
  consumed_amount: number;
  available_amount: number;
  execution_percentage: number;
  total_hours: number;
  completed_hours: number;
  courses_enrolled: number;
  courses_completed: number;
}

interface InstitutionReport {
  institution_id: string;
  institution_name: string;
  institution_type: string;
  total_investment: number;
  total_hours: number;
  courses_count: number;
  enrollments_count: number;
  completed_count: number;
}

interface PeriodReport {
  period_id: string;
  period_label: string;
  year: number;
  semester: number;
  total_assigned: number;
  total_consumed: number;
  total_available: number;
  execution_percentage: number;
  total_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
  total_hours: number;
}

type ReportType = 'person' | 'department' | 'institution' | 'period';

const Icons = {
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  school: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  filter: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

const reportTabs: { id: ReportType; label: string; icon: React.ReactElement }[] = [
  { id: 'person', label: 'Por Persona', icon: Icons.users },
  { id: 'department', label: 'Por Área', icon: Icons.building },
  { id: 'institution', label: 'Por Institución', icon: Icons.school },
  { id: 'period', label: 'Por Período', icon: Icons.calendar },
];

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<ReportType>('person');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [personData, setPersonData] = useState<PersonReport[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentReport[]>([]);
  const [institutionData, setInstitutionData] = useState<InstitutionReport[]>([]);
  const [periodData, setPeriodData] = useState<PeriodReport[]>([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadReport(activeTab);
  }, [activeTab]);

  const loadDepartments = async () => {
    try {
      const response = await api.get<{ data: Department[] }>('/departments?limit=100');
      setDepartments(response.data);
    } catch {
      // Fail silently for filters
    }
  };

  const loadReport = async (type: ReportType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartment && (type === 'person' || type === 'department')) {
        params.append('department_id', selectedDepartment);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';

      switch (type) {
        case 'person':
          const persons = await api.get<PersonReport[]>(`/reports/by-person${queryString}`);
          setPersonData(persons);
          break;
        case 'department':
          const depts = await api.get<DepartmentReport[]>(`/reports/by-department${queryString}`);
          setDepartmentData(depts);
          break;
        case 'institution':
          const insts = await api.get<InstitutionReport[]>('/reports/by-institution');
          setInstitutionData(insts);
          break;
        case 'period':
          const periods = await api.get<PeriodReport[]>('/reports/by-period');
          setPeriodData(periods);
          break;
      }
    } catch {
      notify.error('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadReport(activeTab);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('');
    setSelectedYear('');
    loadReport(activeTab);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const params = new URLSearchParams({ type: activeTab });
      if (selectedDepartment && (activeTab === 'person' || activeTab === 'department')) {
        params.append('department_id', selectedDepartment);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reports/export?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      notify.success('Reporte exportado');
    } catch {
      notify.error('Error al exportar reporte');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Get filtered data based on date range
  const getFilteredData = () => {
    // For now, we don't apply date filtering on client side
    // The backend should handle this, but we prepare the UI
    return {
      personData,
      departmentData,
      institutionData,
      periodData: selectedYear
        ? periodData.filter((p) => p.year.toString() === selectedYear)
        : periodData,
    };
  };

  const filtered = getFilteredData();

  // Prepare chart data
  const topPersonsByHours = [...filtered.personData]
    .sort((a, b) => b.completed_hours - a.completed_hours)
    .slice(0, 10)
    .map((p) => ({
      name: p.full_name,
      hours: p.completed_hours,
    }));

  const topPersonsByInvestment = [...filtered.personData]
    .sort((a, b) => b.total_investment - a.total_investment)
    .slice(0, 10)
    .map((p) => ({
      name: p.full_name,
      investment: p.total_investment,
    }));

  const departmentInvestmentData = filtered.departmentData.map((d) => ({
    name: d.department_name,
    investment: d.consumed_amount,
  }));

  const departmentHoursData = filtered.departmentData.map((d) => ({
    name: d.department_name,
    hours: d.completed_hours,
  }));

  const institutionInvestmentData = filtered.institutionData.map((i) => ({
    name: i.institution_name,
    value: i.total_investment,
  }));

  const institutionCoursesData = filtered.institutionData.map((i) => ({
    name: i.institution_name,
    courses: i.courses_count,
  }));

  const periodInvestmentTrend = filtered.periodData.map((p) => ({
    period: p.period_label,
    investment: p.total_consumed,
    hours: p.total_hours,
  }));

  const years = Array.from(new Set(periodData.map((p) => p.year))).sort((a, b) => b - a);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500">Análisis de inversión y horas de capacitación</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {Icons.filter}
            <span>{showFilters ? 'Ocultar' : 'Filtros'}</span>
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {Icons.download}
            <span>{exporting ? 'Exportando...' : 'Exportar CSV'}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range - Not functional yet but UI is ready */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />

            {/* Department Filter - for Person and Department tabs */}
            {(activeTab === 'person' || activeTab === 'department') && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Departamento</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Year Filter - for Period tab */}
            {activeTab === 'period' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Año</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              {Icons.x}
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Cargando...</div>
      ) : (
        <>
          {/* Por Persona */}
          {activeTab === 'person' && (
            <>
              {/* Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cursos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completados</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Horas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inversión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.personData.map((row) => (
                      <tr key={row.profile_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{row.full_name}</div>
                          <div className="text-sm text-gray-500">{row.position || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.department}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.courses_enrolled}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.courses_completed}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.completed_hours}h / {row.total_hours}h</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(row.total_investment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.personData.length === 0 && (
                  <div className="p-8 text-center text-gray-500">No hay datos disponibles</div>
                )}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Top 10 Colaboradores por Horas
                  </h3>
                  {topPersonsByHours.length > 0 ? (
                    <BarChart
                      data={topPersonsByHours}
                      dataKey="hours"
                      xAxisKey="name"
                      color="#3b82f6"
                      horizontal
                      formatValue={(v) => `${v}h`}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                      No hay datos disponibles
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Top 10 Colaboradores por Inversión
                  </h3>
                  {topPersonsByInvestment.length > 0 ? (
                    <BarChart
                      data={topPersonsByInvestment}
                      dataKey="investment"
                      xAxisKey="name"
                      color="#10b981"
                      horizontal
                      formatValue={formatCurrencyShort}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                      No hay datos disponibles
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Por Departamento */}
          {activeTab === 'department' && (
            <>
              {/* Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Asignado</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumido</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Ejecución</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Horas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cursos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.departmentData.map((row) => (
                      <tr key={`${row.department_id}-${row.period}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.department_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.period}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(row.assigned_amount)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(row.consumed_amount)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.execution_percentage >= 80 ? 'bg-green-100 text-green-800' :
                            row.execution_percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {row.execution_percentage}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.completed_hours}h / {row.total_hours}h</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.courses_completed} / {row.courses_enrolled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.departmentData.length === 0 && (
                  <div className="p-8 text-center text-gray-500">No hay datos disponibles</div>
                )}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Inversión por Departamento
                  </h3>
                  {departmentInvestmentData.length > 0 ? (
                    <BarChart
                      data={departmentInvestmentData}
                      dataKey="investment"
                      xAxisKey="name"
                      color="#f59e0b"
                      formatValue={formatCurrencyShort}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                      No hay datos disponibles
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Horas por Departamento
                  </h3>
                  {departmentHoursData.length > 0 ? (
                    <BarChart
                      data={departmentHoursData}
                      dataKey="hours"
                      xAxisKey="name"
                      color="#8b5cf6"
                      formatValue={(v) => `${v}h`}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                      No hay datos disponibles
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Distribución de Inversión
                  </h3>
                  {departmentInvestmentData.length > 0 ? (
                    <PieChart
                      data={departmentInvestmentData}
                      dataKey="investment"
                      nameKey="name"
                      formatValue={formatCurrency}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                      No hay datos disponibles
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Por Institución */}
          {activeTab === 'institution' && (
            <>
              {/* Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institución</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cursos</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inscripciones</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completados</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Horas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inversión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.institutionData.map((row) => (
                      <tr key={row.institution_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.institution_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{row.institution_type}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.courses_count}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.enrollments_count}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.completed_count}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.total_hours}h</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(row.total_investment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.institutionData.length === 0 && (
                  <div className="p-8 text-center text-gray-500">No hay datos disponibles</div>
                )}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Inversión por Institución
                  </h3>
                  {institutionInvestmentData.length > 0 ? (
                    <PieChart
                      data={institutionInvestmentData}
                      dataKey="value"
                      nameKey="name"
                      formatValue={formatCurrency}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                      No hay datos disponibles
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Número de Cursos por Institución
                  </h3>
                  {institutionCoursesData.length > 0 ? (
                    <BarChart
                      data={institutionCoursesData}
                      dataKey="courses"
                      xAxisKey="name"
                      color="#06b6d4"
                      formatValue={(v) => `${v}`}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                      No hay datos disponibles
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Por Período */}
          {activeTab === 'period' && (
            <>
              {/* Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Presupuesto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumido</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Ejecución</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inscripciones</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Completación</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.periodData.map((row) => (
                      <tr key={row.period_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.period_label}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(row.total_assigned)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(row.total_consumed)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.execution_percentage >= 80 ? 'bg-green-100 text-green-800' :
                            row.execution_percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {row.execution_percentage}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.total_enrollments}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.completion_rate >= 80 ? 'bg-green-100 text-green-800' :
                            row.completion_rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {row.completion_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{row.total_hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.periodData.length === 0 && (
                  <div className="p-8 text-center text-gray-500">No hay datos disponibles</div>
                )}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Tendencia de Inversión y Horas
                  </h3>
                  {periodInvestmentTrend.length > 0 ? (
                    <LineChart
                      data={periodInvestmentTrend}
                      lines={[
                        { dataKey: 'investment', name: 'Inversión', color: '#3b82f6' },
                        { dataKey: 'hours', name: 'Horas', color: '#10b981' },
                      ]}
                      xAxisKey="period"
                      formatValue={(v) => formatCurrencyShort(v)}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400">
                      No hay datos disponibles
                    </div>
                  )}
                </div>

                {years.length > 1 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Comparativa Año vs Año
                    </h3>
                    {periodData.length > 0 ? (
                      <BarChart
                        data={periodData.map((p) => ({
                          period: p.period_label,
                          consumed: p.total_consumed,
                        }))}
                        dataKey="consumed"
                        xAxisKey="period"
                        color="#ef4444"
                        formatValue={formatCurrencyShort}
                      />
                    ) : (
                      <div className="h-96 flex items-center justify-center text-gray-400">
                        No hay datos disponibles
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
