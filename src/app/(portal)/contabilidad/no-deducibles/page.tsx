'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { NonDeductible, NonDeductibleStats } from '@/types/accounting';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export default function NoDeduciblesPage() {
  const [filterPeriodo, setFilterPeriodo] = useState('2026-04');
  const [filterDepartment, setFilterDepartment] = useState('');

  // TODO: Conectar con endpoints reales
  const { data: noDeducibles = [], isLoading } = useQuery({
    queryKey: ['contabilidad', 'no-deducibles', filterPeriodo, filterDepartment],
    queryFn: async () => {
      // Mock data
      return [
        {
          id: '1',
          periodo: '2026-04',
          concepto: 'Gastos de representacion sin comprobante',
          monto: 15000,
          department_id: '1',
          cfdi_uuid: null,
          notes: 'Evento corporativo sin factura',
          created_by: null,
          is_active: true,
          created_at: '2026-04-10',
          updated_at: '2026-04-10',
          departments: { id: '1', name: 'Administracion' },
        },
        {
          id: '2',
          periodo: '2026-04',
          concepto: 'Multas y recargos',
          monto: 8500,
          department_id: '2',
          cfdi_uuid: null,
          notes: 'Recargos IMSS marzo',
          created_by: null,
          is_active: true,
          created_at: '2026-04-15',
          updated_at: '2026-04-15',
          departments: { id: '2', name: 'Recursos Humanos' },
        },
        {
          id: '3',
          periodo: '2026-04',
          concepto: 'Donativos no deducibles',
          monto: 25000,
          department_id: '1',
          cfdi_uuid: 'ABC123',
          notes: 'Donativo a organizacion sin autorizacion SAT',
          created_by: null,
          is_active: true,
          created_at: '2026-04-18',
          updated_at: '2026-04-18',
          departments: { id: '1', name: 'Administracion' },
        },
      ] as NonDeductible[];
    },
  });

  const { data: stats = [] } = useQuery({
    queryKey: ['contabilidad', 'no-deducibles', 'stats', filterPeriodo],
    queryFn: async () => {
      // Mock stats
      return [
        { department_id: '1', department_name: 'Administracion', total_monto: 40000, count: 2 },
        { department_id: '2', department_name: 'Recursos Humanos', total_monto: 8500, count: 1 },
        { department_id: '3', department_name: 'Operaciones', total_monto: 12000, count: 3 },
      ] as NonDeductibleStats[];
    },
  });

  const totalMonto = noDeducibles.reduce((acc, nd) => acc + nd.monto, 0);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Gastos No Deducibles</h1>
          <p className="text-gray-500">Control de gastos no deducibles por departamento</p>
        </div>
        <button className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Gasto
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total del Periodo</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalMonto)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Registros</p>
          <p className="text-2xl font-bold text-[#424846]">{noDeducibles.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Departamentos Afectados</p>
          <p className="text-2xl font-bold text-[#424846]">{stats.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Promedio por Registro</p>
          <p className="text-xl font-bold text-[#424846]">
            {formatCurrency(noDeducibles.length > 0 ? totalMonto / noDeducibles.length : 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
            <input
              type="month"
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            >
              <option value="">Todos</option>
              {stats.map(s => (
                <option key={s.department_id} value={s.department_id}>{s.department_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Exportar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Stats by Department */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-[#424846] mb-4">Por Departamento</h3>
          <div className="space-y-3">
            {stats.map((stat) => {
              const maxMonto = Math.max(...stats.map(s => s.total_monto));
              const percentage = maxMonto > 0 ? (stat.total_monto / maxMonto) * 100 : 0;
              return (
                <div key={stat.department_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{stat.department_name}</span>
                    <span className="font-medium">{formatCurrency(stat.total_monto)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#424846] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Departamento</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Monto</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                noDeducibles.map((nd) => (
                  <tr key={nd.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{nd.concepto}</p>
                      {nd.notes && <p className="text-xs text-gray-500">{nd.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{nd.departments?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">
                      {formatCurrency(nd.monto)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Editar">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
