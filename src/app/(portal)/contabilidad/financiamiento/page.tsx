'use client';

import { useQuery } from '@tanstack/react-query';
import { FinancingData } from '@/types/accounting';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short' });

export default function FinanciamientoPage() {
  const { data: financingData, isLoading } = useQuery({
    queryKey: ['contabilidad', 'financiamiento'],
    queryFn: async () => {
      // Mock data
      return {
        periodo: '2026-04',
        deuda_total: 45000000,
        intereses_periodo: 1250000,
        razon_deuda_ebitda: 2.86,
        creditos: [
          { institucion: 'Banco Nacional', saldo: 25000000, tasa: 12.5, vencimiento: '2028-06-15' },
          { institucion: 'Banco Comercial', saldo: 15000000, tasa: 11.8, vencimiento: '2027-12-01' },
          { institucion: 'Arrendadora Financiera', saldo: 5000000, tasa: 14.2, vencimiento: '2026-09-30' },
        ],
      } as FinancingData;
    },
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Financiamiento e Intereses</h1>
        <p className="text-gray-500">Monitoreo de deuda financiera e intereses devengados</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#222D59]">
              <p className="text-sm text-gray-500">Deuda Total Vigente</p>
              <p className="text-2xl font-bold text-[#424846]">{formatCurrency(financingData?.deuda_total || 0)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <p className="text-sm text-gray-500">Intereses del Periodo</p>
              <p className="text-2xl font-bold text-[#424846]">{formatCurrency(financingData?.intereses_periodo || 0)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#52AF32]">
              <p className="text-sm text-gray-500">Razon Deuda/EBITDA</p>
              <p className="text-2xl font-bold text-[#424846]">{financingData?.razon_deuda_ebitda?.toFixed(2)}x</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
              <p className="text-sm text-gray-500">Creditos Activos</p>
              <p className="text-2xl font-bold text-[#424846]">{financingData?.creditos?.length || 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#424846]">Detalle de Creditos</h3>
            </div>
            <table className="w-full">
              <thead className="bg-[#424846] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Institucion</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">Saldo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">Tasa</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">% del Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {financingData?.creditos?.map((credito, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{credito.institucion}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(credito.saldo)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{credito.tasa}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatDate(credito.vencimiento)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {((credito.saldo / (financingData.deuda_total || 1)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(financingData?.deuda_total || 0)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
