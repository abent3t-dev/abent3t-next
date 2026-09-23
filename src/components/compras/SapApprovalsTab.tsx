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
  SAP_APPROVAL_LINE_LABELS,
  SAP_APPROVAL_STATUS_CLASSES,
  SAP_APPROVAL_STATUS_LABELS,
  SapApprovalRequest,
  SapSummary,
} from '@/types/purchases';
import ResultChips from './ResultChips';

/**
 * Sprint 2026-09-22 (B5) — "Pendientes de autorización (SAP)": la cola de
 * autorización del ERP (ApprovalRequests + borrador), SOLO LECTURA — aprobar
 * se sigue haciendo en SAP. Esto es lo que Ingrid ve en su "Informe status
 * de autorización" y que antes no aparecía en la plataforma.
 */

const PAGE_SIZE = 15;

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount === null) return '—';
  try {
    return new Intl.NumberFormat(
      'es-MX',
      currency ? { style: 'currency', currency } : { minimumFractionDigits: 2 },
    ).format(amount);
  } catch {
    return `${amount.toLocaleString('es-MX')} ${currency ?? ''}`.trim();
  }
};

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const KIND_LABELS: Record<SapApprovalRequest['document_kind'], string> = {
  purchase_order: 'Orden de compra',
  purchase_request: 'Solicitud de pedido',
  other: 'Otro documento',
};

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

export default function SapApprovalsTab() {
  const { hasRole } = useAuth();
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const listQs = toQuery({ page, limit: PAGE_SIZE, status, kind, search });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sap-approval-requests', listQs],
    queryFn: () => api.get<PaginatedResponse<SapApprovalRequest>>(`/sap/approval-requests?${listQs}`),
  });
  const summaryQ = useQuery({
    queryKey: ['sap', 'summary'],
    queryFn: () => api.get<SapSummary>('/sap/summary'),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const canSeeIntegrations = hasRole(...PURCHASE_ADMIN_ROLES, 'executive');
  const pending = summaryQ.data?.approvalRequests.pending;
  const total = summaryQ.data?.approvalRequests.total;

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <p className="text-sm text-gray-600">
          Cola de autorización de <strong>SAP Business One</strong> (solo lectura: se autoriza en SAP).
          {pending !== undefined && (
            <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              {pending} pendientes
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por descripción, solicitante, proveedor o número..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="pending">Pendientes</option>
            <option value="approved">Autorizadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="all">Todas</option>
          </select>
          <select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Todo tipo</option>
            <option value="purchase_request">Solicitudes de pedido</option>
            <option value="purchase_order">Órdenes de compra</option>
          </select>
        </div>
        <ResultChips filteredTotal={meta?.total} grandTotal={status === 'all' ? total : undefined} loading={isLoading} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isError ? (
          <p className="p-8 text-center text-red-600">No se pudo cargar la cola de autorización de SAP. Intenta de nuevo.</p>
        ) : isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : rows.length === 0 && !search && !kind && status === 'pending' && (total ?? 0) === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">Aún no se ha sincronizado la cola de autorización desde SAP</p>
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
                    <th className="px-2.5 py-3 text-left text-xs font-medium text-white uppercase">Documento</th>
                    <th className="px-2.5 py-3 text-left text-xs font-medium text-white uppercase">Descripción</th>
                    <th className="px-2.5 py-3 text-left text-xs font-medium text-white uppercase">Solicitante</th>
                    <th className="px-2.5 py-3 text-right text-xs font-medium text-white uppercase">Monto</th>
                    <th className="px-2.5 py-3 text-left text-xs font-medium text-white uppercase">Etapa</th>
                    <th className="px-2.5 py-3 text-left text-xs font-medium text-white uppercase">Aprobadores</th>
                    <th className="px-2.5 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                    <th className="px-2.5 py-3 text-center text-xs font-medium text-white uppercase">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((r, idx) => (
                    <tr
                      key={r.id}
                      onClick={() => setExpanded(expanded === r.code ? null : r.code)}
                      className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-2.5 py-3">
                        <p className="font-mono font-medium text-[#222D59]">{dash(r.doc_num)}</p>
                        <p className="text-xs text-gray-500">{KIND_LABELS[r.document_kind]}{r.is_draft ? ' · borrador' : ''}</p>
                      </td>
                      <td className="px-2.5 py-3 text-sm text-gray-900 max-w-44">
                        <p className="truncate" title={r.remarks ?? undefined}>{dash(r.remarks)}</p>
                        {r.card_name && <p className="text-xs text-gray-500 truncate">{r.card_name}</p>}
                        {r.template_name && <p className="text-xs text-gray-500 truncate">{r.template_name}</p>}
                      </td>
                      <td className="px-2.5 py-3 text-sm text-gray-900">{dash(r.requester_name ?? r.originator_name)}</td>
                      <td className="px-2.5 py-3 text-sm text-gray-900 text-right font-medium">{formatMoney(r.doc_total, r.currency)}</td>
                      <td className="px-2.5 py-3 text-sm text-gray-600">{dash(r.current_stage_name)}</td>
                      <td className="px-2.5 py-3 text-sm text-gray-600">
                        <div className="flex flex-wrap gap-1">
                          {r.approvers.length === 0 && <span className="text-gray-400">—</span>}
                          {r.approvers.map((a, i) => (
                            <span
                              key={i}
                              title={`${a.stage_name ?? ''} · ${SAP_APPROVAL_LINE_LABELS[a.status ?? ''] ?? a.status ?? ''}${a.update_date ? ` · ${formatDate(a.update_date)}` : ''}`}
                              className={`inline-flex px-2 py-0.5 text-xs leading-tight rounded-md ${
                                a.status === 'ardApproved'
                                  ? 'bg-green-100 text-green-800'
                                  : a.status === 'ardNotApproved'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-50 text-yellow-800'
                              }`}
                            >
                              {a.user_name ?? `Usuario ${a.user_id ?? '?'}`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2.5 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${SAP_APPROVAL_STATUS_CLASSES[r.status ?? ''] ?? 'bg-gray-100 text-gray-700'}`}>
                          {SAP_APPROVAL_STATUS_LABELS[r.status ?? ''] ?? dash(r.status)}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 text-center text-sm text-gray-600">
                        {formatDate(r.creation_date)}
                        {r.days_waiting !== null && <p className={`text-xs whitespace-nowrap ${r.days_waiting >= 7 ? 'font-medium text-red-600' : 'text-gray-500'}`}>{r.days_waiting} {r.days_waiting === 1 ? 'día' : 'días'}</p>}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No hay solicitudes de autorización que coincidan con los filtros
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
    </div>
  );
}
