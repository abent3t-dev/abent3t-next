'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_ADMIN_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  MAXIMO_RUN_STATUS_CLASSES,
  MAXIMO_RUN_STATUS_LABELS,
  SAP_RUN_MODE_LABELS,
  SAP_TARGET_LABELS,
  SapSyncRun,
  SapSyncStatus,
  SapSyncTarget,
} from '@/types/purchases';

/**
 * Fase INT-4 — Seccion SAP de /compras/integraciones: estado del sync,
 * historial de corridas y disparo manual (full/incremental). Consume los
 * endpoints /integrations/sap/* tal cual. Mismo layout que la seccion
 * Maximo (los estados de corrida comparten etiquetas y colores).
 * Acceso: la pagina ya restringe a PURCHASE_ADMINS + executive; el boton
 * de sincronizar, solo admins.
 */

interface SapTriggerResponse {
  accepted: boolean;
  runs: Array<{ target: SapSyncTarget; run_id: string }>;
  conflicts: Array<{ target: SapSyncTarget; reason: string }>;
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

function RunBadge({ status }: { status: SapSyncRun['status'] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${MAXIMO_RUN_STATUS_CLASSES[status]}`}>
      {status === 'running' && (
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
      )}
      {MAXIMO_RUN_STATUS_LABELS[status]}
    </span>
  );
}

export default function SapIntegrationSection() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole(...PURCHASE_ADMIN_ROLES);

  const [target, setTarget] = useState<'all' | SapSyncTarget>('all');
  const [mode, setMode] = useState<'auto' | 'full' | 'incremental'>('auto');
  const [triggering, setTriggering] = useState(false);
  const [runsPage, setRunsPage] = useState(1);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['sap-sync-status'],
    queryFn: () => api.get<SapSyncStatus>('/integrations/sap/status'),
    refetchInterval: (query) =>
      query.state.data?.running.length ? REFRESH_MS : false,
  });

  const runsQuery = useQuery({
    queryKey: ['sap-sync-runs', runsPage],
    queryFn: () =>
      api.get<PaginatedResponse<SapSyncRun>>(
        `/integrations/sap/runs?page=${runsPage}&limit=${RUNS_PAGE_SIZE}`,
      ),
    // El endpoint de corridas es solo para admins: sin el rol ni se consulta
    // (executive veria un 403 pintado como "sin corridas").
    enabled: isAdmin,
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
      const body: Record<string, string> = {};
      if (target !== 'all') body.target = target;
      if (mode !== 'auto') body.mode = mode;
      const res = await api.post<SapTriggerResponse>(
        '/integrations/sap/sync',
        body,
      );
      if (res.runs.length > 0) {
        notify.success(
          `Sincronización SAP aceptada: ${res.runs.map((r) => SAP_TARGET_LABELS[r.target]).join(', ')}`,
        );
      }
      for (const conflict of res.conflicts) {
        notify.info(
          `${SAP_TARGET_LABELS[conflict.target]}: ya hay una corrida en curso`,
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        notify.error('Ya hay una corrida en curso para ese objetivo');
      } else if (err instanceof ApiError && err.status === 503) {
        notify.info(
          'Sincronización de SAP pendiente de activación (configuración del servidor)',
        );
      } else {
        notify.error(err instanceof Error ? err.message : 'Error al sincronizar');
      }
    } finally {
      setTriggering(false);
      void queryClient.invalidateQueries({ queryKey: ['sap-sync-status'] });
      void queryClient.invalidateQueries({ queryKey: ['sap-sync-runs'] });
      // Los datos recien sincronizados deben reflejarse sin recargar:
      void queryClient.invalidateQueries({ queryKey: ['sap-purchase-orders'] });
      void queryClient.invalidateQueries({
        queryKey: ['sap-purchase-requests'],
      });
      void queryClient.invalidateQueries({ queryKey: ['sap', 'summary'] });
    }
  };

  return (
    <>
      {/* Banner: sync pendiente de activacion (no es error) */}
      {status && !enabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            Sincronización de SAP pendiente de activación (configuración del
            servidor). Los datos aparecerán aquí en cuanto se habilite.
          </p>
        </div>
      )}

      {/* Tarjeta de estado */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-[#424846]">
            SAP Business One — estado de la sincronización
          </h3>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as 'all' | SapSyncTarget)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
              >
                <option value="all">Todo</option>
                <option value="purchase_orders">{SAP_TARGET_LABELS.purchase_orders}</option>
                <option value="purchase_requests">Solicitudes de Pedido</option>
                <option value="business_partners">Proveedores</option>
                <option value="approval_requests">Cola de autorización</option>
              </select>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'auto' | 'full' | 'incremental')}
                title="auto = incremental si ya hay datos"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
              >
                <option value="auto">Modo automático</option>
                <option value="incremental">Incremental</option>
                <option value="full">Completa</option>
              </select>
              <button
                onClick={() => void triggerSync()}
                disabled={!enabled || triggering}
                title={
                  enabled
                    ? 'Disparar sincronización manual'
                    : 'Sincronización pendiente de activación (configuración del servidor)'
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
                {status.enabled ? 'Sí' : 'No'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Intervalo</p>
              <p className="text-sm text-gray-900">cada {status.intervalMinutes} min</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 uppercase">Tamaño de página</p>
              <p className="text-sm text-gray-900">{status.pageSize} documentos</p>
            </div>
            {(
              ['purchase_orders', 'purchase_requests', 'business_partners', 'approval_requests'] as const
            ).map((t) => {
              const lastRun = status.lastRuns[t];
              return (
                <div key={t} className="md:col-span-2 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-[#424846]">
                      {SAP_TARGET_LABELS[t]}
                    </p>
                    <div className="flex items-center gap-2">
                      {status.running.includes(t) && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          En curso
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {status.counts[t].toLocaleString('es-MX')} registros sincronizados
                      </span>
                    </div>
                  </div>
                  {lastRun ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                      <RunBadge status={lastRun.status} />
                      <span className="text-xs text-gray-500">
                        {SAP_RUN_MODE_LABELS[lastRun.mode]}
                      </span>
                      <span>{formatDateTime(lastRun.started_at)}</span>
                      <span
                        className="text-xs text-gray-500"
                        title="insertados / actualizados / sin cambio / fallidos"
                      >
                        +{lastRun.records_inserted} / ~{lastRun.records_updated} /
                        ={lastRun.records_unchanged} / !{lastRun.records_failed}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sin corridas registradas</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de corridas (endpoint solo admins) */}
      {isAdmin && (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#424846]">
            Historial de corridas — SAP
          </h3>
        </div>
        {runsQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : runs.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">
            Aún no hay corridas de sincronización
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase">Objetivo</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase">Disparo</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase">Modo</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase">Inicio</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase">Duración</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase">Estado</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase" title="descargados / insertados / actualizados / sin cambio / fallidos">Registros</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-white uppercase">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {runs.map((run, idx) => {
                    const expanded = expandedRunId === run.id;
                    return (
                      <SapRunRow
                        key={run.id}
                        run={run}
                        idx={idx}
                        expanded={expanded}
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
                  Página {runsMeta.page} de {runsMeta.totalPages} ({runsMeta.total} corridas)
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
      )}
    </>
  );
}

function SapRunRow({
  run,
  idx,
  expanded,
  onToggle,
}: {
  run: SapSyncRun;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetail = !!run.error_summary;
  return (
    <>
      <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
        <td className="px-3 py-3 text-sm text-gray-900">
          {SAP_TARGET_LABELS[run.target]}
        </td>
        <td className="px-3 py-3 text-sm text-gray-600">
          {run.triggered_by === 'cron' ? 'Automático' : 'Manual'}
        </td>
        <td className="px-3 py-3 text-center text-sm text-gray-600">
          {SAP_RUN_MODE_LABELS[run.mode]}
        </td>
        <td className="px-3 py-3 text-sm text-gray-600 whitespace-pre">
          {formatDateTime(run.started_at).replace(', ', '\n')}
        </td>
        <td className="px-3 py-3 text-center text-sm text-gray-600">
          {formatDuration(run.started_at, run.finished_at)}
        </td>
        <td className="px-3 py-3 text-center">
          <RunBadge status={run.status} />
        </td>
        <td className="px-3 py-3 text-center text-sm text-gray-600 font-mono whitespace-nowrap">
          {run.records_fetched} / +{run.records_inserted} / ~{run.records_updated} / ={run.records_unchanged} / !{run.records_failed}
        </td>
        <td className="px-3 py-3 text-center">
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
      {expanded && run.error_summary && (
        <tr className="bg-amber-50/50">
          <td colSpan={8} className="px-6 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Errores</p>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{run.error_summary}</p>
          </td>
        </tr>
      )}
    </>
  );
}
