'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';

interface Evidence {
  id: string;
  enrollment_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  evidence_type: string;
  uploaded_at: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  notes: string | null;
  uploaded_by: string;
  profiles: {
    full_name: string;
    email: string;
  };
  course_enrollments: {
    id: string;
    status: string;
    course_editions: {
      courses: {
        name: string;
      };
    };
    profiles: {
      full_name: string;
      email: string;
      departments: { name: string } | null;
    };
  };
}

const evidenceTypeLabels: Record<string, string> = {
  certificate: 'Certificado',
  attendance: 'Constancia de asistencia',
  assessment: 'Evaluación',
  other: 'Otro',
};

const statusConfig: Record<string, { label: string; bgColor: string; color: string }> = {
  pending: { label: 'Pendiente', bgColor: 'bg-yellow-100', color: 'text-yellow-800' },
  approved: { label: 'Aprobada', bgColor: 'bg-green-100', color: 'text-green-800' },
  rejected: { label: 'Rechazada', bgColor: 'bg-red-100', color: 'text-red-800' },
};

const Icons = {
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  file: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function EvidenciasPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: evidences = [], isLoading } = useQuery({
    queryKey: ['evidences', filter],
    queryFn: async () => {
      if (filter === 'pending') {
        return api.get<Evidence[]>('/evidences/pending');
      }
      const all = await api.get<Evidence[]>('/evidences');
      if (filter === 'all') return all;
      return all.filter(e => e.verification_status === filter);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/evidences/${id}/verify`, { verification_status: 'approved' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidences'] });
      notify.success('Evidencia aprobada');
    },
    onError: () => notify.error('Error al aprobar evidencia'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.put(`/evidences/${id}/verify`, { verification_status: 'rejected', rejection_reason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidences'] });
      setRejectingId(null);
      setRejectReason('');
      notify.success('Evidencia rechazada');
    },
    onError: () => notify.error('Error al rechazar evidencia'),
  });

  const handleDownload = async (evidence: Evidence) => {
    try {
      const { url, fileName } = await api.get<{ url: string; fileName: string }>(
        `/evidences/${evidence.id}/download`
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      notify.error('Error al descargar archivo');
    }
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      notify.error('Ingresa un motivo de rechazo');
      return;
    }
    rejectMutation.mutate({ id, reason: rejectReason });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pendingCount = evidences.filter(e => e.verification_status === 'pending').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revisión de Evidencias</h1>
        <p className="text-gray-500">Aprueba o rechaza las evidencias subidas por los colaboradores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Aprobadas</p>
          <p className="text-2xl font-bold text-green-600">
            {evidences.filter(e => e.verification_status === 'approved').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Rechazadas</p>
          <p className="text-2xl font-bold text-red-600">
            {evidences.filter(e => e.verification_status === 'rejected').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{evidences.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: 'pending', label: 'Pendientes' },
          { value: 'approved', label: 'Aprobadas' },
          { value: 'rejected', label: 'Rechazadas' },
          { value: 'all', label: 'Todas' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Evidences List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : evidences.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay evidencias {filter === 'pending' ? 'pendientes de revisión' : ''}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {evidences.map((evidence) => {
              const status = statusConfig[evidence.verification_status];
              const enrollment = evidence.course_enrollments;
              const participant = enrollment?.profiles;
              const course = enrollment?.course_editions?.courses;

              return (
                <div key={evidence.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {Icons.file}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{evidence.file_name}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">{participant?.full_name}</span>
                          {participant?.departments?.name && (
                            <span className="text-gray-400"> • {participant.departments.name}</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Curso: {course?.name || 'Sin nombre'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{evidenceTypeLabels[evidence.evidence_type] || evidence.evidence_type}</span>
                          <span>•</span>
                          <span>{formatFileSize(evidence.file_size)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {Icons.clock}
                            {new Date(evidence.uploaded_at).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                        {evidence.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">"{evidence.notes}"</p>
                        )}
                        {evidence.rejection_reason && (
                          <p className="text-sm text-red-600 mt-2">
                            Motivo de rechazo: {evidence.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(evidence)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        {Icons.download}
                        <span>Descargar</span>
                      </button>

                      {evidence.verification_status === 'pending' && (
                        <>
                          {rejectingId === evidence.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Motivo de rechazo..."
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg w-48"
                              />
                              <button
                                onClick={() => handleReject(evidence.id)}
                                disabled={rejectMutation.isPending}
                                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason('');
                                }}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove(evidence.id)}
                                disabled={approveMutation.isPending}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                {Icons.check}
                                <span>Aprobar</span>
                              </button>
                              <button
                                onClick={() => setRejectingId(evidence.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                              >
                                {Icons.x}
                                <span>Rechazar</span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
