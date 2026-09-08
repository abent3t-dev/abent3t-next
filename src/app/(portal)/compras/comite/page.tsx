'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  APPROVER_ROLES,
  PURCHASE_ADMIN_ROLES,
  PURCHASE_TEAM_ROLES,
} from '@/types/auth';
import type { PaginatedResponse } from '@/types/pagination';
import {
  CommitteeApprovalLevel,
  CommitteeStatus,
  COMMITTEE_STATUS_CLASSES,
  COMMITTEE_STATUS_LABELS,
  PurchaseCommittee,
} from '@/types/purchases';
import CommitteeModal from '@/components/compras/CommitteeModal';
import CommitteeReviewModal from '@/components/compras/CommitteeReviewModal';

/**
 * Fase §16 — Comite de Compras: sesiones con estatus y nivel vigente,
 * filtros, "mis pendientes" para aprobadores, aviso de mapeo sin confirmar
 * (solo PURCHASE_ADMINS) y modales de detalle/revision.
 */

const PAGE_SIZE = 15;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

export default function ComitePage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(...PURCHASE_TEAM_ROLES);
  const isApprover = hasRole('lider_procura', ...APPROVER_ROLES);
  const isAdmin = hasRole(...PURCHASE_ADMIN_ROLES);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommitteeStatus | ''>('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PurchaseCommittee | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewing, setReviewing] = useState<PurchaseCommittee | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);

  const listQuery = useQuery({
    queryKey: ['committees', search, statusFilter, page],
    queryFn: () =>
      api.get<PaginatedResponse<PurchaseCommittee>>(
        `/compras/comite?${queryParams.toString()}`,
      ),
    enabled: !onlyMine,
  });

  const mineQuery = useQuery({
    queryKey: ['committees', 'pendientes-me'],
    queryFn: () => api.get<PurchaseCommittee[]>('/compras/comite/pendientes/me'),
    enabled: onlyMine && isApprover,
  });

  // Aviso §20.A.5: niveles sin confirmar (solo lo consultan los admins)
  const levelsQuery = useQuery({
    queryKey: ['committee-levels'],
    queryFn: () =>
      api.get<CommitteeApprovalLevel[]>('/compras/comite/niveles'),
    enabled: isAdmin,
    retry: false,
  });
  const unconfirmed =
    levelsQuery.data?.filter((l) => l.is_active && !l.confirmed) ?? [];

  const committees = onlyMine ? (mineQuery.data ?? []) : (listQuery.data?.data ?? []);
  const meta = onlyMine ? null : listQuery.data?.meta;
  const isLoading = onlyMine ? mineQuery.isLoading : listQuery.isLoading;
  const hasFilters = !!search || !!statusFilter || onlyMine;

  const openCommittee = (committee: PurchaseCommittee | null) => {
    setSelected(committee);
    setShowModal(true);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Comite de Compras</h1>
          <p className="text-gray-500">
            Sesiones semanales con cadena de aprobacion y trazabilidad
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => openCommittee(null)}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Comite
          </button>
        )}
      </div>

      {/* Aviso discreto: mapeo pendiente de confirmar (regla 1 de la fase) */}
      {isAdmin && unconfirmed.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          La cadena de aprobacion tiene {unconfirmed.length} nivel(es) sin
          confirmar con Ingrid (Gilberto vs David; Felix:
          director_general/cfo). El flujo opera con el mapeo propuesto; al
          confirmarse se actualiza por datos, sin deploy.
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
            placeholder="Buscar por numero o titulo..."
            disabled={onlyMine}
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as CommitteeStatus | '');
              setPage(1);
            }}
            disabled={onlyMine}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white disabled:bg-gray-100"
          >
            <option value="">Todos los estatus</option>
            {Object.entries(COMMITTEE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {isApprover && (
            <button
              type="button"
              onClick={() => setOnlyMine(!onlyMine)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                onlyMine
                  ? 'bg-[#52AF32] text-white'
                  : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Mis pendientes
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : committees.length === 0 && !hasFilters ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">Aun no hay comites registrados</p>
            {canEdit && (
              <p className="text-sm text-gray-400">
                Usa &quot;Nuevo Comite&quot; para crear la primera sesion
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Titulo</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Fecha</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Version</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estatus</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Autor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {committees.map((committee, idx) => (
                    <tr
                      key={committee.id}
                      onClick={() => openCommittee(committee)}
                      className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-[#222D59]">
                          {committee.committee_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-64 truncate">
                        {committee.title}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {formatDate(committee.committee_date)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        v{committee.current_version}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${COMMITTEE_STATUS_CLASSES[committee.status]}`}>
                          {COMMITTEE_STATUS_LABELS[committee.status]}
                          {committee.status === 'en_aprobacion' &&
                            committee.current_level &&
                            ` · nivel ${committee.current_level.orden}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {committee.author?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {committee.is_my_turn ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewing(committee);
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Revisar
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">Ver</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {committees.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        {onlyMine
                          ? 'No tienes comites esperando tu aprobacion'
                          : 'No hay comites que coincidan con los filtros'}
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

      <CommitteeModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelected(null);
        }}
        committee={selected}
        canEdit={canEdit}
      />
      <CommitteeReviewModal
        isOpen={reviewing !== null}
        onClose={() => setReviewing(null)}
        committee={reviewing}
      />
    </div>
  );
}
