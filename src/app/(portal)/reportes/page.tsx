'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/client';

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

  useEffect(() => {
    loadReport(activeTab);
  }, [activeTab]);

  const loadReport = async (type: ReportType) => {
    setLoading(true);
    try {
      switch (type) {
        case 'person':
          const persons = await api.get<PersonReport[]>('/reports/by-person');
          setPersonData(persons);
          break;
        case 'department':
          const depts = await api.get<DepartmentReport[]>('/reports/by-department');
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reports/export?type=${activeTab}`,
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500">Análisis de inversión y horas de capacitación</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {Icons.download}
          <span>{exporting ? 'Exportando...' : 'Exportar CSV'}</span>
        </button>
      </div>

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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <>
            {/* Por Persona */}
            {activeTab === 'person' && (
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
                  {personData.map((row) => (
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
            )}

            {/* Por Departamento */}
            {activeTab === 'department' && (
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
                  {departmentData.map((row) => (
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
            )}

            {/* Por Institución */}
            {activeTab === 'institution' && (
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
                  {institutionData.map((row) => (
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
            )}

            {/* Por Período */}
            {activeTab === 'period' && (
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
                  {periodData.map((row) => (
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
            )}

            {/* Empty states */}
            {!loading && (
              (activeTab === 'person' && personData.length === 0) ||
              (activeTab === 'department' && departmentData.length === 0) ||
              (activeTab === 'institution' && institutionData.length === 0) ||
              (activeTab === 'period' && periodData.length === 0)
            ) && (
              <div className="p-8 text-center text-gray-500">No hay datos disponibles</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
