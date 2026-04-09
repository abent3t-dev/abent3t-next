'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { Supplier } from '@/types/purchases';
import SupplierModal from '@/components/compras/SupplierModal';

interface PaginatedResponse {
  data: Supplier[];
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
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  ban: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  star: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

export default function ProveedoresPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [blockedFilter, setBlockedFilter] = useState<'' | 'true' | 'false'>('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (blockedFilter) queryParams.set('is_blocked', blockedFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, blockedFilter],
    queryFn: () => api.get<PaginatedResponse>(`/suppliers?${queryParams.toString()}`),
  });

  const suppliers = data?.data ?? [];

  const blockMutation = useMutation({
    mutationFn: (params: { id: string; reason: string }) =>
      api.put(`/suppliers/${params.id}/block`, { reason: params.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      notify.success('Proveedor bloqueado');
    },
    onError: () => notify.error('Error al bloquear proveedor'),
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => api.put(`/suppliers/${id}/unblock`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      notify.success('Proveedor desbloqueado');
    },
    onError: () => notify.error('Error al desbloquear proveedor'),
  });

  const handleBlock = async (id: string) => {
    const reason = prompt('Motivo del bloqueo:');
    if (!reason) return;
    blockMutation.mutate({ id, reason });
  };

  const handleUnblock = async (id: string) => {
    const confirmed = await notify.confirm('Desbloquear este proveedor?');
    if (!confirmed) return;
    unblockMutation.mutate(id);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Catalogo de Proveedores</h1>
          <p className="text-gray-500">Gestiona los proveedores de la organizacion</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors"
        >
          {Icons.plus}
          <span>Nuevo Proveedor</span>
        </button>
      </div>

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, RFC o email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <select
            value={blockedFilter}
            onChange={(e) => setBlockedFilter(e.target.value as '' | 'true' | 'false')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
          >
            <option value="">Todos</option>
            <option value="false">Activos</option>
            <option value="true">Bloqueados</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#424846]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">RFC</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Contacto</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Puntuacion</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((supplier, idx) => (
                <tr key={supplier.id} className={`hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{supplier.legal_name}</p>
                      {supplier.commercial_name && (
                        <p className="text-sm text-gray-500">{supplier.commercial_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{supplier.tax_id}</td>
                  <td className="px-4 py-3 text-sm">
                    <p className="text-gray-900">{supplier.contact_name || '-'}</p>
                    <p className="text-gray-500">{supplier.contact_email || supplier.email || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`font-bold ${getScoreColor(supplier.performance_score)}`}>
                        {supplier.performance_score}
                      </span>
                      <span className={getScoreColor(supplier.performance_score)}>{Icons.star}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                      supplier.is_blocked
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {supplier.is_blocked ? 'Bloqueado' : 'Activo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-[#52AF32] hover:bg-[#52AF32]/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        {Icons.edit}
                      </button>
                      {supplier.is_blocked ? (
                        <button
                          onClick={() => handleUnblock(supplier.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Desbloquear"
                        >
                          {Icons.check}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlock(supplier.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Bloquear"
                        >
                          {Icons.ban}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay proveedores que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={showModal}
        onClose={handleCloseModal}
        supplier={editingSupplier}
      />
    </div>
  );
}
