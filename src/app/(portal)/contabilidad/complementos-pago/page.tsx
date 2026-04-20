'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PaymentReconciliation,
  PAYMENT_RECONCILIATION_STATUS_LABELS,
  PAYMENT_RECONCILIATION_STATUS_COLORS,
} from '@/types/accounting';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export default function ComplementosPagoPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-04');

  const { data: reconciliations = [], isLoading } = useQuery({
    queryKey: ['contabilidad', 'complementos-pago', selectedPeriod],
    queryFn: async () => {
      // Mock data
      return [
        {
          id: '1',
          periodo: '2026-04',
          sap_payment_id: 'PAY-001',
          cfdi_uuid: 'UUID-001',
          rfc_proveedor: 'ABC123',
          proveedor_nombre: 'Proveedor A',
          monto_sap: 50000,
          monto_sat: 50000,
          difference_amount: 0,
          status: 'conciliado' as const,
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          is_active: true,
          created_at: '2026-04-15',
        },
        {
          id: '2',
          periodo: '2026-04',
          sap_payment_id: 'PAY-002',
          cfdi_uuid: 'UUID-002',
          rfc_proveedor: 'DEF456',
          proveedor_nombre: 'Proveedor B',
          monto_sap: 75000,
          monto_sat: 72000,
          difference_amount: 3000,
          status: 'diferencia_monto' as const,
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          is_active: true,
          created_at: '2026-04-16',
        },
      ] as PaymentReconciliation[];
    },
  });

  const stats = {
    total: reconciliations.length,
    conciliados: reconciliations.filter(r => r.status === 'conciliado').length,
    diferencias: reconciliations.filter(r => r.status !== 'conciliado').length,
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Complementos de Pago</h1>
          <p className="text-gray-500">Cruce de pagos SAP vs CFDIs tipo P del SAT</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          />
          <button className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors">
            Ejecutar Cruce
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Registros</p>
          <p className="text-2xl font-bold text-[#424846]">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Conciliados</p>
          <p className="text-2xl font-bold text-green-600">{stats.conciliados}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Con Diferencias</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.diferencias}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#424846] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase">Proveedor</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase">Pago SAP</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase">Monto SAP</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase">Monto SAT</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase">Diferencia</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : (
              reconciliations.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rec.proveedor_nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rec.sap_payment_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{rec.monto_sap ? formatCurrency(rec.monto_sap) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{rec.monto_sat ? formatCurrency(rec.monto_sat) : '-'}</td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${rec.difference_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(rec.difference_amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${PAYMENT_RECONCILIATION_STATUS_COLORS[rec.status]}`}>
                      {PAYMENT_RECONCILIATION_STATUS_LABELS[rec.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
