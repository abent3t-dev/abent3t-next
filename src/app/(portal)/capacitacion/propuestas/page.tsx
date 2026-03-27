'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';

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

const statusConfig: Record<string, { label: string; bgColor: string; color: string }> = {
  pendiente: { label: 'Pendiente', bgColor: 'bg-yellow-100', color: 'text-yellow-800' },
  en_investigacion: { label: 'En Investigación', bgColor: 'bg-blue-100', color: 'text-blue-800' },
  aprobada: { label: 'Aprobada', bgColor: 'bg-green-100', color: 'text-green-800' },
  rechazada: { label: 'Rechazada', bgColor: 'bg-red-100', color: 'text-red-800' },
};

const Icons = {
  search: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
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
  link: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

export default function PropuestasPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pendiente' | 'en_investigacion' | 'aprobada' | 'rechazada' | 'all'>('pendiente');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingProposal, setApprovingProposal] = useState<Proposal | null>(null);

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

  // Queries
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals', filter],
    queryFn: async () => {
      if (filter === 'all') {
        return api.get<Proposal[]>('/proposals');
      }
      return api.get<Proposal[]>(`/proposals?status=${filter}`);
    },
  });

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
      setRejectingId(null);
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

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      notify.error('Ingresa un motivo de rechazo');
      return;
    }
    rejectMutation.mutate({ id, reason: rejectReason });
  };

  const handleOpenApproval = (proposal: Proposal) => {
    setApprovingProposal(proposal);
    setApprovalForm({
      course_name: proposal.course_name,
      institution_id: '',
      course_type_id: '',
      modality_id: '',
      cost: proposal.estimated_cost,
      total_hours: proposal.estimated_hours,
      description: '',
      start_date: proposal.start_date || '',
      end_date: proposal.end_date || '',
      location: '',
      instructor: '',
      review_notes: '',
    });
  };

  const handleApprove = () => {
    if (!approvingProposal) return;
    if (!approvalForm.course_name || !approvalForm.institution_id || !approvalForm.course_type_id || !approvalForm.modality_id || !approvalForm.start_date) {
      notify.error('Completa los campos requeridos');
      return;
    }
    approveMutation.mutate({ id: approvingProposal.id, data: approvalForm });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const pendingCount = proposals.filter(p => p.status === 'pendiente').length;
  const investigatingCount = proposals.filter(p => p.status === 'en_investigacion').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Propuestas de Cursos</h1>
        <p className="text-gray-500">Revisa las propuestas de cursos externos enviadas por los colaboradores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">En Investigación</p>
          <p className="text-2xl font-bold text-blue-600">{investigatingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Aprobadas</p>
          <p className="text-2xl font-bold text-green-600">
            {proposals.filter(p => p.status === 'aprobada').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Rechazadas</p>
          <p className="text-2xl font-bold text-red-600">
            {proposals.filter(p => p.status === 'rechazada').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: 'pendiente', label: 'Pendientes' },
          { value: 'en_investigacion', label: 'En Investigación' },
          { value: 'aprobada', label: 'Aprobadas' },
          { value: 'rechazada', label: 'Rechazadas' },
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

      {/* Proposals List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : proposals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay propuestas {filter === 'pendiente' ? 'pendientes' : ''}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {proposals.map((proposal) => {
              const status = statusConfig[proposal.status];

              return (
                <div key={proposal.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        {Icons.user}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{proposal.course_name}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        {/* Beneficiary info */}
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Para:</span> {proposal.profile?.full_name}
                          {proposal.profile?.departments?.name && (
                            <span className="text-gray-400"> • {proposal.profile.departments.name}</span>
                          )}
                        </p>

                        {/* Proposer info */}
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Propuesto por:</span> {proposal.proposer?.full_name}
                        </p>

                        {/* Course details */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          {proposal.institution_name && (
                            <span className="bg-gray-100 px-2 py-1 rounded">{proposal.institution_name}</span>
                          )}
                          {proposal.modality && (
                            <span className="bg-gray-100 px-2 py-1 rounded">{proposal.modality}</span>
                          )}
                          <span>{formatCurrency(proposal.estimated_cost)}</span>
                          <span>{proposal.estimated_hours}h</span>
                          <span className="flex items-center gap-1">
                            {Icons.clock}
                            {new Date(proposal.created_at).toLocaleDateString('es-MX')}
                          </span>
                        </div>

                        {/* URL */}
                        {proposal.course_url && (
                          <a
                            href={proposal.course_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                          >
                            {Icons.link}
                            Ver curso
                          </a>
                        )}

                        {/* Justification */}
                        {proposal.justification && (
                          <p className="text-sm text-gray-600 mt-2 italic bg-gray-50 p-2 rounded">
                            &quot;{proposal.justification}&quot;
                          </p>
                        )}

                        {/* Rejection reason */}
                        {proposal.rejection_reason && (
                          <p className="text-sm text-red-600 mt-2">
                            Motivo de rechazo: {proposal.rejection_reason}
                          </p>
                        )}

                        {/* Review notes */}
                        {proposal.review_notes && (
                          <p className="text-sm text-blue-600 mt-2">
                            Notas: {proposal.review_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {['pendiente', 'en_investigacion'].includes(proposal.status) && (
                        <>
                          {rejectingId === proposal.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Motivo de rechazo..."
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg w-48"
                              />
                              <button
                                onClick={() => handleReject(proposal.id)}
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
                              {proposal.status === 'pendiente' && (
                                <button
                                  onClick={() => handleInvestigate(proposal.id)}
                                  disabled={investigateMutation.isPending}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {Icons.search}
                                  <span>Investigar</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenApproval(proposal)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                {Icons.check}
                                <span>Aprobar</span>
                              </button>
                              <button
                                onClick={() => setRejectingId(proposal.id)}
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

      {/* Approval Modal */}
      {approvingProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Aprobar Propuesta</h2>
              <p className="text-sm text-gray-500">Verifica y completa los datos del curso antes de crear</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Original proposal info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Propuesta original:</p>
                <p className="text-sm text-gray-600">Curso: {approvingProposal.course_name}</p>
                <p className="text-sm text-gray-600">Institución sugerida: {approvingProposal.institution_name || 'No especificada'}</p>
                <p className="text-sm text-gray-600">Para: {approvingProposal.profile?.full_name}</p>
                {approvingProposal.course_url && (
                  <a href={approvingProposal.course_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    Ver URL del curso
                  </a>
                )}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Institución *
                  </label>
                  <select
                    value={approvalForm.institution_id}
                    onChange={(e) => setApprovalForm({ ...approvalForm, institution_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={approvalForm.description}
                    onChange={(e) => setApprovalForm({ ...approvalForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Notas opcionales..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setApprovingProposal(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Procesando...' : 'Aprobar y Crear Curso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
