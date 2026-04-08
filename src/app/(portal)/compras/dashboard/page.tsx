'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  RequisitionStats,
  PurchaseOrderStats,
  ApprovalStats,
  REQUISITION_STATUS_LABELS,
  PO_STATUS_LABELS,
  EXPENSE_TYPE_LABELS,
} from '@/types/purchases';

const Icons = {
  document: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  clock: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  money: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  truck: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export default function ComprasDashboardPage() {
  const rqStatsQuery = useQuery({
    queryKey: ['requisitions', 'stats'],
    queryFn: () => api.get<RequisitionStats>('/requisitions/stats'),
  });

  const poStatsQuery = useQuery({
    queryKey: ['purchase-orders', 'stats'],
    queryFn: () => api.get<PurchaseOrderStats>('/purchase-orders/stats'),
  });

  const approvalStatsQuery = useQuery({
    queryKey: ['approvals', 'stats'],
    queryFn: () => api.get<ApprovalStats>('/approvals/stats'),
  });

  const rqStats = rqStatsQuery.data;
  const poStats = poStatsQuery.data;
  const approvalStats = approvalStatsQuery.data;
  const loading = rqStatsQuery.isLoading || poStatsQuery.isLoading || approvalStatsQuery.isLoading;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Dashboard de Compras</h1>
        <p className="text-gray-500">KPIs y metricas del modulo de compras</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total RQs</p>
                  <p className="text-2xl font-bold text-[#424846]">{rqStats?.total || 0}</p>
                </div>
                <div className="text-blue-500">{Icons.document}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Dias Promedio</p>
                  <p className="text-2xl font-bold text-[#424846]">{rqStats?.average_business_days || 0}</p>
                </div>
                <div className="text-yellow-500">{Icons.clock}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#52AF32]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total POs</p>
                  <p className="text-2xl font-bold text-[#424846]">{poStats?.total || 0}</p>
                </div>
                <div className="text-[#52AF32]">{Icons.check}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#222D59]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Monto Total</p>
                  <p className="text-xl font-bold text-[#424846]">{formatCurrency(poStats?.total_amount || 0)}</p>
                </div>
                <div className="text-[#222D59]">{Icons.money}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">En Transito</p>
                  <p className="text-2xl font-bold text-[#424846]">
                    {poStats?.by_status?.en_transito?.count || 0}
                  </p>
                </div>
                <div className="text-orange-500">{Icons.truck}</div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* RQ por Estado */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Requisiciones por Estado</h3>
              <div className="space-y-3">
                {rqStats?.by_status && Object.entries(rqStats.by_status).map(([status, count]) => {
                  const percentage = rqStats.total > 0 ? (count / rqStats.total) * 100 : 0;
                  const colors: Record<string, string> = {
                    en_revision: 'bg-blue-500',
                    en_aprobacion: 'bg-yellow-500',
                    aprobada: 'bg-green-400',
                    en_progreso: 'bg-yellow-500',
                    cerrada: 'bg-green-500',
                    cancelada: 'bg-gray-400',
                  };
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">
                          {REQUISITION_STATUS_LABELS[status as keyof typeof REQUISITION_STATUS_LABELS] || status}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[status] || 'bg-gray-400'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PO por Tipo (CAPEX/OPEX) */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">POs por Tipo de Gasto</h3>
              <div className="space-y-4">
                {poStats?.by_type && Object.entries(poStats.by_type).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full ${type === 'CAPEX' ? 'bg-[#52AF32]' : 'bg-[#222D59]'}`}
                      />
                      <span className="font-medium text-gray-700">
                        {EXPENSE_TYPE_LABELS[type as keyof typeof EXPENSE_TYPE_LABELS] || type}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#424846]">{formatCurrency(data.amount)}</p>
                      <p className="text-sm text-gray-500">{data.count} ordenes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Approval Stats */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-[#424846] mb-4">Tiempos de Aprobacion por Nivel</h3>
            <div className="grid grid-cols-4 gap-4">
              {approvalStats && Object.values(approvalStats).map((level: any) => (
                <div key={level.level} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">{level.level_name}</p>
                  <p className="text-2xl font-bold text-[#424846]">{level.average_time_days} dias</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-green-600">{level.approved} aprobadas</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-red-600">{level.rejected} rechazadas</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Tasa: {level.approval_rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PO por Tipo de Compra */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-[#424846] mb-4">POs por Tipo de Compra</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% del Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {poStats?.by_purchase_type && Object.entries(poStats.by_purchase_type).map(([type, data]) => {
                    const percentage = poStats.total_amount > 0 ? (data.amount / poStats.total_amount) * 100 : 0;
                    return (
                      <tr key={type} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{type}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{data.count}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(data.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{percentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
