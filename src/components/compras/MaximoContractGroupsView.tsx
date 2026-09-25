'use client';

import { Fragment, ReactNode, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toQuery } from '@/lib/compras-format';
import type { PaginatedResponse } from '@/types/pagination';
import {
  MAXIMO_STATUS_BADGE_CLASSES,
  MaximoContractGroup,
  maximoStatusBadgeClass,
  maximoStatusLabel,
} from '@/types/purchases';
import MaximoContractDetailModal from './MaximoContractDetailModal';
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
 * Pedidos de Ingrid 2026-09-25 (E2, parte independiente del consumido) —
 * Contratos Maximo agrupados: una fila por contrato (última revisión) con el
 * número de solicitudes (PR) que lo usan; al expandir se ven sus PR. Antes
 * el mismo contrato salía una vez por PR (el 1051, 8 veces). Los totales
 * cuentan contratos, no PR.
 */

const PAGE_SIZE = 15;
const EXPIRY_WARNING_DAYS = 30;

const COLUMNS: ColumnConfigs = {
  contrato: { label: 'Contrato', type: 'text' },
  solicitudes: { label: 'Solicitudes (PR)', type: 'number' },
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

const expiresSoon = (endDate: string | null): boolean => {
  if (!endDate) return false;
  const days = (new Date(endDate).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days < EXPIRY_WARNING_DAYS;
};

const NotAvailable = ({ hint }: { hint: string }) => (
  <span className="text-gray-500 italic text-xs whitespace-nowrap" title={hint}>No disponible</span>
);

export default function MaximoContractGroupsView({
  initialStatus = [],
  groupToggle,
}: {
  initialStatus?: string[];
  groupToggle: ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>(initialStatus);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const cf = useColumnFilters('mxCtG', () => setPage(1));

  const filters = { search, status: statuses, group: 'contract' };
  const filterQs = toQuery({ ...filters, ...cf.params });
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...filters, ...cf.params });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maximo-contract-groups', listQs],
    queryFn: () => api.get<PaginatedResponse<MaximoContractGroup>>(`/maximo/contracts?${listQs}`),
    placeholderData: keepPreviousData,
  });
  const statusFacet = useColumnFacet(
    '/maximo/contracts/facets',
    { ...filters, status: undefined, ...cf.params },
    'estatus',
  );

  const groups = data?.data ?? [];
  const meta = data?.meta;
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
  const toggleExpanded = (contractnum: string) => {
    const next = new Set(expanded);
    if (next.has(contractnum)) next.delete(contractnum);
    else next.add(contractnum);
    setExpanded(next);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por contrato, PR o proveedor..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
          <StatusMultiSelect
            options={STATUS_OPTIONS}
            value={statuses}
            onChange={(next) => { setStatuses(next); setPage(1); }}
          />
          {groupToggle}
          <ExportExcelButton
            path={`/maximo/contracts/export${filterQs ? `?${filterQs}` : ''}`}
            filename={`contratos_maximo_${new Date().toISOString().slice(0, 10)}.xlsx`}
            disabled={isLoading || groups.length === 0}
          />
        </div>
        <ResultChips
          filteredTotal={meta?.total}
          statuses={chips}
          activeStatuses={statuses}
          onToggleStatus={toggleStatus}
          loading={isLoading}
        />
        <ActiveColumnFilters cf={cf} columns={COLUMNS} />
        <p className="text-xs text-gray-500">
          Una fila por contrato (su revisión más reciente). Las solicitudes sin contrato se ven al desagrupar o en Solicitudes → Solicitudes Maximo.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-600">
            No se pudieron cargar los contratos de Maximo. Si aplicaste un filtro, límpialo e intenta de nuevo.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <ColumnFilterProvider value={{ cf, columns: COLUMNS, facetsPath: '/maximo/contracts/facets', baseQuery: filters }}>
                <table className="w-full">
                  <thead className="bg-[#424846]">
                    <tr>
                      <FilterTh column="contrato">Contrato</FilterTh>
                      <FilterTh column="solicitudes" align="center" title="Solicitudes (PR) de Maximo que usan el contrato">PR</FilterTh>
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
                    {groups.map((group, idx) => {
                      const open = expanded.has(group.contractnum);
                      return (
                        <Fragment key={group.contractnum}>
                          <tr
                            onClick={() => setDetailKey(group.detail_key)}
                            className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <td className="px-4 py-3">
                              <span className="font-mono font-medium text-[#222D59]">{group.contractnum}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpanded(group.contractnum);
                                }}
                                aria-expanded={open}
                                title={open ? 'Ocultar solicitudes' : 'Ver las solicitudes (PR) del contrato'}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium whitespace-nowrap rounded-full bg-[#222D59]/10 text-[#222D59] hover:bg-[#222D59]/20"
                              >
                                {group.pr_count} PR
                                <span aria-hidden>{open ? '▴' : '▾'}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${maximoStatusBadgeClass(group.status)}`}
                                title={group.status ?? undefined}
                              >
                                {maximoStatusLabel(group.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{dash(group.vendor_name)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {formatMoney(group.contract_value, group.currency)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {group.consumed_value === null ? (
                                <NotAvailable hint="La Object Structure de Maximo (AB_CONTRATOS) aún no expone el consumido del contrato; se define con Ingrid el 28-sep" />
                              ) : (
                                formatMoney(group.consumed_value, group.currency)
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {group.balance_value === null ? (
                                <NotAvailable hint="Requiere valor y consumido del contrato" />
                              ) : (
                                <span className={group.balance_value < 0 ? 'font-semibold text-red-600' : 'text-gray-900'}>
                                  {formatMoney(group.balance_value, group.currency)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-600">{dash(group.currency)}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-600">
                              <span className="whitespace-nowrap">
                                {!group.start_date && !group.end_date
                                  ? '—'
                                  : `${formatDate(group.start_date)} – ${formatDate(group.end_date)}`}
                              </span>
                              {expiresSoon(group.end_date) && (
                                <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                  Vence pronto
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{dash(group.department)}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-600">{dash(group.revisionnum)}</td>
                          </tr>
                          {open && (
                            <tr className="bg-[#52AF32]/5">
                              <td colSpan={11} className="px-6 py-3">
                                {group.prs.length === 0 ? (
                                  <p className="text-sm text-gray-500">El contrato no tiene solicitudes (PR) ligadas en Maximo.</p>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-xs uppercase text-gray-500">
                                        <th className="py-1 pr-4 text-left font-medium">PR</th>
                                        <th className="py-1 pr-4 text-left font-medium">Estatus</th>
                                        <th className="py-1 pr-4 text-left font-medium">Solicitado por</th>
                                        <th className="py-1 pr-4 text-left font-medium">F. Solicitud</th>
                                        <th className="py-1 text-left font-medium">F. Aprobación</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.prs.map((pr) => (
                                        <tr key={pr.prnum ?? 'sin-pr'} className="border-t border-gray-200/70">
                                          <td className="py-1.5 pr-4">
                                            {pr.prnum ? (
                                              <button
                                                type="button"
                                                onClick={() => setDetailKey(pr.prnum)}
                                                className="font-mono font-medium text-[#222D59] hover:text-[#52AF32] hover:underline"
                                              >
                                                {pr.prnum}
                                              </button>
                                            ) : '—'}
                                          </td>
                                          <td className="py-1.5 pr-4">{maximoStatusLabel(pr.status)}</td>
                                          <td className="py-1.5 pr-4 text-gray-700" title={pr.requested_by ?? undefined}>
                                            {pr.requested_by_name ?? dash(pr.requested_by)}
                                          </td>
                                          <td className="py-1.5 pr-4 text-gray-600">{formatDate(pr.created_at_source)}</td>
                                          <td className="py-1.5 text-gray-600">{formatDate(pr.approved_at)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {groups.length === 0 && (
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
                  Mostrando {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} contratos
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
