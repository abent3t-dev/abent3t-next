'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import {
  Contract,
  ContractDocument,
  ContractDocumentType,
  ContractStatus,
  CONTRACT_DOCUMENT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
} from '@/types/purchases';
import ContractStatusBadge from './ContractStatusBadge';
import ContractFileUploader from './ContractFileUploader';
import { usePurchaseUsers } from '@/hooks/usePurchaseUsers';

/**
 * Fase §15 — Alta/edicion de contrato + documentos. En modo SOLO LECTURA
 * (canEdit=false: cualquier usuario fuera de PURCHASE_TEAM) muestra la
 * metadata y permite descargar el PDF, sin botones de mutacion.
 */

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null; // null = alta
  canEdit: boolean;
}

interface Supplier {
  id: string;
  legal_name: string;
  tax_id: string;
}

const EMPTY_FORM = {
  contract_number: '',
  tomo: '',
  document_type: 'contrato' as ContractDocumentType,
  service_description: '',
  supplier_id: '',
  start_date: '',
  end_date: '',
  total_amount: '',
  consumed_amount: '',
  external_link: '',
  currency: 'MXN',
  buyer_profile_id: '',
  responsible_user_email: '',
  responsible_user_name: '',
  status: 'vigente' as ContractStatus,
  notes: '',
};

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount === null) return '—';
  try {
    return new Intl.NumberFormat(
      'es-MX',
      currency ? { style: 'currency', currency } : { minimumFractionDigits: 2 },
    ).format(amount);
  } catch {
    return `${amount.toLocaleString('es-MX')} ${currency ?? ''}`.trim();
  }
};

const formatBytes = (bytes: number | null) => {
  if (bytes === null) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] text-gray-900';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

export default function ContractModal(props: ContractModalProps) {
  if (!props.isOpen) return null;
  // key: al cambiar de contrato se remonta el cuerpo y el estado del form se
  // inicializa desde props (sin setState dentro de un effect).
  return (
    <ContractModalBody key={props.contract?.id ?? 'new'} {...props} />
  );
}

function ContractModalBody({
  onClose,
  contract,
  canEdit,
}: ContractModalProps) {
  const qc = useQueryClient();
  const isEditing = !!contract;
  const [formData, setFormData] = useState(() =>
    contract
      ? {
          contract_number: contract.contract_number,
          tomo: contract.tomo ?? '',
          document_type: contract.document_type,
          service_description: contract.service_description,
          supplier_id: contract.supplier_id,
          start_date: contract.start_date.split('T')[0] ?? '',
          end_date: contract.end_date.split('T')[0] ?? '',
          total_amount:
            contract.total_amount === null
              ? ''
              : String(contract.total_amount),
          consumed_amount:
            contract.consumed_amount === null || contract.consumed_amount === undefined
              ? ''
              : String(contract.consumed_amount),
          external_link: contract.external_link ?? '',
          currency: contract.currency ?? 'MXN',
          buyer_profile_id: contract.buyer_profile_id ?? '',
          responsible_user_email: contract.responsible_user_email ?? '',
          responsible_user_name: contract.responsible_user_name ?? '',
          status: contract.status,
          notes: contract.notes ?? '',
        }
      : EMPTY_FORM,
  );

  // Detalle (incluye documentos) — para edicion y lectura
  const detailQuery = useQuery({
    queryKey: ['contract-detail', contract?.id],
    queryFn: () =>
      api.get<Contract & { documents: ContractDocument[] }>(
        `/compras/contratos/${contract?.id}`,
      ),
    enabled: isEditing,
  });
  const detail = detailQuery.data;
  const documents = detail?.documents ?? [];

  // Catalogos: solo cuando se puede editar (los GET de suppliers/usuarios
  // estan restringidos a PURCHASE_TEAM / admins en el backend)
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-for-contracts'],
    queryFn: () => api.get<{ data: Supplier[] }>('/suppliers?limit=100'),
    enabled: canEdit,
  });
  // T7: /compras/usuarios (antes /auth/users daba 403 a PURCHASE_TEAM)
  const { data: buyersData } = usePurchaseUsers('comprador', canEdit);
  const suppliers = suppliersData?.data ?? [];
  const buyers = buyersData ?? [];

  const buildPayload = () => ({
    contract_number: formData.contract_number.trim(),
    tomo: formData.tomo.trim() || undefined,
    document_type: formData.document_type,
    service_description: formData.service_description.trim(),
    supplier_id: formData.supplier_id,
    start_date: formData.start_date,
    end_date: formData.end_date,
    total_amount:
      formData.total_amount === '' ? undefined : Number(formData.total_amount),
    consumed_amount:
      formData.consumed_amount === '' ? undefined : Number(formData.consumed_amount),
    external_link: formData.external_link.trim() || undefined,
    currency: formData.currency.trim() || undefined,
    buyer_profile_id: formData.buyer_profile_id || undefined,
    responsible_user_email: formData.responsible_user_email.trim() || undefined,
    responsible_user_name: formData.responsible_user_name.trim() || undefined,
    status: formData.status,
    notes: formData.notes.trim() || undefined,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['contracts'] });
    void qc.invalidateQueries({ queryKey: ['contract-detail'] });
  };

  const createMutation = useMutation({
    mutationFn: () => api.post<Contract>('/compras/contratos', buildPayload()),
    onSuccess: () => {
      invalidate();
      notify.success('Contrato creado. Ahora puedes subir su PDF al reabrirlo.');
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'Error al crear contrato'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put<Contract>(`/compras/contratos/${contract?.id}`, buildPayload()),
    onSuccess: () => {
      invalidate();
      notify.success('Contrato actualizado');
      onClose();
    },
    onError: (err: Error) =>
      notify.error(err.message || 'Error al actualizar contrato'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contract_number.trim()) {
      notify.error('El numero de contrato es obligatorio');
      return;
    }
    if (!formData.supplier_id) {
      notify.error('Debe seleccionar un proveedor');
      return;
    }
    if (!formData.service_description.trim()) {
      notify.error('La descripcion del servicio es obligatoria');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      notify.error('La vigencia (inicio y fin) es obligatoria');
      return;
    }
    if (formData.end_date < formData.start_date) {
      notify.error('La fecha de fin no puede ser anterior a la de inicio');
      return;
    }
    if (isEditing) updateMutation.mutate();
    else createMutation.mutate();
  };

  const handleDownload = async (doc: ContractDocument) => {
    try {
      const { url, fileName } = await api.get<{ url: string; fileName: string }>(
        `/compras/contratos/${contract?.id}/documents/${doc.id}/download`,
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      notify.error('Error al descargar el PDF');
    }
  };

  const handleRemoveDocument = async (doc: ContractDocument) => {
    const confirmed = await notify.confirm(
      `¿Marcar "${doc.file_name}" (v${doc.version}) como no vigente?`,
    );
    if (!confirmed) return;
    try {
      await api.delete(
        `/compras/contratos/${contract?.id}/documents/${doc.id}`,
      );
      notify.success('Documento marcado como no vigente');
      invalidate();
      void detailQuery.refetch();
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'Error al actualizar el documento',
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const documentsSection = isEditing && (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#424846]">
          Documentos ({documents.length})
        </h3>
        {canEdit && contract && (
          <ContractFileUploader
            contractId={contract.id}
            onUploaded={() => {
              invalidate();
              void detailQuery.refetch();
            }}
          />
        )}
      </div>
      {documents.length === 0 ? (
        <p className="text-sm text-gray-500">
          Este contrato aun no tiene PDF cargado
        </p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Archivo</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Tamano</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Vigente</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-3 py-2 text-gray-900">{doc.file_name}</td>
                  <td className="px-3 py-2 text-center">v{doc.version}</td>
                  <td className="px-3 py-2 text-center text-gray-500">
                    {formatBytes(doc.file_size_bytes)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {doc.is_current ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Vigente
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                        Historico
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownload(doc)}
                        className="text-sm text-[#52AF32] hover:underline"
                      >
                        Descargar
                      </button>
                      {canEdit && doc.is_current && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveDocument(doc)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Modo SOLO LECTURA ────────────────────────────────────────────────────
  if (!canEdit) {
    const view = detail ?? contract;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#424846]">
            <h2 className="text-lg font-bold text-white">
              Contrato {view?.contract_number ?? ''}
            </h2>
            <button onClick={onClose} className="p-1 text-gray-300 hover:text-white" title="Cerrar">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-5 space-y-6">
            {view ? (
              <>
                <div className="flex items-center gap-3">
                  <ContractStatusBadge status={view.status} />
                  <span className="text-sm text-gray-500">
                    {CONTRACT_DOCUMENT_TYPE_LABELS[view.document_type]}
                    {view.tomo ? ` · ${view.tomo}` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Servicio" value={view.service_description} />
                  <Field label="Proveedor" value={dash(view.supplier?.legal_name)} />
                  <Field label="Vigencia" value={`${formatDate(view.start_date)} – ${formatDate(view.end_date)}`} />
                  <Field label="Monto total" value={view.total_amount === null ? 'No disponible' : formatMoney(view.total_amount, view.currency)} />
                  <Field label="Consumido" value={view.consumed_amount === null || view.consumed_amount === undefined ? 'No disponible' : formatMoney(view.consumed_amount, view.currency)} />
                  <Field
                    label="Saldo"
                    value={
                      view.balance_amount === null || view.balance_amount === undefined ? (
                        'No disponible'
                      ) : (
                        <span className={view.balance_amount < 0 ? 'font-semibold text-red-600' : ''}>
                          {formatMoney(view.balance_amount, view.currency)}
                        </span>
                      )
                    }
                  />
                  <Field
                    label="Expediente (link)"
                    value={
                      view.external_link ? (
                        <a href={view.external_link} target="_blank" rel="noopener noreferrer" className="text-[#52AF32] hover:underline break-all">
                          Abrir expediente
                        </a>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <Field label="Comprador" value={dash(view.buyer?.full_name)} />
                  <Field label="Usuario responsable" value={dash(view.responsible_user_name)} />
                  <Field label="Email responsable" value={dash(view.responsible_user_email)} />
                  <Field label="Notas" value={dash(view.notes)} />
                </div>
                {documentsSection}
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
          </div>
          <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Modo ALTA/EDICION (PURCHASE_TEAM) ────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#424846]">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? `Editar Contrato ${contract.contract_number}` : 'Nuevo Contrato'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-300 hover:text-white" title="Cerrar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero de contrato *</label>
                <input
                  type="text"
                  value={formData.contract_number}
                  onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                  className={`${inputClass} font-mono`}
                  placeholder="A3T001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tomo</label>
                <input
                  type="text"
                  value={formData.tomo}
                  onChange={(e) => setFormData({ ...formData, tomo: e.target.value })}
                  className={inputClass}
                  placeholder="Tomo 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento *</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value as ContractDocumentType })}
                  className={`${inputClass} bg-white`}
                >
                  {Object.entries(CONTRACT_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Servicio *</label>
              <textarea
                value={formData.service_description}
                onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                className={inputClass}
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className={`${inputClass} bg-white`}
                  required
                >
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.legal_name} ({s.tax_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estatus</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ContractStatus })}
                  className={`${inputClass} bg-white`}
                >
                  {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inicio vigencia *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin vigencia *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto total</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className={inputClass}
                  maxLength={10}
                />
              </div>
            </div>

            {/* B4: consumido capturado por Compras (el % automatico depende del ERP) y link del expediente */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto consumido</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.consumed_amount}
                  onChange={(e) => setFormData({ ...formData, consumed_amount: e.target.value })}
                  className={inputClass}
                />
                <p className="text-xs text-gray-500 mt-1">Saldo = monto total − consumido (se calcula solo)</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Link del expediente (SharePoint)</label>
                <input
                  type="url"
                  value={formData.external_link}
                  onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comprador responsable</label>
                <select
                  value={formData.buyer_profile_id}
                  onChange={(e) => setFormData({ ...formData, buyer_profile_id: e.target.value })}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Sin asignar</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>{b.full_name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Recibe las alertas de vencimiento</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email usuario responsable</label>
                <input
                  type="email"
                  value={formData.responsible_user_email}
                  onChange={(e) => setFormData({ ...formData, responsible_user_email: e.target.value })}
                  className={inputClass}
                  placeholder="usuario@abent3t.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre usuario responsable</label>
                <input
                  type="text"
                  value={formData.responsible_user_name}
                  onChange={(e) => setFormData({ ...formData, responsible_user_name: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={inputClass}
                rows={2}
              />
            </div>

            {documentsSection}
            {!isEditing && (
              <p className="text-xs text-gray-500">
                El PDF se sube despues de guardar: crea el contrato y vuelvelo a
                abrir para adjuntar el documento.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
