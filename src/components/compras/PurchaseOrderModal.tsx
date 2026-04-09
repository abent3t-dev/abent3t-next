'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import type { PurchaseOrder, POStatus, ExpenseType } from '@/types/purchases';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder?: PurchaseOrder | null;
}

interface Supplier {
  id: string;
  legal_name: string;
  commercial_name?: string;
  tax_id: string;
  is_blocked: boolean;
}

interface Requisition {
  id: string;
  rq_number: string;
  description: string;
  status: string;
  expense_type: ExpenseType;
  estimated_amount: number;
}

interface PurchaseType {
  id: string;
  name: string;
  key: string;
  requires_contract: boolean;
}

interface Profile {
  id: string;
  full_name: string;
}

const Icons = {
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

const PO_STATUS_OPTIONS: { value: POStatus; label: string }[] = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada al Proveedor' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'en_transito', label: 'En Tránsito' },
  { value: 'entregada_parcial', label: 'Entregada Parcial' },
  { value: 'entregada_completa', label: 'Entregada Completa' },
  { value: 'cancelada', label: 'Cancelada' },
];

export default function PurchaseOrderModal({ isOpen, onClose, purchaseOrder }: PurchaseOrderModalProps) {
  const qc = useQueryClient();
  const isEditing = !!purchaseOrder;

  const [formData, setFormData] = useState({
    po_number: '',
    requisition_id: '',
    supplier_id: '',
    purchase_type_id: '',
    buyer_id: '',
    expense_type: 'OPEX' as ExpenseType,
    amount: 0,
    currency: 'MXN',
    expected_delivery_date: '',
    actual_delivery_date: '',
    status: 'borrador' as POStatus,
    notes: '',
  });

  // Cargar proveedores activos (no bloqueados)
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: () => api.get<{ data: Supplier[] }>('/suppliers?is_blocked=false'),
    enabled: isOpen,
  });

  // Cargar requisiciones aprobadas (o todas si es edición)
  const { data: requisitionsData } = useQuery({
    queryKey: ['requisitions-for-po', isEditing],
    queryFn: () => api.get<{ data: Requisition[] }>(`/requisitions?status=aprobada&limit=100`),
    enabled: isOpen,
  });

  // Cargar tipos de compra
  const { data: purchaseTypes } = useQuery({
    queryKey: ['purchase-types'],
    queryFn: () => api.get<PurchaseType[]>('/purchase-types'),
    enabled: isOpen,
  });

  // Cargar compradores
  const { data: buyersData } = useQuery({
    queryKey: ['buyers'],
    queryFn: () => api.get<{ data: Profile[] }>('/auth/users?role=comprador'),
    enabled: isOpen,
  });

  const suppliers = suppliersData?.data ?? [];
  const requisitions = requisitionsData?.data ?? [];
  const buyers = buyersData?.data ?? [];

  // Cargar datos si es edición
  useEffect(() => {
    if (purchaseOrder) {
      setFormData({
        po_number: purchaseOrder.po_number || '',
        requisition_id: purchaseOrder.requisition_id || '',
        supplier_id: purchaseOrder.supplier_id || '',
        purchase_type_id: purchaseOrder.purchase_type_id || '',
        buyer_id: purchaseOrder.buyer_id || '',
        expense_type: purchaseOrder.expense_type || 'OPEX',
        amount: purchaseOrder.amount || 0,
        currency: purchaseOrder.currency || 'MXN',
        expected_delivery_date: purchaseOrder.expected_delivery_date?.split('T')[0] || '',
        actual_delivery_date: purchaseOrder.actual_delivery_date?.split('T')[0] || '',
        status: purchaseOrder.status || 'borrador',
        notes: purchaseOrder.notes || '',
      });
    } else {
      setFormData({
        po_number: '',
        requisition_id: '',
        supplier_id: '',
        purchase_type_id: '',
        buyer_id: '',
        expense_type: 'OPEX',
        amount: 0,
        currency: 'MXN',
        expected_delivery_date: '',
        actual_delivery_date: '',
        status: 'borrador',
        notes: '',
      });
    }
  }, [purchaseOrder]);

  // Auto-llenar datos de la requisición seleccionada
  const handleRequisitionChange = (reqId: string) => {
    const selectedReq = requisitions.find(r => r.id === reqId);
    if (selectedReq) {
      setFormData(prev => ({
        ...prev,
        requisition_id: reqId,
        expense_type: selectedReq.expense_type,
        amount: selectedReq.estimated_amount,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        requisition_id: reqId,
      }));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/purchase-orders', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      notify.success('Orden de compra creada correctamente');
      onClose();
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Error al crear orden de compra');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => api.put(`/purchase-orders/${purchaseOrder?.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      notify.success('Orden de compra actualizada correctamente');
      onClose();
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Error al actualizar orden de compra');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      notify.error('Debe seleccionar un proveedor');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      notify.error('El monto debe ser mayor a 0');
      return;
    }
    if (!formData.expected_delivery_date) {
      notify.error('Debe indicar la fecha de entrega esperada');
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Verificar si el proveedor seleccionado requiere contrato
  const selectedPurchaseType = purchaseTypes?.find(pt => pt.id === formData.purchase_type_id);
  const requiresContract = selectedPurchaseType?.requires_contract ?? false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#424846]">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-300 hover:text-white">
            {Icons.x}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-4">
            {/* Numero PO y Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. Orden de Compra
                </label>
                <input
                  type="text"
                  value={formData.po_number}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 font-mono"
                  placeholder="PO-2026-00001 (auto si vacio)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as POStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                >
                  {PO_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Requisicion origen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requisición Origen
              </label>
              <select
                value={formData.requisition_id}
                onChange={(e) => handleRequisitionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
              >
                <option value="">Sin requisición asociada</option>
                {requisitions.map((rq) => (
                  <option key={rq.id} value={rq.id}>
                    {rq.rq_number} - {rq.description.substring(0, 50)}...
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Seleccionar una requisición auto-completa tipo y monto</p>
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor *
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                required
              >
                <option value="">Seleccionar proveedor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.commercial_name || s.legal_name} ({s.tax_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Compra y Comprador */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Compra
                </label>
                <select
                  value={formData.purchase_type_id}
                  onChange={(e) => setFormData({ ...formData, purchase_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {purchaseTypes?.map((pt) => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </select>
                {requiresContract && (
                  <p className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                    {Icons.warning} Este tipo de compra requiere contrato
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprador Responsable
                </label>
                <select
                  value={formData.buyer_id}
                  onChange={(e) => setFormData({ ...formData, buyer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                >
                  <option value="">Sin asignar</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>{b.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipo de Gasto y Monto */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Gasto
                </label>
                <select
                  value={formData.expense_type}
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value as ExpenseType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                >
                  <option value="OPEX">OPEX</option>
                  <option value="CAPEX">CAPEX</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900 bg-white"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Entrega Esperada *
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Entrega Real
                </label>
                <input
                  type="date"
                  value={formData.actual_delivery_date}
                  onChange={(e) => setFormData({ ...formData, actual_delivery_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas / Observaciones
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
                placeholder="Notas adicionales sobre la orden de compra"
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
              {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
