'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';

interface Evidence {
  id: string;
  enrollment_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  evidence_type: string;
  uploaded_at: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  uploader?: { full_name: string; email: string };
  verifier?: { full_name: string; email: string } | null;
}

interface EvidenceModalProps {
  enrollmentId: string;
  participantName: string;
  courseName: string;
  isOpen: boolean;
  onClose: () => void;
  canValidate?: boolean;
}

const Icons = {
  x: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  upload: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  download: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  check: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  xCircle: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  trash: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  file: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const evidenceTypeLabels: Record<string, string> = {
  certificate: 'Certificado',
  attendance: 'Constancia de Asistencia',
  assessment: 'Evaluación',
  other: 'Otro',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800' },
};

export function EvidenceModal({
  enrollmentId,
  participantName,
  courseName,
  isOpen,
  onClose,
  canValidate = false,
}: EvidenceModalProps) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('certificate');
  const [notes, setNotes] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadEvidences();
    }
  }, [isOpen, enrollmentId]);

  const loadEvidences = async () => {
    setLoading(true);
    try {
      const data = await api.get<Evidence[]>(`/evidences/enrollment/${enrollmentId}`);
      setEvidences(data);
    } catch {
      notify.error('Error al cargar evidencias');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      notify.error('El archivo excede el tamaño máximo de 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('enrollment_id', enrollmentId);
      formData.append('evidence_type', selectedType);
      if (notes) formData.append('notes', notes);

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/evidences/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
        body: formData,
      });

      notify.success('Evidencia subida correctamente');
      setNotes('');
      loadEvidences();
    } catch {
      notify.error('Error al subir evidencia');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

  const handleApprove = async (evidenceId: string) => {
    try {
      await api.put(`/evidences/${evidenceId}/verify`, {
        verification_status: 'approved',
      });
      notify.success('Evidencia aprobada');
      loadEvidences();
    } catch {
      notify.error('Error al aprobar evidencia');
    }
  };

  const handleReject = async (evidenceId: string) => {
    if (!rejectReason.trim()) {
      notify.error('Ingresa un motivo de rechazo');
      return;
    }
    try {
      await api.put(`/evidences/${evidenceId}/verify`, {
        verification_status: 'rejected',
        rejection_reason: rejectReason,
      });
      notify.success('Evidencia rechazada');
      setRejectingId(null);
      setRejectReason('');
      loadEvidences();
    } catch {
      notify.error('Error al rechazar evidencia');
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (!confirm('¿Eliminar esta evidencia?')) return;
    try {
      await api.delete(`/evidences/${evidenceId}`);
      notify.success('Evidencia eliminada');
      loadEvidences();
    } catch {
      notify.error('Error al eliminar evidencia');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Evidencias</h3>
            <p className="text-sm text-gray-500">
              {participantName} - {courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Icons.x className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Section */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Evidencia
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              >
                {Object.entries(evidenceTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx"
                className="hidden"
                id="evidence-file"
              />
              <label
                htmlFor="evidence-file"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${
                  uploading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Icons.upload className="w-4 h-4" />
                {uploading ? 'Subiendo...' : 'Subir Archivo'}
              </label>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Formatos: PDF, imágenes (JPG, PNG), Excel, Word. Máximo 10MB.
          </p>
        </div>

        {/* Evidences List */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Cargando...</div>
          ) : evidences.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No hay evidencias cargadas
            </div>
          ) : (
            <div className="space-y-3">
              {evidences.map((evidence) => {
                const status = statusLabels[evidence.verification_status];
                return (
                  <div
                    key={evidence.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icons.file className="w-8 h-8 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {evidence.file_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {evidenceTypeLabels[evidence.evidence_type]} •{' '}
                            {formatFileSize(evidence.file_size)} •{' '}
                            {new Date(evidence.uploaded_at).toLocaleDateString('es-MX')}
                          </p>
                          {evidence.notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              {evidence.notes}
                            </p>
                          )}
                          {evidence.rejection_reason && (
                            <p className="text-sm text-red-600 mt-1">
                              Motivo: {evidence.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(evidence)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Icons.download className="w-4 h-4" />
                          Descargar
                        </button>
                        <button
                          onClick={() => handleDelete(evidence.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          <Icons.trash className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>

                      {canValidate && evidence.verification_status === 'pending' && (
                        <div className="flex items-center gap-2">
                          {rejectingId === evidence.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Motivo de rechazo..."
                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                              <button
                                onClick={() => handleReject(evidence.id)}
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason('');
                                }}
                                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove(evidence.id)}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                <Icons.check className="w-4 h-4" />
                                Aprobar
                              </button>
                              <button
                                onClick={() => setRejectingId(evidence.id)}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                <Icons.xCircle className="w-4 h-4" />
                                Rechazar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper para obtener token de Supabase
async function getToken(): Promise<string> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}
