'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_ADMIN_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  SapPurchaseRequest,
  sapStatusBadgeClass,
  sapStatusLabel,
} from '@/types/purchases';
import SapDocDetailModal from './SapDocDetailModal';

/**
 * Fase INT-4 (T6) — Pestana "Solicitudes SAP" dentro de /compras/solicitudes.
 * Lista el staging de Solicitudes de Pedido (GET /sap/purchase-requests).
 * Solo lectura; el monto es la suma de lineas (el SL no expone DocTotal en
 * esta entidad) y la clasificacion sin capturar se muestra "Sin clasificar".
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

export default function SapRequestsTab() {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailDocEntry, setDetailDocEntry] = useState<number | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sap-purchase-requests', search, statusFilter, page],
    queryFn: () =>
      api.get<PaginatedResponse<SapPurchaseRequest>>(
        `/sap/purchase-requests?${queryParams.toString()}`,
      ),
  });

  const requests = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || !!statusFilter;
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
            placeholder="Buscar por numero o solicitante..."
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
            <option value="open">Abierta</option>
            <option value="close">Cerrada</option>
          </select>
        </div>
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
        ) : requests.length === 0 && !hasFilters ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">
              Aun no hay solicitudes sincronizadas desde SAP
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Numero</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Solicitante</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Monto (lineas)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">F. Documento</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">F. Requerida</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Clasif. lineas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map((pr, idx) => (
                    <tr
                      key={pr.id}
                      onClick={() => setDetailDocEntry(pr.doc_entry)}
                      className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-[#222D59]">{dash(pr.doc_num)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-64 truncate">
                        {dash(pr.requester_name)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${sapStatusBadgeClass(pr.document_status)}`}>
                          {sapStatusLabel(pr.document_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {formatMoney(pr.doc_total, pr.currency)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {formatDate(pr.doc_date)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {formatDate(pr.required_date)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {pr.lines_total === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : pr.lines_classified === 0 ? (
                          <span className="text-gray-400 italic">Sin clasificar</span>
                        ) : (
                          <span className="text-gray-700">
                            {pr.lines_classified}/{pr.lines_total}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No hay solicitudes de SAP que coincidan con los filtros
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

      <SapDocDetailModal
        key={detailDocEntry ?? 'closed'}
        isOpen={detailDocEntry !== null}
        onClose={() => setDetailDocEntry(null)}
        docEntry={detailDocEntry}
        entity="purchase-requests"
      />
    </div>
  );
}
