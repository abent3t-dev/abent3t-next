'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_ADMIN_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  MAXIMO_STATUS_BADGE_CLASSES,
  MaximoPurchaseOrder,
  maximoStatusBadgeClass,
} from '@/types/purchases';
import MaximoPoDetailModal from './MaximoPoDetailModal';

/**
 * Fase INT-5 (T6) — Pestana "Ordenes Maximo" dentro de /compras/ordenes.
 * Lista la vista actual del staging (GET /maximo/purchase-orders). Solo
 * lectura; nulls se muestran como "—" (decision 20.A.1).
 */

const PAGE_SIZE = 15;

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount === null) return '—';
  try {
    return new Intl.NumberFormat(
      'es-MX',
      currency
        ? { style: 'currency', currency }
        : { minimumFractionDigits: 2 },
    ).format(amount);
  } catch {
    return `${amount.toLocaleString('es-MX')} ${currency ?? ''}`.trim();
  }
};

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export default function MaximoOrdersTab() {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clasfFilter, setClasfFilter] = useState('');
  const [approvedFrom, setApprovedFrom] = useState('');
  const [approvedTo, setApprovedTo] = useState('');
  const [page, setPage] = useState(1);
  const [detailPonum, setDetailPonum] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (clasfFilter) queryParams.set('ab_clasfpo', clasfFilter);
  if (approvedFrom) queryParams.set('approved_from', approvedFrom);
  if (approvedTo) queryParams.set('approved_to', approvedTo);

  const { data, isLoading } = useQuery({
    queryKey: [
      'maximo-purchase-orders',
      search,
      statusFilter,
      clasfFilter,
      approvedFrom,
      approvedTo,
      page,
    ],
    queryFn: () =>
      api.get<PaginatedResponse<MaximoPurchaseOrder>>(
        `/maximo/purchase-orders?${queryParams.toString()}`,
      ),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters =
    !!search || !!statusFilter || !!clasfFilter || !!approvedFrom || !!approvedTo;
  const canSeeIntegrations = hasRole(...PURCHASE_ADMIN_ROLES, 'executive');

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por PONUM o descripcion..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Todos los estatus</option>
            {Object.keys(MAXIMO_STATUS_BADGE_CLASSES).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={clasfFilter}
            onChange={(e) => {
              setClasfFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Clasificacion</option>
            <option value="CAPEX">CAPEX</option>
            <option value="OPEX">OPEX</option>
          </select>
          <input
            type="date"
            value={approvedFrom}
            onChange={(e) => {
              setApprovedFrom(e.target.value);
              setPage(1);
            }}
            title="Aprobada desde"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900"
          />
          <input
            type="date"
            value={approvedTo}
            onChange={(e) => {
              setApprovedTo(e.target.value);
              setPage(1);
            }}
            title="Aprobada hasta"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 && !hasFilters ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">
              Aun no hay datos sincronizados desde Maximo
            </p>
            {canSeeIntegrations && (
              <Link
                href="/compras/integraciones"
                className="text-sm text-[#52AF32] hover:underline"
              >
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">PONUM</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Descripcion</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Depto.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Clasif.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Ahorro</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">F. Aprob.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((po, idx) => (
                    <tr
                      key={po.id}
                      onClick={() => setDetailPonum(po.ponum)}
                      className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-[#222D59]">{po.ponum}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-64 truncate">
                        {dash(po.description)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${maximoStatusBadgeClass(po.status)}`}>
                          {dash(po.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{dash(po.vendor_name)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {formatMoney(po.total_cost, po.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{dash(po.department)}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{dash(po.ab_clasfpo)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {formatMoney(po.ab_ahorro, po.currency)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {formatDate(po.approved_at)}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No hay ordenes de Maximo que coincidan con los filtros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginacion */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  Mostrando {(meta.page - 1) * meta.limit + 1} -{' '}
                  {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!meta.hasPrev}
                    className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-700">
                    Pagina {meta.page} de {meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!meta.hasNext}
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

      <MaximoPoDetailModal
        isOpen={detailPonum !== null}
        onClose={() => setDetailPonum(null)}
        ponum={detailPonum}
      />
    </div>
  );
}
