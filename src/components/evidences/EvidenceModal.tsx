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
  // PDF icon
  pdf: ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7v5h5v11H6V4zm2 10v4h1.5v-1.5h1a1.5 1.5 0 000-3H8zm1.5 1h.5a.5.5 0 010 1h-.5v-1zm3.5-1v4h2a2 2 0 002-2 2 2 0 00-2-2h-2zm1.5 1v2h.5a1 1 0 000-2h-.5z"/>
    </svg>
  ),
  // Image icon
  image: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  // Excel icon
  excel: ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 13l2 3-2 3h1.5l1.25-2 1.25 2H14l-2-3 2-3h-1.5l-1.25 2-1.25-2H8z"/>
    </svg>
  ),
  // Word icon
  word: ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9 13l1 6h1l1-4 1 4h1l1-6h-1.2l-.6 4-.8-4h-.8l-.8 4-.6-4H9z"/>
    </svg>
  ),
  // Generic file icon
  file: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  // Cloud upload icon for drag & drop
  cloudUpload: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
};

const evidenceTypeLabels: Record<string, string> = {
  certificate: 'Certificado',
  attendance: 'Constancia de Asistencia',
  assessment: 'Evaluacion',
  other: 'Otro',
};

// A3T Colors
const A3T_COLORS = {
  darkGray: '#424846',
  greenMain: '#52AF32',
  greenLight: '#67B52E',
  navy: '#222D59',
  gold: '#DFA922',
};

const statusLabels: Record<string, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: 'Pendiente', bgColor: 'bg-[#DFA922]/15', textColor: 'text-[#DFA922]' },
  approved: { label: 'Aprobado', bgColor: 'bg-[#52AF32]/15', textColor: 'text-[#52AF32]' },
  rejected: { label: 'Rechazado', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

// Helper to get file icon based on type
function getFileIcon(fileType: string) {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return Icons.pdf;
  if (type.includes('image') || type.includes('jpg') || type.includes('jpeg') || type.includes('png')) return Icons.image;
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('xls')) return Icons.excel;
  if (type.includes('word') || type.includes('document') || type.includes('doc')) return Icons.word;
  return Icons.file;
}

// Helper to get file icon color based on type
function getFileIconColor(fileType: string): string {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return 'text-red-500';
  if (type.includes('image') || type.includes('jpg') || type.includes('jpeg') || type.includes('png')) return 'text-[#52AF32]';
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('xls')) return 'text-green-600';
  if (type.includes('word') || type.includes('document') || type.includes('doc')) return 'text-blue-600';
  return 'text-[#424846]';
}

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  const handleFileUpload = async (file: File) => {
    // Validar tamano (10MB)
    if (file.size > 10 * 1024 * 1024) {
      notify.error('El archivo excede el tamano maximo de 10MB');
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileUpload(file);
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
    // Backdrop - A3T Navy semi-transparent with blur
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#222D59]/60 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-lg font-semibold text-[#424846]">Evidencias</h3>
            <p className="text-sm text-gray-500">
              {participantName} - {courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-[#424846] hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <Icons.x className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Section */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
          {/* Type and Notes Row */}
          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#424846] mb-1.5">
                Tipo de Evidencia
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-[#424846] bg-white focus:outline-none focus:ring-2 focus:ring-[#52AF32]/30 focus:border-[#52AF32] transition-all"
              >
                {Object.entries(evidenceTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[#424846] mb-1.5">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-[#424846] bg-white focus:outline-none focus:ring-2 focus:ring-[#52AF32]/30 focus:border-[#52AF32] transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
              ${isDragging
                ? 'border-[#52AF32] bg-[#52AF32]/5'
                : 'border-gray-300 hover:border-[#52AF32] hover:bg-[#52AF32]/5'
              }
              ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx"
              className="hidden"
              id="evidence-file"
              disabled={uploading}
            />
            <Icons.cloudUpload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-[#52AF32]' : 'text-gray-400'}`} />
            <p className="text-sm font-medium text-[#424846]">
              {uploading ? 'Subiendo archivo...' : 'Arrastra y suelta tu archivo aqui'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-400 mt-3">
              PDF, imagenes (JPG, PNG), Excel, Word. Maximo 10MB.
            </p>
          </div>
        </div>

        {/* Evidences List */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#52AF32] border-t-transparent"></div>
            </div>
          ) : evidences.length === 0 ? (
            <div className="text-center py-12">
              <Icons.file className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No hay evidencias cargadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evidences.map((evidence) => {
                const status = statusLabels[evidence.verification_status];
                const FileIcon = getFileIcon(evidence.file_type);
                const iconColor = getFileIconColor(evidence.file_type);

                return (
                  <div
                    key={evidence.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-gray-50 ${iconColor}`}>
                          <FileIcon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#424846] truncate">
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
                            <p className="text-sm text-red-600 mt-1 flex items-start gap-1">
                              <Icons.xCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>Motivo: {evidence.rejection_reason}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${status.bgColor} ${status.textColor}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownload(evidence)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#222D59] hover:bg-[#222D59]/5 rounded-lg transition-colors"
                        >
                          <Icons.download className="w-4 h-4" />
                          Descargar
                        </button>
                        <button
                          onClick={() => handleDelete(evidence.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Icons.trash className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>

                      {canValidate && evidence.verification_status === 'pending' && (
                        <div className="flex items-center gap-2">
                          {rejectingId === evidence.id ? (
                            <div className="flex items-center gap-2">
                              <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Motivo de rechazo..."
                                rows={2}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#52AF32]/30 focus:border-[#52AF32] resize-none min-w-[200px]"
                              />
                              <button
                                onClick={() => handleReject(evidence.id)}
                                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason('');
                                }}
                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove(evidence.id)}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors font-medium shadow-sm"
                              >
                                <Icons.check className="w-4 h-4" />
                                Aprobar
                              </button>
                              <button
                                onClick={() => setRejectingId(evidence.id)}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-[#424846] bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
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
