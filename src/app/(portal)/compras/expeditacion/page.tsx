'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_TEAM_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  DELIVERY_STATUS_CLASSES,
  DELIVERY_STATUS_LABELS,
  DeliveryStatus,
  EXPEDITING_SOURCE_LABELS,
  ExpeditingItem,
  ExpeditingSource,
} from '@/types/purchases';
import ExpeditingModal from '@/components/compras/ExpeditingModal';

/**
 * Fase Expeditación — seguimiento de entregas de POs propias: stats,
 * listado con estatus derivado, filtros, "Mis órdenes" para compradores y
 * modal de seguimiento/recepción.
 */

const PAGE_SIZE = 15;

interface ExpeditingStats {
  counts: Record<DeliveryStatus, number>;
  /** Sprint 2026-09-22 (B6): desglose por fuente (ABENT / SAP / Maximo). */
  by_source?: Record<ExpeditingSource, Record<DeliveryStatus, number>>;
  avg_delay_days: number | null;
  top_delayed_suppliers: Array<{
    supplier_id: string;
    legal_name: string;
    late_orders: number;
  }>;
}

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

const STAT_CARDS: Array<{ key: DeliveryStatus; border: string }> = [
  { key: 'en_tiempo', border: 'border-[#52AF32]' },
  { key: 'en_riesgo', border: 'border-yellow-500' },
  { key: 'retrasada', border: 'border-red-500' },
  { key: 'entregada', border: 'border-[#222D59]' },
];

export default function ExpeditacionPage() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(...PURCHASE_TEAM_ROLES);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<ExpeditingSource | ''>('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (sourceFilter) queryParams.set('source', sourceFilter);
  if (onlyMine && user?.id) queryParams.set('buyer_id', user.id);

  const listQuery = useQuery({
    queryKey: ['expediting', search, statusFilter, sourceFilter, onlyMine, page],
    queryFn: () =>
      api.get<PaginatedResponse<ExpeditingItem>>(
        `/compras/expeditacion?${queryParams.toString()}`,
      ),
  });

  const statsQuery = useQuery({
    queryKey: ['expediting', 'stats'],
    queryFn: () => api.get<ExpeditingStats>('/compras/expeditacion/stats'),
  });

  const items = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const stats = statsQuery.data;
  const hasFilters = !!search || !!statusFilter || !!sourceFilter || onlyMine;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Expeditación</h1>
        <p className="text-gray-500">
          Seguimiento de entregas: OC propias (con seguimiento y recepción) y OC
          abiertas de SAP y Maximo (solo lectura, semáforo por fecha comprometida)
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STAT_CARDS.map((card) => (
            <div
              key={card.key}
              className={`bg-white p-4 rounded-lg shadow border-l-4 ${card.border}`}
            >
              <p className="text-sm text-gray-500">
                {DELIVERY_STATUS_LABELS[card.key]}
              </p>
              <p className="text-2xl font-bold text-[#424846]">
                {stats.counts[card.key]}
              </p>
              {stats.by_source && (
                <p className="text-xs text-gray-500 mt-1">
                  ABENT {stats.by_source.abent[card.key]} · SAP {stats.by_source.sap[card.key]} · Maximo {stats.by_source.maximo[card.key]}
                </p>
              )}
            </div>
          ))}
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-sm text-gray-500">Retraso promedio</p>
            <p className="text-2xl font-bold text-[#424846]">
              {stats.avg_delay_days === null ? '—' : `${stats.avg_delay_days} d`}
            </p>
          </div>
        </div>
      )}

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
            placeholder="Buscar por PO o proveedor..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as DeliveryStatus | '');
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Todos los estatus</option>
            {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as ExpeditingSource | '');
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Todas las fuentes</option>
            <option value="abent">ABENT</option>
            <option value="sap">SAP</option>
            <option value="maximo">Maximo</option>
          </select>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setOnlyMine(!onlyMine);
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                onlyMine
                  ? 'bg-[#52AF32] text-white'
                  : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Mis órdenes
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : items.length === 0 && !hasFilters ? (
          <div className="p-10 text-center">
            <p className="text-gray-500">
              No hay órdenes de compra activas en seguimiento
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">PO</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Origen</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Comprador</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Fecha vigente</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Días</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, idx) => (
                    <tr
                      key={`${item.source}-${item.external_key}`}
                      onClick={() => item.purchase_order_id && setSelectedPoId(item.purchase_order_id)}
                      title={item.purchase_order_id ? undefined : 'OC del ERP: solo lectura (el seguimiento se lleva en el ERP)'}
                      className={`${item.purchase_order_id ? 'cursor-pointer' : 'cursor-default'} hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-[#222D59]">{item.po_number}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                            item.source === 'abent'
                              ? 'bg-[#52AF32]/10 text-[#3d8425]'
                              : item.source === 'sap'
                                ? 'bg-[#222D59]/10 text-[#222D59]'
                                : 'bg-[#DFA922]/20 text-[#8a6a10]'
                          }`}
                        >
                          {EXPEDITING_SOURCE_LABELS[item.source]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.supplier?.legal_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.buyer?.full_name ?? item.requested_by ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(item.effective_expected_date)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {item.days_left === null || item.delivery_status === 'entregada' ? (
                          <span className="text-gray-400">—</span>
                        ) : item.days_left >= 0 ? (
                          <span className="text-gray-700">{item.days_left}</span>
                        ) : (
                          <span className="font-medium text-red-600">{item.days_left}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${DELIVERY_STATUS_CLASSES[item.delivery_status]}`}>
                          {DELIVERY_STATUS_LABELS[item.delivery_status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {item.purchase_order_id ? (item.tracking?.alert_count ?? 0) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No hay órdenes que coincidan con los filtros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

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
                    Página {meta.page} de {meta.totalPages}
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

      <ExpeditingModal
        isOpen={selectedPoId !== null}
        onClose={() => setSelectedPoId(null)}
        purchaseOrderId={selectedPoId}
        canEdit={canEdit}
      />
    </div>
  );
}
