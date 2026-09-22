'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toQuery } from '@/lib/compras-format';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_ADMIN_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  MAXIMO_STATUS_BADGE_CLASSES,
  MaximoContract,
  MaximoSummary,
  maximoStatusBadgeClass,
  maximoStatusLabel,
} from '@/types/purchases';
import MaximoContractDetailModal from './MaximoContractDetailModal';
import ResultChips from './ResultChips';
import StatusMultiSelect from './StatusMultiSelect';
import ExportExcelButton from './ExportExcelButton';

/**
 * Sprint 2026-09-22 (A7) — Pestana "Solicitudes Maximo" en /compras/solicitudes.
 * Las filas de `maximo_contracts` tienen como raiz la PR (prnum, estatus,
 * fecha WAPPR = solicitud, fecha APPR = aprobacion, depto, contrato si ya lo
 * tiene), asi que GET /maximo/contracts ya sirve como listado de solicitudes.
 * Solo lectura; los dias se calculan aprobacion − solicitud (null = N/D).
 */

const PAGE_SIZE = 15;

const STATUS_OPTIONS = Object.keys(MAXIMO_STATUS_BADGE_CLASSES).map((value) => ({
  value,
  label: `${maximoStatusLabel(value)} (${value})`,
}));

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const daysBetween = (from: string | null, to: string | null): number | null => {
  if (!from || !to) return null;
  const d = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
  return d < 0 ? null : d;
};

export default function MaximoRequestsTab({ initialStatus = [] }: { initialStatus?: string[] }) {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>(initialStatus);
  const [page, setPage] = useState(1);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const filters = { search, status: statuses };
  const filterQs = toQuery(filters);
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...filters });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maximo-requests', listQs],
    queryFn: () => api.get<PaginatedResponse<MaximoContract>>(`/maximo/contracts?${listQs}`),
  });
  const summaryQ = useQuery({
    queryKey: ['maximo', 'summary'],
    queryFn: () => api.get<MaximoSummary>('/maximo/summary'),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || statuses.length > 0;
  const canSeeIntegrations = hasRole(...PURCHASE_ADMIN_ROLES, 'executive');
  const summary = summaryQ.data?.contracts;
  const chips = (summary?.byStatus ?? [])
    .filter((s) => s.status !== null)
    .map((s) => ({
      key: s.status as string,
      label: maximoStatusLabel(s.status),
      count: s.count,
      className: maximoStatusBadgeClass(s.status),
    }));
  const toggleStatus = (key: string) => {
    setStatuses(statuses.includes(key) ? statuses.filter((s) => s !== key) : [...statuses, key]);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por PR, contrato o proveedor..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
          <StatusMultiSelect
            options={STATUS_OPTIONS}
            value={statuses}
            onChange={(next) => { setStatuses(next); setPage(1); }}
          />
          <ExportExcelButton
            path={`/maximo/contracts/export${filterQs ? `?${filterQs}` : ''}`}
            filename={`solicitudes_maximo_${new Date().toISOString().slice(0, 10)}.xlsx`}
            disabled={isLoading || rows.length === 0}
          />
        </div>
        <ResultChips
          filteredTotal={meta?.total}
          grandTotal={summary?.total}
          statuses={chips}
          activeStatuses={statuses}
          onToggleStatus={toggleStatus}
          loading={isLoading}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-600">
            No se pudieron cargar las solicitudes de Maximo. Intenta de nuevo.
          </div>
        ) : rows.length === 0 && !hasFilters ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">Aun no hay solicitudes sincronizadas desde Maximo</p>
            {canSeeIntegrations && (
              <Link href="/compras/integraciones" className="text-sm text-[#52AF32] hover:underline">
                Ver estado de la integracion
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">PR</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">F. Solicitud</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">F. Aprobacion</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Dias</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Solicitado por</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Depto.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Contrato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((pr, idx) => {
                    const key = pr.prnum ?? pr.contractnum;
                    const days = daysBetween(pr.created_at_source, pr.approved_at);
                    return (
                      <tr
                        key={pr.id}
                        onClick={() => key && setDetailKey(key)}
                        className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-[#222D59]">{dash(pr.prnum)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${maximoStatusBadgeClass(pr.status)}`}
                            title={pr.status ?? undefined}
                          >
                            {maximoStatusLabel(pr.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{formatDate(pr.created_at_source)}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{formatDate(pr.approved_at)}</td>
                        <td className="px-4 py-3 text-center text-sm">
                          {days === null ? (
                            <span className="text-gray-400 italic" title="Sin fecha de solicitud o de aprobacion en Maximo">N/D</span>
                          ) : (
                            <span className="text-gray-700">{days}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{dash(pr.requested_by)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{dash(pr.department)}</td>
                        <td className="px-4 py-3 text-sm">
                          {pr.has_contract ? (
                            <span className="font-mono text-gray-900">{dash(pr.contractnum)}</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Sin contrato</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No hay solicitudes de Maximo que coincidan con los filtros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  Mostrando {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(page - 1)} disabled={!meta.hasPrev} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                  <span className="text-sm text-gray-700">Pagina {meta.page} de {meta.totalPages}</span>
                  <button onClick={() => setPage(page + 1)} disabled={!meta.hasNext} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <MaximoContractDetailModal
        isOpen={detailKey !== null}
        onClose={() => setDetailKey(null)}
        contractKey={detailKey}
      />
    </div>
  );
}
