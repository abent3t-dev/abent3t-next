'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import MaximoSupplierCell from './MaximoSupplierCell';
import {
  MaximoBadge,
  MaximoPurchaseOrderDetail,
  MaximoPurchaseOrderLine,
  maximoIntegrationBadge,
  maximoReceiptBadge,
  maximoStatusBadgeClass,
  maximoStatusLabel,
  maximoStatusTitle,
} from '@/types/purchases';

/**
 * Fase INT-5 — Detalle SOLO LECTURA de una PO de Maximo (staging).
 * Campos null se muestran como "—" (decision 20.A.1: historicos con vacios).
 * El acordeon "Datos crudos" solo aparece si el backend incluyo `raw`
 * (PURCHASE_ADMINS); para otros roles el campo ni siquiera viaja.
 *
 * K7 (2026-10-05): badges de recepción (RECEIPTS) e integración con SAP
 * (PO5) en la cabecera; "Total (con IVA)" = TOTALCOST, "Subtotal (sin
 * IVA)" = Σ LINECOST ("No disponible" si falta, no se estima) y "OC en SAP"
 * con link a Órdenes SAP; sección "Líneas" (POLINE, sin cantidad pedida:
 * ORDERQTY no llega en AB_COMPRAS).
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

/** Campos AB_* sin captura en Maximo (y montos sin dato): null → "No
 *  disponible", nunca 0 ni "—". */
const NotAvailable = ({ title = 'Sin captura en Maximo' }: { title?: string }) => (
  <span className="text-gray-400 italic" title={title}>
    No disponible
  </span>
);

const formatQty = (value: number) =>
  value.toLocaleString('es-MX', { maximumFractionDigits: 2 });

function Badge({ badge, prefix }: { badge: MaximoBadge; prefix: string }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${badge.className}`}
      title={badge.title}
    >
      {prefix}: {badge.label}
    </span>
  );
}

/** RECEIPTSCOMPLETE de la línea: Sí / No / "—" (sin dato). */
function LineReceived({ line }: { line: MaximoPurchaseOrderLine }) {
  if (line.receipts_complete === null) return <span className="text-gray-400">—</span>;
  return line.receipts_complete ? (
    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Sí</span>
  ) : (
    <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">No</span>
  );
}

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
  const lines = data?.lines ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
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
              {/* Cabecera de la revision actual; K7: recepción e integración */}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${maximoStatusBadgeClass(current.status)}`}
                  title={maximoStatusTitle(current.status)}
                >
                  {maximoStatusLabel(current.status)}
                </span>
                <Badge badge={maximoReceiptBadge(current.receipt_status)} prefix="Recepción" />
                <Badge badge={maximoIntegrationBadge(current.integration_status)} prefix="Integración SAP" />
                <span className="text-sm text-gray-500">
                  Revisión {dash(current.revisionnum)} · Sitio {dash(current.siteid)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Descripción" value={dash(current.description)} />
                {/* G1: proveedor efectivo (según SAP si migró o por cruce) + lo de Maximo */}
                <Field label="Proveedor" value={<MaximoSupplierCell po={current} />} />
                <Field
                  label="Proveedor en Maximo"
                  value={`${dash(current.vendor_name)} (${dash(current.vendor_id)})`}
                />
                {/* K7: TOTALCOST (con IVA) y Σ LINECOST (sin IVA), sin estimar */}
                <Field
                  label="Total (con IVA)"
                  value={formatMoney(current.total_cost, current.currency)}
                />
                <Field
                  label="Subtotal (sin IVA)"
                  value={
                    current.subtotal === null ? (
                      <NotAvailable title="La OC no trae líneas o alguna no trae LINECOST: no se estima con el total" />
                    ) : (
                      formatMoney(current.subtotal, current.currency)
                    )
                  }
                />
                <Field label="Moneda" value={dash(current.currency)} />
                <Field
                  label="OC en SAP"
                  value={
                    current.oc_sap === null ? (
                      <span className="text-gray-500" title="Ninguna OC sincronizada desde SAP trae este PONUM">
                        Sin OC en SAP
                      </span>
                    ) : (
                      <Link
                        href={`/compras/ordenes?tab=sap_po&search=${current.oc_sap}`}
                        onClick={onClose}
                        className="font-mono text-[#222D59] underline hover:text-[#52AF32]"
                        title="Ver la OC en Órdenes SAP (la de menor número si hay varias)"
                      >
                        {current.oc_sap}
                      </Link>
                    )
                  }
                />
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
                {/* E4: comprador de la OC (PURCHASEAGENT); F1: sin él, quien la creó */}
                <Field
                  label="Comprador"
                  value={
                    current.buyer_kind === 'comprador'
                      ? current.buyer_name !== current.purchase_agent
                        ? <>{current.buyer_name} <span className="text-xs text-gray-500">({current.purchase_agent})</span></>
                        : current.purchase_agent
                      : <span className="text-gray-500">Sin agente de compras en Maximo</span>
                  }
                />
                <Field
                  label="Creó la OC"
                  value={
                    current.created_by === null
                      ? '—'
                      : current.buyer_kind === 'capturo' && current.buyer_name !== current.created_by
                        ? <>{current.buyer_name} <span className="text-xs text-gray-500">({current.created_by})</span></>
                        : current.created_by
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

              {/* K7: líneas (POLINE del raw canonizado, por POLINENUM) */}
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
                          title="Cantidad recibida en Maximo (RECEIVEDQTY)"
                        >
                          Recibido
                        </th>
                        <th
                          className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                          title="Importe de la línea sin IVA (LINECOST), en la moneda de la OC"
                        >
                          Importe sin IVA
                        </th>
                        <th
                          className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                          title="La línea ya se recibió completa en Maximo (RECEIPTSCOMPLETE)"
                        >
                          Recibida
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, idx) => (
                        <tr key={`${line.line_num ?? 'n'}-${idx}`}>
                          <td className="px-3 py-2 text-gray-500">{dash(line.line_num)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{dash(line.item_num)}</td>
                          <td className="px-3 py-2 max-w-56 truncate" title={line.description ?? undefined}>
                            {dash(line.description)}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {line.received_qty === null ? '—' : formatQty(line.received_qty)}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {line.line_cost === null ? (
                              <NotAvailable title="La línea no trae LINECOST" />
                            ) : (
                              formatMoney(line.line_cost, current.currency)
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <LineReceived line={line} />
                          </td>
                        </tr>
                      ))}
                      {lines.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                            La OC no trae líneas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                              title={maximoStatusTitle(rev.status)}
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
