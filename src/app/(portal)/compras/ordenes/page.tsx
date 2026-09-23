'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ResultChips from '@/components/compras/ResultChips';
import StatusMultiSelect from '@/components/compras/StatusMultiSelect';
import {
  PurchaseOrder,
  PurchaseOrderStats,
  POStatus,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
  DELIVERY_STATUS_CLASSES,
  DELIVERY_STATUS_LABELS,
  deriveDeliveryChip,
} from '@/types/purchases';
import ExpeditingModal from '@/components/compras/ExpeditingModal';
import PurchaseOrderModal from '@/components/compras/PurchaseOrderModal';
import MaximoOrdersTab from '@/components/compras/MaximoOrdersTab';
import SapOrdersTab from '@/components/compras/SapOrdersTab';
import OrdersKpiCards from '@/components/compras/OrdersKpiCards';
import YearChips from '@/components/compras/YearChips';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_TEAM_ROLES } from '@/types/auth';
import { SHOW_INTERNAL_REQUISITIONS } from '@/lib/features';
import type { DashboardSummary } from '@/types/purchases';

// Fase INT-5 (T6): pestanas por fuente. La pestana "Contratos Maximo" se
// movio a /compras/contratos al implementarse §15. Int-4 agrego "Ordenes SAP".
// Bloque 2026-09-23: D5 tarjetas de ahorro y CAPEX/OPEX arriba de las
// pestañas; D4 filtro por año compartido (viaja desde el dashboard); D1
// origen/PO Maximo desde la URL; D7 la pestaña ABENT se oculta por bandera.
type OrdersTab = 'abent' | 'maximo_po' | 'sap_po';
const TAB_IDS: OrdersTab[] = ['abent', 'maximo_po', 'sap_po'];
const STATUS_OPTIONS = Object.entries(PO_STATUS_LABELS).map(([value, label]) => ({ value, label }));

const ORDER_TABS: { id: OrdersTab; label: string }[] = [
  ...(SHOW_INTERNAL_REQUISITIONS ? [{ id: 'abent' as OrdersTab, label: 'Órdenes ABENT' }] : []),
  { id: 'sap_po', label: 'Órdenes SAP' },
  { id: 'maximo_po', label: 'Órdenes Maximo' },
];
const DEFAULT_TAB: OrdersTab = SHOW_INTERNAL_REQUISITIONS ? 'abent' : 'sap_po';

interface PaginatedResponse {
  data: PurchaseOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const Icons = {
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  truck: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const getStatusBadgeClass = (status: POStatus) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    indigo: 'bg-indigo-100 text-indigo-800',
  };
  return colorMap[PO_STATUS_COLORS[status]] || 'bg-gray-100 text-gray-800';
};

function OrdenesPageInner({
  initialTab,
  initialStatus,
  initialYear,
  initialSearch,
  initialOrigin,
}: {
  initialTab: OrdersTab | null;
  initialStatus: string[];
  initialYear: number | null;
  initialSearch: string;
  initialOrigin: 'sap' | 'maximo' | '';
}) {
  // Modelo "ver todos, actuar por rol": crear/editar solo equipo de compras
  // (espejo de los @Roles del backend). La expeditación desde la fila queda
  // abierta: es consulta, y sus formularios se gatean dentro del modal.
  const { hasRole } = useAuth();
  const canEdit = hasRole('super_admin', ...PURCHASE_TEAM_ROLES);
  const [activeTab, setActiveTab] = useState<OrdersTab>(
    initialTab && (initialTab !== 'abent' || SHOW_INTERNAL_REQUISITIONS) ? initialTab : DEFAULT_TAB,
  );
  // D4: año compartido por las tarjetas D5 y las pestañas SAP/Maximo
  const [year, setYear] = useState<number | null>(initialYear);
  const yearsQ = useQuery({
    queryKey: ['compras', 'dashboard', 'summary', null],
    queryFn: () => api.get<DashboardSummary>('/compras/dashboard/summary'),
    staleTime: 5 * 60_000,
  });
  const years = yearsQ.data?.datos.anios ?? [];
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>(
    initialTab === 'abent' ? initialStatus : [],
  );
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  // Fase Expeditación (B4): acceso al seguimiento desde la fila
  const [expeditingPoId, setExpeditingPoId] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', '15');
  if (search) queryParams.set('search', search);
  if (statuses.length) queryParams.set('status', statuses.join(','));

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', search, statuses.join(','), page],
    queryFn: () => api.get<PaginatedResponse>(`/purchase-orders?${queryParams.toString()}`),
  });
  const statsQ = useQuery({
    queryKey: ['purchase-orders', 'stats'],
    queryFn: () => api.get<PurchaseOrderStats>('/purchase-orders/stats'),
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const chips = STATUS_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    count: statsQ.data?.by_status?.[opt.value as POStatus]?.count ?? 0,
    className: getStatusBadgeClass(opt.value as POStatus),
  }));
  const toggleStatus = (key: string) => {
    setStatuses(statuses.includes(key) ? statuses.filter((s) => s !== key) : [...statuses, key]);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Órdenes de Compra (PO)</h1>
          <p className="text-gray-500">Gestiona las órdenes de compra emitidas</p>
        </div>
        {activeTab === 'abent' && canEdit && (
          <button
            onClick={() => {
              setEditingOrder(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Orden
          </button>
        )}
      </div>

      {/* D5: ahorro acumulado y CAPEX/OPEX (SAP + Maximo, por moneda) */}
      <OrdersKpiCards year={year} />

      {/* Tabs por fuente (T6) + año (D4) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl p-2 shadow">
        <div className="flex gap-2">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#52AF32] text-white'
                  : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {years.length > 0 && activeTab !== 'abent' && (
          <div className="px-2">
            <YearChips years={years} value={year} onChange={setYear} compact />
          </div>
        )}
      </div>

      {activeTab === 'maximo_po' && (
        <MaximoOrdersTab
          initialStatus={initialTab === 'maximo_po' ? initialStatus : []}
          initialSearch={initialTab === 'maximo_po' ? initialSearch : ''}
          year={year}
        />
      )}
      {activeTab === 'sap_po' && (
        <SapOrdersTab
          initialStatus={initialTab === 'sap_po' ? initialStatus : []}
          initialOrigin={initialTab === 'sap_po' ? initialOrigin : ''}
          year={year}
        />
      )}

      {activeTab === 'abent' && (
      <>
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {Icons.search}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por número de PO..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <StatusMultiSelect
            options={STATUS_OPTIONS}
            value={statuses}
            onChange={(next) => { setStatuses(next); setPage(1); }}
            placeholder="Todos los estados"
          />
        </div>
        <div className="mt-3">
          <ResultChips
            filteredTotal={meta?.total}
            grandTotal={statsQ.data?.total}
            statuses={chips}
            activeStatuses={statuses}
            onToggleStatus={toggleStatus}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-[#424846]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">No. PO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">RQ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Entrega Est.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Entrega</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((po, idx) => (
                  <tr key={po.id} className={`hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-[#222D59]">{po.po_number}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {po.requisition?.rq_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="text-gray-900">{po.supplier?.legal_name || '-'}</p>
                      <p className="text-xs text-gray-500">{po.supplier?.tax_id}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        po.expense_type === 'CAPEX' ? 'bg-[#52AF32]/10 text-[#52AF32]' : 'bg-[#222D59]/10 text-[#222D59]'
                      }`}>
                        {po.expense_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(po.amount)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {formatDate(po.expected_delivery_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const chip = deriveDeliveryChip(po);
                        return (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${DELIVERY_STATUS_CLASSES[chip]}`}>
                            {DELIVERY_STATUS_LABELS[chip]}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(po.status)}`}>
                        {po.status === 'en_transito' && Icons.truck}
                        {PO_STATUS_LABELS[po.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                        <button
                          onClick={() => {
                            setEditingOrder(po);
                            setShowModal(true);
                          }}
                          className="p-2 text-[#52AF32] hover:bg-[#52AF32]/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        )}
                        <button
                          onClick={() => setExpeditingPoId(po.id)}
                          className="p-2 text-[#222D59] hover:bg-[#222D59]/10 rounded-lg transition-colors"
                          title="Expeditación (seguimiento de entrega)"
                        >
                          {Icons.truck}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No hay órdenes de compra que coincidan con los filtros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  Mostrando {((meta.page - 1) * meta.limit) + 1} - {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {Icons.chevronLeft}
                  </button>
                  <span className="text-sm text-gray-700">
                    Página {meta.page} de {meta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === meta.totalPages}
                    className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {Icons.chevronRight}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Orden de Compra */}
      <PurchaseOrderModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingOrder(null);
        }}
        purchaseOrder={editingOrder}
      />
      {/* Fase Expeditación (B4): seguimiento de entrega de la PO. El modal
          es consulta para cualquiera; sus formularios respetan canEdit. */}
      <ExpeditingModal
        isOpen={expeditingPoId !== null}
        onClose={() => setExpeditingPoId(null)}
        purchaseOrderId={expeditingPoId}
        canEdit={canEdit}
      />
      </>
      )}
    </div>
  );
}

/**
 * Pestana/estatus iniciales desde la URL (?tab=sap_po&status=open&year=2025
 * &origin=maximo&search=PO1234); Suspense por useSearchParams.
 */
function OrdenesFromUrl() {
  const params = useSearchParams();
  const tabParam = params.get('tab');
  const initialTab = TAB_IDS.includes(tabParam as OrdersTab) ? (tabParam as OrdersTab) : null;
  const initialStatus = (params.get('status') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const yearParam = Number(params.get('year'));
  const initialYear = Number.isInteger(yearParam) && yearParam > 2000 ? yearParam : null;
  const originParam = params.get('origin');
  const initialOrigin = originParam === 'sap' || originParam === 'maximo' ? originParam : '';
  const initialSearch = params.get('search') ?? '';
  return (
    <OrdenesPageInner
      key={`${initialTab ?? ''}|${initialStatus.join(',')}|${initialYear ?? ''}|${initialOrigin}|${initialSearch}`}
      initialTab={initialTab}
      initialStatus={initialStatus}
      initialYear={initialYear}
      initialSearch={initialSearch}
      initialOrigin={initialOrigin}
    />
  );
}

export default function OrdenesPage() {
  return (
    <Suspense fallback={null}>
      <OrdenesFromUrl />
    </Suspense>
  );
}
