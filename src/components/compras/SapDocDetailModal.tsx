'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  SapDocumentLine,
  SapPurchaseOrderDetail,
  SapPurchaseRequestDetail,
  sapDocStatus,
  sapStatusBadgeClass,
  sapStatusLabel,
} from '@/types/purchases';

/**
 * Fase INT-4 — Detalle SOLO LECTURA de un documento de SAP (staging):
 * sirve para Ordenes de Compra y Solicitudes de Pedido (mismo layout).
 *
 * Los 3 campos de compras (U_Clas_gts / U_Imp_ahorro / U_Proc_Comp) llegan
 * null cuando el ERP no los tiene capturados (la captura arranco el
 * 2026-09-15, incremental): se muestran como "No disponible" — NUNCA como 0
 * ni con el placeholder "SELECCIONAR" (T10 / regla 6).
 *
 * El acordeon "Datos crudos" solo aparece si el backend incluyo `raw`
 * (PURCHASE_ADMINS); para otros roles el campo ni siquiera viaja.
 *
 * 2026-09-23: en OC, saldo disponible (con IVA), solicitante (de la
 * solicitud de pedido base) o quién la capturó, y cantidad pendiente por
 * línea. Importes siempre en la moneda del documento.
 */

interface SapDocDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  docEntry: number | null;
  entity: 'purchase-orders' | 'purchase-requests';
}

const dash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

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

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

/** "No disponible" en gris: el dato aun no se captura en el ERP. */
function NoDisponible() {
  return <span className="text-gray-500 italic">No disponible</span>;
}

function udfText(value: string | null) {
  return value === null ? <NoDisponible /> : value;
}

function udfMoney(value: number | null, currency: string | null) {
  return value === null ? <NoDisponible /> : formatMoney(value, currency);
}

const formatQty = (value: number) =>
  value.toLocaleString('es-MX', { maximumFractionDigits: 2 });

/** Cantidad pendiente de la línea: "4,500 de 19,500" o "Cerrada". */
function pendingText(line: SapDocumentLine) {
  if (line.lineStatus === 'close') return <span className="text-gray-400">Cerrada</span>;
  if (line.quantity === null || line.openQuantity === null) return '—';
  if (line.openQuantity >= line.quantity) return `${formatQty(line.quantity)} (toda)`;
  return `${formatQty(line.openQuantity)} de ${formatQty(line.quantity)}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

export default function SapDocDetailModal({
  isOpen,
  onClose,
  docEntry,
  entity,
}: SapDocDetailModalProps) {
  const [showRaw, setShowRaw] = useState(false);
  const isPo = entity === 'purchase-orders';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sap-doc-detail', entity, docEntry],
    queryFn: () =>
      api.get<SapPurchaseOrderDetail | SapPurchaseRequestDetail>(
        `/sap/${entity}/${docEntry}`,
      ),
    enabled: isOpen && docEntry !== null,
  });

  if (!isOpen || docEntry === null) return null;
  const doc = data?.document;
  const lines: SapDocumentLine[] = data?.lines ?? [];
  const poDoc = isPo
    ? (doc as SapPurchaseOrderDetail['document'] | undefined)
    : undefined;
  const prDoc = !isPo
    ? (doc as SapPurchaseRequestDetail['document'] | undefined)
    : undefined;
  const saldo = (() => {
    if (!poDoc) return null;
    if (poDoc.status_key === 'cancelled') return '—';
    if (poDoc.open_total === null) return <NoDisponible />;
    const pct =
      poDoc.doc_total && poDoc.doc_total > 0 && poDoc.open_total < poDoc.doc_total
        ? ` (${Math.round((poDoc.open_total / poDoc.doc_total) * 100)}% del total)`
        : '';
    return `${formatMoney(poDoc.open_total, poDoc.currency)}${pct}`;
  })();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#424846] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isPo ? 'Orden de compra SAP' : 'Solicitud de pedido SAP'}{' '}
              {doc?.doc_num ?? docEntry}
            </h3>
            <p className="text-gray-300 text-sm">
              Datos sincronizados desde SAP Business One (solo lectura)
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
            <p className="p-8 text-center text-red-600">
              No se pudo cargar el documento. Intenta de nuevo o revisa tu
              conexión.
            </p>
          ) : isLoading || !doc ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Cabecera */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${sapStatusBadgeClass(sapDocStatus(doc))}`}>
                  {sapStatusLabel(sapDocStatus(doc))}
                </span>
                <span className="text-sm text-gray-500">
                  DocEntry {doc.doc_entry}
                </span>
                {poDoc?.maximo_ponum && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                      poDoc.maximo_po_exists ? 'bg-[#DFA922]/20 text-[#8a6a10]' : 'bg-gray-100 text-gray-700'
                    }`}
                    title={
                      poDoc.maximo_po_exists
                        ? 'OC creada en SAP por la integración desde Maximo; en los totales combinados se cuenta una sola vez'
                        : 'Referencia a un PO de Maximo que no existe en el staging de Maximo'
                    }
                  >
                    {poDoc.maximo_po_exists ? 'Migrada de Maximo' : 'Ref. Maximo'} {poDoc.maximo_ponum}
                    {poDoc.maximo_po_exists && (
                      <Link
                        href={`/compras/ordenes?tab=maximo_po&search=${encodeURIComponent(poDoc.maximo_ponum)}`}
                        className="underline hover:text-[#52AF32]"
                        onClick={onClose}
                      >
                        ver en Maximo
                      </Link>
                    )}
                  </span>
                )}
                {doc.lines_classified < doc.lines_total && (
                  <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {doc.lines_classified} de {doc.lines_total} líneas
                    clasificadas
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {isPo ? (
                  <>
                    <Field label="Proveedor" value={dash(poDoc?.card_name)} />
                    <Field label="Código proveedor" value={dash(poDoc?.card_code)} />
                    <Field
                      label="Solicitante"
                      value={
                        poDoc && poDoc.requester_names.length > 0 ? (
                          poDoc.requester_names.join(', ')
                        ) : poDoc?.maximo_ponum ? (
                          <>
                            {poDoc.maximo_requested_by ?? (
                              <span className="text-gray-500">Ver en Maximo</span>
                            )}
                            <span className="block text-xs text-gray-500">
                              OC creada desde Maximo ({poDoc.maximo_ponum})
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-500">Sin solicitud de pedido en SAP</span>
                        )
                      }
                    />
                    <Field label="Capturó (SAP)" value={dash(poDoc?.created_by_name)} />
                  </>
                ) : (
                  <>
                    <Field label="Solicitante" value={dash(prDoc?.requester_name)} />
                    <Field label="Usuario SAP" value={dash(prDoc?.requester)} />
                  </>
                )}
                <Field
                  label={isPo ? 'Monto (con IVA)' : 'Monto (sin IVA)'}
                  value={formatMoney(doc.doc_total, doc.currency)}
                />
                {isPo && <Field label="Saldo disponible" value={saldo} />}
                <Field label="Moneda" value={dash(doc.currency)} />
                <Field label="Fecha documento" value={formatDate(doc.doc_date)} />
                <Field
                  label={isPo ? 'Fecha entrega' : 'Fecha compromiso'}
                  value={formatDate(doc.doc_due_date)}
                />
                {!isPo && (
                  <Field
                    label="Fecha requerida"
                    value={formatDate(prDoc?.required_date ?? null)}
                  />
                )}
                <Field
                  label="Ahorro total"
                  value={udfMoney(doc.ahorro_total, doc.currency)}
                />
                <Field label="Comentarios" value={dash(doc.comments)} />
              </div>

              {/* Lineas con los 3 campos de compras */}
              <div>
                <h4 className="text-sm font-semibold text-[#424846] mb-2">
                  Líneas ({lines.length})
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Artículo</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th
                          className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                          title="Importe de la línea sin IVA, en la moneda del documento"
                        >
                          Importe
                        </th>
                        {isPo && (
                          <th
                            className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                            title="Cantidad aún no recibida ni facturada"
                          >
                            Pendiente
                          </th>
                        )}
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Clasificación</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Proceso</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ahorro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, idx) => (
                        <tr key={`${line.lineNum ?? idx}`}>
                          <td className="px-3 py-2 text-gray-500">
                            {line.lineNum === null ? '—' : line.lineNum + 1}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{dash(line.itemCode)}</td>
                          <td className="px-3 py-2 max-w-56 truncate" title={line.itemDescription ?? undefined}>
                            {dash(line.itemDescription)}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {formatMoney(line.lineTotal, line.currency)}
                          </td>
                          {isPo && (
                            <td className="px-3 py-2 text-right whitespace-nowrap">{pendingText(line)}</td>
                          )}
                          <td className="px-3 py-2 whitespace-nowrap">{udfText(line.clasGts)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{udfText(line.procComp)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {udfMoney(line.impAhorro, line.currency)}
                          </td>
                        </tr>
                      ))}
                      {lines.length === 0 && (
                        <tr>
                          <td colSpan={isPo ? 8 : 7} className="px-3 py-6 text-center text-gray-500">
                            El documento no trae líneas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {lines.some((l) => l.clasGts === null || l.impAhorro === null) && (
                  <p className="mt-2 text-xs text-gray-500">
                    &quot;No disponible&quot; = el campo aún no se captura en SAP. La
                    captura la realiza el equipo de compras desde el 15-sep-2026 y
                    es incremental (no retroactiva).
                  </p>
                )}
              </div>

              {/* Datos crudos: solo si el backend los incluyo (PURCHASE_ADMINS) */}
              {data?.raw !== undefined && (
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
                      {JSON.stringify(data.raw, null, 2)}
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
