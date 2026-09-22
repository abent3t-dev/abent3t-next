'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_ADMIN_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import SapIntegrationSection from '@/components/compras/SapIntegrationSection';
import {
  MAXIMO_RUN_STATUS_CLASSES,
  MAXIMO_RUN_STATUS_LABELS,
  MAXIMO_TARGET_LABELS,
  MAXIMO_TRIGGER_LABELS,
  MaximoSyncRun,
  MaximoSyncStatus,
  MaximoSyncTarget,
} from '@/types/purchases';

/**
 * Fase INT-5 — Pagina tecnica de la integracion Maximo: estado del sync,
 * historial de corridas y disparo manual. Consume los endpoints de Int-3
 * (/integrations/maximo/*) tal cual; no re-implementa nada.
 * Acceso: PURCHASE_ADMINS + executive (el boton de sincronizar, solo admins).
 */

interface TriggerResponse {
  accepted: boolean;
  runs: Array<{ target: MaximoSyncTarget; run_id: string }>;
  skipped: Array<{ target: MaximoSyncTarget; reason: string }>;
  conflicts: Array<{ target: MaximoSyncTarget; message?: string }>;
}

const RUNS_PAGE_SIZE = 10;
const REFRESH_MS = 15_000;

const formatDateTime = (date: string | null) =>
  date
    ? new Date(date).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const formatDuration = (start: string, end: string | null) => {
  if (!end) return '—';
  const seconds = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 1000,
  );
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

function RunBadge({ status }: { status: MaximoSyncRun['status'] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${MAXIMO_RUN_STATUS_CLASSES[status]}`}>
      {status === 'running' && (
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
      )}
      {MAXIMO_RUN_STATUS_LABELS[status]}
    </span>
  );
}

export default function IntegracionesPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole(...PURCHASE_ADMIN_ROLES);

  const [target, setTarget] = useState<'all' | MaximoSyncTarget>('all');
  const [triggering, setTriggering] = useState(false);
  const [runsPage, setRunsPage] = useState(1);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['maximo-sync-status'],
    queryFn: () => api.get<MaximoSyncStatus>('/integrations/maximo/status'),
    refetchInterval: (query) =>
      query.state.data?.running.length ? REFRESH_MS : false,
  });

  const runsQuery = useQuery({
    queryKey: ['maximo-sync-runs', runsPage],
    queryFn: () =>
      api.get<PaginatedResponse<MaximoSyncRun>>(
        `/integrations/maximo/runs?page=${runsPage}&limit=${RUNS_PAGE_SIZE}`,
      ),
    // Auto-refresh cada 15 s mientras haya corridas en curso
    refetchInterval: (query) =>
      query.state.data?.data.some((run) => run.status === 'running')
        ? REFRESH_MS
        : false,
  });

  const status = statusQuery.data;
  const runs = runsQuery.data?.data ?? [];
  const runsMeta = runsQuery.data?.meta;
  const enabled = status?.enabled ?? false;

  const triggerSync = async () => {
    setTriggering(true);
    try {
      const body = target === 'all' ? {} : { target };
      const res = await api.post<TriggerResponse>(
        '/integrations/maximo/sync',
        body,
      );
      if (res.runs.length > 0) {
        notify.success(
          `Sincronizacion aceptada: ${res.runs.map((r) => MAXIMO_TARGET_LABELS[r.target]).join(', ')}`,
        );
      }
      for (const skipped of res.skipped) {
        notify.info(
          `${MAXIMO_TARGET_LABELS[skipped.target]} omitido: ${skipped.reason}`,
        );
      }
      for (const conflict of res.conflicts) {
        notify.info(
          `${MAXIMO_TARGET_LABELS[conflict.target]}: ya hay una corrida en curso`,
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        notify.error('Ya hay una corrida en curso para ese objetivo');
      } else if (err instanceof ApiError && err.status === 503) {
        notify.info(
          'Sincronizacion pendiente de activacion (configuracion del servidor)',
        );
      } else {
        notify.error(err instanceof Error ? err.message : 'Error al sincronizar');
      }
    } finally {
      setTriggering(false);
      void queryClient.invalidateQueries({ queryKey: ['maximo-sync-status'] });
      void queryClient.invalidateQueries({ queryKey: ['maximo-sync-runs'] });
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Integraciones</h1>
          <p className="text-gray-500">
            Sincronizacion de datos desde IBM Maximo y SAP Business One (solo
            lectura hacia los ERP)
          </p>
        </div>
      </div>

      {/* Banner: sync pendiente de activacion (no es error) */}
      {status && !enabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            Sincronizacion de Maximo pendiente de activacion (configuracion del
            servidor). Los datos apareceran aqui en cuanto se habilite.
          </p>
        </div>
      )}

      {/* Seccion IBM Maximo */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-[#424846]">
            IBM Maximo — estado de la sincronizacion
          </h3>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as 'all' | MaximoSyncTarget)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
              >
                <option value="all">Todo</option>
                <option value="purchase_orders">Ordenes (PO)</option>
                <option value="contracts">Contratos</option>
              </select>
              <button
                onClick={() => void triggerSync()}
                disabled={!enabled || triggering}
                title={
                  enabled
                    ? 'Disparar sincronizacion manual'
                    : 'Sincronizacion pendiente de activacion (configuracion del servidor)'
                }
                className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {triggering ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
            </div>
          )}
        </div>
        {statusQuery.isLoading || !status ? (
          <div className="p-4 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Habilitada</p>
              <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${status.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                {status.enabled ? 'Si' : 'No'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Contratos</p>
              <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${status.contractsEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                {status.contractsEnabled ? 'Habilitados' : 'Deshabilitados'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Intervalo</p>
              <p className="text-sm text-gray-900">cada {status.intervalMinutes} min</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Tamano de pagina</p>
              <p className="text-sm text-gray-900">{status.pageSize} registros</p>
            </div>
            {(['purchase_orders', 'contracts'] as const).map((t) => {
              const lastRun = status.lastRuns[t];
              return (
                <div key={t} className="md:col-span-2 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-[#424846]">
                      {MAXIMO_TARGET_LABELS[t]}
                    </p>
                    <div className="flex items-center gap-2">
                      {status.running.includes(t) && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          En curso
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {status.counts[t]} registros sincronizados
                      </span>
                    </div>
                  </div>
                  {lastRun ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                      <RunBadge status={lastRun.status} />
                      <span>{formatDateTime(lastRun.started_at)}</span>
                      <span className="text-xs text-gray-400">
                        +{lastRun.records_inserted} / ~{lastRun.records_updated} /
                        ={lastRun.records_unchanged} / !{lastRun.records_failed}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Sin corridas registradas</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabla de corridas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#424846]">
            Historial de corridas — Maximo
          </h3>
        </div>
        {runsQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : runs.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">
            Aun no hay corridas de sincronizacion
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Objetivo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Disparo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Inicio</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Duracion</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase" title="descargados / insertados / actualizados / sin cambio / fallidos">Registros</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {runs.map((run, idx) => {
                    const hasDetail =
                      !!run.error_summary || run.filter_warnings != null;
                    const expanded = expandedRunId === run.id;
                    return (
                      <RunRow
                        key={run.id}
                        run={run}
                        idx={idx}
                        expanded={expanded}
                        hasDetail={hasDetail}
                        onToggle={() =>
                          setExpandedRunId(expanded ? null : run.id)
                        }
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            {runsMeta && runsMeta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  Pagina {runsMeta.page} de {runsMeta.totalPages} ({runsMeta.total} corridas)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRunsPage(runsPage - 1)}
                    disabled={!runsMeta.hasPrev}
                    className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setRunsPage(runsPage + 1)}
                    disabled={!runsMeta.hasNext}
                    className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Seccion SAP Business One (Int-4) */}
      <SapIntegrationSection />
    </div>
  );
}

function RunRow({
  run,
  idx,
  expanded,
  hasDetail,
  onToggle,
}: {
  run: MaximoSyncRun;
  idx: number;
  expanded: boolean;
  hasDetail: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
        <td className="px-4 py-3 text-sm text-gray-900">
          {MAXIMO_TARGET_LABELS[run.target]}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {MAXIMO_TRIGGER_LABELS[run.triggered_by]}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {formatDateTime(run.started_at)}
        </td>
        <td className="px-4 py-3 text-center text-sm text-gray-600">
          {formatDuration(run.started_at, run.finished_at)}
        </td>
        <td className="px-4 py-3 text-center">
          <RunBadge status={run.status} />
        </td>
        <td className="px-4 py-3 text-center text-sm text-gray-600 font-mono whitespace-nowrap">
          {run.records_fetched} / +{run.records_inserted} / ~{run.records_updated} / ={run.records_unchanged} / !{run.records_failed}
        </td>
        <td className="px-4 py-3 text-center">
          {hasDetail && (
            <button
              onClick={onToggle}
              className="text-sm text-[#52AF32] hover:underline"
            >
              {expanded ? 'Ocultar' : 'Ver'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-amber-50/50">
          <td colSpan={7} className="px-6 py-3 space-y-2">
            {run.error_summary && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Errores</p>
                <p className="text-sm text-red-700 whitespace-pre-wrap">{run.error_summary}</p>
              </div>
            )}
            {run.filter_warnings != null && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Advertencias de filtro</p>
                <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded p-2 overflow-x-auto">
                  {JSON.stringify(run.filter_warnings, null, 2)}
                </pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
