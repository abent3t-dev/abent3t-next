'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import Pagination from '@/components/ui/Pagination';
import type { PaginatedResponse } from '@/types/pagination';

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
  verified_at: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
  verified_by_profile?: {
    full_name: string;
  };
  course_enrollments: {
    id: string;
    status: string;
    enrolled_at: string;
    course_editions: {
      start_date: string;
      end_date: string;
      location: string | null;
      instructor: string | null;
      courses: {
        name: string;
        total_hours: number;
        cost: number;
        institutions: { name: string } | null;
        modalities: { name: string } | null;
      };
    };
    profiles: {
      full_name: string;
      email: string;
      position: string | null;
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

const evidenceTypeIcons: Record<string, React.ReactNode> = {
  certificate: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  attendance: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  assessment: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  other: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
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
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  building: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  academic: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
};

export default function EvidenciasPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewEvidence, setPreviewEvidence] = useState<Evidence | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Query para TODAS las evidencias sin paginación (para los stats)
  const { data: allEvidences = [] } = useQuery({
    queryKey: ['evidences', 'all', 'stats'],
    queryFn: () => api.get<Evidence[]>('/evidences'),
  });

  // Query para las evidencias filtradas con paginación (para la lista)
  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['evidences', filter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filter !== 'all') {
        params.append('status', filter);
      }

      return api.get<PaginatedResponse<Evidence>>(`/evidences?${params}`);
    },
  });

  const filteredEvidences = paginatedData?.data ?? [];
  const meta = paginatedData?.meta;

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/evidences/${id}/verify`, { verification_status: 'approved' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidences'] });
      notify.success('Evidencia aprobada exitosamente');
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

  // Resetear página cuando cambia el filtro
  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Stats calculados de TODAS las evidencias
  const stats = {
    pending: allEvidences.filter(e => e.verification_status === 'pending').length,
    approved: allEvidences.filter(e => e.verification_status === 'approved').length,
    rejected: allEvidences.filter(e => e.verification_status === 'rejected').length,
    total: allEvidences.length,
  };

  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toUpperCase() || 'FILE';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return (
        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
          <span className="text-red-600 font-bold text-xs">PDF</span>
        </div>
      );
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return (
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    if (['xlsx', 'xls'].includes(ext || '')) {
      return (
        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <span className="text-green-600 font-bold text-xs">XLS</span>
        </div>
      );
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return (
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-blue-600 font-bold text-xs">DOC</span>
        </div>
      );
    }
    return (
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-600 font-bold text-xs">{getFileExtension(fileName)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#424846]">Revision de Evidencias</h1>
            <p className="text-gray-500 mt-1">Aprueba o rechaza las evidencias subidas por los colaboradores</p>
          </div>
          {stats.pending > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#DFA922]/10 border border-[#DFA922]/30 rounded-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DFA922] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#DFA922]"></span>
              </span>
              <span className="text-sm font-medium text-[#DFA922]">
                {stats.pending} evidencia{stats.pending !== 1 ? 's' : ''} pendiente{stats.pending !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Stats Cards - Clickeables como filtros */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => handleFilterChange('pending')}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              filter === 'pending'
                ? 'bg-[#DFA922]/10 border-[#DFA922] shadow-md'
                : 'bg-white border-gray-100 hover:border-[#DFA922]/50 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Pendientes</p>
              <div className="w-10 h-10 bg-[#DFA922]/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#DFA922]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#DFA922] mt-2">{stats.pending}</p>
            <p className="text-xs text-gray-400 mt-1">Por revisar</p>
          </button>

          <button
            onClick={() => handleFilterChange('approved')}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              filter === 'approved'
                ? 'bg-[#52AF32]/10 border-[#52AF32] shadow-md'
                : 'bg-white border-gray-100 hover:border-[#52AF32]/50 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Aprobadas</p>
              <div className="w-10 h-10 bg-[#52AF32]/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#52AF32]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#52AF32] mt-2">{stats.approved}</p>
            <p className="text-xs text-gray-400 mt-1">Validadas</p>
          </button>

          <button
            onClick={() => handleFilterChange('rejected')}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              filter === 'rejected'
                ? 'bg-red-50 border-red-500 shadow-md'
                : 'bg-white border-gray-100 hover:border-red-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Rechazadas</p>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
            <p className="text-xs text-gray-400 mt-1">No validas</p>
          </button>

          <button
            onClick={() => handleFilterChange('all')}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              filter === 'all'
                ? 'bg-[#424846]/10 border-[#424846] shadow-md'
                : 'bg-white border-gray-100 hover:border-[#424846]/50 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <div className="w-10 h-10 bg-[#424846]/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#424846]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-[#424846] mt-2">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-1">Evidencias</p>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Mostrando:</span>
          <div className="flex gap-2">
            {[
              { value: 'pending', label: 'Pendientes', activeClass: 'bg-[#DFA922] text-white' },
              { value: 'approved', label: 'Aprobadas', activeClass: 'bg-[#52AF32] text-white' },
              { value: 'rejected', label: 'Rechazadas', activeClass: 'bg-red-500 text-white' },
              { value: 'all', label: 'Todas', activeClass: 'bg-[#424846] text-white' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value as typeof filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === f.value
                    ? `${f.activeClass} shadow-sm`
                    : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Evidences List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52AF32]"></div>
          </div>
        ) : filteredEvidences.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No hay evidencias</h3>
            <p className="text-gray-500">
              {filter === 'pending'
                ? 'No hay evidencias pendientes de revisión'
                : filter === 'approved'
                ? 'No hay evidencias aprobadas'
                : filter === 'rejected'
                ? 'No hay evidencias rechazadas'
                : 'No se han subido evidencias aún'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvidences.map((evidence) => {
              const enrollment = evidence.course_enrollments;
              const participant = enrollment?.profiles;
              const course = enrollment?.course_editions?.courses;
              const edition = enrollment?.course_editions;

              return (
                <div
                  key={evidence.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header con status */}
                  <div className={`px-5 py-3 border-b ${
                    evidence.verification_status === 'pending' ? 'bg-[#DFA922]/10 border-[#DFA922]/20' :
                    evidence.verification_status === 'approved' ? 'bg-[#52AF32]/10 border-[#52AF32]/20' :
                    'bg-red-50 border-red-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          evidence.verification_status === 'pending' ? 'bg-[#DFA922]/20 text-[#DFA922]' :
                          evidence.verification_status === 'approved' ? 'bg-[#52AF32]/20 text-[#52AF32]' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {evidence.verification_status === 'pending' ? 'Pendiente de revision' :
                           evidence.verification_status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          {Icons.clock}
                          Subida el {formatDate(evidence.uploaded_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          evidence.evidence_type === 'certificate' ? 'bg-purple-100 text-purple-700' :
                          evidence.evidence_type === 'attendance' ? 'bg-blue-100 text-blue-700' :
                          evidence.evidence_type === 'assessment' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {evidenceTypeLabels[evidence.evidence_type] || evidence.evidence_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    <div className="grid grid-cols-12 gap-6">
                      {/* Archivo */}
                      <div className="col-span-3">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Archivo</p>
                        <div className="flex items-start gap-3">
                          {getFileIcon(evidence.file_name)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate" title={evidence.file_name}>
                              {evidence.file_name}
                            </p>
                            <p className="text-sm text-gray-500">{formatFileSize(evidence.file_size)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Colaborador */}
                      <div className="col-span-3">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Colaborador</p>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-[#52AF32] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {participant?.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{participant?.full_name || 'Sin nombre'}</p>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              {Icons.building}
                              <span>{participant?.departments?.name || 'Sin área'}</span>
                            </div>
                            {participant?.position && (
                              <p className="text-xs text-gray-400">{participant.position}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Curso */}
                      <div className="col-span-4">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Curso</p>
                        <div>
                          <p className="font-medium text-gray-900">{course?.name || 'Sin nombre'}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                            {course?.institutions?.name && (
                              <span className="flex items-center gap-1">
                                {Icons.academic}
                                {course.institutions.name}
                              </span>
                            )}
                            {course?.total_hours && (
                              <span className="flex items-center gap-1">
                                {Icons.clock}
                                {course.total_hours}h
                              </span>
                            )}
                            {course?.modalities?.name && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                {course.modalities.name}
                              </span>
                            )}
                          </div>
                          {edition?.start_date && (
                            <p className="text-xs text-gray-400 mt-1">
                              Edición: {formatDate(edition.start_date)}
                              {edition.end_date && ` - ${formatDate(edition.end_date)}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="col-span-2 flex flex-col justify-center">
                        {evidence.verification_status === 'pending' ? (
                          rejectingId === evidence.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Motivo del rechazo..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReject(evidence.id)}
                                  disabled={rejectMutation.isPending}
                                  className="flex-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason('');
                                  }}
                                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <button
                                onClick={() => handleApprove(evidence.id)}
                                disabled={approveMutation.isPending}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 disabled:opacity-50 transition-colors"
                              >
                                {Icons.check}
                                Aprobar
                              </button>
                              <button
                                onClick={() => setRejectingId(evidence.id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                {Icons.x}
                                Rechazar
                              </button>
                              <button
                                onClick={() => handleDownload(evidence)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#424846] hover:text-[#424846]/80 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                {Icons.download}
                                Descargar
                              </button>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => handleDownload(evidence)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#52AF32] bg-[#52AF32]/10 border border-[#52AF32]/30 rounded-lg hover:bg-[#52AF32]/20 transition-colors"
                          >
                            {Icons.download}
                            Descargar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notas o Motivo de rechazo */}
                    {(evidence.notes || evidence.rejection_reason) && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {evidence.notes && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="text-gray-400">Notas:</span>
                            <span className="text-gray-600 italic">"{evidence.notes}"</span>
                          </div>
                        )}
                        {evidence.rejection_reason && (
                          <div className="flex items-start gap-2 text-sm bg-red-50 p-3 rounded-lg">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <p className="font-medium text-red-800">Motivo del rechazo:</p>
                              <p className="text-red-700">{evidence.rejection_reason}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info de verificación */}
                    {evidence.verified_at && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {evidence.verification_status === 'approved' ? 'Aprobada' : 'Rechazada'} el {formatDate(evidence.verified_at)}
                          {evidence.verified_by_profile?.full_name && ` por ${evidence.verified_by_profile.full_name}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.total > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <Pagination
              meta={meta}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
