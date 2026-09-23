'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  MaximoPurchaseOrderDetail,
  maximoStatusBadgeClass,
  maximoStatusLabel,
} from '@/types/purchases';

/**
 * Fase INT-5 — Detalle SOLO LECTURA de una PO de Maximo (staging).
 * Campos null se muestran como "—" (decision 20.A.1: historicos con vacios).
 * El acordeon "Datos crudos" solo aparece si el backend incluyo `raw`
 * (PURCHASE_ADMINS); para otros roles el campo ni siquiera viaja.
 */

interface MaximoPoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ponum: string | null;
}

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount === null) return '—';
  try {
    return new Intl.NumberFormat(
      'es-MX',
      currency
        ? { style: 'currency', currency }
        : { minimumFractionDigits: 2 },
    ).format(amount);
  } catch {
    return `${amount.toLocaleString('es-MX')} ${currency ?? ''}`.trim();
  }
};

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

/** Campos AB_* que la Object Structure de Maximo aun no expone (pendiente
 *  CIISA): null → "No disponible", nunca 0 ni "—". */
const NotAvailable = () => (
  <span
    className="text-gray-400 italic"
    title="La Object Structure de Maximo aun no expone este campo (ajuste pendiente con CIISA)"
  >
    No disponible
  </span>
);

export default function MaximoPoDetailModal({
  isOpen,
  onClose,
  ponum,
}: MaximoPoDetailModalProps) {
  const [showRaw, setShowRaw] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maximo-purchase-order', ponum],
    queryFn: () =>
      api.get<MaximoPurchaseOrderDetail>(
        `/maximo/purchase-orders/${encodeURIComponent(ponum ?? '')}`,
      ),
    enabled: isOpen && !!ponum,
  });

  if (!isOpen || !ponum) return null;
  const current = data?.current;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#424846] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Orden de compra Maximo {ponum}
            </h3>
            <p className="text-gray-300 text-sm">
              Datos sincronizados desde IBM Maximo (solo lectura)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
            title="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-5 space-y-6">
          {isError ? (
            <div className="p-8 text-center text-red-600">
              No se pudo cargar el detalle de la orden. Intenta de nuevo.
            </div>
          ) : isLoading || !current ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Cabecera de la revision actual */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${maximoStatusBadgeClass(current.status)}`}
                  title={current.status ?? undefined}
                >
                  {maximoStatusLabel(current.status)}
                </span>
                <span className="text-sm text-gray-500">
                  Revisión {dash(current.revisionnum)} · Sitio {dash(current.siteid)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Descripción" value={dash(current.description)} />
                <Field label="Proveedor" value={dash(current.vendor_name)} />
                <Field label="ID Proveedor" value={dash(current.vendor_id)} />
                <Field
                  label="Monto"
                  value={formatMoney(current.total_cost, current.currency)}
                />
                <Field label="Moneda" value={dash(current.currency)} />
                <Field label="Departamento" value={dash(current.department)} />
                <Field
                  label="Clasificación"
                  value={
                    current.ab_clasfpo === null ? (
                      <NotAvailable />
                    ) : (
                      current.ab_clasfpo
                    )
                  }
                />
                <Field
                  label="Ahorro"
                  value={
                    current.ab_ahorro === null ? (
                      <NotAvailable />
                    ) : (
                      formatMoney(current.ab_ahorro, current.currency)
                    )
                  }
                />
                <Field
                  label="Tipo compra"
                  value={
                    current.ab_tipocomp === null ? (
                      <NotAvailable />
                    ) : (
                      current.ab_tipocomp
                    )
                  }
                />
                <Field
                  label="Solicitado por"
                  value={
                    current.requested_by_name
                      ? <>{current.requested_by_name} <span className="text-xs text-gray-500">({current.requested_by})</span></>
                      : dash(current.requested_by)
                  }
                />
                <Field
                  label="Fecha aprobación"
                  value={formatDate(current.approved_at)}
                />
                <Field
                  label="Aprobó"
                  value={
                    current.approved_by === null
                      ? '—'
                      : current.approved_by_name
                        ? <>{current.approved_by_name} <span className="text-xs text-gray-500">({current.approved_by})</span></>
                        : current.approved_by
                  }
                />
                <Field
                  label="Fecha en Maximo"
                  value={formatDate(current.created_at_source)}
                />
              </div>

              {/* Revisiones */}
              <div>
                <h4 className="text-sm font-semibold text-[#424846] mb-2">
                  Revisiones ({data.revisions.length})
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rev.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sitio</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Último cambio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.revisions.map((rev) => (
                        <tr key={rev.id}>
                          <td className="px-3 py-2">{dash(rev.revisionnum)}</td>
                          <td className="px-3 py-2">{dash(rev.siteid)}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${maximoStatusBadgeClass(rev.status)}`}
                              title={rev.status ?? undefined}
                            >
                              {maximoStatusLabel(rev.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {formatDate(rev.last_changed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Datos crudos: solo si el backend los incluyo (PURCHASE_ADMINS) */}
              {current.raw !== undefined && (
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#424846] hover:bg-gray-50"
                  >
                    Datos crudos (JSON)
                    <svg
                      className={`w-4 h-4 transition-transform ${showRaw ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showRaw && (
                    <pre className="px-4 py-3 bg-gray-900 text-green-300 text-xs overflow-x-auto max-h-64 rounded-b-lg">
                      {JSON.stringify(current.raw, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
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
