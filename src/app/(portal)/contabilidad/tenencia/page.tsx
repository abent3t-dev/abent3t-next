'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ShareholdingRecord, ShareholdingDetail } from '@/types/accounting';

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

// Colores para la grafica de pastel
const COLORS = ['#52AF32', '#222D59', '#DFA922', '#67B52E', '#424846', '#74B82B'];

export default function TenenciaPage() {
  // TODO: Conectar con endpoint real
  const { data: tenencia, isLoading } = useQuery({
    queryKey: ['contabilidad', 'tenencia'],
    queryFn: async () => {
      // Mock data mientras se implementa el backend
      return {
        id: '1',
        version: 3,
        effective_date: '2024-01-15',
        event_description: 'Actualizacion tras ampliacion de capital',
        created_by: null,
        is_active: true,
        created_at: '2024-01-15',
        details: [
          {
            id: '1',
            shareholding_record_id: '1',
            accionista_nombre: 'Grupo Industrial ABC',
            rfc: 'GIA880101ABC',
            tipo_accion: 'ordinaria',
            porcentaje: 45.0,
            num_acciones: 450000,
            notes: 'Socio mayoritario',
            is_active: true,
            created_at: '2024-01-15',
          },
          {
            id: '2',
            shareholding_record_id: '1',
            accionista_nombre: 'Fondo de Inversion XYZ',
            rfc: 'FIX900515XYZ',
            tipo_accion: 'ordinaria',
            porcentaje: 25.0,
            num_acciones: 250000,
            notes: null,
            is_active: true,
            created_at: '2024-01-15',
          },
          {
            id: '3',
            shareholding_record_id: '1',
            accionista_nombre: 'Inversiones DEF',
            rfc: 'IDE950320DEF',
            tipo_accion: 'ordinaria',
            porcentaje: 15.0,
            num_acciones: 150000,
            notes: null,
            is_active: true,
            created_at: '2024-01-15',
          },
          {
            id: '4',
            shareholding_record_id: '1',
            accionista_nombre: 'Otros Accionistas Minoritarios',
            rfc: null,
            tipo_accion: 'ordinaria',
            porcentaje: 15.0,
            num_acciones: 150000,
            notes: 'Agrupa accionistas con menos del 5%',
            is_active: true,
            created_at: '2024-01-15',
          },
        ],
      } as ShareholdingRecord;
    },
  });

  const totalShares = tenencia?.details?.reduce((acc, d) => acc + (d.num_acciones || 0), 0) || 0;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Tenencia Accionaria</h1>
          <p className="text-gray-500">Estructura accionaria de Abent 3T S.A.P.I. de C.V.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Ver Historial
          </button>
          <button className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Evento
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Version Info */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Version Actual</p>
              <p className="text-lg font-semibold text-[#424846]">Version {tenencia?.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha Efectiva</p>
              <p className="text-lg font-semibold text-[#424846]">{formatDate(tenencia?.effective_date || '')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Evento</p>
              <p className="text-lg font-semibold text-[#424846]">{tenencia?.event_description || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Acciones</p>
              <p className="text-lg font-semibold text-[#424846]">{totalShares.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Distribucion Accionaria</h3>
              <div className="relative h-64 flex items-center justify-center">
                {/* Simple SVG Pie Chart */}
                <svg viewBox="0 0 100 100" className="w-48 h-48">
                  {tenencia?.details?.reduce((acc: { offset: number; elements: React.ReactElement[] }, detail, index) => {
                    const percentage = detail.porcentaje;
                    const circumference = 2 * Math.PI * 15.9155;
                    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -(acc.offset / 100) * circumference;

                    acc.elements.push(
                      <circle
                        key={detail.id}
                        cx="50"
                        cy="50"
                        r="15.9155"
                        fill="transparent"
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth="31.831"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 50 50)"
                      />
                    );
                    acc.offset += percentage;
                    return acc;
                  }, { offset: 0, elements: [] }).elements}
                </svg>
              </div>
              {/* Legend */}
              <div className="mt-4 space-y-2">
                {tenencia?.details?.map((detail, index) => (
                  <div key={detail.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-700">{detail.accionista_nombre}</span>
                    </div>
                    <span className="font-medium">{formatPercentage(detail.porcentaje)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-[#424846] mb-4">Detalle de Accionistas</h3>
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Accionista</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">RFC</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenencia?.details?.map((detail) => (
                    <tr key={detail.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{detail.accionista_nombre}</p>
                          {detail.notes && <p className="text-xs text-gray-500">{detail.notes}</p>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{detail.rfc || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 text-right">
                        {detail.num_acciones?.toLocaleString() || '-'}
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-[#424846] text-right">
                        {formatPercentage(detail.porcentaje)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-sm font-medium text-gray-900">Total</td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                      {totalShares.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">100.00%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
