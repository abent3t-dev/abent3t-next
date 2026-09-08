'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import {
  DELIVERY_EVENT_LABELS,
  DELIVERY_STATUS_CLASSES,
  DELIVERY_STATUS_LABELS,
  DeliveryTrackingEvent,
  ExpeditingDetail,
} from '@/types/purchases';

/**
 * Fase Expeditación — Detalle de la entrega de una PO propia: datos de la
 * orden (solo lectura), linea de tiempo de seguimientos y formularios de
 * nota / reprogramacion / recepcion (solo PURCHASE_TEAM).
 */

interface ExpeditingModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrderId: string | null;
  canEdit: boolean;
}

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

const eventSummary = (event: DeliveryTrackingEvent): string => {
  switch (event.event_type) {
    case 'reprogramacion':
      return `${formatDate(event.previous_expected_date)} → ${formatDate(event.new_expected_date)}`;
    case 'recepcion_parcial':
      return `Recibido ${formatDate(event.received_date)}${event.quantity !== null ? ` · cantidad ${event.quantity}` : ''}`;
    case 'recepcion_total':
      return `Recibido ${formatDate(event.received_date)}`;
    default:
      return '';
  }
};

export default function ExpeditingModal({
  isOpen,
  onClose,
  purchaseOrderId,
  canEdit,
}: ExpeditingModalProps) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [receiptType, setReceiptType] = useState<'total' | 'parcial'>('total');
  const [receivedDate, setReceivedDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [receiptComment, setReceiptComment] = useState('');

  const detailQuery = useQuery({
    queryKey: ['expediting-detail', purchaseOrderId],
    queryFn: () =>
      api.get<ExpeditingDetail>(`/compras/expeditacion/${purchaseOrderId}`),
    enabled: isOpen && !!purchaseOrderId,
  });
  const detail = detailQuery.data;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['expediting'] });
    void qc.invalidateQueries({ queryKey: ['expediting-detail'] });
    void qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    void detailQuery.refetch();
  };

  const followUpMutation = useMutation({
    mutationFn: () =>
      api.post(`/compras/expeditacion/${purchaseOrderId}/follow-up`, { note }),
    onSuccess: () => {
      notify.success('Seguimiento registrado');
      setNote('');
      refresh();
    },
    onError: (err: Error) => notify.error(err.message || 'Error al registrar'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      api.post(`/compras/expeditacion/${purchaseOrderId}/reschedule`, {
        new_expected_date: newDate,
        reason,
      }),
    onSuccess: () => {
      notify.success('Fecha reprogramada');
      setNewDate('');
      setReason('');
      refresh();
    },
    onError: (err: Error) => notify.error(err.message || 'Error al reprogramar'),
  });

  const receiptMutation = useMutation({
    mutationFn: () =>
      api.post(`/compras/expeditacion/${purchaseOrderId}/receipt`, {
        type: receiptType,
        received_date: receivedDate,
        quantity: quantity === '' ? undefined : Number(quantity),
        comment: receiptComment || undefined,
      }),
    onSuccess: () => {
      notify.success(
        receiptType === 'total'
          ? 'Recepción total registrada; la PO quedó entregada'
          : 'Recepción parcial registrada',
      );
      setReceivedDate('');
      setQuantity('');
      setReceiptComment('');
      refresh();
    },
    onError: (err: Error) => notify.error(err.message || 'Error al registrar'),
  });

  if (!isOpen || !purchaseOrderId) return null;

  const delivered = detail?.delivery_status === 'entregada';
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#424846]">
          <div>
            <h2 className="text-lg font-bold text-white">
              Expeditación {detail?.po_number ?? ''}
            </h2>
            {detail && (
              <span className={`inline-flex px-2 py-0.5 mt-1 text-xs font-medium rounded-full ${DELIVERY_STATUS_CLASSES[detail.delivery_status]}`}>
                {DELIVERY_STATUS_LABELS[detail.delivery_status]}
                {detail.days_left !== null &&
                  !delivered &&
                  ` · ${detail.days_left >= 0 ? `faltan ${detail.days_left} días` : `${-detail.days_left} días de retraso`}`}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-300 hover:text-white" title="Cerrar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-5 space-y-6">
          {!detail ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Datos de la orden (solo lectura) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Proveedor</p>
                  <p className="text-sm text-gray-900">{dash(detail.supplier?.legal_name)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Comprador</p>
                  <p className="text-sm text-gray-900">{dash(detail.buyer?.full_name)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Requisición</p>
                  <p className="text-sm text-gray-900">{dash(detail.requisition?.rq_number)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Fecha comprometida (PO)</p>
                  <p className="text-sm text-gray-900">{formatDate(detail.expected_delivery_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Fecha vigente</p>
                  <p className="text-sm text-gray-900">{formatDate(detail.effective_expected_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Entrega real</p>
                  <p className="text-sm text-gray-900">{formatDate(detail.actual_delivery_date)}</p>
                </div>
              </div>

              {/* Linea de tiempo */}
              <div>
                <h3 className="text-sm font-semibold text-[#424846] mb-2">
                  Historial ({detail.events.length})
                </h3>
                {detail.events.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin seguimientos registrados</p>
                ) : (
                  <ol className="space-y-2">
                    {detail.events.map((event) => (
                      <li key={event.id} className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-[#52AF32] shrink-0" />
                        <div>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{DELIVERY_EVENT_LABELS[event.event_type]}</span>
                            {eventSummary(event) && (
                              <span className="text-gray-600"> · {eventSummary(event)}</span>
                            )}
                          </p>
                          {event.comment && (
                            <p className="text-xs text-gray-500">&ldquo;{event.comment}&rdquo;</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {dash(event.created_by_name)} ·{' '}
                            {event.created_at
                              ? new Date(event.created_at).toLocaleString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Acciones (PURCHASE_TEAM) */}
              {canEdit && !delivered && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo seguimiento</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Nota de contacto con el proveedor..."
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={followUpMutation.isPending || note.trim().length < 3}
                      onClick={() => followUpMutation.mutate()}
                      className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 disabled:opacity-50"
                    >
                      Registrar
                    </button>
                  </div>

                  <div className="flex gap-2 items-end flex-wrap">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reprogramar fecha</label>
                      <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputClass} />
                    </div>
                    <div className="flex-1 min-w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motivo de la reprogramación..."
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={rescheduleMutation.isPending || !newDate || reason.trim().length < 5}
                      onClick={() => rescheduleMutation.mutate()}
                      className="px-4 py-2 bg-[#222D59] text-white rounded-lg hover:bg-[#222D59]/90 disabled:opacity-50"
                    >
                      Reprogramar
                    </button>
                  </div>

                  <div className="flex gap-2 items-end flex-wrap">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recepción</label>
                      <select
                        value={receiptType}
                        onChange={(e) => setReceiptType(e.target.value as 'total' | 'parcial')}
                        className={`${inputClass} bg-white`}
                      >
                        <option value="total">Total</option>
                        <option value="parcial">Parcial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputClass} />
                    </div>
                    {receiptType === 'parcial' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                        <input
                          type="number"
                          min="0"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-40">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
                      <input
                        type="text"
                        value={receiptComment}
                        onChange={(e) => setReceiptComment(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={receiptMutation.isPending || !receivedDate}
                      onClick={() => receiptMutation.mutate()}
                      className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 disabled:opacity-50"
                    >
                      Registrar recepción
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
