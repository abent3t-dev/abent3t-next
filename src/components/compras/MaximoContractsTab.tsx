'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
import MaximoContractGroupsView from './MaximoContractGroupsView';
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
 * Fase INT-5 (T6) — Pestana "Contratos Maximo" (vive en /compras/contratos
 * desde §15). Vista actual del staging (GET /maximo/contracts), incluye PRs
 * sin contrato. Solo lectura. El listado muestra el VALOR del contrato
 * (contract_value ≡ TOTALCOST, §20.2 resuelta por Isaac 2026-09); MAXVOL no
 * lo expone la Object Structure (pendiente CIISA) y va como "No disponible"
 * en el detalle, nunca 0.
 *
 * Sprint 2026-09-22: filtro multi-estatus (A5), chips (A4), export (B1).
 * Bloque 2026-09-23 (D8, Ingrid): valor, consumido y saldo (valor − consumido,
 * negativo en rojo). El consumido llega null mientras AB_CONTRATOS no lo
 * exponga (pedido a CIISA junto con MAXVOL) → "No disponible", nunca 0.
 * E1 (2026-09-25, pedido también por César): filtro "tipo Excel" por columna.
 * E2 (2026-09-25, parte independiente del consumido): "Agrupar por contrato"
 * (activo por defecto; `mxCt_g=0` en la URL = una fila por PR).
 */

const NotAvailable = ({ hint }: { hint: string }) => (
  <span className="text-gray-500 italic text-xs whitespace-nowrap" title={hint}>No disponible</span>
);

const PAGE_SIZE = 15;

const COLUMNS: ColumnConfigs = {
  pr: { label: 'PRNUM', type: 'text' },
  contrato: { label: 'Contrato', type: 'text', emptyLabel: 'Sin contrato' },
  estatus: {
    label: 'Estatus',
    type: 'text',
    format: (v) => `${maximoStatusLabel(v)} (${v})`,
    emptyLabel: 'Sin estatus en Maximo',
  },
  proveedor: { label: 'Proveedor', type: 'text' },
  valor: { label: 'Valor contrato', type: 'number' },
  consumido: { label: 'Consumido', type: 'number' },
  saldo: { label: 'Saldo', type: 'number' },
  moneda: { label: 'Moneda', type: 'text' },
  fin: { label: 'Fin de vigencia', type: 'date' },
  depto: { label: 'Departamento', type: 'text' },
  revision: { label: 'Revisión', type: 'number' },
};
const EXPIRY_WARNING_DAYS = 30;

const STATUS_OPTIONS = Object.keys(MAXIMO_STATUS_BADGE_CLASSES).map((value) => ({
  value,
  label: `${maximoStatusLabel(value)} (${value})`,
}));

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

/** Vence en < 30 dias (indicador visual T6; las alertas reales son de §15). */
const expiresSoon = (endDate: string | null): boolean => {
  if (!endDate) return false;
  const days = (new Date(endDate).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days < EXPIRY_WARNING_DAYS;
};

/** E2: una fila por contrato (default) o una por PR, recordado en la URL. */
export default function MaximoContractsTab({ initialStatus = [] }: { initialStatus?: string[] }) {
  const searchParams = useSearchParams();
  const [grouped, setGrouped] = useState(searchParams.get('mxCt_g') !== '0');
  const toggle = () => {
    const next = !grouped;
    setGrouped(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.delete('mxCt_g');
    else url.searchParams.set('mxCt_g', '0');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };
  const groupToggle = (
    <label
      className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 cursor-pointer select-none"
      title="Una fila por contrato con sus solicitudes (PR), en lugar de una fila por PR"
    >
      <input type="checkbox" checked={grouped} onChange={toggle} className="accent-[#52AF32]" />
      Agrupar por contrato
    </label>
  );
  return grouped ? (
    <MaximoContractGroupsView initialStatus={initialStatus} groupToggle={groupToggle} />
  ) : (
    <MaximoContractRowsView initialStatus={initialStatus} groupToggle={groupToggle} />
  );
}

function MaximoContractRowsView({
  initialStatus = [],
  groupToggle,
}: {
  initialStatus?: string[];
  groupToggle: ReactNode;
}) {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>(initialStatus);
  const [hasContractFilter, setHasContractFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const cf = useColumnFilters('mxCt', () => setPage(1));

  const filters = { search, status: statuses, has_contract: hasContractFilter };
  const filterQs = toQuery({ ...filters, ...cf.params });
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...filters, ...cf.params });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maximo-contracts', listQs],
    queryFn: () => api.get<PaginatedResponse<MaximoContract>>(`/maximo/contracts?${listQs}`),
    // E1: la tabla anterior se queda en pantalla mientras llega la nueva
    placeholderData: keepPreviousData,
  });
  const summaryQ = useQuery({
    queryKey: ['maximo', 'summary'],
    queryFn: () => api.get<MaximoSummary>('/maximo/summary'),
  });
  // E1: chips por estatus con los demás filtros (sin el propio estatus)
  const statusFacet = useColumnFacet(
    '/maximo/contracts/facets',
    { ...filters, status: undefined, ...cf.params },
    'estatus',
  );

  const contracts = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || statuses.length > 0 || !!hasContractFilter || cf.activeCount > 0;
  const canSeeIntegrations = hasRole(...PURCHASE_ADMIN_ROLES, 'executive');
  const summary = summaryQ.data?.contracts;
  const chips = [...facetCounts(statusFacet.data).entries()]
    .filter((entry): entry is [string, number] => entry[0] !== null)
    .map(([status, count]) => ({
      key: status,
      label: maximoStatusLabel(status),
      count,
      className: maximoStatusBadgeClass(status),
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
          <select
            value={hasContractFilter}
            onChange={(e) => { setHasContractFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Con y sin contrato</option>
            <option value="true">Con contrato</option>
            <option value="false">Sin contrato</option>
          </select>
          {groupToggle}
          <ExportExcelButton
            path={`/maximo/contracts/export${filterQs ? `?${filterQs}` : ''}`}
            filename={`contratos_maximo_${new Date().toISOString().slice(0, 10)}.xlsx`}
            disabled={isLoading || contracts.length === 0}
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
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-600">
            No se pudieron cargar los contratos de Maximo. Intenta de nuevo.
          </div>
        ) : contracts.length === 0 && !hasFilters ? (
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
              <ColumnFilterProvider value={{ cf, columns: COLUMNS, facetsPath: '/maximo/contracts/facets', baseQuery: filters }}>
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <FilterTh column="pr">PRNUM</FilterTh>
                    <FilterTh column="contrato">Contrato</FilterTh>
                    <FilterTh column="estatus" align="center">Estatus</FilterTh>
                    <FilterTh column="proveedor">Proveedor</FilterTh>
                    <FilterTh column="valor" align="right">Valor contrato</FilterTh>
                    <FilterTh column="consumido" align="right" title="Consumido del contrato según Maximo">Consumido</FilterTh>
                    <FilterTh column="saldo" align="right" title="Valor − consumido">Saldo</FilterTh>
                    <FilterTh column="moneda" align="center">Moneda</FilterTh>
                    <FilterTh column="fin" align="center" title="Filtra y ordena por el fin de la vigencia">Vigencia</FilterTh>
                    <FilterTh column="depto">Depto.</FilterTh>
                    <FilterTh column="revision" align="center">Rev.</FilterTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contracts.map((contract, idx) => {
                    const key = contract.prnum ?? contract.contractnum;
                    return (
                      <tr
                        key={contract.id}
                        onClick={() => key && setDetailKey(key)}
                        className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-[#222D59]">{dash(contract.prnum)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {contract.has_contract ? (
                            <span className="font-mono text-gray-900">{dash(contract.contractnum)}</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap bg-gray-100 text-gray-600">
                              Sin contrato
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${maximoStatusBadgeClass(contract.status)}`}
                            title={contract.status ?? undefined}
                          >
                            {maximoStatusLabel(contract.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{dash(contract.vendor_name)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatMoney(contract.contract_value, contract.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {contract.consumed_value === null ? (
                            <NotAvailable hint="La Object Structure de Maximo (AB_CONTRATOS) aún no expone el consumido del contrato; pedido a CIISA" />
                          ) : (
                            formatMoney(contract.consumed_value, contract.currency)
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {contract.balance_value === null ? (
                            <NotAvailable hint="Requiere valor y consumido del contrato" />
                          ) : (
                            <span className={contract.balance_value < 0 ? 'font-semibold text-red-600' : 'text-gray-900'}>
                              {formatMoney(contract.balance_value, contract.currency)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{dash(contract.currency)}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          <span className="whitespace-nowrap">
                            {!contract.start_date && !contract.end_date
                              ? '—'
                              : `${formatDate(contract.start_date)} – ${formatDate(contract.end_date)}`}
                          </span>
                          {expiresSoon(contract.end_date) && (
                            <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                              Vence pronto
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{dash(contract.department)}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {dash(contract.revisionnum)}
                          {contract.purchview_count > 1 && (
                            <span className="ml-1 text-xs text-gray-400">({contract.purchview_count})</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {contracts.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                        No hay contratos de Maximo que coincidan con los filtros
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
