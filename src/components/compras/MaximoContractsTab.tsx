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
 * Fase INT-5 (T6) — Pestana "Contratos Maximo" (vive en /compras/contratos
 * desde §15). Vista actual del staging (GET /maximo/contracts), incluye PRs
 * sin contrato. Solo lectura. El listado muestra el VALOR del contrato
 * (contract_value ≡ TOTALCOST, §20.2 resuelta por Isaac 2026-09); MAXVOL no
 * lo expone la Object Structure (pendiente CIISA) y va como "No disponible"
 * en el detalle, nunca 0.
 *
 * Sprint 2026-09-22: filtro multi-estatus (A5), chips (A4), export (B1).
 */

const PAGE_SIZE = 15;
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

export default function MaximoContractsTab({ initialStatus = [] }: { initialStatus?: string[] }) {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>(initialStatus);
  const [hasContractFilter, setHasContractFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const filters = { search, status: statuses, has_contract: hasContractFilter };
  const filterQs = toQuery(filters);
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...filters });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maximo-contracts', listQs],
    queryFn: () => api.get<PaginatedResponse<MaximoContract>>(`/maximo/contracts?${listQs}`),
  });
  const summaryQ = useQuery({
    queryKey: ['maximo', 'summary'],
    queryFn: () => api.get<MaximoSummary>('/maximo/summary'),
  });

  const contracts = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || statuses.length > 0 || !!hasContractFilter;
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
          <select
            value={hasContractFilter}
            onChange={(e) => { setHasContractFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Con y sin contrato</option>
            <option value="true">Con contrato</option>
            <option value="false">Sin contrato</option>
          </select>
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
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">PRNUM</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Contrato</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Valor contrato</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Moneda</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Vigencia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Depto.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Rev.</th>
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
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No hay contratos de Maximo que coincidan con los filtros
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
