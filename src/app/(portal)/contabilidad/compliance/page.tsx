'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  PaymentReconciliation,
  ComplianceStatus,
  PAYMENT_RECONCILIATION_STATUS_LABELS,
  PAYMENT_RECONCILIATION_STATUS_COLORS,
} from '@/types/accounting';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export default function CompliancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-04');

  // TODO: Conectar con endpoints reales (requiere SAP + SAT)
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['contabilidad', 'compliance', 'status', selectedPeriod],
    queryFn: async () => {
      // Mock data
      return {
        periodo: '2026-04',
        total_registros: 156,
        conciliados: 142,
        con_diferencias: 8,
        solo_sap: 4,
        solo_sat: 2,
        porcentaje_compliance: 91.0,
      } as ComplianceStatus;
    },
  });

  const { data: reconciliations = [], isLoading: reconLoading } = useQuery({
    queryKey: ['contabilidad', 'compliance', 'reconciliations', selectedPeriod],
    queryFn: async () => {
      // Mock data - solo diferencias
      return [
        {
          id: '1',
          periodo: '2026-04',
          sap_payment_id: 'PAY-2026-0123',
          cfdi_uuid: 'ABC123-DEF456-GHI789',
          rfc_proveedor: 'XYZ123456ABC',
          proveedor_nombre: 'Proveedor de Energia S.A.',
          monto_sap: 125000,
          monto_sat: 120000,
          difference_amount: 5000,
          status: 'diferencia_monto' as const,
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          is_active: true,
          created_at: '2026-04-15',
        },
        {
          id: '2',
          periodo: '2026-04',
          sap_payment_id: 'PAY-2026-0145',
          cfdi_uuid: null,
          rfc_proveedor: 'ABC987654XYZ',
          proveedor_nombre: 'Servicios Industriales SA de CV',
          monto_sap: 85000,
          monto_sat: null,
          difference_amount: 85000,
          status: 'solo_en_sap' as const,
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          is_active: true,
          created_at: '2026-04-18',
        },
        {
          id: '3',
          periodo: '2026-04',
          sap_payment_id: null,
          cfdi_uuid: 'ZZZ999-YYY888-XXX777',
          rfc_proveedor: 'DEF456789GHI',
          proveedor_nombre: 'Consultoria Fiscal MX',
          monto_sap: null,
          monto_sat: 42000,
          difference_amount: 42000,
          status: 'solo_en_sat' as const,
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          is_active: true,
          created_at: '2026-04-20',
        },
      ] as PaymentReconciliation[];
    },
  });

  const isLoading = statusLoading || reconLoading;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Compliance SAP-SAT</h1>
          <p className="text-gray-500">Cruce automatico de informacion contable contra registros del SAT</p>
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Compliance Score */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Porcentaje de Compliance</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className={`text-5xl font-bold ${(status?.porcentaje_compliance || 0) >= 95 ? 'text-green-600' : (status?.porcentaje_compliance || 0) >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {status?.porcentaje_compliance || 0}%
                  </p>
                  <p className="text-gray-500">de registros conciliados</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{status?.conciliados || 0}</p>
                  <p className="text-sm text-gray-500">Conciliados</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">{status?.con_diferencias || 0}</p>
                  <p className="text-sm text-gray-500">Con Diferencias</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">{status?.solo_sap || 0}</p>
                  <p className="text-sm text-gray-500">Solo en SAP</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{status?.solo_sat || 0}</p>
                  <p className="text-sm text-gray-500">Solo en SAT</p>
                </div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden flex">
                <div
                  className="h-4 bg-green-500"
                  style={{ width: `${(status?.conciliados || 0) / (status?.total_registros || 1) * 100}%` }}
                />
                <div
                  className="h-4 bg-yellow-500"
                  style={{ width: `${(status?.con_diferencias || 0) / (status?.total_registros || 1) * 100}%` }}
                />
                <div
                  className="h-4 bg-orange-500"
                  style={{ width: `${(status?.solo_sap || 0) / (status?.total_registros || 1) * 100}%` }}
                />
                <div
                  className="h-4 bg-red-500"
                  style={{ width: `${(status?.solo_sat || 0) / (status?.total_registros || 1) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Differences Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#424846]">Registros con Diferencias</h3>
              <p className="text-sm text-gray-500">Requieren revision manual</p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago SAP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UUID CFDI</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto SAP</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto SAT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{rec.proveedor_nombre}</p>
                      <p className="text-xs text-gray-500">{rec.rfc_proveedor}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rec.sap_payment_id || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                      {rec.cfdi_uuid ? rec.cfdi_uuid.substring(0, 16) + '...' : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {rec.monto_sap ? formatCurrency(rec.monto_sap) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {rec.monto_sat ? formatCurrency(rec.monto_sat) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">
                      {formatCurrency(rec.difference_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${PAYMENT_RECONCILIATION_STATUS_COLORS[rec.status]}`}>
                        {PAYMENT_RECONCILIATION_STATUS_LABELS[rec.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Revisar">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Integraciones Requeridas</p>
                <p className="text-sm text-yellow-600">
                  Este modulo requiere que tanto SAP B1 como SAT esten configurados y sincronizados
                  para ejecutar el cruce automatico de informacion.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
