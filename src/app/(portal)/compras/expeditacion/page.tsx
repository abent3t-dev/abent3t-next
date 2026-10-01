'use client';

import { Suspense, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_TEAM_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  DELIVERY_STATUS_CLASSES,
  DELIVERY_STATUS_LABELS,
  DeliveryStatus,
  ERP_CLOSED_BY_LABELS,
  EXPEDITING_SOURCE_LABELS,
  ExpeditingItem,
  ExpeditingSource,
  buyerLabel,
  maximoStatusText,
} from '@/types/purchases';
import ExpeditingModal from '@/components/compras/ExpeditingModal';
import ExportExcelButton from '@/components/compras/ExportExcelButton';
import ResultChips from '@/components/compras/ResultChips';
import {
  ActiveColumnFilters,
  ColumnFilterProvider,
  FilterTh,
} from '@/components/ui/ColumnFilter';
import { useColumnFilters } from '@/hooks/useColumnFilters';
import type { ColumnConfigs } from '@/lib/column-filters';
import { toQuery } from '@/lib/compras-format';

/**
 * Fase Expeditación — seguimiento de entregas de POs propias: stats,
 * listado con estatus derivado, filtros, "Mis órdenes" para compradores y
 * modal de seguimiento/recepción.
 *
 * Bloque 2026-09-23: D9 botón "Exportar Excel" presente desde el primer
 * render (no espera a los datos; con los mismos filtros); D1 una OC migrada
 * de Maximo a SAP sale una vez, con badge "migrada de Maximo".
 *
 * Pedidos de Ingrid 2026-09-25: E1 filtro "tipo Excel" en cada columna (en
 * la URL; lista, tarjetas y Excel salen del mismo filtro); E3 días legibles
 * ("1,473 días de retraso" / "faltan N días") y retraso promedio por
 * fuente; E4 nombre del comprador ("Capturó: …" en las OC de SAP, que no
 * traen comprador).
 *
 * Go-live 2026-09-30: I1 una OC cerrada o cancelada en Maximo o en SAP ya no
 * es entrega pendiente (badge "Cerrada en Maximo"…; el estatus de Maximo en
 * el tooltip) y el export para depurarlas en SAP; I2 "PO Maximo" y "OC SAP"
 * en columnas propias, y la búsqueda por cualquiera de los dos números.
 */

const PAGE_SIZE = 15;

type SourceStats = Record<DeliveryStatus, number>;

interface ExpeditingStats {
  total: number;
  counts: Record<DeliveryStatus, number>;
  /** Sprint 2026-09-22 (B6): desglose por fuente (ABENT / SAP / Maximo). */
  by_source?: Record<ExpeditingSource, SourceStats>;
  /** E3: días de retraso promedio de las retrasadas (null = ninguna). */
  avg_delay_days: number | null;
  avg_delay_by_source?: Record<ExpeditingSource, number | null>;
  /** I1a: abiertas en SAP que ya están cerradas o canceladas en Maximo. */
  closed_in_maximo?: number;
}

const ORIGIN_LABELS: Record<string, string> = {
  abent: 'ABENT',
  sap: 'SAP',
  sap_maximo: 'SAP (migrada de Maximo)',
  maximo: 'Maximo',
};

const COLUMNS: ColumnConfigs = {
  // I2: los dos números; la OC propia de ABENT va en la columna de la OC
  po_maximo: { label: 'PO Maximo', type: 'text', emptyLabel: '(Sin PO de Maximo)' },
  oc_sap: { label: 'OC SAP', type: 'text', emptyLabel: '(Sin OC de SAP)' },
  origen: { label: 'Origen', type: 'text', format: (v) => ORIGIN_LABELS[v] ?? v },
  proveedor: { label: 'Proveedor', type: 'text' },
  comprador: { label: 'Comprador', type: 'text', emptyLabel: '(Sin comprador)' },
  fecha: { label: 'Fecha vigente', type: 'date' },
  dias: { label: 'Días', type: 'number' },
  estatus: {
    label: 'Estatus',
    type: 'text',
    format: (v) => DELIVERY_STATUS_LABELS[v as DeliveryStatus] ?? v,
  },
  alertas: { label: 'Alertas', type: 'number' },
};

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * E3: "1,473 días de retraso" en rojo; "faltan N días" en tiempo/riesgo. El
 * número arriba y el texto abajo, para que la columna no ensanche la tabla.
 */
function DaysCell({ item }: { item: ExpeditingItem }) {
  const days = item.days_left;
  if (days === null || item.delivery_status === 'entregada' || item.delivery_status === 'cancelada') {
    return <span className="text-gray-400">—</span>;
  }
  if (days === 0) return <span className="font-medium text-amber-700 whitespace-nowrap">vence hoy</span>;
  const late = days < 0;
  const n = Math.abs(days);
  const color = late ? 'text-red-600' : item.delivery_status === 'en_riesgo' ? 'text-amber-700' : 'text-gray-700';
  return (
    <div className={`leading-tight ${color}`} title={late ? `${n} ${plural(n, 'día', 'días')} de retraso` : `Faltan ${n} ${plural(n, 'día', 'días')}`}>
      {!late && <span className="block text-xs">faltan</span>}
      <span className={`block ${late ? 'font-semibold' : 'font-medium'}`}>{n.toLocaleString('es-MX')}</span>
      <span className="block text-xs whitespace-nowrap">{plural(n, 'día', 'días')}{late ? ' de retraso' : ''}</span>
    </div>
  );
}

/**
 * I1: estatus derivado y, si la OC ya se cerró o canceló en el otro sistema,
 * el badge que lo explica. Tooltip: estatus en Maximo y recepción.
 */
function StatusCell({ item }: { item: ExpeditingItem }) {
  const maximo = maximoStatusText({
    maximo_status: item.maximo_status ?? null,
    receipt_status: item.receipt_status ?? null,
  });
  const closedBy = item.closed_by ? ERP_CLOSED_BY_LABELS[item.closed_by] : null;
  const partial = !item.closed_by && item.receipt_status?.toUpperCase() === 'PARTIAL';
  const title = [
    closedBy && item.source === 'sap' ? `Abierta en SAP; ${closedBy.toLowerCase()}` : closedBy,
    maximo,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="flex flex-col items-center gap-1" title={title || undefined}>
      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${DELIVERY_STATUS_CLASSES[item.delivery_status]}`}>
        {DELIVERY_STATUS_LABELS[item.delivery_status]}
      </span>
      {closedBy && (
        <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold leading-tight rounded bg-[#222D59]/10 text-[#222D59] whitespace-nowrap">
          {closedBy}
        </span>
      )}
      {partial && (
        <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold leading-tight rounded bg-orange-100 text-orange-800 whitespace-nowrap">
          Recepción parcial
        </span>
      )}
    </div>
  );
}

const STAT_CARDS: Array<{ key: DeliveryStatus; border: string }> = [
  { key: 'en_tiempo', border: 'border-[#52AF32]' },
  { key: 'en_riesgo', border: 'border-yellow-500' },
  { key: 'retrasada', border: 'border-red-500' },
  { key: 'entregada', border: 'border-[#222D59]' },
];

const formatAvg = (days: number | null | undefined) =>
  days === null || days === undefined ? '—' : `${Math.round(days).toLocaleString('es-MX')} d`;

function ExpeditacionContent() {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole(...PURCHASE_TEAM_ROLES);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<ExpeditingSource | ''>('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const cf = useColumnFilters('exp', () => setPage(1));

  // Filtros propios de la tabla; los de columna se suman en cada llamada
  const baseQuery = {
    search,
    status: statusFilter,
    source: sourceFilter,
    buyer_id: onlyMine && user?.id ? user.id : '',
  };
  const filteredQs = toQuery({ ...baseQuery, ...cf.params });
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...baseQuery, ...cf.params });

  const listQuery = useQuery({
    queryKey: ['expediting', listQs],
    queryFn: () => api.get<PaginatedResponse<ExpeditingItem>>(`/compras/expeditacion?${listQs}`),
    // E1: la tabla anterior se queda en pantalla mientras llega la nueva
    placeholderData: keepPreviousData,
  });

  // E1: las tarjetas salen del MISMO filtro que la lista y el Excel
  const statsQuery = useQuery({
    queryKey: ['expediting', 'stats', filteredQs],
    queryFn: () => api.get<ExpeditingStats>(`/compras/expeditacion/stats${filteredQs ? `?${filteredQs}` : ''}`),
  });

  const items = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const stats = statsQuery.data;
  const hasFilters = !!search || !!statusFilter || !!sourceFilter || onlyMine || cf.activeCount > 0;

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

      {/* Stats (con los filtros aplicados) */}
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
                {stats.counts[card.key].toLocaleString('es-MX')}
              </p>
              {stats.by_source && (
                <p className="text-xs text-gray-500 mt-1">
                  ABENT {stats.by_source.abent[card.key]} · SAP {stats.by_source.sap[card.key]} · Maximo {stats.by_source.maximo[card.key]}
                </p>
              )}
            </div>
          ))}
          <div
            className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500"
            title="Promedio de días de retraso de las órdenes retrasadas, con los filtros aplicados"
          >
            <p className="text-sm text-gray-500">Retraso promedio</p>
            <p className="text-2xl font-bold text-[#424846]">
              {stats.avg_delay_days === null
                ? '—'
                : `${stats.avg_delay_days.toLocaleString('es-MX')} ${plural(stats.avg_delay_days, 'día', 'días')}`}
            </p>
            {stats.avg_delay_by_source && (
              <p className="text-xs text-gray-500 mt-1">
                ABENT {formatAvg(stats.avg_delay_by_source.abent)} · SAP {formatAvg(stats.avg_delay_by_source.sap)} · Maximo {formatAvg(stats.avg_delay_by_source.maximo)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por PO de Maximo, OC de SAP o proveedor..."
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
          <ExportExcelButton
            path={`/compras/expeditacion/export${filteredQs ? `?${filteredQs}` : ''}`}
            filename={`expeditacion_${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
          {/* I1a: la lista para cerrarlas en SAP (con los mismos filtros) */}
          <ExportExcelButton
            path={`/compras/expeditacion/export?${toQuery({ ...baseQuery, ...cf.params, closed_in_maximo: 'true' })}`}
            filename={`expeditacion_depurar_sap_${new Date().toISOString().slice(0, 10)}.xlsx`}
            label={`Abiertas en SAP, cerradas en Maximo${stats?.closed_in_maximo !== undefined ? ` (${stats.closed_in_maximo.toLocaleString('es-MX')})` : ''}`}
            title="OC que SAP tiene abiertas pero en Maximo ya están cerradas o canceladas: ya no cuentan como entregas pendientes; descárgalas para cerrarlas en SAP"
            disabled={stats?.closed_in_maximo === 0}
          />
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
        <ResultChips filteredTotal={meta?.total} loading={listQuery.isLoading} />
        <ActiveColumnFilters cf={cf} columns={COLUMNS} />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : listQuery.isError ? (
          <p className="p-8 text-center text-red-600">
            No se pudo cargar la expeditación. Si aplicaste un filtro, límpialo e intenta de nuevo.
          </p>
        ) : items.length === 0 && !hasFilters ? (
          <div className="p-10 text-center">
            <p className="text-gray-500">
              No hay órdenes de compra activas en seguimiento
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <ColumnFilterProvider value={{ cf, columns: COLUMNS, facetsPath: '/compras/expeditacion/facets', baseQuery }}>
                <table className="w-full">
                  <thead className="bg-[#424846]">
                    <tr>
                      <FilterTh column="po_maximo">PO Maximo</FilterTh>
                      <FilterTh column="oc_sap" title="OC de SAP (en las propias, la OC de ABENT)">OC SAP</FilterTh>
                      <FilterTh column="origen" align="center">Origen</FilterTh>
                      <FilterTh column="proveedor">Proveedor</FilterTh>
                      <FilterTh column="comprador" title="SAP no tiene comprador en sus OC: se muestra quién la capturó">Comprador</FilterTh>
                      <FilterTh column="fecha" align="center">Fecha vigente</FilterTh>
                      <FilterTh column="dias" align="center">Días</FilterTh>
                      <FilterTh column="estatus" align="center">Estatus</FilterTh>
                      <FilterTh column="alertas" align="center">Alertas</FilterTh>
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.po_maximo ? (
                            <span className="font-mono font-medium text-[#8a6a10]">{item.po_maximo}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(item.source === 'abent' ? item.po_number : item.oc_sap) ? (
                            <span className="font-mono font-medium text-[#222D59]">
                              {item.source === 'abent' ? item.po_number : item.oc_sap}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
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
                          {item.source === 'sap' && item.maximo_ponum && (
                            <span
                              className="block mt-0.5 text-[10px] leading-tight text-[#8a6a10] whitespace-nowrap"
                              title={`Nació en Maximo (PO ${item.maximo_ponum}) y la integración la creó en SAP (OC ${item.oc_sap ?? item.po_number}). Se muestra una sola vez, con la fecha comprometida de SAP.`}
                            >
                              migrada de Maximo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-48">
                          {item.supplier?.legal_name ?? '—'}
                          {/* G1: proveedor efectivo de Maximo; "en Maximo: …" si su maestro lo nombra distinto */}
                          {item.supplier_note && (
                            <span className="block text-xs italic text-amber-700" title="Maximo tiene otro nombre para este proveedor; se muestra el de SAP">
                              {item.supplier_note}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm min-w-40">
                          {item.buyer_name ? (
                            <span
                              className={item.buyer_kind === 'capturo' ? 'text-gray-500' : 'text-gray-900'}
                              title={
                                item.buyer_kind === 'capturo'
                                  ? item.source === 'maximo' || item.maximo_ponum
                                    ? 'Sin agente de compras en Maximo: se muestra quién creó la OC'
                                    : 'La OC de SAP no trae comprador: se muestra el usuario que la capturó'
                                  : undefined
                              }
                            >
                              {buyerLabel(item)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(item.effective_expected_date)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <DaysCell item={item} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusCell item={item} />
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {item.purchase_order_id ? (item.tracking?.alert_count ?? 0) : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                          No hay órdenes que coincidan con los filtros
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
                  Mostrando {((meta.page - 1) * meta.limit + 1).toLocaleString('es-MX')} -{' '}
                  {Math.min(meta.page * meta.limit, meta.total).toLocaleString('es-MX')} de {meta.total.toLocaleString('es-MX')}
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

/** Los filtros por columna viven en la URL: useSearchParams pide Suspense. */
export default function ExpeditacionPage() {
  return (
    <Suspense fallback={null}>
      <ExpeditacionContent />
    </Suspense>
  );
}
