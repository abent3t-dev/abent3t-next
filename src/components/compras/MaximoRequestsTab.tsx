'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { NO_DISPONIBLE, toQuery } from '@/lib/compras-format';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_ADMIN_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  MAXIMO_PR_STATUS_NOT_AVAILABLE,
  MAXIMO_PR_STATUS_OPTIONS,
  MaximoContract,
  MaximoSummary,
  maximoPrStatusBadge,
  maximoPrStatusLabel,
  maximoStatusLabel,
} from '@/types/purchases';
import MaximoContractDetailModal from './MaximoContractDetailModal';
import ResultChips from './ResultChips';
import LinkedFilterChips, { periodText } from './LinkedFilterChips';
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
 * Sprint 2026-09-22 (A7) — Pestana "Solicitudes Maximo" en /compras/solicitudes.
 * GET /maximo/contracts sirve como listado de solicitudes. Solo lectura; los
 * dias se calculan aprobacion − solicitud (null = N/D).
 *
 * Bloque 2026-09-23: D7 monto de la PR (`pr_total`); D6 solicitante con
 * nombre si hay alias; D4 año.
 * E1 (2026-09-25): filtro "tipo Excel" por columna (URL, chips y Excel).
 * K7.6 (2026-10-05): siempre con `vista=solicitudes` (una fila por PR, K4.4):
 * estatus, fechas y días DE LA PR (`pr_status`, ISSUEDATE y primer APPR =
 * llegada a Compras); con contrato, su estatus va en el title. Las PR en
 * aprobación (WAPPR) todavía no llegan a Compras: se cuentan aparte y se ven
 * con `en_aprobacion`.
 */

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount === null) return null;
  try {
    return new Intl.NumberFormat(
      'es-MX',
      currency ? { style: 'currency', currency } : { minimumFractionDigits: 2 },
    ).format(amount);
  } catch {
    return `${amount.toLocaleString('es-MX')} ${currency ?? ''}`.trim();
  }
};

const PAGE_SIZE = 15;

// K7.6: columnas de la vista de solicitudes (MAXIMO_REQUEST_FILTER_COLUMNS
// del API): `estatus_pr` y las fechas y días son los DE LA PR
const COLUMNS: ColumnConfigs = {
  pr: { label: 'PR', type: 'text' },
  estatus_pr: {
    label: 'Estatus de la PR',
    type: 'text',
    format: (v) => `${maximoPrStatusLabel(v)} (${v})`,
    emptyLabel: MAXIMO_PR_STATUS_NOT_AVAILABLE,
  },
  solicitud: { label: 'Fecha de la PR', type: 'date' },
  aprobacion: { label: 'Aprobación de la PR', type: 'date' },
  dias: { label: 'Días de aprobación', type: 'number' },
  monto_pr: { label: 'Monto de la PR (Maximo)', type: 'number' },
  solicitante: { label: 'Solicitado por', type: 'text', emptyLabel: '(Sin solicitante)' },
  depto: { label: 'Departamento', type: 'text' },
  contrato: { label: 'Contrato', type: 'text', emptyLabel: 'Sin contrato' },
};

const STATUS_OPTIONS = MAXIMO_PR_STATUS_OPTIONS.map(({ value, label }) => ({
  value,
  label: `${label} (${value})`,
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

/** K7.6: estatus del contrato para los title; sin estatus, "No disponible". */
const contractStatusText = (status: string | null) =>
  status ? `${maximoStatusLabel(status)} (${status})` : NO_DISPONIBLE;

/** K7.6: title del badge: el estatus de la PR con su etiqueta y, con contrato, el del contrato. */
const prStatusTitle = (pr: MaximoContract) =>
  [
    pr.pr_status
      ? `PR: ${maximoPrStatusLabel(pr.pr_status)} (${pr.pr_status})`
      : maximoPrStatusBadge(null).title,
    pr.has_contract ? `Contrato: ${contractStatusText(pr.status)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

export default function MaximoRequestsTab({
  initialPrStatus = [],
  year = null,
  pendingFrom = null,
}: {
  /** K7.6: estatus DE LA PR (`pr_status`) desde la URL (pie del tablero). */
  initialPrStatus?: string[];
  /** D4: año (K4.4: por la fecha de la PR; en pendientes, por su aprobación). */
  year?: number | null;
  /** G3 (2026-09-28): solo pendientes de gestionar, aprobadas desde esta fecha ('' = sin fecha). */
  pendingFrom?: string | null;
}) {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [prStatuses, setPrStatuses] = useState<string[]>(initialPrStatus);
  const [page, setPage] = useState(1);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [pending, setPending] = useState(pendingFrom);
  // I8: dentro de pendientes, las PR DE CONTRATO sin OC van aparte (la OC se
  // genera en automático; no son carga de Compras)
  const [contractPending, setContractPending] = useState(false);
  // K7.6: las PR en aprobación (WAPPR) todavía no llegan a Compras: aparte
  const [inApproval, setInApproval] = useState(false);
  const cf = useColumnFilters('mxPr', () => setPage(1));

  const showContract = pending !== null && contractPending && !inApproval;
  const filters = {
    // K7.6: sin `vista`, la ruta responde Contratos (una fila por revisión)
    vista: 'solicitudes',
    search,
    pr_status: prStatuses,
    year: year ?? undefined,
    sin_oc: pending !== null && !showContract && !inApproval ? 'true' : undefined,
    contrato_sin_oc: showContract ? 'true' : undefined,
    en_aprobacion: inApproval ? 'true' : undefined,
    pr_desde: pending || undefined,
  };
  // I8 y K7.6: cuántas de contrato y cuántas en aprobación hay en el mismo
  // periodo (para mostrarlas aparte)
  const periodQuery = {
    vista: 'solicitudes',
    limit: 1,
    year: year ?? undefined,
    pr_desde: pending || undefined,
  };
  const contractCountQs = toQuery({ ...periodQuery, contrato_sin_oc: 'true' });
  const contractCountQ = useQuery({
    queryKey: ['maximo-requests', 'de-contrato', contractCountQs],
    queryFn: () => api.get<PaginatedResponse<MaximoContract>>(`/maximo/contracts?${contractCountQs}`),
    enabled: pending !== null,
  });
  const contractCount = contractCountQ.data?.meta.total;
  const inApprovalCountQs = toQuery({ ...periodQuery, en_aprobacion: 'true' });
  const inApprovalCountQ = useQuery({
    queryKey: ['maximo-requests', 'en-aprobacion', inApprovalCountQs],
    queryFn: () => api.get<PaginatedResponse<MaximoContract>>(`/maximo/contracts?${inApprovalCountQs}`),
    enabled: pending !== null,
  });
  const filterQs = toQuery({ ...filters, ...cf.params });
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...filters, ...cf.params });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maximo-requests', listQs],
    queryFn: () => api.get<PaginatedResponse<MaximoContract>>(`/maximo/contracts?${listQs}`),
    // E1: la tabla anterior se queda en pantalla mientras llega la nueva
    placeholderData: keepPreviousData,
  });
  const summaryQ = useQuery({
    queryKey: ['maximo', 'summary', year],
    queryFn: () => api.get<MaximoSummary>(`/maximo/summary${year ? `?year=${year}` : ''}`),
  });
  // E1/K7.6: chips por estatus de la PR con los demás filtros (sin el propio)
  const statusFacet = useColumnFacet(
    '/maximo/contracts/facets',
    { ...filters, pr_status: undefined, ...cf.params },
    'estatus_pr',
  );
  const statusCounts = facetCounts(statusFacet.data);

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters =
    !!search || prStatuses.length > 0 || !!year || pending !== null || inApproval || cf.activeCount > 0;
  const canSeeIntegrations = hasRole(...PURCHASE_ADMIN_ROLES, 'executive');
  // K4.4: una por PR (con año, por su fecha), como la tabla
  const summary = summaryQ.data?.requests;
  // K7.6: en pendientes, las WAPPR del mismo periodo; si no, las de la faceta
  const inApprovalCount =
    pending !== null
      ? inApprovalCountQ.data?.meta.total
      : statusFacet.data
        ? (statusCounts.get('WAPPR') ?? 0)
        : undefined;
  const chips = [...statusCounts.entries()]
    .filter((entry): entry is [string, number] => entry[0] !== null)
    .map(([status, count]) => {
      const badge = maximoPrStatusBadge(status);
      return { key: status, label: badge.label, count, className: badge.className };
    });
  const toggleStatus = (key: string) => {
    setPrStatuses(prStatuses.includes(key) ? prStatuses.filter((s) => s !== key) : [...prStatuses, key]);
    setPage(1);
  };
  const periodo = pending ? periodText(pending) : year ? `en ${year}` : '';
  const pendingChip = inApproval
    ? {
        label: 'En aprobación (WAPPR)',
        value: `todavía no llegan a Compras${periodo ? `, creadas ${periodo}` : ''}`,
        title:
          'PR en aprobación (WAPPR) en Maximo: todavía no llegan a Compras, así que no cuentan como pendientes de gestionar. El periodo va por la fecha de la PR',
      }
    : showContract
      ? {
          label: 'De contrato sin OC',
          value: `la OC se genera en automático${periodo ? `, aprobadas ${periodo}` : ''}`,
          title:
            'PR de contrato aprobadas (APPR) cuyo número no aparece en ninguna OC vigente de Maximo: la OC se genera en automático, así que no cuentan como carga de Compras',
        }
      : {
          label: 'Pendientes de gestionar',
          value: `sin OC ni contrato${periodo ? `, aprobadas ${periodo}` : ''}`,
          title:
            'PR aprobadas (APPR: ya llegaron a Compras) sin contrato y cuyo número no aparece en ninguna OC vigente de Maximo. El periodo va por su aprobación (llegada a Compras)',
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
            value={prStatuses}
            onChange={(next) => { setPrStatuses(next); setPage(1); }}
            placeholder="Todos los estatus de la PR"
          />
          <ExportExcelButton
            path={`/maximo/contracts/export${filterQs ? `?${filterQs}` : ''}`}
            filename={`solicitudes_maximo_${new Date().toISOString().slice(0, 10)}.xlsx`}
            disabled={isLoading || rows.length === 0}
          />
        </div>
        <ResultChips
          filteredTotal={meta?.total}
          // H8: null (con año y sin base) = total desconocido: solo el del listado
          grandTotal={summary?.total ?? undefined}
          statuses={chips}
          activeStatuses={prStatuses}
          onToggleStatus={toggleStatus}
          loading={isLoading}
        />
        <LinkedFilterChips
          filters={
            pending !== null
              ? [
                  {
                    key: 'sin_oc',
                    ...pendingChip,
                    onClear: () => {
                      setPending(null);
                      setContractPending(false);
                      setInApproval(false);
                      setPage(1);
                    },
                  },
                ]
              : []
          }
        />
        {/* I8: las de contrato no son carga de Compras: se ven aparte */}
        {pending !== null && !inApproval && contractCount !== undefined && contractCount > 0 && (
          <p className="text-xs text-gray-600">
            {showContract ? (
              <>
                PR de contrato sin OC: la OC se genera en automático y no cuentan como pendientes de Compras.{' '}
                <button type="button" onClick={() => { setContractPending(false); setPage(1); }} className="text-[#52AF32] font-medium hover:underline">
                  Volver a las pendientes
                </button>
              </>
            ) : (
              <>
                Aparte, <strong>{contractCount.toLocaleString('es-MX')} de contrato</strong> sin OC: la OC se genera en automático.{' '}
                <button type="button" onClick={() => { setContractPending(true); setPage(1); }} className="text-[#52AF32] font-medium hover:underline">
                  Ver las de contrato
                </button>
              </>
            )}
          </p>
        )}
        {/* K7.6: las PR en aprobación (WAPPR) todavía no llegan a Compras: aparte */}
        {inApproval ? (
          <p className="text-xs text-gray-600">
            PR en aprobación (WAPPR): todavía no llegan a Compras
            {pending !== null ? ' y no cuentan como pendientes de gestionar' : ''}.{' '}
            <button type="button" onClick={() => { setInApproval(false); setPage(1); }} className="text-[#52AF32] font-medium hover:underline">
              {pending !== null ? 'Volver a las pendientes' : 'Ver todas'}
            </button>
          </p>
        ) : (
          inApprovalCount !== undefined &&
          inApprovalCount > 0 && (
            <p className="text-xs text-gray-600">
              {pending !== null ? 'Aparte, ' : ''}
              <strong>{inApprovalCount.toLocaleString('es-MX')} en aprobación (WAPPR)</strong>, todavía no llegan a Compras.{' '}
              <button
                type="button"
                onClick={() => {
                  setInApproval(true);
                  setContractPending(false);
                  setPrStatuses([]);
                  setPage(1);
                }}
                className="text-[#52AF32] font-medium hover:underline"
              >
                Ver
              </button>
            </p>
          )
        )}
        <ActiveColumnFilters cf={cf} columns={COLUMNS} />
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
            <p className="text-gray-500">Aún no hay solicitudes sincronizadas desde Maximo</p>
            {canSeeIntegrations && (
              <Link href="/compras/integraciones" className="text-sm text-[#52AF32] hover:underline">
                Ver estado de la integración
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <ColumnFilterProvider value={{ cf, columns: COLUMNS, facetsPath: '/maximo/contracts/facets', baseQuery: filters }}>
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <FilterTh column="pr">PR</FilterTh>
                    <FilterTh column="estatus_pr" align="center" title="Estatus de la solicitud (PR) en Maximo; con contrato, el del contrato va en el tooltip">Estatus PR</FilterTh>
                    <FilterTh column="solicitud" align="center" title="Fecha de la PR en Maximo (ISSUEDATE)">F. Solicitud</FilterTh>
                    <FilterTh column="aprobacion" align="center" title="Primera aprobación de la PR (APPR): su llegada a Compras">F. Aprobación</FilterTh>
                    <FilterTh column="dias" align="center" title="Días de la fecha de la PR a su aprobación (APPR)">Días</FilterTh>
                    <FilterTh column="monto_pr" align="right" title="Monto de la PR en Maximo (TOTALCOST). No se combina con las solicitudes de SAP">Monto PR</FilterTh>
                    <FilterTh column="solicitante">Solicitado por</FilterTh>
                    <FilterTh column="depto">Depto.</FilterTh>
                    <FilterTh column="contrato">Contrato</FilterTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((pr, idx) => {
                    const key = pr.prnum ?? pr.contractnum;
                    // K7.6: días DE LA PR (ISSUEDATE → primer APPR), la columna `dias` del API
                    const days = daysBetween(pr.pr_issue_date, pr.pr_approved_at);
                    const badge = maximoPrStatusBadge(pr.pr_status);
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
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${badge.className}`}
                            title={prStatusTitle(pr)}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{formatDate(pr.pr_issue_date)}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{formatDate(pr.pr_approved_at)}</td>
                        <td className="px-4 py-3 text-center text-sm">
                          {days === null ? (
                            <span className="text-gray-500 italic" title="Sin fecha de la PR o sin aprobación (APPR) en Maximo">N/D</span>
                          ) : (
                            <span className="text-gray-700">{days}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                          {pr.pr_total === null ? (
                            <span className="text-gray-500 italic" title="Maximo no trae el monto (TOTALCOST) de esta PR">No disponible</span>
                          ) : (
                            <span className="text-gray-900" title="Monto de la PR en Maximo (TOTALCOST)">{formatMoney(pr.pr_total, pr.currency)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600" title={pr.requested_by ?? undefined}>
                          {pr.requested_by_name ?? dash(pr.requested_by)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{dash(pr.department)}</td>
                        <td className="px-4 py-3 text-sm">
                          {pr.has_contract ? (
                            <>
                              <span className="font-mono text-gray-900">{dash(pr.contractnum)}</span>
                              {/* I8/K7.6: PR de contrato aprobada (APPR) sin OC → la OC se genera en automático */}
                              {pr.has_po === false && pr.pr_status === 'APPR' && (
                                <span
                                  className="block mt-0.5 w-fit max-w-44 px-1.5 py-0.5 text-[10px] font-semibold leading-tight rounded bg-[#222D59]/10 text-[#222D59]"
                                  title={`PR aprobada (APPR) y todavía sin OC; no cuenta como pendiente de Compras. Contrato: ${contractStatusText(pr.status)}`}
                                >
                                  De contrato: la OC se genera en automático
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Sin contrato</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No hay solicitudes de Maximo que coincidan con los filtros
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

      <MaximoContractDetailModal
        isOpen={detailKey !== null}
        onClose={() => setDetailKey(null)}
        contractKey={detailKey}
      />
    </div>
  );
}
