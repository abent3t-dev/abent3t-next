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
  SAP_STATUS_OPTIONS,
  SapPurchaseOrder,
  SapSummary,
  sapDocStatus,
  sapStatusBadgeClass,
  sapStatusLabel,
} from '@/types/purchases';
import SapDocDetailModal from './SapDocDetailModal';
import ResultChips from './ResultChips';
import StatusMultiSelect from './StatusMultiSelect';
import ExportExcelButton from './ExportExcelButton';

/**
 * Fase INT-4 (T6) — Pestana "Ordenes SAP" dentro de /compras/ordenes.
 * Lista el staging (GET /sap/purchase-orders). Solo lectura. Los campos de
 * clasificacion/ahorro sin capturar en el ERP se muestran como "Sin
 * clasificar" / "No disponible", nunca 0.
 *
 * Sprint 2026-09-22: estatus derivado con Cancelada (A6), filtro multi
 * (A5), chips de totales (A4), export Excel (B1) y filtro inicial desde la
 * URL (clic en un pie del dashboard, A2).
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

export default function SapOrdersTab({ initialStatus = [] }: { initialStatus?: string[] }) {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>(initialStatus);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [detailDocEntry, setDetailDocEntry] = useState<number | null>(null);

  const filterQs = toQuery({ search, status: statuses, from, to });
  const listQs = toQuery({ page, limit: PAGE_SIZE, search, status: statuses, from, to });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sap-purchase-orders', listQs],
    queryFn: () => api.get<PaginatedResponse<SapPurchaseOrder>>(`/sap/purchase-orders?${listQs}`),
  });
  const summaryQ = useQuery({
    queryKey: ['sap', 'summary'],
    queryFn: () => api.get<SapSummary>('/sap/summary'),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || statuses.length > 0 || !!from || !!to;
  const canSeeIntegrations = hasRole(...PURCHASE_ADMIN_ROLES, 'executive');
  const summary = summaryQ.data?.purchaseOrders;
  const chips = SAP_STATUS_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    count: summary?.byStatus.find((s) => s.status === opt.value)?.count ?? 0,
    className: sapStatusBadgeClass(opt.value),
  }));

  const toggleStatus = (key: string) => {
    setStatuses(statuses.includes(key) ? statuses.filter((s) => s !== key) : [...statuses, key]);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por numero o proveedor..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
          <StatusMultiSelect
            options={SAP_STATUS_OPTIONS}
            value={statuses}
            onChange={(next) => { setStatuses(next); setPage(1); }}
          />
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            title="Fecha documento desde"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            title="Fecha documento hasta"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900"
          />
          <ExportExcelButton
            path={`/sap/purchase-orders/export${filterQs ? `?${filterQs}` : ''}`}
            filename={`ordenes_sap_${new Date().toISOString().slice(0, 10)}.xlsx`}
            disabled={isLoading || orders.length === 0}
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

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isError ? (
          <p className="p-8 text-center text-red-600">
            No se pudieron cargar los datos de SAP. Intenta de nuevo más tarde.
          </p>
        ) : isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 && !hasFilters ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">Aun no hay ordenes sincronizadas desde SAP</p>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Numero</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">F. Documento</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">F. Entrega</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Clasif. lineas</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Ahorro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((po, idx) => {
                    const status = sapDocStatus(po);
                    return (
                      <tr
                        key={po.id}
                        onClick={() => setDetailDocEntry(po.doc_entry)}
                        className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-[#222D59]">{dash(po.doc_num)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-64 truncate">{dash(po.card_name)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${sapStatusBadgeClass(status)}`}>
                            {sapStatusLabel(status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {formatMoney(po.doc_total, po.currency)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{formatDate(po.doc_date)}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{formatDate(po.doc_due_date)}</td>
                        <td className="px-4 py-3 text-center text-sm">
                          {po.lines_total === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : po.lines_classified === 0 ? (
                            <span className="text-gray-400 italic">Sin clasificar</span>
                          ) : (
                            <span className="text-gray-700">{po.lines_classified}/{po.lines_total}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {po.ahorro_total === null ? (
                            <span className="text-gray-400 italic">No disponible</span>
                          ) : (
                            <span className="text-gray-700">{formatMoney(po.ahorro_total, po.currency)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No hay ordenes de SAP que coincidan con los filtros
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

      <SapDocDetailModal
        key={detailDocEntry ?? 'closed'}
        isOpen={detailDocEntry !== null}
        onClose={() => setDetailDocEntry(null)}
        docEntry={detailDocEntry}
        entity="purchase-orders"
      />
    </div>
  );
}
