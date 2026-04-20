'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CostsData } from '@/types/accounting';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export default function CostosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-Q1');

  const { data: costsData, isLoading } = useQuery({
    queryKey: ['contabilidad', 'costos', selectedPeriod],
    queryFn: async () => {
      // Mock data - estos datos vendran de SAP B1
      return {
        periodo: '2026-Q1',
        total: 8450000,
        costo_gas: 4200000,
        costo_porteo: 2800000,
        fees: 1450000,
      } as CostsData;
    },
  });

  const costs = costsData ? [
    { name: 'Costo de Gas', value: costsData.costo_gas, color: '#52AF32' },
    { name: 'Costo de Porteo', value: costsData.costo_porteo, color: '#222D59' },
    { name: 'Fees y Comisiones', value: costsData.fees, color: '#DFA922' },
  ] : [];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Dashboard de Costos de Ventas</h1>
          <p className="text-gray-500">Monitoreo de costos de ventas con foco en gas, porteo y fees</p>
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
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500 uppercase">Costo Total de Ventas</p>
            <p className="text-4xl font-bold text-[#424846] mt-2">{formatCurrency(costsData?.total || 0)}</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {costs.map((cost) => (
              <div key={cost.name} className="bg-white p-6 rounded-lg shadow" style={{ borderLeftWidth: 4, borderLeftColor: cost.color }}>
                <p className="text-sm text-gray-500">{cost.name}</p>
                <p className="text-2xl font-bold text-[#424846] mt-2">{formatCurrency(cost.value)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {costsData?.total ? ((cost.value / costsData.total) * 100).toFixed(1) : 0}% del total
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-[#424846] mb-4">Desglose de Costos</h3>
            <div className="space-y-4">
              {costs.map((cost) => {
                const percentage = costsData?.total ? (cost.value / costsData.total) * 100 : 0;
                return (
                  <div key={cost.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{cost.name}</span>
                      <span className="font-medium">{formatCurrency(cost.value)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="h-4 rounded-full"
                        style={{ width: `${percentage}%`, backgroundColor: cost.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
