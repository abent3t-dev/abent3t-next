'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Requisition,
  RequisitionStatus,
  RequisitionStats,
  ExpenseType,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_COLORS,
  EXPENSE_TYPE_LABELS,
} from '@/types/purchases';
import RequisitionModal from '@/components/compras/RequisitionModal';
import SapRequestsTab from '@/components/compras/SapRequestsTab';
import MaximoRequestsTab from '@/components/compras/MaximoRequestsTab';
import ResultChips from '@/components/compras/ResultChips';
import StatusMultiSelect from '@/components/compras/StatusMultiSelect';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';
import { PURCHASE_TEAM_ROLES } from '@/types/auth';
import { SHOW_INTERNAL_REQUISITIONS } from '@/lib/features';

// Bloque 2026-09-23 (D7): la pestaña de requisiciones propias se OCULTA
// (Ingrid: "no la vamos a ocupar"); backend y rutas intactos, bandera
// NEXT_PUBLIC_SHOW_INTERNAL_REQUISITIONS=true la devuelve. D4: `year` y
// `maximo_status` desde la URL (tarjeta de pendientes del dashboard).
// Int-4 (T6): pestanas por fuente, mismo patron que /compras/ordenes.
// Modelo "ver todos, actuar por rol" (junta 2026-09-17): la lectura —
// pestana SAP incluida — es para cualquier autenticado; los botones de
// accion se condicionan por rol (espejo de los @Roles del backend).
// Sprint 2026-09-22 (A7): pestana de solicitudes de Maximo; la pestana
// inicial y el estatus vienen de la URL (clic en un pie del dashboard, A2).
type RequestsTab = 'abent' | 'sap_pr' | 'maximo_pr';
const TAB_IDS: RequestsTab[] = ['abent', 'sap_pr', 'maximo_pr'];

// POST /requisitions: equipo de compras + solicitante.
const CREATOR_ROLES: UserRole[] = ['super_admin', ...PURCHASE_TEAM_ROLES, 'solicitante'];
// PUT /requisitions/:id: solo equipo de compras.
const EDITOR_ROLES: UserRole[] = ['super_admin', ...PURCHASE_TEAM_ROLES];

const REQUEST_TABS: { id: RequestsTab; label: string }[] = [
  ...(SHOW_INTERNAL_REQUISITIONS ? [{ id: 'abent' as RequestsTab, label: 'Solicitudes ABENT' }] : []),
  { id: 'sap_pr', label: 'Solicitudes SAP' },
  { id: 'maximo_pr', label: 'Solicitudes Maximo' },
];

const STATUS_OPTIONS = Object.entries(REQUISITION_STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface PaginatedResponse {
  data: Requisition[];
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
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

const getStatusBadgeClass = (status: RequisitionStatus) => {
  const colorMap: Record<string, string> = {
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
  };
  return colorMap[REQUISITION_STATUS_COLORS[status]] || 'bg-gray-100 text-gray-800';
};

function SolicitudesPageInner({
  initialTab,
  initialStatus,
  initialMaximoStatus,
  initialYear,
}: {
  initialTab: RequestsTab | null;
  initialStatus: string[];
  initialMaximoStatus: string[];
  initialYear: number | null;
}) {
  const { hasRole } = useAuth();
  const canCreate = hasRole(...CREATOR_ROLES) && SHOW_INTERNAL_REQUISITIONS;
  const canEdit = hasRole(...EDITOR_ROLES);
  // null = el usuario no ha elegido pestana: se abre la primera con datos
  // (A7 extra — Ingrid entraba y veia la tabla ABENT vacia).
  const [userTab, setUserTab] = useState<RequestsTab | null>(
    initialTab === 'abent' && !SHOW_INTERNAL_REQUISITIONS ? null : initialTab,
  );
  const visibleTabs = REQUEST_TABS;
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>(
    initialTab === 'abent' ? initialStatus : [],
  );
  const [typeFilter, setTypeFilter] = useState<ExpenseType | ''>('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', '15');
  if (search) queryParams.set('search', search);
  if (statuses.length) queryParams.set('status', statuses.join(','));
  if (typeFilter) queryParams.set('expense_type', typeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', search, statuses.join(','), typeFilter, page],
    queryFn: () => api.get<PaginatedResponse>(`/requisitions?${queryParams.toString()}`),
  });
  const statsQ = useQuery({
    queryKey: ['requisitions', 'stats'],
    queryFn: () => api.get<RequisitionStats>('/requisitions/stats'),
  });

  const requisitions = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || statuses.length > 0 || !!typeFilter;
  const abentEmpty = data !== undefined && meta?.total === 0 && !hasFilters;
  const activeTab: RequestsTab =
    userTab ?? (!SHOW_INTERNAL_REQUISITIONS || abentEmpty ? 'sap_pr' : 'abent');
  const chips = STATUS_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    count: statsQ.data?.by_status?.[opt.value as RequisitionStatus] ?? 0,
    className: getStatusBadgeClass(opt.value as RequisitionStatus),
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
          <h1 className="text-2xl font-bold text-[#424846]">Solicitudes de Compra (RQ)</h1>
          <p className="text-gray-500">Gestiona las requisiciones de compra</p>
        </div>
        {activeTab === 'abent' && canCreate && (
          <button
            onClick={() => {
              setEditingRequisition(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Requisición
          </button>
        )}
      </div>

      {/* Tabs por fuente (T6) */}
      <div className="flex gap-2 bg-white rounded-xl p-2 shadow">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setUserTab(tab.id)}
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

      {activeTab === 'sap_pr' && (
        <SapRequestsTab initialStatus={initialTab === 'sap_pr' ? initialStatus : []} year={initialYear} />
      )}
      {activeTab === 'maximo_pr' && (
        <MaximoRequestsTab
          initialStatus={initialTab === 'maximo_pr' ? initialStatus : initialMaximoStatus}
          year={initialYear}
        />
      )}

      {activeTab === 'abent' && SHOW_INTERNAL_REQUISITIONS && (
      <>
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          {/* Search */}
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
              placeholder="Buscar por número de RQ o descripción..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Status Filter (A5: multi-seleccion) */}
          <StatusMultiSelect
            options={STATUS_OPTIONS}
            value={statuses}
            onChange={(next) => { setStatuses(next); setPage(1); }}
          />

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ExpenseType | '');
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">CAPEX/OPEX</option>
            {Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">No. RQ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Solicitante</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Monto Est.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Días</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requisitions.map((rq, idx) => (
                  <tr key={rq.id} className={`hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-[#222D59]">{rq.rq_number}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={rq.description}>
                      {rq.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {rq.requester?.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        rq.expense_type === 'CAPEX' ? 'bg-[#52AF32]/10 text-[#52AF32]' : 'bg-[#222D59]/10 text-[#222D59]'
                      }`}>
                        {rq.expense_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(rq.estimated_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        {Icons.clock}
                        <span>{rq.business_days_elapsed}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(rq.status)}`}>
                        {REQUISITION_STATUS_LABELS[rq.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                        <button
                          onClick={() => {
                            setEditingRequisition(rq);
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
                          onClick={() => console.log('Ver detalle:', rq.id)}
                          className="p-2 text-[#222D59] hover:bg-[#222D59]/10 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          {Icons.eye}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {requisitions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No hay requisiciones que coincidan con los filtros
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

      </>
      )}

      {/* Modal de Requisición */}
      <RequisitionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRequisition(null);
        }}
        requisition={editingRequisition}
      />
    </div>
  );
}

/**
 * La pestana y el estatus iniciales vienen de la URL (?tab=sap_pr&status=open);
 * useSearchParams exige un Suspense en el arbol.
 */
function SolicitudesFromUrl() {
  const params = useSearchParams();
  const tabParam = params.get('tab');
  const initialTab = TAB_IDS.includes(tabParam as RequestsTab) ? (tabParam as RequestsTab) : null;
  const initialStatus = (params.get('status') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // D4: la tarjeta de pendientes manda SAP=open y Maximo=WAPPR,PNDREV a la vez
  const initialMaximoStatus = (params.get('maximo_status') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const yearParam = Number(params.get('year'));
  const initialYear = Number.isInteger(yearParam) && yearParam > 2000 ? yearParam : null;
  return (
    <SolicitudesPageInner
      key={`${initialTab ?? ''}|${initialStatus.join(',')}|${initialMaximoStatus.join(',')}|${initialYear ?? ''}`}
      initialTab={initialTab}
      initialStatus={initialStatus}
      initialMaximoStatus={initialMaximoStatus}
      initialYear={initialYear}
    />
  );
}

export default function SolicitudesPage() {
  return (
    <Suspense fallback={null}>
      <SolicitudesFromUrl />
    </Suspense>
  );
}
