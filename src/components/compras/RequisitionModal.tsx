'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import type { Requisition, ExpenseType } from '@/types/purchases';

interface RequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition?: Requisition | null;
}

interface Department {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

const Icons = {
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function RequisitionModal({ isOpen, onClose, requisition }: RequisitionModalProps) {
  const qc = useQueryClient();
  const isEditing = !!requisition;

  const [formData, setFormData] = useState({
    rq_number: '',
    description: '',
    requester_id: '',
    department_id: '',
    buyer_id: '',
    expense_type: 'OPEX' as ExpenseType,
    estimated_amount: 0,
    justification: '',
    created_date: new Date().toISOString().split('T')[0],
    required_date: '',
  });

  // Cargar departamentos
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<Department[]>('/departments'),
    enabled: isOpen,
  });

  // Cargar compradores (usuarios con rol de compras)
  const { data: buyers } = useQuery({
    queryKey: ['buyers'],
    queryFn: () => api.get<{ data: Profile[] }>('/auth/users?role=comprador'),
    enabled: isOpen,
  });

  // Cargar datos si es edicion
  useEffect(() => {
    if (requisition) {
      setFormData({
        rq_number: requisition.rq_number || '',
        description: requisition.description || '',
        requester_id: requisition.requester_id || '',
        department_id: requisition.department_id || '',
        buyer_id: requisition.buyer_id || '',
        expense_type: requisition.expense_type || 'OPEX',
        estimated_amount: requisition.estimated_amount || 0,
        justification: requisition.justification || '',
        created_date: requisition.created_date || new Date().toISOString().split('T')[0],
        required_date: requisition.required_date || '',
      });
    } else {
      setFormData({
        rq_number: '',
        description: '',
        requester_id: '',
        department_id: '',
        buyer_id: '',
        expense_type: 'OPEX',
        estimated_amount: 0,
        justification: '',
        created_date: new Date().toISOString().split('T')[0],
        required_date: '',
      });
    }
  }, [requisition]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/requisitions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      notify.success('Requisicion creada correctamente');
      onClose();
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Error al crear requisicion');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => api.put(`/requisitions/${requisition?.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      notify.success('Requisicion actualizada correctamente');
      onClose();
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Error al actualizar requisicion');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      notify.error('La descripcion es requerida');
      return;
    }
    if (!formData.requester_id) {
      notify.error('El solicitante es requerido');
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#424846]">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? 'Editar Requisicion' : 'Nueva Requisicion'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-300 hover:text-white">
            {Icons.x}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-4">
            {/* Numero y Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. Requisicion
                </label>
                <input
                  type="text"
                  value={formData.rq_number}
                  onChange={(e) => setFormData({ ...formData, rq_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 font-mono"
                  placeholder="RQ-2026-00001 (auto si vacio)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Gasto *
                </label>
                <select
                  value={formData.expense_type}
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value as ExpenseType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                >
                  <option value="OPEX">OPEX (Operativo)</option>
                  <option value="CAPEX">CAPEX (Capital)</option>
                </select>
              </div>
            </div>

            {/* Descripcion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripcion *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                placeholder="Descripcion detallada de la solicitud de compra"
              />
            </div>

            {/* Solicitante y Departamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solicitante *
                </label>
                <input
                  type="text"
                  value={formData.requester_id}
                  onChange={(e) => setFormData({ ...formData, requester_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                  placeholder="ID del solicitante"
                />
                <p className="text-xs text-gray-500 mt-1">UUID del usuario solicitante</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comprador y Monto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprador Asignado
                </label>
                <select
                  value={formData.buyer_id}
                  onChange={(e) => setFormData({ ...formData, buyer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                >
                  <option value="">Sin asignar</option>
                  {buyers?.data?.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>{buyer.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Estimado
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.estimated_amount}
                    onChange={(e) => setFormData({ ...formData, estimated_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Creacion *
                </label>
                <input
                  type="date"
                  value={formData.created_date}
                  onChange={(e) => setFormData({ ...formData, created_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Requerida
                </label>
                <input
                  type="date"
                  value={formData.required_date}
                  onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                />
              </div>
            </div>

            {/* Justificacion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justificacion
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                placeholder="Justificacion de la compra"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Requisicion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
