'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AccountingDashboardKpis } from '@/types/accounting';

const Icons = {
  trending: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  dollar: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  alert: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  creditCard: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

export default function ContabilidadDashboardPage() {
  // TODO: Conectar con endpoints reales cuando el backend este listo
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['contabilidad', 'dashboard'],
    queryFn: async () => {
      // Mock data mientras se implementa el backend
      return {
        ebitda_actual: 15750000,
        ebitda_anterior: 14200000,
        ebitda_variacion: 10.9,
        utilidad_financiera: 8500000,
        utilidad_fiscal: 7200000,
        deuda_total: 45000000,
        compliance_porcentaje: 94.5,
        perdidas_vigentes: 3,
        perdidas_proximas_vencer: 1,
      } as AccountingDashboardKpis;
    },
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Dashboard de Contabilidad</h1>
        <p className="text-gray-500">KPIs financieros y compliance fiscal</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#52AF32]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">EBITDA</p>
                  <p className="text-xl font-bold text-[#424846]">{formatCurrency(kpis?.ebitda_actual || 0)}</p>
                  <p className={`text-xs ${(kpis?.ebitda_variacion || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(kpis?.ebitda_variacion || 0)} vs periodo anterior
                  </p>
                </div>
                <div className="text-[#52AF32]">{Icons.trending}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Utilidad Financiera</p>
                  <p className="text-xl font-bold text-[#424846]">{formatCurrency(kpis?.utilidad_financiera || 0)}</p>
                </div>
                <div className="text-blue-500">{Icons.dollar}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-[#222D59]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Utilidad Fiscal</p>
                  <p className="text-xl font-bold text-[#424846]">{formatCurrency(kpis?.utilidad_fiscal || 0)}</p>
                </div>
                <div className="text-[#222D59]">{Icons.dollar}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Deuda Total</p>
                  <p className="text-xl font-bold text-[#424846]">{formatCurrency(kpis?.deuda_total || 0)}</p>
                </div>
                <div className="text-yellow-500">{Icons.creditCard}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Compliance</p>
                  <p className="text-2xl font-bold text-[#424846]">{kpis?.compliance_porcentaje || 0}%</p>
                </div>
                <div className="text-green-500">{Icons.check}</div>
              </div>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Perdidas Fiscales */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Perdidas Fiscales</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700">Vigentes</span>
                  <span className="text-2xl font-bold text-green-600">{kpis?.perdidas_vigentes || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-gray-700">Proximas a Vencer</span>
                  <span className="text-2xl font-bold text-yellow-600">{kpis?.perdidas_proximas_vencer || 0}</span>
                </div>
              </div>
            </div>

            {/* Accesos Rapidos */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Accesos Rapidos</h3>
              <div className="space-y-2">
                <a
                  href="/contabilidad/ebitda"
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700">Ver Dashboard EBITDA</span>
                </a>
                <a
                  href="/contabilidad/compliance"
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700">Ver Cruce SAP-SAT</span>
                </a>
                <a
                  href="/contabilidad/perdidas-fiscales"
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700">Gestionar Perdidas Fiscales</span>
                </a>
              </div>
            </div>

            {/* Estado de Integraciones */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Estado de Integraciones</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">SAP B1</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                    No configurado
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">SAT</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                    No configurado
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Las integraciones se configuran en la seccion de Configuracion.
              </p>
            </div>
          </div>

          {/* Placeholder Charts */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">EBITDA por Tipo de Ingreso</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">Grafica disponible cuando SAP este conectado</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Tendencia de Utilidad</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">Grafica disponible cuando SAP este conectado</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
