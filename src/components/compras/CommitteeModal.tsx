'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { PURCHASE_ADMIN_ROLES } from '@/types/auth';
import {
  CommitteeDetail,
  CommitteeVersion,
  COMMITTEE_STATUS_CLASSES,
  COMMITTEE_STATUS_LABELS,
  PurchaseCommittee,
} from '@/types/purchases';
import CommitteeApprovalTimeline from './CommitteeApprovalTimeline';
import CommitteeChainEditor from './CommitteeChainEditor';

/**
 * Fase §16 — Alta/edicion del comite + versiones del PPT (archivo .pdf/.pptx
 * de hasta 30MB O link externo HTTPS) + linea de tiempo de aprobaciones.
 * Solo lectura para quien no es del equipo de procura; la edicion/el envio
 * los re-valida el backend (autor + estado borrador/rechazado).
 *
 * M3 (2026-10-14, Ingrid y Omar):
 *  - Alta en un solo paso: "Crear comité" ya no cierra el modal; sigue con el
 *    comité recién creado, en edición, con el documento a la vista para subir
 *    el PDF ahí mismo (antes decía "Reábrelo para subir el PPT").
 *  - "Aprobadores" dentro del comité: la cadena vigente (nivel, persona o rol
 *    y si está confirmada) para cualquiera que lo abra, el aviso de niveles
 *    sin confirmar y, para PURCHASE_ADMINS, "Editar aprobadores" con el
 *    editor de siempre. El correo sigue en simulación.
 */

interface CommitteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  committee: PurchaseCommittee | null; // null = alta
  canEdit: boolean;
}

interface CommitteeModalBodyProps extends CommitteeModalProps {
  /** M3: el alta terminó; el modal sigue con el comité recién creado. */
  onCreated: (committee: PurchaseCommittee) => void;
  /** M3: se acaba de crear (resalta el documento para subir el PDF). */
  justCreated: boolean;
}

const MAX_FILE_BYTES = 30 * 1024 * 1024;
const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export default function CommitteeModal(props: CommitteeModalProps) {
  // M3: el comité recién creado en esta apertura del modal (alta en un paso)
  const [created, setCreated] = useState<PurchaseCommittee | null>(null);
  if (!props.isOpen) return null;
  const committee = props.committee ?? created;
  const onClose = () => {
    setCreated(null);
    props.onClose();
  };
  return (
    <CommitteeModalBody
      key={committee?.id ?? 'new'}
      {...props}
      committee={committee}
      onClose={onClose}
      onCreated={setCreated}
      justCreated={props.committee === null && created !== null}
    />
  );
}

function CommitteeModalBody({
  onClose,
  committee,
  canEdit,
  onCreated,
  justCreated,
}: CommitteeModalBodyProps) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(...PURCHASE_ADMIN_ROLES);
  const isEditing = !!committee;
  const fileRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLElement>(null);
  const [uploading, setUploading] = useState(false);
  const [externalLink, setExternalLink] = useState('');
  const [editingChain, setEditingChain] = useState(false);
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

  // M3: recién creado, el documento queda a la vista para subir el PDF
  useEffect(() => {
    if (justCreated) documentRef.current?.scrollIntoView({ block: 'nearest' });
  }, [justCreated]);

  // M3: si el modal se cierra con el alta en curso, el comité nuevo no debe
  // quedar pegado para el siguiente "Nuevo Comité"
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const createMutation = useMutation({
    mutationFn: () => api.post<PurchaseCommittee>('/compras/comite', formData),
    onSuccess: (created) => {
      invalidate();
      if (!mounted.current) {
        notify.success(`Comité ${created.committee_number} creado`);
        return;
      }
      notify.success('Comité creado. Ahora sube el PDF y envíalo a aprobación.');
      // M3: el modal sigue abierto con el comité nuevo, en edición
      onCreated(created);
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
  const formId = useId();
  const noDocument = !!detail && detail.versions.length === 0;
  // detail.levels = niveles activos (la cadena vigente)
  const unconfirmed = detail?.levels.filter((l) => !l.confirmed).length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${editingChain ? 'max-w-5xl' : 'max-w-3xl'} max-h-[90vh] overflow-hidden flex flex-col`}
      >
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

        {/* M3: el documento y los aprobadores van fuera del <form>: un Enter en
            sus campos (link, notas del editor) no guarda ni cierra el comité */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">
            <form id={formId} onSubmit={handleSave} className="space-y-5">
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
                {/* I7 (go-live 2026-09-30, Ingrid): el comité lleva título, agenda y PDF */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Agenda</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!editable}
                  rows={5}
                  placeholder="Temas a tratar, uno por renglón"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 disabled:bg-gray-100 whitespace-pre-wrap"
                />
              </div>
            </form>

            {!isEditing && editable && (
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Al crear el comité, aquí mismo subes el PDF y ves quiénes lo aprueban; después lo
                envías a aprobación.
              </p>
            )}

            {/* Documento (M3: el PDF primero; se sube sin cerrar el modal) */}
            {isEditing && (
              <section
                ref={documentRef}
                aria-labelledby={`${formId}-documento`}
                className={`space-y-3 ${
                  justCreated && noDocument ? 'p-3 rounded-lg ring-2 ring-[#52AF32]/60 bg-[#52AF32]/5' : ''
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <h3 id={`${formId}-documento`} className="text-sm font-semibold text-[#424846]">
                      Documento del comité (PDF)
                    </h3>
                    <p className="text-xs text-gray-500">
                      PDF o PPTX de hasta 30 MB, o un link HTTPS (SharePoint, Slides)
                    </p>
                  </div>
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
                        {uploading ? 'Subiendo...' : 'Subir PDF o PPTX'}
                      </button>
                      <input
                        type="url"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void saveExternalLink();
                          }
                        }}
                        placeholder="o pega un link HTTPS (SharePoint, Slides)"
                        aria-label="Link HTTPS del documento"
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
                {!detail ? (
                  <p className="text-sm text-gray-400">Cargando…</p>
                ) : noDocument ? (
                  <p className={justCreated ? 'text-sm font-medium text-[#3d8425]' : 'text-sm text-gray-500'}>
                    {justCreated
                      ? 'Siguiente paso: sube el PDF del comité (o el PPTX, o un link). Sin documento no se puede enviar a aprobación.'
                      : 'Sin documento: sube el PDF (o el PPTX, o un link) para poder enviarlo a aprobación.'}
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Versiones del documento ({detail.versions.length})</caption>
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Versión</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Vigente</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Abrir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.versions.map((version) => (
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
              </section>
            )}

            {/* M3: aprobadores (la cadena vigente) con las firmas de esta versión */}
            {isEditing && (
              <section aria-labelledby={`${formId}-aprobadores`} className="space-y-2">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <h3 id={`${formId}-aprobadores`} className="text-sm font-semibold text-[#424846]">
                      Aprobadores
                    </h3>
                    <p className="text-xs text-gray-500">
                      Firman en este orden; con todas las firmas el comité queda aprobado.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingChain(!editingChain)}
                      aria-expanded={editingChain}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[#52AF32] text-[#3d8425] hover:bg-[#52AF32]/5"
                    >
                      {editingChain ? 'Cerrar el editor' : 'Editar aprobadores'}
                    </button>
                  )}
                </div>
                {unconfirmed > 0 && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {unconfirmed === 1
                      ? '1 nivel está sin confirmar'
                      : `${unconfirmed} niveles están sin confirmar`}
                    : el flujo opera con la asignación propuesta.
                    {isAdmin ? ' Confírmalos en "Editar aprobadores".' : ' Los confirma Compras.'}
                  </p>
                )}
                {detail ? (
                  <CommitteeApprovalTimeline detail={detail} />
                ) : (
                  <p className="text-sm text-gray-400">Cargando…</p>
                )}
                {isAdmin && editingChain && (
                  <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
                    <p className="text-xs text-gray-600">
                      La cadena es una sola para todos los comités: lo que cambies aquí aplica también
                      a los demás.
                    </p>
                    <CommitteeChainEditor />
                  </div>
                )}
              </section>
            )}
          </div>
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
                form={formId}
                disabled={isPending}
                className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear comité'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
