'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ReportSummary {
  total_requisitions: number;
  total_purchase_orders: number;
  total_suppliers: number;
  total_amount_rq: number;
  total_amount_po: number;
  by_status: Record<string, number>;
  by_expense_type: Record<string, number>;
}

const Icons = {
  document: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  cart: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  truck: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  currency: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export default function ReportesComprasPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Datos simulados mientras se implementa el backend
  const mockData: ReportSummary = {
    total_requisitions: 24,
    total_purchase_orders: 18,
    total_suppliers: 12,
    total_amount_rq: 1250000,
    total_amount_po: 980000,
    by_status: {
      en_revision: 5,
      en_aprobacion: 8,
      aprobada: 4,
      en_progreso: 3,
      cerrada: 3,
      cancelada: 1,
    },
    by_expense_type: {
      CAPEX: 850000,
      OPEX: 400000,
    },
  };

  const data = mockData;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Reportes de Compras</h1>
          <p className="text-gray-500">Metricas y analisis del modulo de compras</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Desde:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Hasta:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              {Icons.document}
            </div>
            <div>
              <p className="text-sm text-gray-500">Requisiciones</p>
              <p className="text-2xl font-bold text-gray-900">{data.total_requisitions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg text-green-600">
              {Icons.cart}
            </div>
            <div>
              <p className="text-sm text-gray-500">Ordenes de Compra</p>
              <p className="text-2xl font-bold text-gray-900">{data.total_purchase_orders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
              {Icons.truck}
            </div>
            <div>
              <p className="text-sm text-gray-500">Proveedores Activos</p>
              <p className="text-2xl font-bold text-gray-900">{data.total_suppliers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
              {Icons.currency}
            </div>
            <div>
              <p className="text-sm text-gray-500">Monto Total PO</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.total_amount_po)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requisiciones por Estado</h3>
          <div className="space-y-3">
            {Object.entries(data.by_status).map(([status, count]) => {
              const total = Object.values(data.by_status).reduce((a, b) => a + b, 0);
              const percentage = ((count / total) * 100).toFixed(1);
              const colors: Record<string, string> = {
                en_revision: 'bg-yellow-500',
                en_aprobacion: 'bg-blue-500',
                aprobada: 'bg-green-500',
                en_progreso: 'bg-purple-500',
                cerrada: 'bg-gray-500',
                cancelada: 'bg-red-500',
              };
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 capitalize">
                    {status.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[status] || 'bg-gray-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-right text-gray-700">
                    {count} ({percentage}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CAPEX vs OPEX */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribucion CAPEX / OPEX</h3>
          <div className="flex items-center justify-center gap-8 h-48">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-[#52AF32] flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-xl font-bold">
                  {((data.by_expense_type.CAPEX / (data.by_expense_type.CAPEX + data.by_expense_type.OPEX)) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">CAPEX</p>
              <p className="text-sm text-gray-500">{formatCurrency(data.by_expense_type.CAPEX)}</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-[#222D59] flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-xl font-bold">
                  {((data.by_expense_type.OPEX / (data.by_expense_type.CAPEX + data.by_expense_type.OPEX)) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">OPEX</p>
              <p className="text-sm text-gray-500">{formatCurrency(data.by_expense_type.OPEX)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Montos</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Monto Total Requisiciones</span>
              <span className="font-semibold text-gray-900">{formatCurrency(data.total_amount_rq)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Monto Total Ordenes</span>
              <span className="font-semibold text-gray-900">{formatCurrency(data.total_amount_po)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Diferencia (RQ - PO)</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(data.total_amount_rq - data.total_amount_po)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicadores Clave</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Tasa de Conversion (RQ → PO)</span>
              <span className="font-semibold text-blue-600">
                {((data.total_purchase_orders / data.total_requisitions) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Monto Promedio por PO</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(data.total_amount_po / data.total_purchase_orders)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">PO por Proveedor (promedio)</span>
              <span className="font-semibold text-gray-900">
                {(data.total_purchase_orders / data.total_suppliers).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> Los datos mostrados son de ejemplo. Los reportes completos estaran disponibles
          cuando se implemente el endpoint <code className="bg-yellow-100 px-1 rounded">/api/compras/reports</code> en el backend.
        </p>
      </div>
    </div>
  );
}
