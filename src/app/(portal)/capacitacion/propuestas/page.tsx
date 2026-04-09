'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import Pagination from '@/components/ui/Pagination';
import type { PaginatedResponse } from '@/types/pagination';

interface Proposal {
  id: string;
  course_name: string;
  institution_name: string | null;
  course_url: string | null;
  estimated_cost: number;
  estimated_hours: number;
  modality: string | null;
  start_date: string | null;
  end_date: string | null;
  justification: string | null;
  status: 'pendiente' | 'en_investigacion' | 'aprobada' | 'rechazada';
  review_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  proposer: {
    id: string;
    full_name: string;
    email: string;
    departments: { name: string } | null;
  };
  profile: {
    id: string;
    full_name: string;
    email: string;
    position: string | null;
    departments: { name: string } | null;
  };
  courses?: { id: string; name: string } | null;
}

interface Catalog {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; borderColor: string; icon: string }> = {
  pendiente: {
    label: 'Pendiente de Revisión',
    bg: 'bg-[#DFA922]/10',
    text: 'text-[#DFA922]',
    border: 'border-[#DFA922]/30',
    borderColor: '#DFA922',
    icon: 'clock'
  },
  en_investigacion: {
    label: 'En Investigación',
    bg: 'bg-[#222D59]/10',
    text: 'text-[#222D59]',
    border: 'border-[#222D59]/30',
    borderColor: '#222D59',
    icon: 'search'
  },
  aprobada: {
    label: 'Aprobada',
    bg: 'bg-[#52AF32]/10',
    text: 'text-[#52AF32]',
    border: 'border-[#52AF32]/30',
    borderColor: '#52AF32',
    icon: 'check'
  },
  rechazada: {
    label: 'Rechazada',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    borderColor: '#ef4444',
    icon: 'x'
  },
};

const Icons = {
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
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
  link: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  userGroup: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  currency: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  office: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  chat: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

export default function PropuestasPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pendiente' | 'en_investigacion' | 'aprobada' | 'rechazada' | 'all'>('pendiente');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rejectingProposal, setRejectingProposal] = useState<Proposal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingProposal, setApprovingProposal] = useState<Proposal | null>(null);
  const [confirmingApproval, setConfirmingApproval] = useState<Proposal | null>(null);

  // Form state for approval
  const [approvalForm, setApprovalForm] = useState({
    course_name: '',
    institution_id: '',
    course_type_id: '',
    modality_id: '',
    cost: 0,
    total_hours: 0,
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    instructor: '',
    review_notes: '',
  });

  // Query para TODAS las propuestas (para los stats)
  const { data: allProposalsData } = useQuery({
    queryKey: ['proposals', 'all', 1, 9999],
    queryFn: () => api.get<PaginatedResponse<Proposal>>('/proposals?page=1&limit=9999'),
  });

  const allProposals = allProposalsData?.data || [];

  // Query para las propuestas filtradas (para la lista con paginación)
  const { data: proposalsResponse, isLoading } = useQuery({
    queryKey: ['proposals', filter, page, limit],
    queryFn: async () => {
      const statusParam = filter !== 'all' ? `status=${filter}&` : '';
      return api.get<PaginatedResponse<Proposal>>(`/proposals?${statusParam}page=${page}&limit=${limit}`);
    },
  });

  const filteredProposals = proposalsResponse?.data || [];
  const paginationMeta = proposalsResponse?.meta || null;

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.get<Catalog[]>('/institutions'),
  });

  const { data: courseTypes = [] } = useQuery({
    queryKey: ['course-types'],
    queryFn: () => api.get<Catalog[]>('/course-types'),
  });

  const { data: modalities = [] } = useQuery({
    queryKey: ['modalities'],
    queryFn: () => api.get<Catalog[]>('/modalities'),
  });

  // Mutations
  const investigateMutation = useMutation({
    mutationFn: (id: string) =>
      api.put(`/proposals/${id}/review`, { status: 'en_investigacion' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      notify.success('Propuesta marcada como en investigación');
    },
    onError: () => notify.error('Error al actualizar propuesta'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.put(`/proposals/${id}/review`, { status: 'rechazada', rejection_reason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      setRejectingProposal(null);
      setRejectReason('');
      notify.success('Propuesta rechazada');
    },
    onError: () => notify.error('Error al rechazar propuesta'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof approvalForm }) =>
      api.put(`/proposals/${id}/approve`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      setApprovingProposal(null);
      notify.success('Propuesta aprobada - Curso creado e inscripción realizada');
    },
    onError: () => notify.error('Error al aprobar propuesta'),
  });

  const handleInvestigate = (id: string) => {
    investigateMutation.mutate(id);
  };

  const handleReject = () => {
    if (!rejectingProposal) return;
    if (!rejectReason.trim()) {
      notify.error('Ingresa un motivo de rechazo');
      return;
    }
    if (rejectReason.trim().length < 20) {
      notify.error('El motivo debe ser más detallado (mínimo 20 caracteres)');
      return;
    }
    rejectMutation.mutate({ id: rejectingProposal.id, reason: rejectReason });
  };

  const openRejectModal = (proposal: Proposal) => {
    setRejectingProposal(proposal);
    setRejectReason('');
  };

  const handleOpenApproval = (proposal: Proposal) => {
    setConfirmingApproval(proposal);
  };

  const handleConfirmApproval = () => {
    if (!confirmingApproval) return;
    setApprovingProposal(confirmingApproval);
    setApprovalForm({
      course_name: confirmingApproval.course_name,
      institution_id: '',
      course_type_id: '',
      modality_id: '',
      cost: confirmingApproval.estimated_cost,
      total_hours: confirmingApproval.estimated_hours,
      description: '',
      start_date: confirmingApproval.start_date || '',
      end_date: confirmingApproval.end_date || '',
      location: '',
      instructor: '',
      review_notes: '',
    });
    setConfirmingApproval(null);
  };

  const handleApprove = () => {
    if (!approvingProposal) return;
    if (!approvalForm.course_name || !approvalForm.institution_id || !approvalForm.course_type_id || !approvalForm.modality_id || !approvalForm.start_date) {
      notify.error('Completa los campos requeridos');
      return;
    }
    approveMutation.mutate({ id: approvingProposal.id, data: approvalForm });
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setPage(1); // Reset to page 1 when changing filter
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to page 1 when changing limit
  };

  // Stats calculados de TODAS las propuestas
  const stats = {
    pendientes: allProposals.filter(p => p.status === 'pendiente').length,
    enInvestigacion: allProposals.filter(p => p.status === 'en_investigacion').length,
    aprobadas: allProposals.filter(p => p.status === 'aprobada').length,
    rechazadas: allProposals.filter(p => p.status === 'rechazada').length,
    total: allProposals.length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Propuestas de Cursos Externos</h1>
          <p className="text-gray-500 mt-1">Revisa y gestiona las propuestas de cursos enviadas por los colaboradores</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button
            onClick={() => handleFilterChange('pendiente')}
            className={`p-4 rounded-xl transition-all bg-white ${
              filter === 'pendiente'
                ? 'shadow-lg border-2 border-[#DFA922]'
                : 'border border-gray-200 hover:border-[#DFA922] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#DFA922]">{Icons.clock}</span>
              <span className="text-xs font-medium text-[#DFA922] uppercase tracking-wide">Pendientes</span>
            </div>
            <p className="text-3xl font-bold text-[#DFA922]">{stats.pendientes}</p>
          </button>

          <button
            onClick={() => handleFilterChange('en_investigacion')}
            className={`p-4 rounded-xl transition-all bg-white ${
              filter === 'en_investigacion'
                ? 'shadow-lg border-2 border-[#222D59]'
                : 'border border-gray-200 hover:border-[#222D59] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#222D59]">{Icons.search}</span>
              <span className="text-xs font-medium text-[#222D59] uppercase tracking-wide">Investigando</span>
            </div>
            <p className="text-3xl font-bold text-[#222D59]">{stats.enInvestigacion}</p>
          </button>

          <button
            onClick={() => handleFilterChange('aprobada')}
            className={`p-4 rounded-xl transition-all bg-white ${
              filter === 'aprobada'
                ? 'shadow-lg border-2 border-[#52AF32]'
                : 'border border-gray-200 hover:border-[#52AF32] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#52AF32]">{Icons.check}</span>
              <span className="text-xs font-medium text-[#52AF32] uppercase tracking-wide">Aprobadas</span>
            </div>
            <p className="text-3xl font-bold text-[#52AF32]">{stats.aprobadas}</p>
          </button>

          <button
            onClick={() => handleFilterChange('rechazada')}
            className={`p-4 rounded-xl transition-all bg-white ${
              filter === 'rechazada'
                ? 'shadow-lg border-2 border-red-500'
                : 'border border-gray-200 hover:border-red-500 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-red-500">{Icons.x}</span>
              <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Rechazadas</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.rechazadas}</p>
          </button>

          <button
            onClick={() => handleFilterChange('all')}
            className={`p-4 rounded-xl transition-all bg-white ${
              filter === 'all'
                ? 'shadow-lg border-2 border-[#424846]'
                : 'border border-gray-200 hover:border-[#424846] hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#424846]">{Icons.lightbulb}</span>
              <span className="text-xs font-medium text-[#424846] uppercase tracking-wide">Total</span>
            </div>
            <p className="text-3xl font-bold text-[#424846]">{stats.total}</p>
          </button>
        </div>

        {/* Proposals List */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 mt-4">Cargando propuestas...</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#52AF32]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#52AF32]">
              {Icons.lightbulb}
            </div>
            <p className="text-[#424846] font-medium">No hay propuestas</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter !== 'all'
                ? `No hay propuestas ${statusConfig[filter]?.label.toLowerCase() || ''}`
                : 'Aún no se han recibido propuestas de cursos externos'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredProposals.map((proposal) => {
                const status = statusConfig[proposal.status];

                return (
                  <div
                    key={proposal.id}
                    className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${status.border}`}
                  >
                  {/* Header con estado */}
                  <div className={`px-6 py-3 ${status.bg} border-b ${status.border} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                        {status.icon === 'clock' && Icons.clock}
                        {status.icon === 'search' && Icons.search}
                        {status.icon === 'check' && Icons.check}
                        {status.icon === 'x' && Icons.x}
                        {status.label}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        {Icons.calendar}
                        Propuesto el {formatDate(proposal.created_at)}
                      </span>
                    </div>

                    {/* Acciones */}
                    {['pendiente', 'en_investigacion'].includes(proposal.status) && (
                      <div className="flex items-center gap-2">
                        {proposal.status === 'pendiente' && (
                          <button
                            onClick={() => handleInvestigate(proposal.id)}
                            disabled={investigateMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-[#222D59] text-white rounded-lg hover:bg-[#222D59]/90 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {Icons.search}
                            Investigar
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenApproval(proposal)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors text-sm font-medium"
                        >
                          {Icons.check}
                          Aprobar
                        </button>
                        <button
                          onClick={() => openRejectModal(proposal)}
                          className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                          {Icons.x}
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contenido principal */}
                  <div className="p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Columna 1: Información de personas */}
                      <div className="space-y-4">
                        {/* Quién propone */}
                        <div className="bg-[#222D59]/5 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-[#222D59] mb-2">
                            {Icons.user}
                            <span className="text-xs font-semibold uppercase tracking-wide">Propuesto por</span>
                          </div>
                          <p className="font-semibold text-[#424846]">{proposal.proposer?.full_name || '—'}</p>
                          <p className="text-sm text-gray-500">{proposal.proposer?.email}</p>
                        </div>

                        {/* Flecha */}
                        <div className="flex justify-center text-gray-300">
                          <svg className="w-6 h-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>

                        {/* Para quién es */}
                        <div className="bg-[#52AF32]/5 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-[#52AF32] mb-2">
                            {Icons.userGroup}
                            <span className="text-xs font-semibold uppercase tracking-wide">Beneficiario</span>
                          </div>
                          <p className="font-semibold text-[#424846]">{proposal.profile?.full_name || '—'}</p>
                          <p className="text-sm text-gray-500">{proposal.profile?.position || 'Sin puesto'}</p>
                          {proposal.profile?.departments?.name && (
                            <span className="inline-flex items-center gap-1 mt-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                              {Icons.office}
                              {proposal.profile.departments.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Columna 2: Información del curso */}
                      <div className="md:col-span-2">
                        <div className="bg-gray-50 rounded-xl p-5 h-full">
                          <div className="flex items-center gap-2 text-[#424846] mb-3">
                            {Icons.book}
                            <span className="text-xs font-semibold uppercase tracking-wide">Curso Propuesto</span>
                          </div>

                          <h3 className="font-bold text-xl text-[#424846] mb-4">{proposal.course_name}</h3>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {/* Institución */}
                            {proposal.institution_name && (
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Institución</p>
                                <p className="font-medium text-gray-900 text-sm">{proposal.institution_name}</p>
                              </div>
                            )}

                            {/* Modalidad */}
                            {proposal.modality && (
                              <div className="bg-white rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Modalidad</p>
                                <p className="font-medium text-gray-900 text-sm capitalize">{proposal.modality}</p>
                              </div>
                            )}

                            {/* Costo */}
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Costo Estimado</p>
                              <p className="font-bold text-gray-900">{formatCurrency(proposal.estimated_cost)}</p>
                            </div>

                            {/* Horas */}
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Duración</p>
                              <p className="font-medium text-gray-900">{proposal.estimated_hours} horas</p>
                            </div>
                          </div>

                          {/* Fechas si existen */}
                          {(proposal.start_date || proposal.end_date) && (
                            <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                              {proposal.start_date && (
                                <span className="flex items-center gap-1">
                                  {Icons.calendar}
                                  Inicio: {formatDate(proposal.start_date)}
                                </span>
                              )}
                              {proposal.end_date && (
                                <span className="flex items-center gap-1">
                                  {Icons.calendar}
                                  Fin: {formatDate(proposal.end_date)}
                                </span>
                              )}
                            </div>
                          )}

                          {/* URL del curso */}
                          {proposal.course_url && (
                            <a
                              href={proposal.course_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-[#52AF32] hover:underline text-sm font-medium"
                            >
                              {Icons.link}
                              Ver pagina del curso
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Justificación */}
                    {proposal.justification && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="text-gray-400 mt-0.5">{Icons.chat}</div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Justificación del colaborador</p>
                            <p className="text-gray-700 italic">&quot;{proposal.justification}&quot;</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notas de revisión */}
                    {proposal.review_notes && (
                      <div className="mt-4 pt-4 border-t border-blue-100">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">Notas de revisión</p>
                          <p className="text-blue-700">{proposal.review_notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Motivo de rechazo */}
                    {proposal.status === 'rechazada' && proposal.rejection_reason && (
                      <div className="mt-4 pt-4 border-t border-red-100">
                        <div className="bg-red-50 rounded-lg p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1">Motivo del rechazo</p>
                          <p className="text-red-700">{proposal.rejection_reason}</p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
            </div>

            {/* Pagination */}
            {paginationMeta && paginationMeta.total > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <Pagination
                  meta={paginationMeta}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              </div>
            )}
          </>
        )}

        {/* Confirmation Modal - Before Approval */}
        {confirmingApproval && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-[#DFA922] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Antes de aprobar</h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-[#424846]">
                  <strong>Importante:</strong> Antes de aprobar esta propuesta, asegurate de:
                </p>
                <ul className="text-sm text-gray-600 space-y-3">
                  <li className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-[#DFA922] mt-0.5">{Icons.search}</span>
                    <span>Investigar el curso propuesto (revisar URL, contenido, calidad)</span>
                  </li>
                  <li className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-[#DFA922] mt-0.5">{Icons.office}</span>
                    <span>Verificar que la <strong>institucion</strong> exista en el catalogo</span>
                  </li>
                  <li className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-[#DFA922] mt-0.5">{Icons.book}</span>
                    <span>Verificar <strong>tipo de curso</strong> y <strong>modalidad</strong> en catalogos</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-500 italic bg-[#222D59]/5 p-3 rounded-lg">
                  Los catalogos se pueden administrar desde el menu &quot;Catalogos&quot; en la barra lateral.
                </p>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmingApproval(null)}
                  className="px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmApproval}
                  className="px-5 py-2.5 text-sm bg-[#52AF32] text-white rounded-xl hover:bg-[#67B52E] font-medium"
                >
                  Entendido, continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {approvingProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
              <div className="bg-[#52AF32] px-6 py-4 sticky top-0 z-10">
                <h2 className="text-xl font-bold text-white">Aprobar Propuesta y Crear Curso</h2>
                <p className="text-white/80 text-sm">Verifica y completa los datos del curso antes de crear</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Original proposal info */}
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#424846] mb-3">Datos de la propuesta original</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Curso:</span>
                      <p className="font-medium text-[#424846]">{approvingProposal.course_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Institucion sugerida:</span>
                      <p className="font-medium text-[#424846]">{approvingProposal.institution_name || 'No especificada'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Beneficiario:</span>
                      <p className="font-medium text-[#424846]">{approvingProposal.profile?.full_name}</p>
                    </div>
                    <div>
                      {approvingProposal.course_url && (
                        <a href={approvingProposal.course_url} target="_blank" rel="noopener noreferrer" className="text-[#52AF32] hover:underline text-sm flex items-center gap-1">
                          {Icons.link} Ver URL del curso
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Course data form */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Curso *
                    </label>
                    <input
                      type="text"
                      value={approvalForm.course_name}
                      onChange={(e) => setApprovalForm({ ...approvalForm, course_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Institución *
                    </label>
                    <select
                      value={approvalForm.institution_id}
                      onChange={(e) => setApprovalForm({ ...approvalForm, institution_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Curso *
                    </label>
                    <select
                      value={approvalForm.course_type_id}
                      onChange={(e) => setApprovalForm({ ...approvalForm, course_type_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      {courseTypes.map((ct) => (
                        <option key={ct.id} value={ct.id}>{ct.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modalidad *
                    </label>
                    <select
                      value={approvalForm.modality_id}
                      onChange={(e) => setApprovalForm({ ...approvalForm, modality_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      {modalities.map((mod) => (
                        <option key={mod.id} value={mod.id}>{mod.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo (MXN) *
                    </label>
                    <input
                      type="number"
                      value={approvalForm.cost}
                      onChange={(e) => setApprovalForm({ ...approvalForm, cost: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horas Totales *
                    </label>
                    <input
                      type="number"
                      value={approvalForm.total_hours}
                      onChange={(e) => setApprovalForm({ ...approvalForm, total_hours: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      value={approvalForm.start_date}
                      onChange={(e) => setApprovalForm({ ...approvalForm, start_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Fin
                    </label>
                    <input
                      type="date"
                      value={approvalForm.end_date}
                      onChange={(e) => setApprovalForm({ ...approvalForm, end_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación/Plataforma
                    </label>
                    <input
                      type="text"
                      value={approvalForm.location}
                      onChange={(e) => setApprovalForm({ ...approvalForm, location: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                      placeholder="Ej: Udemy, Presencial CDMX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructor
                    </label>
                    <input
                      type="text"
                      value={approvalForm.instructor}
                      onChange={(e) => setApprovalForm({ ...approvalForm, instructor: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={approvalForm.description}
                      onChange={(e) => setApprovalForm({ ...approvalForm, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas de Aprobación
                    </label>
                    <textarea
                      value={approvalForm.review_notes}
                      onChange={(e) => setApprovalForm({ ...approvalForm, review_notes: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#52AF32] focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Notas opcionales..."
                    />
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-[#52AF32]/10 border border-[#52AF32]/30 rounded-xl p-4 text-sm text-[#424846]">
                  <p className="font-medium mb-1">Al aprobar esta propuesta:</p>
                  <ul className="list-disc list-inside space-y-1 text-[#424846]/80">
                    <li>Se creara el curso con los datos verificados</li>
                    <li>Se creara una edicion con las fechas indicadas</li>
                    <li>Se inscribira automaticamente al beneficiario</li>
                    <li>Se actualizara el presupuesto del departamento</li>
                  </ul>
                </div>
              </div>

              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                <button
                  onClick={() => setApprovingProposal(null)}
                  className="px-5 py-2.5 text-sm text-gray-700 hover:text-gray-900 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="px-5 py-2.5 text-sm bg-[#52AF32] text-white rounded-xl hover:bg-[#67B52E] disabled:opacity-50 font-medium"
                >
                  {approveMutation.isPending ? 'Procesando...' : 'Aprobar y Crear Curso'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {rejectingProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
              <div className="bg-red-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Rechazar Propuesta</h2>
                <p className="text-white/80 text-sm">Indica el motivo del rechazo para que el colaborador pueda entenderlo</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Resumen de la propuesta */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Curso Propuesto</p>
                      <p className="font-semibold text-[#424846]">{rejectingProposal.course_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Solicitante</p>
                      <p className="font-medium text-[#424846]">{rejectingProposal.proposer?.full_name}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Beneficiario</p>
                    <p className="font-medium text-[#424846]">{rejectingProposal.profile?.full_name}</p>
                    {rejectingProposal.profile?.departments?.name && (
                      <p className="text-sm text-gray-500">{rejectingProposal.profile.departments.name}</p>
                    )}
                  </div>
                  {rejectingProposal.justification && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Justificación del colaborador</p>
                      <p className="text-sm text-gray-700 italic mt-1">&quot;{rejectingProposal.justification}&quot;</p>
                    </div>
                  )}
                </div>

                {/* Campo de motivo de rechazo */}
                <div>
                  <label className="block text-sm font-medium text-[#424846] mb-1">
                    Motivo del rechazo *
                  </label>
                  <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>
                        Este mensaje será visible para el colaborador. Sé claro y constructivo al explicar por qué no se puede aprobar esta propuesta.
                      </span>
                    </p>
                  </div>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                    placeholder="Ej: El curso no está alineado con los objetivos del área, el costo excede el presupuesto disponible, existe un curso similar ya programado..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Mínimo 20 caracteres</p>
                </div>

                {/* Warning box */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  <p className="font-medium mb-1">Al rechazar esta propuesta:</p>
                  <ul className="list-disc list-inside space-y-1 text-red-600">
                    <li>El colaborador recibirá una notificación</li>
                    <li>El motivo del rechazo será visible en su historial</li>
                    <li>Esta acción no se puede deshacer</li>
                  </ul>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setRejectingProposal(null);
                    setRejectReason('');
                  }}
                  className="px-5 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  className="px-5 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {rejectMutation.isPending ? 'Procesando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
