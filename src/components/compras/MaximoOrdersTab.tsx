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
  MAXIMO_STATUS_BADGE_CLASSES,
  MaximoPurchaseOrder,
  MaximoSummary,
  buyerLabel,
  maximoIntegrationBadge,
  maximoIntegrationCodeOf,
  maximoReceiptBadge,
  maximoStatusBadgeClass,
  maximoStatusLabel,
  maximoStatusListLabel,
  maximoStatusTitle,
} from '@/types/purchases';
import MaximoPoDetailModal from './MaximoPoDetailModal';
import ResultChips from './ResultChips';
import LinkedFilterChips, { periodText } from './LinkedFilterChips';
import MaximoSupplierCell from './MaximoSupplierCell';
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
 * Fase INT-5 (T6) — Pestana "Ordenes Maximo" dentro de /compras/ordenes.
 * Lista la vista actual del staging (GET /maximo/purchase-orders). Solo
 * lectura; nulls se muestran como "—" (decision 20.A.1), EXCEPTO los campos
 * AB_* (AB_AHORRO / AB_TIPOCOMP / AB_CLASFPO) sin captura en Maximo: esos
 * van como "No disponible", nunca 0.
 *
 * Sprint 2026-09-22: filtro multi-estatus (A5), chips (A4), export (B1),
 * filtro inicial desde la URL (clic en un pie del dashboard, A2).
 * Bloque 2026-09-23: D4 año; D1 búsqueda inicial por PONUM (link desde la
 * OC de SAP migrada); D6 solicitante con nombre si hay alias.
 * Pedidos de Ingrid 2026-09-25: E1 filtro "tipo Excel" por columna; E4
 * columna Comprador (PURCHASEAGENT con su nombre: alias > Maximo > usuario);
 * F1: sin PURCHASEAGENT (casi todas), "Capturó: …" = quien creó la OC.
 *
 * Reunión con Ingrid 2026-09-28: G1 proveedor EFECTIVO (según SAP si la OC
 * migró o por cruce de código; "en Maximo: …" cuando Maximo lo nombra
 * distinto) y clic desde el top de Reportes (proveedor + periodo); G7
 * estatus en aprobación por nivel (APPRn / APPRnREV) con el código en el
 * tooltip.
 *
 * K7 (2026-10-05): columnas Recepción (RECEIPTS) e Integración SAP (PO5,
 * con la OC de SAP debajo), Subtotal sin IVA (Σ LINECOST; "No disponible"
 * si falta, no se estima) y Total con IVA (TOTALCOST); chips "Integración
 * con SAP" sobre la faceta `integracion`; el buscador también encuentra la
 * PO por la OC de SAP.
 */

const PAGE_SIZE = 15;

const AB_FIELD_HINT = 'Sin captura en Maximo';

const STATUS_OPTIONS = Object.keys(MAXIMO_STATUS_BADGE_CLASSES).map((value) => ({
  value,
  label: `${maximoStatusLabel(value)} (${value})`,
}));

const COLUMNS: ColumnConfigs = {
  // G1: la barra del top de Reportes filtra por moneda (sin encabezado propio)
  moneda: { label: 'Moneda', type: 'text' },
  ponum: { label: 'PONUM', type: 'text' },
  descripcion: { label: 'Descripción', type: 'text' },
  estatus: {
    label: 'Estatus',
    type: 'text',
    format: (v) => `${maximoStatusLabel(v)} (${v})`,
    emptyLabel: 'Sin estatus en Maximo',
  },
  // K7: la API manda las etiquetas de Expeditación ("Completa", "Sin dato"…)
  recepcion: { label: 'Recepción', type: 'text' },
  integracion: { label: 'Integración SAP', type: 'text' },
  // K7: sin encabezado propio (va bajo Integración SAP); el buscador también la encuentra
  oc_sap: { label: 'OC SAP', type: 'text', emptyLabel: '(Sin OC de SAP)' },
  proveedor: { label: 'Proveedor', type: 'text' },
  subtotal: { label: 'Subtotal (sin IVA)', type: 'number' },
  monto: { label: 'Total (con IVA)', type: 'number' },
  solicitante: { label: 'Solicitante', type: 'text', emptyLabel: '(Sin solicitante)' },
  comprador: { label: 'Comprador', type: 'text', emptyLabel: '(Sin comprador)' },
  depto: { label: 'Departamento', type: 'text' },
  clasificacion: { label: 'Clasificación', type: 'text', emptyLabel: 'No disponible' },
  ahorro: { label: 'Ahorro', type: 'number' },
  aprobacion: { label: 'Fecha de aprobación', type: 'date' },
};

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

/** Campos AB_* sin captura en Maximo: null → "No disponible". */
const NotAvailable = ({ title = AB_FIELD_HINT }: { title?: string }) => (
  <span className="text-gray-500 italic whitespace-nowrap" title={title}>
    No disponible
  </span>
);

const SUBTOTAL_MISSING_HINT =
  'Sin subtotal: la OC no trae líneas o alguna no trae LINECOST (no se estima con el total)';

/** K7: badge de recepción (RECEIPTS) de la OC. */
function ReceiptBadge({ status }: { status: string | null }) {
  const badge = maximoReceiptBadge(status);
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${badge.className}`} title={badge.title}>
      {badge.label}
    </span>
  );
}

/** K7: integración con SAP (PO5) y, debajo, la OC que la copió en SAP. */
function IntegrationCell({ po }: { po: MaximoPurchaseOrder }) {
  const badge = maximoIntegrationBadge(po.integration_status);
  return (
    <div className="leading-tight">
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${badge.className}`} title={badge.title}>
        {badge.label}
      </span>
      {po.oc_sap !== null && (
        <span className="block mt-0.5 font-mono text-xs text-[#222D59]" title="OC de SAP que copió esta PO (la de menor número si hay varias)">
          OC {po.oc_sap}
        </span>
      )}
    </div>
  );
}

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

export default function MaximoOrdersTab({
  initialStatus = [],
  initialSearch = '',
  year = null,
  linkedVendor = null,
  initialFrom = '',
  initialTo = '',
}: {
  initialStatus?: string[];
  /** D1: PONUM prefiltrado desde el detalle de una OC de SAP migrada. */
  initialSearch?: string;
  /** D4: año (created_at_source), lo controla la página de Órdenes. */
  year?: number | null;
  /** G1: proveedor efectivo de la barra del top de Reportes. */
  linkedVendor?: { key: string; name: string | null } | null;
  /** G1: periodo del reporte (fecha de la OC en Maximo). */
  initialFrom?: string;
  initialTo?: string;
}) {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState(initialSearch);
  const [statuses, setStatuses] = useState<string[]>(initialStatus);
  const [clasfFilter, setClasfFilter] = useState('');
  const [approvedFrom, setApprovedFrom] = useState('');
  const [approvedTo, setApprovedTo] = useState('');
  const [page, setPage] = useState(1);
  const [detailPonum, setDetailPonum] = useState<string | null>(null);
  const [vendor, setVendor] = useState(linkedVendor);
  const [period, setPeriod] = useState(
    initialFrom || initialTo ? { from: initialFrom, to: initialTo } : null,
  );
  const cf = useColumnFilters('mxPo', () => setPage(1));

  const filters = {
    search,
    status: statuses,
    ab_clasfpo: clasfFilter,
    approved_from: approvedFrom,
    approved_to: approvedTo,
    year: year ?? undefined,
    proveedor: vendor?.key,
    from: period?.from || undefined,
    to: period?.to || undefined,
  };
  const filterQs = toQuery({ ...filters, ...cf.params });
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...filters, ...cf.params });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maximo-purchase-orders', listQs],
    queryFn: () => api.get<PaginatedResponse<MaximoPurchaseOrder>>(`/maximo/purchase-orders?${listQs}`),
    // E1: la tabla anterior se queda en pantalla mientras llega la nueva
    placeholderData: keepPreviousData,
  });
  const summaryQ = useQuery({
    queryKey: ['maximo', 'summary', year],
    queryFn: () => api.get<MaximoSummary>(`/maximo/summary${year ? `?year=${year}` : ''}`),
  });
  // E1: chips por estatus con los demás filtros (sin el propio estatus)
  const statusFacet = useColumnFacet(
    '/maximo/purchase-orders/facets',
    { ...filters, status: undefined, ...cf.params },
    'estatus',
  );

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters =
    !!search || statuses.length > 0 || !!clasfFilter || !!approvedFrom || !!approvedTo || !!year || !!vendor || !!period || cf.activeCount > 0;
  const canSeeIntegrations = hasRole(...PURCHASE_ADMIN_ROLES, 'executive');
  const summary = summaryQ.data?.purchaseOrders;
  const chips = [...facetCounts(statusFacet.data).entries()]
    .filter((entry): entry is [string, number] => entry[0] !== null)
    .map(([status, count]) => ({
      key: status,
      // L3: APPRn y APPRnREV se llaman igual: el chip lleva el código
      label: maximoStatusListLabel(status),
      count,
      className: maximoStatusBadgeClass(status),
    }));
  const toggleStatus = (key: string) => {
    setStatuses(statuses.includes(key) ? statuses.filter((s) => s !== key) : [...statuses, key]);
    setPage(1);
  };
  // K7: chips de integración con SAP (PO5) con los demás filtros aplicados
  // (la faceta no se filtra a sí misma); clic = filtro de columna
  const integrationFacet = useColumnFacet(
    '/maximo/purchase-orders/facets',
    { ...filters, ...cf.params },
    'integracion',
  );
  const integrationFilter = cf.filters.integracion;
  const activeIntegrations = integrationFilter && 'in' in integrationFilter ? integrationFilter.in : [];
  const integrationChips = [...facetCounts(integrationFacet.data).entries()].filter(
    (entry): entry is [string, number] => entry[0] !== null,
  );
  const toggleIntegration = (label: string) => {
    const next = activeIntegrations.includes(label)
      ? activeIntegrations.filter((v) => v !== label)
      : [...activeIntegrations, label];
    cf.setFilter('integracion', next.length ? { in: next } : null);
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
            placeholder="Buscar por PONUM, OC de SAP o descripción..."
            className="flex-1 min-w-48 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
          <StatusMultiSelect
            options={STATUS_OPTIONS}
            value={statuses}
            onChange={(next) => { setStatuses(next); setPage(1); }}
          />
          <select
            value={clasfFilter}
            onChange={(e) => { setClasfFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Clasificación</option>
            <option value="CAPEX">CAPEX</option>
            <option value="OPEX">OPEX</option>
          </select>
          <input
            type="date"
            value={approvedFrom}
            onChange={(e) => { setApprovedFrom(e.target.value); setPage(1); }}
            title="Aprobada desde"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900"
          />
          <input
            type="date"
            value={approvedTo}
            onChange={(e) => { setApprovedTo(e.target.value); setPage(1); }}
            title="Aprobada hasta"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900"
          />
          <ExportExcelButton
            path={`/maximo/purchase-orders/export${filterQs ? `?${filterQs}` : ''}`}
            filename={`ordenes_maximo_${new Date().toISOString().slice(0, 10)}.xlsx`}
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
        <LinkedFilterChips
          filters={[
            ...(vendor
              ? [
                  {
                    key: 'proveedor',
                    label: 'Proveedor',
                    value: `${vendor.name ?? vendor.key} (${vendor.key.replace(/^(sap|maximo):/, '')})`,
                    title: vendor.key.startsWith('sap:')
                      ? 'Proveedor efectivo según SAP (la OC migró a SAP o su código de Maximo cae en este proveedor)'
                      : 'Proveedor según el maestro de Maximo',
                    onClear: () => { setVendor(null); setPage(1); },
                  },
                ]
              : []),
            ...(period
              ? [
                  {
                    key: 'periodo',
                    label: 'Fecha de la OC',
                    value: periodText(period.from, period.to),
                    onClear: () => { setPeriod(null); setPage(1); },
                  },
                ]
              : []),
          ]}
        />
        {/* K7: integración con SAP (PO5) de la OC; clic = filtrar */}
        {integrationChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Integración con SAP (PO5):</span>
            {integrationChips.map(([label, count]) => {
              const badge = maximoIntegrationBadge(maximoIntegrationCodeOf(label));
              const active = activeIntegrations.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleIntegration(label)}
                  title={`${badge.title}. Clic para filtrar`}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors hover:opacity-80 ${badge.className} ${
                    active ? 'ring-2 ring-[#52AF32] ring-offset-1' : ''
                  }`}
                >
                  {label}
                  <span className="font-bold">{count.toLocaleString('es-MX')}</span>
                </button>
              );
            })}
          </div>
        )}
        <ActiveColumnFilters cf={cf} columns={COLUMNS} />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-600">
            No se pudieron cargar las órdenes de Maximo. Intenta de nuevo.
          </div>
        ) : orders.length === 0 && !hasFilters ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">Aún no hay datos sincronizados desde Maximo</p>
            {canSeeIntegrations && (
              <Link href="/compras/integraciones" className="text-sm text-[#52AF32] hover:underline">
                Ver estado de la integración
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <ColumnFilterProvider value={{ cf, columns: COLUMNS, facetsPath: '/maximo/purchase-orders/facets', baseQuery: filters }}>
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <FilterTh column="ponum" className="px-3 py-3">PONUM</FilterTh>
                    <FilterTh column="descripcion" className="px-3 py-3">Descripción</FilterTh>
                    <FilterTh column="estatus" align="center" className="px-3 py-3">Estatus</FilterTh>
                    <FilterTh column="recepcion" align="center" className="px-3 py-3" title="Recepción de la OC en Maximo (RECEIPTS)">Recepción</FilterTh>
                    <FilterTh column="integracion" className="px-3 py-3" title="Integración con SAP (PO5) y, debajo, la OC de SAP que copió esta PO">Integración SAP</FilterTh>
                    <FilterTh column="proveedor" className="px-3 py-3" title="Proveedor según SAP cuando la OC migró o por el cruce de su código; si no, el de Maximo">Proveedor</FilterTh>
                    <FilterTh column="subtotal" align="right" className="px-3 py-3" title='Suma de LINECOST de las líneas, sin IVA. "No disponible" si la OC no trae líneas o alguna no trae LINECOST'>
                      Subtotal<span className="block text-[10px] font-normal normal-case text-white/70">sin IVA</span>
                    </FilterTh>
                    <FilterTh column="monto" align="right" className="px-3 py-3" title="TOTALCOST de Maximo, con IVA">
                      Total<span className="block text-[10px] font-normal normal-case text-white/70">con IVA</span>
                    </FilterTh>
                    <FilterTh column="solicitante" className="px-3 py-3">Solicitante</FilterTh>
                    <FilterTh column="comprador" className="px-3 py-3" title="Comprador de la OC en Maximo (PURCHASEAGENT)">Comprador</FilterTh>
                    <FilterTh column="depto" className="px-3 py-3">Depto.</FilterTh>
                    <FilterTh column="clasificacion" align="center" className="px-3 py-3">Clasif.</FilterTh>
                    <FilterTh column="ahorro" align="right" className="px-3 py-3">Ahorro</FilterTh>
                    <FilterTh column="aprobacion" align="center" className="px-3 py-3">F. Aprob.</FilterTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((po, idx) => (
                    <tr
                      key={po.id}
                      onClick={() => setDetailPonum(po.ponum)}
                      className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-3 py-3">
                        <span className="font-mono font-medium text-[#222D59]">{po.ponum}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 max-w-36 truncate" title={po.description ?? undefined}>{dash(po.description)}</td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${maximoStatusBadgeClass(po.status)}`}
                          title={maximoStatusTitle(po.status)}
                        >
                          {maximoStatusLabel(po.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ReceiptBadge status={po.receipt_status} />
                      </td>
                      <td className="px-3 py-3">
                        <IntegrationCell po={po} />
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <MaximoSupplierCell po={po} />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                        {po.subtotal === null ? <NotAvailable title={SUBTOTAL_MISSING_HINT} /> : formatMoney(po.subtotal, po.currency)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 text-right font-medium whitespace-nowrap">
                        {formatMoney(po.total_cost, po.currency)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 max-w-36 truncate" title={po.requested_by ?? undefined}>
                        {po.requested_by_name ?? dash(po.requested_by)}
                      </td>
                      <td
                        className={`px-3 py-3 text-sm max-w-40 truncate ${po.buyer_kind === 'capturo' ? 'text-gray-500' : 'text-gray-700'}`}
                        title={
                          po.buyer_kind === 'comprador'
                            ? `Agente de compras en Maximo: ${po.purchase_agent}`
                            : po.buyer_kind === 'capturo'
                              ? `Sin agente de compras en Maximo: creó la OC ${po.created_by}`
                              : 'Sin comprador en Maximo'
                        }
                      >
                        {buyerLabel(po) ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{dash(po.department)}</td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600">
                        {po.ab_clasfpo === null ? <NotAvailable /> : po.ab_clasfpo}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 text-right">
                        {po.ab_ahorro === null ? <NotAvailable /> : formatMoney(po.ab_ahorro, po.currency)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600 whitespace-nowrap">{formatDate(po.approved_at)}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                        No hay órdenes de Maximo que coincidan con los filtros
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
                  Mostrando {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
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

      <MaximoPoDetailModal
        isOpen={detailPonum !== null}
        onClose={() => setDetailPonum(null)}
        ponum={detailPonum}
      />
    </div>
  );
}
