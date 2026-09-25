'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toQuery } from '@/lib/compras-format';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_ADMIN_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  SAP_STATUS_OPTIONS,
  SapPurchaseOrder,
  SapSummary,
  buyerLabel,
  sapDocStatus,
  sapStatusBadgeClass,
  sapStatusLabel,
} from '@/types/purchases';
import SapDocDetailModal from './SapDocDetailModal';
import ResultChips from './ResultChips';
import StatusMultiSelect from './StatusMultiSelect';
import ExportExcelButton from './ExportExcelButton';
import {
  ActiveColumnFilters,
  ColumnFilterProvider,
  FilterTh,
  facetCounts,
  useColumnFacet,
} from '@/components/ui/ColumnFilter';
import { useColumnFilters } from '@/hooks/useColumnFilters';
import type { ColumnConfigs } from '@/lib/column-filters';

/**
 * Fase INT-4 (T6) — Pestana "Ordenes SAP" dentro de /compras/ordenes.
 * Lista el staging (GET /sap/purchase-orders). Solo lectura. Los campos de
 * clasificacion/ahorro sin capturar en el ERP se muestran como "Sin
 * clasificar" / "No disponible", nunca 0.
 *
 * Sprint 2026-09-22: estatus derivado con Cancelada (A6), filtro multi
 * (A5), chips de totales (A4), export Excel (B1) y filtro inicial desde la
 * URL (clic en un pie del dashboard, A2).
 *
 * 2026-09-23 (Ingrid): saldo disponible (lo que falta por recibir/facturar)
 * y solicitante. SAP no trae solicitante en la OC: sale de la solicitud de
 * pedido de la que nació; las OC que crea la integración con Maximo traen
 * el solicitante de Maximo.
 *
 * Bloque 2026-09-23: D1 columna/badge "Origen" (SAP / Migrada de Maximo
 * con su PO) + filtro de origen; D4 año (desde el dashboard o los chips).
 *
 * Pedidos de Ingrid 2026-09-25: E1 filtro "tipo Excel" por columna (URL,
 * chips y Excel con el mismo filtro); E4 columna Comprador — SAP no tiene
 * comprador en ninguna OC: la migrada muestra el de Maximo y las demás
 * "Capturó: …" (antes ese respaldo vivía en Solicitante).
 */

const ORIGIN_OPTIONS: Array<{ value: 'sap' | 'maximo' | ''; label: string }> = [
  { value: '', label: 'Origen: todos' },
  { value: 'sap', label: 'Capturadas en SAP' },
  { value: 'maximo', label: 'Migradas de Maximo' },
];

const ORIGIN_LABELS: Record<string, string> = {
  sap: 'SAP',
  maximo: 'Migrada de Maximo',
  ref: 'Ref. Maximo (no existe allá)',
};

const COLUMNS: ColumnConfigs = {
  numero: { label: 'Número', type: 'text' },
  origen: { label: 'Origen', type: 'text', format: (v) => ORIGIN_LABELS[v] ?? v },
  proveedor: { label: 'Proveedor', type: 'text' },
  solicitante: { label: 'Solicitante', type: 'text', emptyLabel: '(Sin solicitante)' },
  comprador: { label: 'Comprador', type: 'text', emptyLabel: '(Sin comprador)' },
  estatus: { label: 'Estatus', type: 'text', format: sapStatusLabel },
  monto: { label: 'Monto', type: 'number' },
  saldo: { label: 'Saldo disponible', type: 'number' },
  fecha: { label: 'Fecha del documento', type: 'date' },
  entrega: { label: 'Fecha de entrega', type: 'date' },
};

/** D1: badge de origen de la OC. */
function OriginBadge({ po }: { po: SapPurchaseOrder }) {
  if (po.maximo_ponum === null) {
    return <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded bg-[#222D59]/10 text-[#222D59]">SAP</span>;
  }
  const exists = po.maximo_po_exists;
  return (
    <span
      className={`inline-flex flex-col items-start px-2 py-0.5 text-[11px] font-semibold rounded leading-tight ${
        exists ? 'bg-[#DFA922]/20 text-[#8a6a10]' : 'bg-gray-100 text-gray-600'
      }`}
      title={
        exists
          ? `OC creada en SAP por la integración desde Maximo (PO ${po.maximo_ponum}). En los totales combinados se cuenta una sola vez.`
          : `Referencia a Maximo (${po.maximo_ponum}) que no existe en el staging de Maximo: se cuenta como OC de SAP.`
      }
    >
      <span>{exists ? 'Migrada de Maximo' : 'Ref. Maximo'}</span>
      <span className="font-mono font-normal">{po.maximo_ponum}</span>
    </span>
  );
}

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

/** Saldo disponible: una cancelada no tiene; sin calcular = "No disponible". */
function SaldoCell({ po }: { po: SapPurchaseOrder }) {
  if (po.status_key === 'cancelled') return <span className="text-gray-400">—</span>;
  if (po.open_total === null) return <span className="text-gray-400 italic">No disponible</span>;
  if (po.open_total === 0) {
    return <span className="text-gray-400">{formatMoney(0, po.currency)}</span>;
  }
  const pct =
    po.doc_total && po.doc_total > 0 && po.open_total < po.doc_total
      ? Math.round((po.open_total / po.doc_total) * 100)
      : null;
  return (
    <div className="leading-tight">
      <span className="font-medium text-gray-900">{formatMoney(po.open_total, po.currency)}</span>
      {pct !== null && <div className="text-xs text-gray-500">{pct}% del total</div>}
    </div>
  );
}

function RequesterCell({ po }: { po: SapPurchaseOrder }) {
  if (po.requester_names.length > 0) {
    const names = po.requester_names.join(', ');
    return (
      <span className="block max-w-40 truncate text-gray-900" title={names}>
        {names}
      </span>
    );
  }
  if (po.maximo_ponum) {
    return (
      <div className="leading-tight max-w-40" title={`OC creada desde Maximo (${po.maximo_ponum}); solicitante según Maximo`}>
        <span className={`block truncate ${po.maximo_requested_by ? 'text-gray-900' : 'text-gray-500'}`}>
          {po.maximo_requested_by ?? 'Ver en Maximo'}
        </span>
        <span className="block text-xs text-gray-500">según Maximo</span>
      </div>
    );
  }
  return (
    <span className="text-gray-400" title="La OC no nació de una solicitud de pedido de SAP">
      —
    </span>
  );
}

/** E4: comprador de Maximo (migradas) o quién capturó la OC en SAP. */
function BuyerCell({ po }: { po: SapPurchaseOrder }) {
  const label = buyerLabel(po);
  if (!label) {
    return (
      <span className="text-gray-400" title={po.maximo_ponum ? 'La OC de Maximo no trae comprador' : 'Sin dato'}>
        —
      </span>
    );
  }
  if (po.buyer_kind === 'comprador') {
    return (
      <div className="leading-tight max-w-40" title="Comprador de la OC en Maximo">
        <span className="block truncate text-gray-900">{po.buyer_name}</span>
        <span className="block text-xs text-gray-500">según Maximo</span>
      </div>
    );
  }
  // F1: la migrada sin agente de compras en Maximo muestra quién la creó allá
  if (po.maximo_po_exists) {
    return (
      <div className="leading-tight max-w-40" title={`Sin agente de compras en Maximo: creó la OC ${po.buyer_name}`}>
        <span className="block truncate text-gray-500">{label}</span>
        <span className="block text-xs text-gray-500">según Maximo</span>
      </div>
    );
  }
  return (
    <span
      className="block max-w-40 truncate text-gray-500"
      title={`SAP no registra comprador en la OC. Capturó la OC: ${po.buyer_name}`}
    >
      {label}
    </span>
  );
}

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

export default function SapOrdersTab({
  initialStatus = [],
  initialOrigin = '',
  year = null,
}: {
  initialStatus?: string[];
  /** D1: filtro inicial de origen (desde el dashboard). */
  initialOrigin?: 'sap' | 'maximo' | '';
  /** D4: año (lo controla la página de Órdenes). */
  year?: number | null;
}) {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>(initialStatus);
  const [origin, setOrigin] = useState<'sap' | 'maximo' | ''>(initialOrigin);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [detailDocEntry, setDetailDocEntry] = useState<number | null>(null);
  const cf = useColumnFilters('sapPo', () => setPage(1));

  const baseQuery = { search, status: statuses, from, to, origin, year: year ?? undefined };
  const filterQs = toQuery({ ...baseQuery, ...cf.params });
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...baseQuery, ...cf.params });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sap-purchase-orders', listQs],
    queryFn: () => api.get<PaginatedResponse<SapPurchaseOrder>>(`/sap/purchase-orders?${listQs}`),
    // E1: la tabla anterior se queda en pantalla mientras llega la nueva
    placeholderData: keepPreviousData,
  });
  const summaryQ = useQuery({
    queryKey: ['sap', 'summary', year],
    queryFn: () => api.get<SapSummary>(`/sap/summary${year ? `?year=${year}` : ''}`),
  });
  // E1: chips por estatus con los demás filtros (sin el propio estatus)
  const statusFacet = useColumnFacet(
    '/sap/purchase-orders/facets',
    { ...baseQuery, status: undefined, ...cf.params },
    'estatus',
  );
  const statusCounts = facetCounts(statusFacet.data);

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || statuses.length > 0 || !!from || !!to || !!origin || !!year || cf.activeCount > 0;
  const canSeeIntegrations = hasRole(...PURCHASE_ADMIN_ROLES, 'executive');
  const summary = summaryQ.data?.purchaseOrders;
  const chips = SAP_STATUS_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    count: statusCounts.get(opt.value) ?? 0,
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
            placeholder="Número, proveedor o solicitante..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
          <StatusMultiSelect
            options={SAP_STATUS_OPTIONS}
            value={statuses}
            onChange={(next) => { setStatuses(next); setPage(1); }}
          />
          <select
            value={origin}
            onChange={(e) => { setOrigin(e.target.value as 'sap' | 'maximo' | ''); setPage(1); }}
            title="Origen: capturada en SAP o creada por la integración desde Maximo"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-sm text-gray-900 bg-white"
          >
            {ORIGIN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            title="Fecha documento desde"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-sm text-gray-900"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            title="Fecha documento hasta"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-sm text-gray-900"
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
        <ActiveColumnFilters cf={cf} columns={COLUMNS} />
        {summaryQ.data && summaryQ.data.migradas.total > 0 && (
          <p className="text-xs text-gray-600">
            {summaryQ.data.migradas.total.toLocaleString('es-MX')} OC creadas desde Maximo
            {summaryQ.data.migradas.en_maximo < summaryQ.data.migradas.total
              ? ` (${summaryQ.data.migradas.en_maximo.toLocaleString('es-MX')} existen en Maximo; el resto son referencias manuales)`
              : ''}
            . El export con &quot;Migradas de Maximo&quot; sirve como lista de revisión.
          </p>
        )}
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
            <p className="text-gray-500">Aún no hay órdenes sincronizadas desde SAP</p>
            {canSeeIntegrations && (
              <Link href="/compras/integraciones" className="text-sm text-[#52AF32] hover:underline">
                Ver estado de la integración
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <ColumnFilterProvider value={{ cf, columns: COLUMNS, facetsPath: '/sap/purchase-orders/facets', baseQuery }}>
                <table className="w-full">
                  <thead className="bg-[#424846]">
                    <tr>
                      <FilterTh column="numero" className="px-3 py-3">Número</FilterTh>
                      <FilterTh column="origen" className="px-3 py-3" title="SAP: capturada en SAP. Migrada de Maximo: creada por la integración con el PO de Maximo">Origen</FilterTh>
                      <FilterTh column="proveedor" className="px-3 py-3">Proveedor</FilterTh>
                      <FilterTh column="solicitante" className="px-3 py-3">Solicitante</FilterTh>
                      <FilterTh column="comprador" className="px-3 py-3" title="SAP no registra comprador en sus OC: la migrada muestra el de Maximo y las demás quién la capturó">Comprador</FilterTh>
                      <FilterTh column="estatus" align="center" className="px-3 py-3">Estatus</FilterTh>
                      <FilterTh column="monto" align="right" className="px-3 py-3">Monto</FilterTh>
                      <FilterTh column="saldo" align="right" className="px-3 py-3" title="Lo que falta por recibir o facturar de la OC, con IVA">Saldo disponible</FilterTh>
                      <FilterTh column="fecha" align="center" className="px-3 py-3" title="Fecha del documento y, abajo, fecha de entrega">Fechas</FilterTh>
                      {/* En pantallas angostas van al detalle y al Excel (casi todas
                          dicen "Sin clasificar"/"No disponible" mientras avanza la captura) */}
                      <th className="hidden 2xl:table-cell px-3 py-3 text-center text-xs font-medium text-white uppercase">Clasif. líneas</th>
                      <th className="hidden 2xl:table-cell px-3 py-3 text-right text-xs font-medium text-white uppercase">Ahorro</th>
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
                          <td className="px-3 py-3">
                            <span className="font-mono font-medium text-[#222D59]">{dash(po.doc_num)}</span>
                          </td>
                          <td className="px-3 py-3"><OriginBadge po={po} /></td>
                          <td className="px-3 py-3 text-sm text-gray-900 max-w-44 truncate" title={po.card_name ?? undefined}>{dash(po.card_name)}</td>
                          <td className="px-3 py-3 text-sm">
                            <RequesterCell po={po} />
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <BuyerCell po={po} />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${sapStatusBadgeClass(status)}`}>
                              {sapStatusLabel(status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 text-right font-medium whitespace-nowrap">
                            {formatMoney(po.doc_total, po.currency)}
                          </td>
                          <td className="px-3 py-3 text-sm text-right whitespace-nowrap">
                            <SaldoCell po={po} />
                          </td>
                          <td className="px-3 py-3 text-center text-sm whitespace-nowrap leading-tight">
                            <div className="text-gray-700">{formatDate(po.doc_date)}</div>
                            <div className="text-xs text-gray-500">entrega {formatDate(po.doc_due_date)}</div>
                          </td>
                          <td className="hidden 2xl:table-cell px-3 py-3 text-center text-sm whitespace-nowrap">
                            {po.lines_total === 0 ? (
                              <span className="text-gray-400">—</span>
                            ) : po.lines_classified === 0 ? (
                              <span className="text-gray-400 italic">Sin clasificar</span>
                            ) : (
                              <span className="text-gray-700">{po.lines_classified}/{po.lines_total}</span>
                            )}
                          </td>
                          <td className="hidden 2xl:table-cell px-3 py-3 text-sm text-right whitespace-nowrap">
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
                        <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                          No hay órdenes de SAP que coincidan con los filtros
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ColumnFilterProvider>
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  Mostrando {((meta.page - 1) * meta.limit + 1).toLocaleString('es-MX')} - {Math.min(meta.page * meta.limit, meta.total).toLocaleString('es-MX')} de {meta.total.toLocaleString('es-MX')}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(page - 1)} disabled={!meta.hasPrev} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                  <span className="text-sm text-gray-700">Página {meta.page} de {meta.totalPages}</span>
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
