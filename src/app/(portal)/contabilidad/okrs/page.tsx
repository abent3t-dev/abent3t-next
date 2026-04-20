'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  AccountingOkr,
  OkrStatus,
  OKR_STATUS_LABELS,
  OKR_STATUS_COLORS,
} from '@/types/accounting';

export default function OkrsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Q2-2026');

  // TODO: Conectar con endpoint real
  const { data: okrs = [], isLoading } = useQuery({
    queryKey: ['contabilidad', 'okrs', selectedPeriod],
    queryFn: async () => {
      // Mock data mientras se implementa el backend
      return [
        {
          id: '1',
          titulo: 'Mejorar compliance fiscal',
          descripcion: 'Alcanzar 98% de conciliacion SAP-SAT',
          periodo: 'Q2-2026',
          tipo: 'objective' as const,
          parent_okr_id: null,
          target_value: 98,
          current_value: 94.5,
          unit: '%',
          status: 'on_track' as OkrStatus,
          due_date: '2026-06-30',
          created_by: null,
          is_active: true,
          created_at: '2026-04-01',
          updated_at: '2026-04-15',
          key_results: [
            {
              id: '1a',
              titulo: 'Reducir diferencias de monto a menos de 5',
              descripcion: null,
              periodo: 'Q2-2026',
              tipo: 'key_result' as const,
              parent_okr_id: '1',
              target_value: 5,
              current_value: 8,
              unit: 'registros',
              status: 'at_risk' as OkrStatus,
              due_date: '2026-06-30',
              created_by: null,
              is_active: true,
              created_at: '2026-04-01',
              updated_at: '2026-04-15',
            },
            {
              id: '1b',
              titulo: 'Eliminar registros "solo en SAP"',
              descripcion: null,
              periodo: 'Q2-2026',
              tipo: 'key_result' as const,
              parent_okr_id: '1',
              target_value: 0,
              current_value: 3,
              unit: 'registros',
              status: 'on_track' as OkrStatus,
              due_date: '2026-06-30',
              created_by: null,
              is_active: true,
              created_at: '2026-04-01',
              updated_at: '2026-04-15',
            },
          ],
        },
        {
          id: '2',
          titulo: 'Automatizar reportes financieros',
          descripcion: 'Eliminar generacion manual de reportes mensuales',
          periodo: 'Q2-2026',
          tipo: 'objective' as const,
          parent_okr_id: null,
          target_value: 100,
          current_value: 60,
          unit: '%',
          status: 'on_track' as OkrStatus,
          due_date: '2026-06-30',
          created_by: null,
          is_active: true,
          created_at: '2026-04-01',
          updated_at: '2026-04-15',
          key_results: [
            {
              id: '2a',
              titulo: 'Conectar SAP B1 para EBITDA automatico',
              descripcion: null,
              periodo: 'Q2-2026',
              tipo: 'key_result' as const,
              parent_okr_id: '2',
              target_value: 100,
              current_value: 0,
              unit: '%',
              status: 'behind' as OkrStatus,
              due_date: '2026-05-31',
              created_by: null,
              is_active: true,
              created_at: '2026-04-01',
              updated_at: '2026-04-15',
            },
          ],
        },
      ] as (AccountingOkr & { key_results?: AccountingOkr[] })[];
    },
  });

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 100;
    return Math.min(100, (current / target) * 100);
  };

  const getProgressColor = (status: OkrStatus) => {
    switch (status) {
      case 'on_track': return 'bg-green-500';
      case 'at_risk': return 'bg-yellow-500';
      case 'behind': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">OKRs del Area</h1>
          <p className="text-gray-500">Objetivos y resultados clave de Contabilidad y Fiscal</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
          >
            <option value="Q1-2026">Q1 2026</option>
            <option value="Q2-2026">Q2 2026</option>
            <option value="Q3-2026">Q3 2026</option>
            <option value="Q4-2026">Q4 2026</option>
          </select>
          <button className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Objetivo
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {okrs.map((objective) => (
            <div key={objective.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Objective Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-[#424846]">{objective.titulo}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${OKR_STATUS_COLORS[objective.status]}`}>
                        {OKR_STATUS_LABELS[objective.status]}
                      </span>
                    </div>
                    {objective.descripcion && (
                      <p className="mt-1 text-gray-500">{objective.descripcion}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#424846]">
                      {objective.current_value}{objective.unit}
                    </p>
                    <p className="text-sm text-gray-500">
                      de {objective.target_value}{objective.unit}
                    </p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(objective.status)} transition-all duration-500`}
                      style={{ width: `${calculateProgress(objective.current_value, objective.target_value || 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Key Results */}
              {objective.key_results && objective.key_results.length > 0 && (
                <div className="px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Key Results</h4>
                  <div className="space-y-4">
                    {objective.key_results.map((kr) => (
                      <div key={kr.id} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-700">{kr.titulo}</span>
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${OKR_STATUS_COLORS[kr.status]}`}>
                              {OKR_STATUS_LABELS[kr.status]}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getProgressColor(kr.status)}`}
                              style={{ width: `${calculateProgress(kr.current_value, kr.target_value || 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <span className="font-medium text-[#424846]">{kr.current_value}</span>
                          <span className="text-gray-500"> / {kr.target_value} {kr.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
