'use client';

import { Suspense, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_TEAM_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  Contract,
  ContractStatus,
  CONTRACT_DOC_KIND_LABELS,
  CONTRACT_STATUS_LABELS,
} from '@/types/purchases';
import ContractModal from '@/components/compras/ContractModal';
import ContractGroupsView from '@/components/compras/ContractGroupsView';
import { ContractVigencia, formatContractMoney } from '@/components/compras/ContractVigencia';
import ResultChips from '@/components/compras/ResultChips';
import ExportExcelButton from '@/components/compras/ExportExcelButton';
import ContractStatusBadge from '@/components/compras/ContractStatusBadge';
import MaximoContractsTab from '@/components/compras/MaximoContractsTab';
import {
  ActiveColumnFilters,
  ColumnFilterProvider,
  FilterTh,
} from '@/components/ui/ColumnFilter';
import { useColumnFilters } from '@/hooks/useColumnFilters';
import type { ColumnConfigs } from '@/lib/column-filters';
import { toQuery } from '@/lib/compras-format';

/**
 * Fase §15 — Repositorio documental de contratos. Consulta abierta a
 * cualquier usuario autenticado; alta/edicion/subida solo PURCHASE_TEAM
 * (canEdit). La pestana "Contratos Maximo" llego aqui desde /compras/ordenes
 * (cierre de la provisionalidad T6).
 *
 * E1 (2026-09-25, pedido por César e Ingrid): filtro "tipo Excel" por
 * columna en las dos pestañas (URL, total y Excel con el mismo filtro).
 *
 * I6 (go-live 2026-09-30, base real de Diana): agrupados por carpeta por
 * defecto (el contrato con su CI, enmiendas y convenios), área usuaria (la
 * responsable del contrato) y comprador en la tabla, y "Sin fecha de fin".
 */

type ContractsTab = 'abent' | 'maximo';

const TABS: { id: ContractsTab; label: string }[] = [
  { id: 'abent', label: 'Contratos ABENT' },
  { id: 'maximo', label: 'Contratos Maximo' },
];

const PAGE_SIZE = 15;

const COLUMNS: ColumnConfigs = {
  numero: { label: 'Número', type: 'text' },
  carpeta: { label: 'Carpeta', type: 'text', emptyLabel: '(Sin carpeta)' },
  tipo: { label: 'Tipo de documento', type: 'text' },
  area: { label: 'Área usuaria', type: 'text', emptyLabel: '(Sin área)' },
  servicio: { label: 'Servicio', type: 'text' },
  proveedor: { label: 'Proveedor', type: 'text' },
  fin: { label: 'Fin de vigencia', type: 'date' },
  estatus: {
    label: 'Estatus',
    type: 'text',
    format: (v) => CONTRACT_STATUS_LABELS[v as ContractStatus] ?? v,
  },
  monto: { label: 'Monto', type: 'number' },
  consumido: { label: 'Consumido', type: 'number' },
  saldo: { label: 'Saldo', type: 'number' },
  comprador: { label: 'Comprador', type: 'text', emptyLabel: '(Sin comprador)' },
  responsable: { label: 'Responsable', type: 'text', emptyLabel: '(Sin responsable)' },
};

function ContratosContent() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...PURCHASE_TEAM_ROLES);

  const [activeTab, setActiveTab] = useState<ContractsTab>('abent');
  // I6: por carpeta (contrato + CI, enmiendas y convenios) por defecto
  const [grouped, setGrouped] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const cf = useColumnFilters('ct', () => setPage(1));

  // I6: "Sin fecha de fin" va en el mismo selector de vigencia
  const baseQuery = {
    search,
    status: statusFilter,
    vence_en_dias: expiryFilter === 'sin_fin' ? '' : expiryFilter,
    sin_fin: expiryFilter === 'sin_fin' ? 'true' : '',
  };
  const listQs = toQuery({ page, limit: PAGE_SIZE, ...baseQuery, ...cf.params });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contracts', listQs],
    queryFn: () => api.get<PaginatedResponse<Contract>>(`/compras/contratos?${listQs}`),
    // E1: la tabla anterior se queda en pantalla mientras llega la nueva
    placeholderData: keepPreviousData,
    enabled: activeTab === 'abent' && !grouped,
  });

  const contracts = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || !!statusFilter || !!expiryFilter || cf.activeCount > 0;
  const exportQs = toQuery({ ...baseQuery, ...cf.params });
  const exportPath = `/compras/contratos/export${exportQs ? `?${exportQs}` : ''}`;

  const openContract = (contract: Contract | null) => {
    setSelected(contract);
    setShowModal(true);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Contratos</h1>
          <p className="text-gray-500">
            Repositorio de contratos con proveedores: consulta, PDF y vigencias
          </p>
        </div>
        {canEdit && activeTab === 'abent' && (
          <button
            onClick={() => openContract(null)}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Contrato
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-2 shadow">
        {TABS.map((tab) => (
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

      {activeTab === 'maximo' && <MaximoContractsTab />}

      {activeTab === 'abent' && (
        <>
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
                placeholder="Buscar por número, servicio o proveedor..."
                className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ContractStatus | '');
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
              >
                <option value="">Todos los estatus</option>
                {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select
                value={expiryFilter}
                onChange={(e) => {
                  setExpiryFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white"
              >
                <option value="">Cualquier vigencia</option>
                <option value="30">Vence en 30 días</option>
                <option value="7">Vence en 7 días</option>
                <option value="sin_fin">Sin fecha de fin</option>
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-[#424846] select-none" title="Una fila por carpeta: el contrato con su carta de intención, enmiendas y convenios">
                <input
                  type="checkbox"
                  checked={grouped}
                  onChange={(e) => {
                    setGrouped(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-gray-300 text-[#52AF32] focus:ring-[#52AF32]"
                />
                Agrupar por carpeta
              </label>
            </div>
            <div className="mt-3">
              <ActiveColumnFilters cf={cf} columns={COLUMNS} />
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {grouped ? (
              <ColumnFilterProvider value={{ cf, columns: COLUMNS, facetsPath: '/compras/contratos/facets', baseQuery }}>
                <ContractGroupsView
                  params={{ ...baseQuery, ...cf.params }}
                  page={page}
                  setPage={setPage}
                  onOpen={openContract}
                />
              </ColumnFilterProvider>
            ) : isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : isError ? (
              <p className="p-8 text-center text-red-600">
                No se pudieron cargar los contratos. Si aplicaste un filtro, límpialo e intenta de nuevo.
              </p>
            ) : contracts.length === 0 && !hasFilters ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-gray-500">Aún no hay contratos registrados</p>
                {canEdit && (
                  <p className="text-sm text-gray-400">
                    Usa &quot;Nuevo Contrato&quot; para dar de alta el primero
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-gray-100">
                  <ResultChips filteredTotal={meta?.total} loading={isLoading} />
                  <ExportExcelButton
                    path={exportPath}
                    filename={`contratos_${new Date().toISOString().slice(0, 10)}.xlsx`}
                    disabled={contracts.length === 0}
                  />
                </div>
                <div className="overflow-x-auto">
                  <ColumnFilterProvider value={{ cf, columns: COLUMNS, facetsPath: '/compras/contratos/facets', baseQuery }}>
                  <table className="w-full">
                    <thead className="bg-[#424846]">
                      <tr>
                        <FilterTh column="numero">Número</FilterTh>
                        <FilterTh column="tipo">Tipo</FilterTh>
                        <FilterTh column="servicio">Servicio</FilterTh>
                        <FilterTh column="proveedor">Proveedor</FilterTh>
                        <FilterTh column="area" title="El área usuaria es la responsable del contrato">Área usuaria</FilterTh>
                        <FilterTh column="fin" align="center" title="Filtra y ordena por el fin de la vigencia">Vigencia</FilterTh>
                        <FilterTh column="estatus" align="center">Estatus</FilterTh>
                        <FilterTh column="monto" align="right">Monto</FilterTh>
                        <FilterTh column="consumido" align="right">Consumido</FilterTh>
                        <FilterTh column="saldo" align="right">Saldo</FilterTh>
                        <FilterTh column="comprador">Comprador</FilterTh>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {contracts.map((contract, idx) => (
                        <tr
                          key={contract.id}
                          onClick={() => openContract(contract)}
                          className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-[#222D59]">
                              {contract.contract_number}
                            </span>
                            {contract.external_link && (
                              <a
                                href={contract.external_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Abrir expediente (SharePoint) en pestaña nueva"
                                className="ml-2 inline-flex align-middle text-[#222D59] hover:text-[#52AF32]"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                              </a>
                            )}
                            {contract.tomo && (
                              <p className="text-xs text-gray-400">{contract.tomo}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {contract.document_label ?? CONTRACT_DOC_KIND_LABELS[contract.doc_kind]}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-900 max-w-48 truncate"
                            title={contract.service_description}
                          >
                            {contract.service_description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {contract.supplier?.legal_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {contract.user_area ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                            <ContractVigencia contract={contract} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ContractStatusBadge status={contract.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {contract.total_amount === null ? (
                              <span className="text-gray-500 italic text-xs whitespace-nowrap">No disponible</span>
                            ) : (
                              formatContractMoney(contract.total_amount, contract.currency)
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {contract.consumed_amount === null ? (
                              <span className="text-gray-500 italic text-xs whitespace-nowrap" title="Captura manual de Compras pendiente">No disponible</span>
                            ) : (
                              formatContractMoney(contract.consumed_amount, contract.currency)
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {contract.balance_amount === null ? (
                              <span className="text-gray-500 italic text-xs whitespace-nowrap" title="Requiere monto y consumido">No disponible</span>
                            ) : (
                              <span className={contract.balance_amount < 0 ? 'font-semibold text-red-600' : 'text-gray-900'}>
                                {formatContractMoney(contract.balance_amount, contract.currency)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {contract.buyer?.full_name ?? '—'}
                          </td>
                        </tr>
                      ))}
                      {contracts.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                            No hay contratos que coincidan con los filtros
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </ColumnFilterProvider>
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

          <ContractModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setSelected(null);
            }}
            contract={selected}
            canEdit={canEdit}
          />
        </>
      )}
    </div>
  );
}

/** Los filtros por columna viven en la URL: useSearchParams pide Suspense. */
export default function ContratosPage() {
  return (
    <Suspense fallback={null}>
      <ContratosContent />
    </Suspense>
  );
}
