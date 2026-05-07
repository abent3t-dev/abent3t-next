'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import Pagination from '@/components/ui/Pagination';
import CourseCombobox from '@/components/capacitacion/CourseCombobox';
import CollaboratorCombobox from '@/components/capacitacion/CollaboratorCombobox';
import { markSectionAsSeen } from '@/hooks/useSidebarBadges';
import type {
  TrainingRequest,
  RequestStatus,
  Course,
  UserProfile,
} from '@/types/catalogs';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';

interface ProposalAttachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  is_active: boolean;
}

interface CourseProposal {
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
  proposed_by?: string;
  profile_id?: string;
  proposer?: { id: string; full_name: string; email: string } | null;
  profile?: { id: string; full_name: string; position: string | null } | null;
  attachments?: ProposalAttachment[] | null;
}

const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getApiToken(): Promise<string> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

const Icons = {
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
  arrowRight: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  ),
  chat: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  paperclip: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
};

const statusConfig: Record<RequestStatus, { label: string; bg: string; text: string; border: string; iconColor: string }> = {
  pendiente: { label: 'Pendiente de Revisión', bg: 'bg-[#DFA922]/10', text: 'text-[#DFA922]', border: 'border-[#DFA922]/30', iconColor: 'text-[#DFA922]' },
  aprobada: { label: 'Aprobada', bg: 'bg-[#52AF32]/10', text: 'text-[#52AF32]', border: 'border-[#52AF32]/30', iconColor: 'text-[#52AF32]' },
  rechazada: { label: 'Rechazada', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', iconColor: 'text-red-600' },
};

const proposalStatusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_investigacion: 'En Investigacion',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const proposalStatusColors: Record<string, string> = {
  pendiente: 'bg-[#DFA922]/10 text-[#DFA922]',
  en_investigacion: 'bg-[#222D59]/10 text-[#222D59]',
  aprobada: 'bg-[#52AF32]/10 text-[#52AF32]',
  rechazada: 'bg-red-100 text-red-600',
};

export default function SolicitudesPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin_rh', 'super_admin');
  const isManager = hasRole('jefe_area', 'director');

  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Modal para crear solicitud
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedEdition, setSelectedEdition] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal para revisar solicitud (admin)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<TrainingRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'aprobada' | 'rechazada'>('aprobada');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Estado para propuestas de cursos externos
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'propuestas'>('solicitudes');
  const [proposals, setProposals] = useState<CourseProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    course_name: '',
    institution_name: '',
    course_url: '',
    estimated_cost: 0,
    estimated_hours: 0,
    modality: '',
    start_date: '',
    end_date: '',
    justification: '',
  });
  const [proposalFiles, setProposalFiles] = useState<File[]>([]);
  const [proposalUrlError, setProposalUrlError] = useState('');

  // Estado para estadísticas
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
  });

  // Estado para filas expandidas
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set());

  const toggleRequest = (id: string) => {
    setExpandedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProposal = (id: string) => {
    setExpandedProposals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Cargar solicitudes
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (filter !== 'all') {
        params.append('status', filter);
      }

      let response: PaginatedResponse<TrainingRequest>;
      if (isAdmin) {
        response = await api.get<PaginatedResponse<TrainingRequest>>(`/requests?${params.toString()}`);
      } else {
        response = await api.get<PaginatedResponse<TrainingRequest>>(`/requests/my-requests?${params.toString()}`);
      }
      setRequests(response.data);
      setMeta(response.meta);
    } catch {
      notify.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, limit, filter]);

  // Cargar cursos para el modal de crear
  // Solo se muestran cursos activos que tengan al menos una edicion activa,
  // ya que sin edicion no es posible inscribir al colaborador.
  const loadCourses = async () => {
    const data = await api.get<Course[]>('/courses');
    setCourses(data.filter((c) => c.is_active && (c.active_editions_count ?? 0) > 0));
  };

  // Cargar colaboradores del departamento del jefe
  const loadCollaborators = async () => {
    if (!user?.department_id) return;
    const data = await api.get<UserProfile[]>('/auth/my-team');
    setCollaborators(data);
  };

  // Cargar propuestas: jefe_area ve las de su equipo, colaborador solo las suyas
  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    try {
      const endpoint = isManager ? '/proposals/my-team' : '/proposals/my-proposals';
      const data = await api.get<CourseProposal[]>(endpoint);
      setProposals(data);
    } catch {
      notify.error('Error al cargar propuestas');
    } finally {
      setLoadingProposals(false);
    }
  }, [isManager]);

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      const data = await api.get<{ total: number; pendientes: number; aprobadas: number; rechazadas: number }>('/requests/stats');
      setStats(data);
    } catch {
      notify.error('Error al cargar estadísticas');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'solicitudes') {
      loadRequests();
      loadStats();
      markSectionAsSeen('solicitudes');
    } else {
      loadProposals();
      markSectionAsSeen('propuestas');
    }
  }, [loadRequests, loadProposals, loadStats, activeTab]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  // Abrir modal de crear
  const openCreateModal = async () => {
    await Promise.all([loadCourses(), loadCollaborators()]);
    setSelectedCourse('');
    setSelectedEdition('');
    setSelectedCollaborator('');
    setRequestReason('');
    setCreateModalOpen(true);
  };

  // Cuando se selecciona curso + edición desde el picker
  const handleCourseAndEditionChange = (courseId: string, editionId: string) => {
    setSelectedCourse(courseId);
    setSelectedEdition(editionId);
  };

  // Crear solicitud
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEdition || !selectedCollaborator) {
      notify.error('Selecciona un curso, edición y colaborador');
      return;
    }

    setCreating(true);
    try {
      await api.post('/requests', {
        course_edition_id: selectedEdition,
        profile_id: selectedCollaborator,
        request_reason: requestReason || null,
      });
      notify.success('Solicitud creada exitosamente');
      setCreateModalOpen(false);
      loadRequests();
      loadStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      notify.error(error.message || 'Error al crear solicitud');
    } finally {
      setCreating(false);
    }
  };

  // Abrir modal de revisión
  const openReviewModal = (request: TrainingRequest, action: 'aprobada' | 'rechazada') => {
    setReviewingRequest(request);
    setReviewAction(action);
    setRejectionReason('');
    setReviewModalOpen(true);
  };

  // Revisar solicitud
  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRequest) return;

    if (reviewAction === 'rechazada' && !rejectionReason.trim()) {
      notify.error('Debes indicar el motivo del rechazo');
      return;
    }

    setReviewing(true);
    try {
      await api.put(`/requests/${reviewingRequest.id}/review`, {
        status: reviewAction,
        rejection_reason: reviewAction === 'rechazada' ? rejectionReason : undefined,
      });
      notify.success(
        reviewAction === 'aprobada'
          ? 'Solicitud aprobada - Inscripción creada'
          : 'Solicitud rechazada'
      );
      setReviewModalOpen(false);
      loadRequests();
      loadStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      notify.error(error.message || 'Error al procesar solicitud');
    } finally {
      setReviewing(false);
    }
  };

  // Cancelar solicitud (solo jefe_area, solo pendientes)
  const handleCancel = async (id: string) => {
    const confirmed = await notify.confirm('¿Cancelar esta solicitud?');
    if (!confirmed) return;

    try {
      await api.delete(`/requests/${id}`);
      notify.success('Solicitud cancelada');
      loadRequests();
      loadStats();
    } catch (err: unknown) {
      const error = err as { message?: string };
      notify.error(error.message || 'Error al cancelar');
    }
  };

  // Abrir modal de propuesta
  const openProposalModal = () => {
    setProposalForm({
      course_name: '',
      institution_name: '',
      course_url: '',
      estimated_cost: 0,
      estimated_hours: 0,
      modality: '',
      start_date: '',
      end_date: '',
      justification: '',
    });
    setProposalFiles([]);
    setProposalUrlError('');
    setProposalModalOpen(true);
  };

  const isValidUrl = (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleProposalUrlChange = (value: string) => {
    setProposalForm({ ...proposalForm, course_url: value });
    if (!value.trim()) {
      setProposalUrlError('');
      return;
    }
    setProposalUrlError(
      isValidUrl(value.trim())
        ? ''
        : 'Ingresa una URL válida (debe iniciar con http:// o https://)',
    );
  };

  const handleAddProposalFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted: File[] = [];
    for (const f of Array.from(files)) {
      if (!ATTACHMENT_ALLOWED_MIME.includes(f.type)) {
        notify.error(`"${f.name}": tipo de archivo no permitido`);
        continue;
      }
      if (f.size > ATTACHMENT_MAX_BYTES) {
        notify.error(`"${f.name}": excede el tamaño máximo de 10MB`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > 0) {
      setProposalFiles((prev) => [...prev, ...accepted]);
    }
  };

  const removeProposalFile = (index: number) => {
    setProposalFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadProposalAttachments = async (
    proposalId: string,
    files: File[],
  ) => {
    if (files.length === 0) return;
    const token = await getApiToken();
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${apiUrl}/proposals/${proposalId}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error al subir "${file.name}"`);
      }
    }
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    try {
      const { url, fileName } = await api.get<{ url: string; fileName: string }>(
        `/proposals/attachments/${attachmentId}/download`,
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

  // Crear propuesta
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalForm.course_name.trim()) {
      notify.error('Ingresa el nombre del curso');
      return;
    }
    if (!proposalForm.justification.trim()) {
      notify.error('La justificación es obligatoria. Explica por qué te interesa este curso.');
      return;
    }
    if (proposalForm.justification.trim().length < 50) {
      notify.error('La justificación debe ser más detallada (mínimo 50 caracteres)');
      return;
    }

    const trimmedUrl = proposalForm.course_url.trim();
    if (trimmedUrl && !isValidUrl(trimmedUrl)) {
      setProposalUrlError(
        'Ingresa una URL válida (debe iniciar con http:// o https://)',
      );
      notify.error('La URL del curso no es válida');
      return;
    }

    setCreatingProposal(true);
    try {
      const payload = {
        ...proposalForm,
        course_url: trimmedUrl || undefined,
      };
      const created = await api.post<CourseProposal>('/proposals', payload);

      if (proposalFiles.length > 0) {
        try {
          await uploadProposalAttachments(created.id, proposalFiles);
        } catch (uploadErr: unknown) {
          const error = uploadErr as { message?: string };
          notify.error(
            error.message ||
              'La propuesta se creó pero hubo un error al subir algún archivo',
          );
        }
      }

      notify.success('Propuesta enviada exitosamente');
      setProposalModalOpen(false);
      setProposalFiles([]);
      loadProposals();
    } catch (err: unknown) {
      const error = err as { message?: string };
      notify.error(error.message || 'Error al enviar propuesta');
    } finally {
      setCreatingProposal(false);
    }
  };

  // Cancelar propuesta
  const handleCancelProposal = async (id: string) => {
    const confirmed = await notify.confirm('¿Cancelar esta propuesta?');
    if (!confirmed) return;

    try {
      await api.delete(`/proposals/${id}`);
      notify.success('Propuesta cancelada');
      loadProposals();
    } catch (err: unknown) {
      const error = err as { message?: string };
      notify.error(error.message || 'Error al cancelar');
    }
  };

  // Handlers de paginación
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };

  // Formatear fecha
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#424846]">Solicitudes de Capacitacion</h1>
            <p className="text-gray-500 mt-1">
              {isAdmin
                ? 'Revisa y gestiona las solicitudes de capacitacion de todas las areas'
                : isManager
                ? 'Solicita cursos para tu equipo o propon cursos externos'
                : 'Propon cursos externos para tu desarrollo profesional'}
            </p>
          </div>
          <div className="flex gap-3">
            {!isAdmin && (
              <button
                onClick={openProposalModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#222D59] text-white rounded-xl hover:bg-[#222D59]/90 transition-all shadow-md"
              >
                {Icons.lightbulb}
                <span>Proponer Curso</span>
              </button>
            )}
            {isManager && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#52AF32] text-white rounded-xl hover:bg-[#67B52E] transition-all shadow-md"
              >
                {Icons.plus}
                <span>Nueva Solicitud</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs - Solo para no-admins */}
        {!isAdmin && (
          <div className="bg-white rounded-xl p-1 inline-flex gap-1 shadow-sm">
            <button
              onClick={() => setActiveTab('solicitudes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'solicitudes'
                  ? 'bg-[#52AF32]/10 text-[#52AF32] shadow-sm'
                  : 'text-gray-500 hover:text-[#424846]'
              }`}
            >
              {isManager ? 'Solicitudes de Equipo' : 'Solicitudes'}
            </button>
            <button
              onClick={() => setActiveTab('propuestas')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'propuestas'
                  ? 'bg-[#222D59]/10 text-[#222D59] shadow-sm'
                  : 'text-gray-500 hover:text-[#424846]'
              }`}
            >
              {isManager ? 'Propuestas de Equipo' : 'Mis Propuestas'}
              {proposals.filter(p => ['pendiente', 'en_investigacion'].includes(p.status)).length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-[#222D59]/10 text-[#222D59] rounded-full">
                  {proposals.filter(p => ['pendiente', 'en_investigacion'].includes(p.status)).length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Contenido de Solicitudes */}
        {activeTab === 'solicitudes' && (
          <>
            {/* Stats Cards - KPIs con colores A3T */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setFilter('all')}
                className={`p-4 rounded-xl transition-all ${
                  filter === 'all'
                    ? 'bg-white shadow-lg border-2 border-[#424846]'
                    : 'bg-white hover:shadow-md border border-gray-200'
                }`}
              >
                <p className="text-2xl font-bold text-[#424846]">{stats.total}</p>
                <p className="text-sm text-[#424846]/70">Total</p>
              </button>
              <button
                onClick={() => setFilter('pendiente')}
                className={`p-4 rounded-xl transition-all ${
                  filter === 'pendiente'
                    ? 'bg-[#DFA922]/10 shadow-lg border-2 border-[#DFA922]'
                    : 'bg-white hover:bg-[#DFA922]/5 hover:shadow-md border border-gray-200'
                }`}
              >
                <p className="text-2xl font-bold text-[#DFA922]">{stats.pendientes}</p>
                <p className="text-sm text-[#DFA922]/70">Pendientes</p>
              </button>
              <button
                onClick={() => setFilter('aprobada')}
                className={`p-4 rounded-xl transition-all ${
                  filter === 'aprobada'
                    ? 'bg-[#52AF32]/10 shadow-lg border-2 border-[#52AF32]'
                    : 'bg-white hover:bg-[#52AF32]/5 hover:shadow-md border border-gray-200'
                }`}
              >
                <p className="text-2xl font-bold text-[#52AF32]">{stats.aprobadas}</p>
                <p className="text-sm text-[#52AF32]/70">Aprobadas</p>
              </button>
              <button
                onClick={() => setFilter('rechazada')}
                className={`p-4 rounded-xl transition-all ${
                  filter === 'rechazada'
                    ? 'bg-red-50 shadow-lg border-2 border-red-500'
                    : 'bg-white hover:bg-red-50 hover:shadow-md border border-gray-200'
                }`}
              >
                <p className="text-2xl font-bold text-red-600">{stats.rechazadas}</p>
                <p className="text-sm text-red-600/70">Rechazadas</p>
              </button>
            </div>

            {/* Lista de solicitudes */}
            {loading ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <div className="animate-spin w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-500 mt-4">Cargando solicitudes...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-[#52AF32]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#52AF32]">
                  {Icons.book}
                </div>
                <p className="text-[#424846] font-medium">No hay solicitudes</p>
                <p className="text-gray-400 text-sm mt-1">
                  {filter !== 'all' ? `No hay solicitudes con este estado` : 'Aun no se han creado solicitudes de capacitacion'}
                </p>
              </div>
            ) : (
              <>
              <div className="space-y-2">
                {requests.map((req) => {
                  const status = statusConfig[req.status];
                  const course = req.course_editions?.courses;
                  const edition = req.course_editions;
                  const profile = req.profiles;
                  const requester = req.requester;
                  const isExpanded = expandedRequests.has(req.id);
                  // Costo efectivo: edición tiene prioridad sobre el costo base del curso
                  const effectiveCost = edition?.cost_override ?? course?.cost ?? 0;

                  return (
                    <div
                      key={req.id}
                      className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${status.border}`}
                    >
                      {/* Fila compacta - clickeable para expandir */}
                      <button
                        onClick={() => toggleRequest(req.id)}
                        className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Chevron */}
                        <span className={`text-[#424846]/50 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                          {Icons.chevronDown}
                        </span>

                        {/* Status pill */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} border ${status.border} flex-shrink-0`}>
                          <span className={status.iconColor}>
                            {req.status === 'pendiente' && Icons.clock}
                            {req.status === 'aprobada' && Icons.check}
                            {req.status === 'rechazada' && Icons.x}
                          </span>
                          {status.label}
                        </span>

                        {/* Curso */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#424846] truncate">{course?.name || '—'}</p>
                          <p className="text-xs text-[#424846]/60 truncate">
                            {profile?.full_name || '—'} · {profile?.departments?.name || '—'}
                          </p>
                        </div>

                        {/* Fecha de inicio del curso */}
                        <div className="hidden md:flex items-center gap-1 text-xs text-[#424846]/70 flex-shrink-0">
                          {Icons.calendar}
                          <span>{edition?.start_date ? formatDate(edition.start_date) : '—'}</span>
                        </div>

                        {/* Costo */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[#424846] text-sm">
                            ${effectiveCost.toLocaleString()}
                            <span className="text-xs font-normal text-[#424846]/60 ml-1">MXN</span>
                          </p>
                        </div>
                      </button>

                      {/* Acciones (siempre visibles para pendientes) */}
                      {req.status === 'pendiente' && (isAdmin || isManager) && (
                        <div className={`px-4 pb-3 flex items-center justify-end gap-2 ${isExpanded ? '' : 'border-t border-gray-100 pt-3'}`}>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openReviewModal(req, 'aprobada')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#52AF32] text-white rounded-lg hover:bg-[#67B52E] transition-colors text-xs font-medium"
                              >
                                {Icons.check}
                                Aprobar
                              </button>
                              <button
                                onClick={() => openReviewModal(req, 'rechazada')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-600 border border-red-500 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
                              >
                                {Icons.x}
                                Rechazar
                              </button>
                            </>
                          )}
                          {isManager && (
                            <button
                              onClick={() => handleCancel(req.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-[#424846] rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                            >
                              {Icons.x}
                              Cancelar
                            </button>
                          )}
                        </div>
                      )}

                      {/* Contenido expandido */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 p-6 bg-gray-50/30">
                          <div className="flex items-center gap-2 text-xs text-[#424846]/70 mb-4">
                            {Icons.calendar}
                            <span>Solicitado el {formatDate(req.created_at)}</span>
                          </div>

                          <div className="grid md:grid-cols-3 gap-6">
                            {/* Columna 1: Flujo de solicitud */}
                            <div className="md:col-span-1 space-y-4">
                              <div className="bg-[#222D59]/5 rounded-xl p-4 border border-[#222D59]/10">
                                <div className="flex items-center gap-2 text-[#222D59] mb-2">
                                  {Icons.userGroup}
                                  <span className="text-xs font-semibold uppercase tracking-wide">Solicitado por</span>
                                </div>
                                <p className="font-semibold text-[#424846]">{requester?.full_name || '—'}</p>
                                <p className="text-sm text-[#424846]/70">Jefe de Area</p>
                              </div>

                              <div className="flex justify-center text-[#52AF32]/50">
                                <svg className="w-6 h-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </div>

                              <div className="bg-[#52AF32]/5 rounded-xl p-4 border border-[#52AF32]/10">
                                <div className="flex items-center gap-2 text-[#52AF32] mb-2">
                                  {Icons.user}
                                  <span className="text-xs font-semibold uppercase tracking-wide">Beneficiario</span>
                                </div>
                                <p className="font-semibold text-[#424846]">{profile?.full_name || '—'}</p>
                                <p className="text-sm text-[#424846]/70">{profile?.position || 'Sin puesto'}</p>
                                <p className="text-xs text-[#424846]/50 mt-1">{profile?.email}</p>
                              </div>
                            </div>

                            {/* Columna 2: Informacion del curso */}
                            <div className="md:col-span-1">
                              <div className="bg-[#424846]/5 rounded-xl p-4 h-full border border-[#424846]/10">
                                <div className="flex items-center gap-2 text-[#424846] mb-3">
                                  {Icons.book}
                                  <span className="text-xs font-semibold uppercase tracking-wide">Curso Solicitado</span>
                                </div>
                                <h3 className="font-bold text-lg text-[#424846] mb-3">{course?.name || '—'}</h3>

                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2 text-[#424846]/70">
                                    {Icons.calendar}
                                    <span>Inicio: {edition?.start_date ? formatDate(edition.start_date) : '—'}</span>
                                  </div>
                                  {edition?.end_date && (
                                    <div className="flex items-center gap-2 text-[#424846]/70">
                                      {Icons.calendar}
                                      <span>Fin: {formatDate(edition.end_date)}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-[#424846]/70">
                                    {Icons.clock}
                                    <span>{course?.total_hours || 0} horas</span>
                                  </div>
                                  {edition?.instructor && (
                                    <div className="flex items-center gap-2 text-[#424846]/70">
                                      {Icons.user}
                                      <span>Instructor: {edition.instructor}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Columna 3: Area y costo */}
                            <div className="md:col-span-1 space-y-4">
                              <div className="bg-[#222D59]/5 rounded-xl p-4 border border-[#222D59]/10">
                                <div className="flex items-center gap-2 text-[#222D59] mb-2">
                                  {Icons.office}
                                  <span className="text-xs font-semibold uppercase tracking-wide">Area</span>
                                </div>
                                <p className="font-semibold text-[#424846]">{profile?.departments?.name || '—'}</p>
                              </div>

                              <div className="bg-[#DFA922]/10 rounded-xl p-4 border border-[#DFA922]/20">
                                <div className="flex items-center gap-2 text-[#DFA922] mb-2">
                                  {Icons.currency}
                                  <span className="text-xs font-semibold uppercase tracking-wide">Inversion</span>
                                </div>
                                <p className="font-bold text-2xl text-[#424846]">
                                  ${effectiveCost.toLocaleString()}
                                  <span className="text-sm font-normal text-[#424846]/60 ml-1">MXN</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Motivo de la solicitud */}
                          {req.request_reason && (
                            <div className="mt-6 pt-4 border-t border-[#424846]/10">
                              <div className="flex items-start gap-3">
                                <div className="text-[#424846]/50 mt-0.5">{Icons.chat}</div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[#424846]/70 mb-1">Motivo de la solicitud</p>
                                  <p className="text-[#424846]">{req.request_reason}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Motivo de rechazo */}
                          {req.status === 'rechazada' && req.rejection_reason && (
                            <div className="mt-6 pt-4 border-t border-red-100">
                              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1">Motivo del rechazo</p>
                                <p className="text-red-700">{req.rejection_reason}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <Pagination
                  meta={meta}
                  onPageChange={handlePageChange}
                  onLimitChange={handleLimitChange}
                />
              </div>
              </>
            )}
          </>
        )}

        {/* Contenido de Propuestas - Solo para no-admins */}
        {!isAdmin && activeTab === 'propuestas' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loadingProposals ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#222D59] border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-500 mt-4">Cargando propuestas...</p>
              </div>
            ) : proposals.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-[#222D59]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#222D59]">
                  {Icons.lightbulb}
                </div>
                <p className="text-[#424846] font-medium">
                  {isManager ? 'No hay propuestas de tu equipo' : 'No tienes propuestas de cursos'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {isManager
                    ? 'Cuando tú o algún colaborador de tu área proponga un curso, aparecerá aquí.'
                    : 'Encontraste un curso interesante? Haz clic en "Proponer Curso" para enviarlo a revisión.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#424846]/10">
                {proposals.map((proposal) => {
                  const isExpanded = expandedProposals.has(proposal.id);
                  const isOwn = proposal.proposed_by === user?.id;
                  // Solo se puede cancelar propuestas propias y en estado activo
                  const canCancel = isOwn && ['pendiente', 'en_investigacion'].includes(proposal.status);

                  return (
                    <div key={proposal.id} className="transition-colors">
                      {/* Fila compacta */}
                      <button
                        onClick={() => toggleProposal(proposal.id)}
                        className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className={`text-[#424846]/50 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                          {Icons.chevronDown}
                        </span>

                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ${proposalStatusColors[proposal.status]}`}>
                          {proposalStatusLabels[proposal.status]}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#424846] truncate">
                            {proposal.course_name}
                            {isManager && !isOwn && (
                              <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-[#52AF32]/10 text-[#52AF32] rounded-full uppercase tracking-wide align-middle">
                                Equipo
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[#424846]/60 truncate">
                            {isManager && proposal.proposer
                              ? `Propuesta por ${proposal.proposer.full_name}`
                              : proposal.institution_name || 'Sin institución'}
                            {' · '}{formatDate(proposal.created_at)}
                          </p>
                        </div>

                        <div className="hidden md:flex items-center gap-1 text-xs text-[#424846]/70 flex-shrink-0">
                          {Icons.clock}
                          <span>{proposal.estimated_hours}h</span>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[#424846] text-sm">
                            ${proposal.estimated_cost.toLocaleString()}
                            <span className="text-xs font-normal text-[#424846]/60 ml-1">MXN</span>
                          </p>
                        </div>

                        {canCancel && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelProposal(proposal.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCancelProposal(proposal.id);
                              }
                            }}
                            className="p-1.5 text-[#424846]/50 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                            title="Cancelar propuesta"
                          >
                            {Icons.x}
                          </span>
                        )}
                      </button>

                      {/* Contenido expandido */}
                      {isExpanded && (
                        <div className="px-6 pb-6 bg-gray-50/30 border-t border-gray-100">
                          <div className="pt-4 flex flex-wrap items-center gap-4 text-sm text-[#424846]/70">
                            {proposal.institution_name && (
                              <span className="flex items-center gap-1">{Icons.office} {proposal.institution_name}</span>
                            )}
                            {proposal.modality && (
                              <span className="bg-[#424846]/10 px-2 py-0.5 rounded text-xs text-[#424846]">{proposal.modality}</span>
                            )}
                            <span className="flex items-center gap-1">{Icons.currency} ${proposal.estimated_cost.toLocaleString()}</span>
                            <span className="flex items-center gap-1">{Icons.clock} {proposal.estimated_hours}h</span>
                            <span className="flex items-center gap-1">{Icons.calendar} {formatDate(proposal.created_at)}</span>
                          </div>

                          {proposal.course_url && (
                            <a
                              href={proposal.course_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#52AF32] hover:text-[#67B52E] hover:underline mt-3 inline-block font-medium"
                            >
                              Ver curso externo →
                            </a>
                          )}
                          {proposal.justification && (
                            <p className="text-sm text-[#424846]/80 mt-3 italic bg-white p-3 rounded-xl border border-[#424846]/10">&quot;{proposal.justification}&quot;</p>
                          )}
                          {proposal.attachments && proposal.attachments.filter(a => a.is_active).length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#424846]/70 mb-2 flex items-center gap-1">
                                {Icons.paperclip}
                                Archivos adjuntos ({proposal.attachments.filter(a => a.is_active).length})
                              </p>
                              <ul className="space-y-2">
                                {proposal.attachments.filter(a => a.is_active).map((att) => (
                                  <li
                                    key={att.id}
                                    className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-[#424846]/10"
                                  >
                                    <span className="text-[#222D59]">{Icons.paperclip}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-[#424846] truncate">
                                        {att.file_name}
                                      </p>
                                      <p className="text-xs text-[#424846]/60">
                                        {formatFileSize(att.file_size)}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadAttachment(att.id)}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#222D59] bg-[#222D59]/10 hover:bg-[#222D59]/20 rounded-lg transition-colors"
                                    >
                                      {Icons.download}
                                      Descargar
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {proposal.review_notes && (
                            <p className="text-sm text-[#52AF32] mt-3 font-medium">Notas de revision: {proposal.review_notes}</p>
                          )}
                          {proposal.rejection_reason && (
                            <div className="mt-3 bg-red-50 rounded-xl p-3 border border-red-200">
                              <p className="text-sm text-red-600">Motivo de rechazo: {proposal.rejection_reason}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Crear Solicitud */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              <div className="bg-[#52AF32] px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Nueva Solicitud de Capacitacion</h2>
                <p className="text-white/80 text-sm">Solicita un curso para un colaborador de tu equipo</p>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="block">
                  <span className="text-sm font-medium text-[#424846]">Curso y edición *</span>
                  <div className="mt-1">
                    <CourseCombobox
                      courses={courses}
                      value={selectedCourse}
                      editionValue={selectedEdition}
                      onChange={handleCourseAndEditionChange}
                      emptyHint="Prueba con otro nombre, institución o modalidad."
                    />
                  </div>
                  {courses.length === 0 && (
                    <p className="mt-2 text-xs text-[#DFA922]">
                      No hay cursos con ediciones disponibles para solicitar. Contacta a RRHH para que registren una edicion.
                    </p>
                  )}
                </div>

                <div className="block">
                  <span className="text-sm font-medium text-[#424846]">Colaborador *</span>
                  <div className="mt-1">
                    <CollaboratorCombobox
                      collaborators={collaborators}
                      value={selectedCollaborator}
                      onChange={setSelectedCollaborator}
                      emptyHint="Solo aparecen colaboradores activos de tu área."
                    />
                  </div>
                  {collaborators.length === 0 && (
                    <p className="mt-2 text-xs text-[#DFA922]">
                      No hay colaboradores disponibles en tu área.
                    </p>
                  )}
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[#424846]">Motivo de la solicitud</span>
                  <textarea
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    rows={3}
                    placeholder="Por que se solicita esta capacitacion?"
                    className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#52AF32] focus:border-transparent resize-none"
                  />
                </label>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-5 py-2.5 text-[#424846] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2.5 bg-[#52AF32] text-white rounded-xl hover:bg-[#67B52E] disabled:opacity-50 transition-colors font-medium"
                  >
                    {creating ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Revisar Solicitud */}
        {reviewModalOpen && reviewingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
              <div className={`px-6 py-4 ${reviewAction === 'aprobada' ? 'bg-[#52AF32]' : 'bg-red-600'}`}>
                <h2 className="text-lg font-semibold text-white">
                  {reviewAction === 'aprobada' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
                </h2>
                <p className="text-white/80 text-sm">
                  {reviewAction === 'aprobada'
                    ? 'Confirma la aprobacion de esta solicitud de capacitacion'
                    : 'Indica el motivo del rechazo de esta solicitud'}
                </p>
              </div>
              <form onSubmit={handleReview} className="p-6 space-y-4">
                {/* Resumen de la solicitud */}
                <div className="bg-[#424846]/5 rounded-xl p-4 space-y-3 border border-[#424846]/10">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#424846]/70 uppercase tracking-wide">Solicitante</p>
                      <p className="font-medium text-[#424846]">{reviewingRequest.requester?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#424846]/70 uppercase tracking-wide">Beneficiario</p>
                      <p className="font-medium text-[#424846]">{reviewingRequest.profiles?.full_name}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#424846]/10">
                    <p className="text-xs text-[#424846]/70 uppercase tracking-wide">Curso</p>
                    <p className="font-semibold text-[#424846]">{reviewingRequest.course_editions?.courses?.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#424846]/70 uppercase tracking-wide">Area</p>
                      <p className="font-medium text-[#424846]">{reviewingRequest.profiles?.departments?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#424846]/70 uppercase tracking-wide">Costo</p>
                      <p className="font-bold text-[#424846]">${(reviewingRequest.course_editions?.cost_override ?? reviewingRequest.course_editions?.courses?.cost ?? 0).toLocaleString()} MXN</p>
                    </div>
                  </div>
                  {reviewingRequest.request_reason && (
                    <div className="pt-3 border-t border-[#424846]/10">
                      <p className="text-xs text-[#424846]/70 uppercase tracking-wide">Motivo</p>
                      <p className="text-[#424846]">{reviewingRequest.request_reason}</p>
                    </div>
                  )}
                </div>

                {reviewAction === 'rechazada' && (
                  <label className="block">
                    <span className="text-sm font-medium text-[#424846]">Motivo del rechazo *</span>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                      rows={3}
                      placeholder="Indica el motivo del rechazo"
                      className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  </label>
                )}

                {reviewAction === 'aprobada' && (
                  <div className="bg-[#52AF32]/10 border border-[#52AF32]/20 rounded-xl p-4 text-sm text-[#424846]">
                    <p className="font-medium mb-1 text-[#52AF32]">Al aprobar esta solicitud:</p>
                    <ul className="list-disc list-inside space-y-1 text-[#424846]/80">
                      <li>Se inscribira automaticamente al colaborador en el curso</li>
                      <li>Se actualizara el presupuesto del area correspondiente</li>
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-5 py-2.5 text-[#424846] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={reviewing}
                    className={`px-5 py-2.5 text-white rounded-xl disabled:opacity-50 transition-colors font-medium ${
                      reviewAction === 'aprobada'
                        ? 'bg-[#52AF32] hover:bg-[#67B52E]'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {reviewing
                      ? 'Procesando...'
                      : reviewAction === 'aprobada'
                      ? 'Confirmar Aprobacion'
                      : 'Confirmar Rechazo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Proponer Curso - Solo para no-admins */}
        {!isAdmin && proposalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="bg-[#222D59] px-6 py-4 sticky top-0">
                <h2 className="text-lg font-semibold text-white">Proponer Curso Externo</h2>
                <p className="text-white/80 text-sm">
                  Encontraste un curso que te interesa? Comparte los detalles y lo revisaremos.
                </p>
              </div>
              <form onSubmit={handleCreateProposal} className="p-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-[#424846]">Nombre del Curso *</span>
                  <input
                    type="text"
                    value={proposalForm.course_name}
                    onChange={(e) => setProposalForm({ ...proposalForm, course_name: e.target.value })}
                    required
                    placeholder="Ej: Certificacion Scrum Master"
                    className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#222D59] focus:border-transparent"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#424846]">Institucion / Plataforma</span>
                  <input
                    type="text"
                    value={proposalForm.institution_name}
                    onChange={(e) => setProposalForm({ ...proposalForm, institution_name: e.target.value })}
                    placeholder="Ej: Coursera, Udemy, Universidad XYZ"
                    className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#222D59] focus:border-transparent"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#424846]">
                    URL del Curso{' '}
                    <span className="text-xs font-normal text-[#424846]/50">(opcional)</span>
                  </span>
                  <input
                    type="text"
                    value={proposalForm.course_url}
                    onChange={(e) => handleProposalUrlChange(e.target.value)}
                    placeholder="https://..."
                    className={`mt-1 block w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:border-transparent ${
                      proposalUrlError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-200 focus:ring-[#222D59]'
                    }`}
                  />
                  {proposalUrlError && (
                    <p className="text-xs text-red-600 mt-1">{proposalUrlError}</p>
                  )}
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-[#424846]">Costo Estimado (MXN)</span>
                    <input
                      type="number"
                      value={proposalForm.estimated_cost}
                      onChange={(e) => setProposalForm({ ...proposalForm, estimated_cost: Number(e.target.value) })}
                      min="0"
                      className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#222D59] focus:border-transparent"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-[#424846]">Horas Estimadas</span>
                    <input
                      type="number"
                      value={proposalForm.estimated_hours}
                      onChange={(e) => setProposalForm({ ...proposalForm, estimated_hours: Number(e.target.value) })}
                      min="0"
                      className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#222D59] focus:border-transparent"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[#424846]">Modalidad</span>
                  <select
                    value={proposalForm.modality}
                    onChange={(e) => setProposalForm({ ...proposalForm, modality: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#222D59] focus:border-transparent"
                  >
                    <option value="">— Seleccionar —</option>
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual</option>
                    <option value="hibrido">Hibrido</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-[#424846]">Fecha de Inicio</span>
                    <input
                      type="date"
                      value={proposalForm.start_date}
                      onChange={(e) => setProposalForm({ ...proposalForm, start_date: e.target.value })}
                      className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#222D59] focus:border-transparent"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-[#424846]">Fecha de Fin</span>
                    <input
                      type="date"
                      value={proposalForm.end_date}
                      onChange={(e) => setProposalForm({ ...proposalForm, end_date: e.target.value })}
                      className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#222D59] focus:border-transparent"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[#424846]">¿Por qué te interesa este curso? *</span>
                  <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>
                        <strong>Este campo es fundamental para la aprobación.</strong> Explica detalladamente cómo este curso contribuirá a tu desarrollo profesional y beneficiará a la empresa.
                      </span>
                    </p>
                  </div>
                  <textarea
                    value={proposalForm.justification}
                    onChange={(e) => setProposalForm({ ...proposalForm, justification: e.target.value })}
                    required
                    rows={4}
                    placeholder="Describe: &#10;• ¿Qué habilidades o conocimientos adquirirás?&#10;• ¿Cómo aplicarás lo aprendido en tu trabajo diario?&#10;• ¿Qué beneficios traerá para tu equipo o la empresa?"
                    className="mt-2 block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#222D59] focus:border-transparent resize-none"
                  />
                </label>

                {/* Archivos adjuntos */}
                <div>
                  <span className="text-sm font-medium text-[#424846]">
                    Archivos Adjuntos{' '}
                    <span className="text-xs font-normal text-[#424846]/50">(opcional)</span>
                  </span>
                  <p className="text-xs text-[#424846]/60 mt-1 mb-2">
                    Si tienes el temario, brochure, ficha técnica o cualquier documento del curso, adjúntalo aquí para que admin RH lo pueda revisar.
                  </p>
                  <label
                    htmlFor="proposal-files-input"
                    className="block cursor-pointer"
                  >
                    <div className="border-2 border-dashed border-[#222D59]/30 rounded-xl p-4 text-center hover:bg-[#222D59]/5 transition-colors">
                      <div className="flex flex-col items-center gap-1 text-[#222D59]">
                        {Icons.paperclip}
                        <span className="text-sm font-medium">Adjuntar archivos</span>
                        <span className="text-xs text-[#424846]/60">
                          PDF, JPG, PNG, Word, Excel · máximo 10MB c/u
                        </span>
                      </div>
                    </div>
                    <input
                      id="proposal-files-input"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        handleAddProposalFiles(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  {proposalFiles.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {proposalFiles.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <span className="text-[#222D59]">{Icons.paperclip}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#424846] truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-[#424846]/60">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProposalFile(index)}
                            className="p-1 text-[#424846]/50 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            aria-label={`Quitar ${file.name}`}
                          >
                            {Icons.x}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setProposalModalOpen(false)}
                    className="px-5 py-2.5 text-[#424846] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProposal}
                    className="px-5 py-2.5 bg-[#222D59] text-white rounded-xl hover:bg-[#222D59]/90 disabled:opacity-50 transition-colors font-medium"
                  >
                    {creatingProposal ? 'Enviando...' : 'Enviar Propuesta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
