'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { Approval, REQUISITION_STATUS_LABELS, APPROVAL_LEVEL_NAMES } from '@/types/purchases';

const Icons = {
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  document: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AprobacionesPage() {
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.get<Approval[]>('/approvals/pending'),
  });

  const approveMutation = useMutation({
    mutationFn: (requisitionId: string) =>
      api.post('/approvals/approve', { requisition_id: requisitionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      notify.success('Requisicion aprobada correctamente');
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Error al aprobar');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (params: { requisitionId: string; reason: string }) =>
      api.post('/approvals/reject', {
        requisition_id: params.requisitionId,
        rejection_reason: params.reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      setRejectingId(null);
      setRejectReason('');
      notify.success('Requisicion rechazada');
    },
    onError: (err: Error) => {
      notify.error(err.message || 'Error al rechazar');
    },
  });

  const handleApprove = async (requisitionId: string) => {
    const confirmed = await notify.confirm('Aprobar esta requisicion?');
    if (!confirmed) return;
    approveMutation.mutate(requisitionId);
  };

  const handleReject = () => {
    if (!rejectingId || !rejectReason.trim()) {
      notify.error('Debes indicar un motivo de rechazo');
      return;
    }
    rejectMutation.mutate({ requisitionId: rejectingId, reason: rejectReason });
  };

  const approvals = pendingApprovals ?? [];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Panel de Aprobaciones</h1>
        <p className="text-gray-500">Requisiciones pendientes de tu aprobacion</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="bg-white px-4 py-3 rounded-lg shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
            {Icons.clock}
          </div>
          <div>
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-xl font-bold text-[#424846]">{approvals.length}</p>
          </div>
        </div>
      </div>

      {/* Approvals List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin aprobaciones pendientes</h3>
          <p className="text-gray-500">No tienes requisiciones pendientes de aprobar en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {approvals.map((approval) => {
            const rq = approval.workflow?.requisition;
            if (!rq) return null;

            return (
              <div key={approval.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      {Icons.document}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-[#424846] font-mono">{rq.rq_number}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          rq.expense_type === 'CAPEX' ? 'bg-[#52AF32]/10 text-[#52AF32]' : 'bg-[#222D59]/10 text-[#222D59]'
                        }`}>
                          {rq.expense_type}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{rq.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          {Icons.user}
                          <span>{rq.requester?.full_name || 'N/A'}</span>
                        </div>
                        <span>|</span>
                        <span>Monto: {formatCurrency(rq.estimated_amount)}</span>
                        <span>|</span>
                        <span>Nivel: {APPROVAL_LEVEL_NAMES[approval.level]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(rq.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors disabled:opacity-50"
                    >
                      {Icons.check}
                      <span>Aprobar</span>
                    </button>
                    <button
                      onClick={() => setRejectingId(rq.id)}
                      disabled={rejectMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {Icons.x}
                      <span>Rechazar</span>
                    </button>
                  </div>
                </div>

                {/* Workflow Timeline */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Flujo de Aprobacion:</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((level) => {
                      const levelApproval = approval.workflow?.approvals?.find((a) => a.level === level);
                      const isCurrent = approval.workflow?.current_level === level;
                      const isApproved = levelApproval?.status === 'aprobada';
                      const isRejected = levelApproval?.status === 'rechazada';

                      return (
                        <div key={level} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              isApproved
                                ? 'bg-green-500 text-white'
                                : isRejected
                                ? 'bg-red-500 text-white'
                                : isCurrent
                                ? 'bg-yellow-500 text-white animate-pulse'
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {isApproved ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isRejected ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : (
                              level
                            )}
                          </div>
                          {level < 4 && (
                            <div className={`w-8 h-1 ${isApproved ? 'bg-green-500' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className="w-8 text-center">
                        <span>N{level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#424846]">Rechazar Requisicion</h2>
              <button onClick={() => setRejectingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                {Icons.x}
              </button>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del rechazo *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Indica el motivo por el cual se rechaza esta requisicion..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
