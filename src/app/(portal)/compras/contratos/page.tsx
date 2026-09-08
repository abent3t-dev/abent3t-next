'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_TEAM_ROLES } from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  Contract,
  ContractStatus,
  CONTRACT_DOCUMENT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
} from '@/types/purchases';
import ContractModal from '@/components/compras/ContractModal';
import ContractStatusBadge from '@/components/compras/ContractStatusBadge';
import MaximoContractsTab from '@/components/compras/MaximoContractsTab';

/**
 * Fase §15 — Repositorio documental de contratos. Consulta abierta a
 * cualquier usuario autenticado; alta/edicion/subida solo PURCHASE_TEAM
 * (canEdit). La pestana "Contratos Maximo" llego aqui desde /compras/ordenes
 * (cierre de la provisionalidad T6).
 */

type ContractsTab = 'abent' | 'maximo';

const TABS: { id: ContractsTab; label: string }[] = [
  { id: 'abent', label: 'Contratos ABENT' },
  { id: 'maximo', label: 'Contratos Maximo' },
];

const PAGE_SIZE = 15;
const EXPIRY_WARNING_DAYS = 30;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

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

/** Vence en < 30 dias (ambar). Vencido ya lo pinta el badge en rojo. */
const expiresSoon = (contract: Contract): boolean => {
  if (contract.status !== 'vigente') return false;
  const days = (new Date(contract.end_date).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days < EXPIRY_WARNING_DAYS;
};

export default function ContratosPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...PURCHASE_TEAM_ROLES);

  const [activeTab, setActiveTab] = useState<ContractsTab>('abent');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (expiryFilter) queryParams.set('vence_en_dias', expiryFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', search, statusFilter, expiryFilter, page],
    queryFn: () =>
      api.get<PaginatedResponse<Contract>>(
        `/compras/contratos?${queryParams.toString()}`,
      ),
    enabled: activeTab === 'abent',
  });

  const contracts = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!search || !!statusFilter || !!expiryFilter;

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
                placeholder="Buscar por numero, servicio o proveedor..."
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
                <option value="30">Vence en 30 dias</option>
                <option value="7">Vence en 7 dias</option>
              </select>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : contracts.length === 0 && !hasFilters ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-gray-500">Aun no hay contratos registrados</p>
                {canEdit && (
                  <p className="text-sm text-gray-400">
                    Usa &quot;Nuevo Contrato&quot; para dar de alta el primero
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#424846]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Numero</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Servicio</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Proveedor</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Vigencia</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase">Monto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Comprador</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Responsable</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
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
                            {contract.tomo && (
                              <p className="text-xs text-gray-400">{contract.tomo}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {CONTRACT_DOCUMENT_TYPE_LABELS[contract.document_type]}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-64 truncate">
                            {contract.service_description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {contract.supplier?.legal_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                            <span className="whitespace-nowrap">
                              {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
                            </span>
                            {expiresSoon(contract) && (
                              <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                Vence pronto
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatMoney(contract.total_amount, contract.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {contract.buyer?.full_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {contract.responsible_user_name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ContractStatusBadge status={contract.status} />
                          </td>
                        </tr>
                      ))}
                      {contracts.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            No hay contratos que coincidan con los filtros
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
