'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { PurchaseCommittee } from '@/types/purchases';

/**
 * Fase §16 — Revision del aprobador del turno vigente: aprobar, o rechazar
 * con justificacion obligatoria (min 10 caracteres, regla 4). El backend
 * re-valida el turno contra committee_approval_levels (403 si no toca).
 */

interface CommitteeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  committee: PurchaseCommittee | null;
}

export default function CommitteeReviewModal({
  isOpen,
  onClose,
  committee,
}: CommitteeReviewModalProps) {
  const qc = useQueryClient();
  const [justification, setJustification] = useState('');

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['committees'] });
    void qc.invalidateQueries({ queryKey: ['committee-detail'] });
  };

  const approveMutation = useMutation({
    mutationFn: () =>
      api.post(`/compras/comite/${committee?.id}/approve`, {}),
    onSuccess: () => {
      invalidate();
      notify.success('Comite aprobado en tu nivel');
      setJustification('');
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'Error al aprobar'),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.post(`/compras/comite/${committee?.id}/reject`, { justification }),
    onSuccess: () => {
      invalidate();
      notify.success('Comite rechazado; regreso al autor');
      setJustification('');
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'Error al rechazar'),
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  if (!isOpen || !committee) return null;

  const handleReject = () => {
    if (justification.trim().length < 10) {
      notify.error('La justificacion del rechazo requiere al menos 10 caracteres');
      return;
    }
    rejectMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#424846]">
          <h2 className="text-lg font-bold text-white">
            Revisar {committee.committee_number}
          </h2>
          <p className="text-gray-300 text-sm">
            Nivel {committee.current_level?.orden ?? '—'} · version{' '}
            {committee.current_version}
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Titulo</p>
            <p className="text-sm text-gray-900">{committee.title}</p>
          </div>
          <p className="text-sm text-gray-600">
            Tu accion queda registrada como firma electronica (usuario, fecha e
            IP). Un rechazo regresa el comite al autor y exige nueva version.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Justificacion (obligatoria solo para rechazar)
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900"
              placeholder="Minimo 10 caracteres si rechazas"
            />
          </div>
        </div>
        <div className="flex justify-between px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {rejectMutation.isPending ? 'Rechazando...' : 'Rechazar'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => approveMutation.mutate()}
              className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50"
            >
              {approveMutation.isPending ? 'Aprobando...' : 'Aprobar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
