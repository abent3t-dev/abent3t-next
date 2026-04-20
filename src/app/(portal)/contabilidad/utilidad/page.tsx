'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UtilityData } from '@/types/accounting';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export default function UtilidadPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-Q1');

  const { data: utilityData, isLoading } = useQuery({
    queryKey: ['contabilidad', 'utilidad', selectedPeriod],
    queryFn: async () => {
      // Mock data
      return {
        periodo: '2026-Q1',
        utilidad_financiera: 8500000,
        utilidad_fiscal: 7200000,
        gastos_deducibles: 12500000,
        intereses: 850000,
        depreciacion: 1250000,
      } as UtilityData;
    },
  });

  const diferencia = (utilityData?.utilidad_financiera || 0) - (utilityData?.utilidad_fiscal || 0);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Utilidad Financiera y Fiscal</h1>
          <p className="text-gray-500">Comparativo y conciliacion entre utilidad financiera y fiscal</p>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
        >
          <option value="2026-Q1">Q1 2026</option>
          <option value="2026-Q2">Q2 2026</option>
          <option value="2025-Q4">Q4 2025</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Utilidad Financiera</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(utilityData?.utilidad_financiera || 0)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#222D59]">
              <p className="text-sm text-gray-500">Utilidad Fiscal</p>
              <p className="text-3xl font-bold text-[#222D59] mt-2">{formatCurrency(utilityData?.utilidad_fiscal || 0)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
              <p className="text-sm text-gray-500">Diferencia</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{formatCurrency(diferencia)}</p>
              <p className="text-xs text-gray-500 mt-1">Conciliacion fiscal-financiera</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Componentes de la Utilidad</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Gastos Deducibles</span>
                  <span className="font-medium text-gray-900">{formatCurrency(utilityData?.gastos_deducibles || 0)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Intereses</span>
                  <span className="font-medium text-gray-900">{formatCurrency(utilityData?.intereses || 0)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Depreciacion</span>
                  <span className="font-medium text-gray-900">{formatCurrency(utilityData?.depreciacion || 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Conciliacion</h3>
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 text-gray-700">Utilidad Financiera</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(utilityData?.utilidad_financiera || 0)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700">(+) Gastos no deducibles</td>
                    <td className="py-2 text-right font-medium">+ {formatCurrency(diferencia > 0 ? 0 : Math.abs(diferencia))}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700">(-) Deducciones fiscales</td>
                    <td className="py-2 text-right font-medium">- {formatCurrency(diferencia > 0 ? diferencia : 0)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">Utilidad Fiscal</td>
                    <td className="py-2 text-right font-bold text-[#222D59]">{formatCurrency(utilityData?.utilidad_fiscal || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
