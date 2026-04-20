'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EbitdaData } from '@/types/accounting';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

// Colores para las barras
const COLORS = ['#52AF32', '#222D59', '#DFA922', '#67B52E', '#424846', '#74B82B', '#3b82f6', '#8b5cf6', '#f59e0b'];

export default function EbitdaPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-Q1');

  // TODO: Conectar con endpoint real (SAP B1)
  const { data: ebitdaData, isLoading } = useQuery({
    queryKey: ['contabilidad', 'ebitda', selectedPeriod],
    queryFn: async () => {
      // Mock data - estos datos vendran de SAP B1
      return {
        periodo: '2026-Q1',
        total: 15750000,
        por_tipo_ingreso: [
          { tipo: 'Energia - Cargo fijo', monto: 5200000 },
          { tipo: 'Energia - Porteo', monto: 3800000 },
          { tipo: 'Energia - Gas', monto: 2500000 },
          { tipo: 'Vapor', monto: 1800000 },
          { tipo: 'PML', monto: 1200000 },
          { tipo: 'Take or Pay', monto: 650000 },
          { tipo: 'Banco de energia', monto: 350000 },
          { tipo: 'Gestion y coordinacion', monto: 200000 },
          { tipo: 'Entrega de medidores', monto: 50000 },
        ],
      } as EbitdaData;
    },
  });

  const maxMonto = ebitdaData?.por_tipo_ingreso?.reduce((max, item) => Math.max(max, item.monto), 0) || 0;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Dashboard EBITDA</h1>
          <p className="text-gray-500">Visualizacion del EBITDA por tipo de ingreso</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          >
            <option value="2026-Q1">Q1 2026</option>
            <option value="2026-Q2">Q2 2026</option>
            <option value="2025-Q4">Q4 2025</option>
            <option value="2025-Q3">Q3 2025</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Exportar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Main KPI */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">EBITDA Total del Periodo</p>
                <p className="text-4xl font-bold text-[#52AF32] mt-2">
                  {formatCurrency(ebitdaData?.total || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Periodo: {ebitdaData?.periodo}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Comparado con periodo anterior</p>
                <p className="text-2xl font-bold text-green-600">+10.9%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">EBITDA por Tipo de Ingreso</h3>
              <div className="space-y-4">
                {ebitdaData?.por_tipo_ingreso?.map((item, index) => {
                  const percentage = maxMonto > 0 ? (item.monto / maxMonto) * 100 : 0;
                  return (
                    <div key={item.tipo}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 truncate flex-1">{item.tipo}</span>
                        <span className="font-medium ml-2">{formatCurrency(item.monto)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="h-4 rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pie Chart / Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Distribucion Porcentual</h3>
              <div className="space-y-3">
                {ebitdaData?.por_tipo_ingreso?.map((item, index) => {
                  const percentage = ebitdaData.total > 0 ? (item.monto / ebitdaData.total) * 100 : 0;
                  return (
                    <div key={item.tipo} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-gray-700">{item.tipo}</span>
                      </div>
                      <span className="text-sm font-medium text-[#424846]">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#424846] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Tipo de Ingreso</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">Monto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">% del Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">vs Periodo Anterior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ebitdaData?.por_tipo_ingreso?.map((item, index) => {
                  const percentage = ebitdaData.total > 0 ? (item.monto / ebitdaData.total) * 100 : 0;
                  // Mock variation
                  const variation = ['+12.5%', '+8.3%', '-2.1%', '+15.7%', '+5.2%', '+3.8%', '-5.4%', '+22.1%', '+10.0%'][index];
                  const isPositive = variation.startsWith('+');
                  return (
                    <tr key={item.tipo} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-gray-900">{item.tipo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(item.monto)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{percentage.toFixed(1)}%</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {variation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">Total EBITDA</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#52AF32] text-right">
                    {formatCurrency(ebitdaData?.total || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">100.0%</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">+10.9%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">Fuente de datos</p>
                <p className="text-sm text-blue-600">
                  Los datos de EBITDA se obtienen automaticamente desde SAP B1 Service Layer.
                  La ultima sincronizacion fue hace 2 horas.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
