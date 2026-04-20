'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  FiscalLoss,
  FiscalLossStatus,
  FISCAL_LOSS_STATUS_LABELS,
  FISCAL_LOSS_STATUS_COLORS,
} from '@/types/accounting';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

export default function PerdidasFiscalesPage() {
  const [filterStatus, setFilterStatus] = useState<FiscalLossStatus | ''>('');

  // TODO: Conectar con endpoint real
  const { data: perdidas = [], isLoading } = useQuery({
    queryKey: ['contabilidad', 'perdidas-fiscales', filterStatus],
    queryFn: async () => {
      // Mock data mientras se implementa el backend
      return [
        {
          id: '1',
          ejercicio: 2020,
          fecha_declaracion: '2021-03-31',
          fecha_vencimiento: '2031-03-31',
          monto_original: 5000000,
          factor_actualizacion: 1.25,
          monto_actualizado: 6250000,
          amortizado: 2000000,
          saldo_pendiente: 4250000,
          status: 'vigente' as FiscalLossStatus,
          notes: null,
          created_by: null,
          is_active: true,
          created_at: '2021-04-01',
          updated_at: '2024-01-15',
        },
        {
          id: '2',
          ejercicio: 2018,
          fecha_declaracion: '2019-03-31',
          fecha_vencimiento: '2029-03-31',
          monto_original: 3500000,
          factor_actualizacion: 1.45,
          monto_actualizado: 5075000,
          amortizado: 5075000,
          saldo_pendiente: 0,
          status: 'amortizada_total' as FiscalLossStatus,
          notes: 'Amortizada completamente en 2023',
          created_by: null,
          is_active: true,
          created_at: '2019-04-01',
          updated_at: '2023-12-15',
        },
        {
          id: '3',
          ejercicio: 2017,
          fecha_declaracion: '2018-03-31',
          fecha_vencimiento: '2027-03-31',
          monto_original: 2800000,
          factor_actualizacion: 1.52,
          monto_actualizado: 4256000,
          amortizado: 1500000,
          saldo_pendiente: 2756000,
          status: 'proxima_a_vencer' as FiscalLossStatus,
          notes: 'Vence en 11 meses',
          created_by: null,
          is_active: true,
          created_at: '2018-04-01',
          updated_at: '2024-01-15',
        },
      ] as FiscalLoss[];
    },
  });

  const totals = perdidas.reduce(
    (acc, p) => ({
      monto_actualizado: acc.monto_actualizado + p.monto_actualizado,
      saldo_pendiente: acc.saldo_pendiente + p.saldo_pendiente,
    }),
    { monto_actualizado: 0, saldo_pendiente: 0 }
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Perdidas Fiscales</h1>
          <p className="text-gray-500">Control de perdidas fiscales pendientes de amortizar</p>
        </div>
        <button className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Perdida
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Perdidas</p>
          <p className="text-2xl font-bold text-[#424846]">{perdidas.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Monto Actualizado Total</p>
          <p className="text-xl font-bold text-[#424846]">{formatCurrency(totals.monto_actualizado)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Saldo Pendiente</p>
          <p className="text-xl font-bold text-[#52AF32]">{formatCurrency(totals.saldo_pendiente)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Proximas a Vencer</p>
          <p className="text-2xl font-bold text-yellow-600">
            {perdidas.filter(p => p.status === 'proxima_a_vencer').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FiscalLossStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            >
              <option value="">Todos los estados</option>
              <option value="vigente">Vigente</option>
              <option value="proxima_a_vencer">Proxima a Vencer</option>
              <option value="vencida">Vencida</option>
              <option value="amortizada_total">Amortizada Total</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Actualizar INPC
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#424846] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Ejercicio</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Fecha Declaracion</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Fecha Vencimiento</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Monto Original</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Factor INPC</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Monto Actualizado</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Amortizado</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">Saldo Pendiente</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {perdidas
                .filter(p => !filterStatus || p.status === filterStatus)
                .map((perdida) => (
                  <tr key={perdida.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{perdida.ejercicio}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(perdida.fecha_declaracion)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(perdida.fecha_vencimiento)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(perdida.monto_original)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{perdida.factor_actualizacion.toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(perdida.monto_actualizado)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(perdida.amortizado)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#52AF32] text-right">{formatCurrency(perdida.saldo_pendiente)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${FISCAL_LOSS_STATUS_COLORS[perdida.status]}`}>
                        {FISCAL_LOSS_STATUS_LABELS[perdida.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Amortizar">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Editar">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
