'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import {
  CommitteeDetail,
  CommitteeVersion,
  COMMITTEE_STATUS_CLASSES,
  COMMITTEE_STATUS_LABELS,
  PurchaseCommittee,
} from '@/types/purchases';
import CommitteeApprovalTimeline from './CommitteeApprovalTimeline';

/**
 * Fase §16 — Alta/edicion del comite + versiones del PPT (archivo .pdf/.pptx
 * de hasta 30MB O link externo HTTPS) + linea de tiempo de aprobaciones.
 * Solo lectura para quien no es del equipo de procura; la edicion/el envio
 * los re-valida el backend (autor + estado borrador/rechazado).
 */

interface CommitteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  committee: PurchaseCommittee | null; // null = alta
  canEdit: boolean;
}

const MAX_FILE_BYTES = 30 * 1024 * 1024;
const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export default function CommitteeModal(props: CommitteeModalProps) {
  if (!props.isOpen) return null;
  return <CommitteeModalBody key={props.committee?.id ?? 'new'} {...props} />;
}

function CommitteeModalBody({
  onClose,
  committee,
  canEdit,
}: CommitteeModalProps) {
  const qc = useQueryClient();
  const isEditing = !!committee;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [externalLink, setExternalLink] = useState('');
  const [formData, setFormData] = useState(() => ({
    committee_date: committee?.committee_date.split('T')[0] ?? '',
    title: committee?.title ?? '',
    description: committee?.description ?? '',
  }));

  const detailQuery = useQuery({
    queryKey: ['committee-detail', committee?.id],
    queryFn: () => api.get<CommitteeDetail>(`/compras/comite/${committee?.id}`),
    enabled: isEditing,
  });
  const detail = detailQuery.data;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['committees'] });
    void qc.invalidateQueries({ queryKey: ['committee-detail'] });
  };

  const refresh = () => {
    invalidate();
    void detailQuery.refetch();
  };

  const editable =
    canEdit && (!committee || ['borrador', 'rechazado'].includes(committee.status));

  const createMutation = useMutation({
    mutationFn: () => api.post<PurchaseCommittee>('/compras/comite', formData),
    onSuccess: () => {
      invalidate();
      notify.success(
        'Comité creado. Reábrelo para subir el PPT y enviarlo a aprobación.',
      );
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'Error al crear comité'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put<PurchaseCommittee>(`/compras/comite/${committee?.id}`, formData),
    onSuccess: () => {
      invalidate();
      notify.success('Comité actualizado');
      onClose();
    },
    onError: (err: Error) =>
      notify.error(err.message || 'Error al actualizar comité'),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/compras/comite/${committee?.id}/submit`, {}),
    onSuccess: () => {
      refresh();
      notify.success('Comité enviado a aprobación (nivel 1 notificado)');
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'Error al enviar'),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      notify.error('El título es obligatorio');
      return;
    }
    if (!formData.committee_date) {
      notify.error('La fecha del comité es obligatoria');
      return;
    }
    if (isEditing) updateMutation.mutate();
    else createMutation.mutate();
  };

  const uploadFileVersion = async (file: File | undefined) => {
    if (!file || !committee) return;
    if (!ALLOWED_MIMES.includes(file.type)) {
      notify.error(`"${file.name}": solo se acepta .pdf o .pptx`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      notify.error(`"${file.name}": excede el máximo de 30MB`);
      return;
    }
    setUploading(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${apiUrl}/compras/comite/${committee.id}/versions`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al subir el documento');
      }
      notify.success('Documento de la versión cargado');
      refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveExternalLink = async () => {
    if (!committee) return;
    if (!externalLink.startsWith('https://')) {
      notify.error('El link externo debe ser HTTPS');
      return;
    }
    try {
      await api.post(`/compras/comite/${committee.id}/versions`, {
        external_link: externalLink,
      });
      notify.success('Link externo registrado como documento de la versión');
      setExternalLink('');
      refresh();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al guardar link');
    }
  };

  const downloadVersion = async (version: CommitteeVersion) => {
    if (!committee) return;
    try {
      const { url } = await api.get<{ url: string; fileName: string | null }>(
        `/compras/comite/${committee.id}/versions/${version.id}/download`,
      );
      window.open(url, '_blank', 'noopener');
    } catch {
      notify.error('Error al obtener el documento');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#424846]">
          <div>
            <h2 className="text-lg font-bold text-white">
              {isEditing ? committee.committee_number : 'Nuevo Comité'}
            </h2>
            {isEditing && (
              <span className={`inline-flex px-2 py-0.5 mt-1 text-xs font-medium rounded-full ${COMMITTEE_STATUS_CLASSES[committee.status]}`}>
                {COMMITTEE_STATUS_LABELS[committee.status]}
                {committee.current_level && ` · nivel ${committee.current_level.orden}`}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-300 hover:text-white" title="Cerrar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-5">
            {/* Metadata */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del comité *</label>
                <input
                  type="date"
                  value={formData.committee_date}
                  onChange={(e) => setFormData({ ...formData, committee_date: e.target.value })}
                  disabled={!editable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 disabled:bg-gray-100"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={!editable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 disabled:bg-gray-100"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / agenda</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={!editable}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 disabled:bg-gray-100"
              />
            </div>

            {/* Versiones */}
            {isEditing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-[#424846]">
                    Versiones del documento ({detail?.versions.length ?? 0})
                  </h3>
                  {editable && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.pptx"
                        className="hidden"
                        onChange={(e) => void uploadFileVersion(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                        className="px-3 py-1.5 text-sm bg-[#222D59] text-white rounded-lg hover:bg-[#222D59]/90 disabled:opacity-50"
                      >
                        {uploading ? 'Subiendo...' : 'Subir .pdf/.pptx'}
                      </button>
                      <input
                        type="url"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        placeholder="o link HTTPS (Slides/SharePoint)"
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 min-w-56"
                      />
                      <button
                        type="button"
                        onClick={() => void saveExternalLink()}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-[#424846] hover:bg-gray-50"
                      >
                        Guardar link
                      </button>
                    </div>
                  )}
                </div>
                {(detail?.versions.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-500">
                    Sin documento: sube el PPT (o registra un link) para poder
                    enviar a aprobación
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Versión</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Vigente</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Abrir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail?.versions.map((version) => (
                          <tr key={version.id}>
                            <td className="px-3 py-2">v{version.version}</td>
                            <td className="px-3 py-2 text-gray-900">
                              {version.file_name ?? version.external_link ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {version.version === detail.current_version ? (
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Vigente</span>
                              ) : (
                                <span className="text-xs text-gray-400">historial</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => void downloadVersion(version)}
                                className="text-sm text-[#52AF32] hover:underline"
                              >
                                {version.external_link ? 'Abrir link' : 'Descargar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Timeline de aprobaciones */}
            {isEditing && detail && (
              <div>
                <h3 className="text-sm font-semibold text-[#424846] mb-2">
                  Cadena de aprobación
                </h3>
                <CommitteeApprovalTimeline detail={detail} />
              </div>
            )}
          </div>

          <div className="flex justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
            {editable && (
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    type="button"
                    disabled={submitMutation.isPending}
                    onClick={() => submitMutation.mutate()}
                    title="Requiere el documento de la versión"
                    className="px-4 py-2 bg-[#222D59] text-white rounded-lg hover:bg-[#222D59]/90 disabled:opacity-50"
                  >
                    {submitMutation.isPending
                      ? 'Enviando...'
                      : committee.status === 'rechazado'
                        ? 'Reenviar a aprobación'
                        : 'Enviar a aprobación'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 disabled:opacity-50"
                >
                  {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear comité'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
