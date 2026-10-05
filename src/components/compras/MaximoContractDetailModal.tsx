'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import MaximoSupplierCell from './MaximoSupplierCell';
import {
  MaximoContractDetail,
  maximoPrStatusBadge,
  maximoStatusBadgeClass,
  maximoStatusLabel,
  maximoStatusTitle,
} from '@/types/purchases';

/**
 * Fase INT-5 — Detalle SOLO LECTURA de un contrato/PR de Maximo (staging).
 * `contractKey` es el prnum, o el contractnum cuando el registro no trae PR.
 * Lineas e historial vienen derivados del raw por el backend.
 *
 * K7.7 (2026-10-05): la PR y el contrato por separado: badge de cada uno,
 * fechas y días DE LA PR (K3) e historial de la PR (PRSTATUS) aparte del
 * historial del contrato, que solo sale con contrato.
 */

interface MaximoContractDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractKey: string | null;
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

const formatDateTime = (date: string | null) =>
  date
    ? new Date(date).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

/** MAXVOL no lo expone la Object Structure de AB_CONTRATOS (pendiente
 *  CIISA): null → "No disponible", nunca 0 ni "—". K7.7: `hint` para los
 *  campos que sí llegan pero vienen vacíos (monto de la PR). */
const NotAvailable = ({
  hint = 'La Object Structure de Maximo aún no expone este campo (ajuste pendiente con CIISA)',
}: {
  hint?: string;
}) => (
  <span className="text-gray-400 italic" title={hint}>
    No disponible
  </span>
);

/** K7.7: días de la PR (ISSUEDATE → primer APPR), la misma regla que la columna `dias` del API. */
const daysBetween = (from: string | null, to: string | null): number | null => {
  if (!from || !to) return null;
  const d = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
  return d < 0 ? null : d;
};

export default function MaximoContractDetailModal({
  isOpen,
  onClose,
  contractKey,
}: MaximoContractDetailModalProps) {
  const [showRaw, setShowRaw] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maximo-contract', contractKey],
    queryFn: () =>
      api.get<MaximoContractDetail>(
        `/maximo/contracts/${encodeURIComponent(contractKey ?? '')}`,
      ),
    enabled: isOpen && !!contractKey,
  });

  if (!isOpen || !contractKey) return null;
  const current = data?.current;
  const prBadge = maximoPrStatusBadge(current?.pr_status);
  const prDays = current ? daysBetween(current.pr_issue_date, current.pr_approved_at) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-[#424846] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {current?.has_contract
                ? `Contrato Maximo ${dash(current.contractnum)}`
                : `PR Maximo ${contractKey}`}
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
              No se pudo cargar el detalle del contrato. Intenta de nuevo.
            </div>
          ) : isLoading || !current ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Cabecera */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* K7.7: estatus DE LA PR y, con contrato, el del contrato */}
                {current.prnum && (
                  <span
                    className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${prBadge.className}`}
                    title={prBadge.title}
                  >
                    Solicitud: {prBadge.label}
                  </span>
                )}
                {current.has_contract ? (
                  <span
                    className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${maximoStatusBadgeClass(current.status)}`}
                    title={maximoStatusTitle(current.status)}
                  >
                    Contrato: {maximoStatusLabel(current.status)}
                  </span>
                ) : (
                  <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                    Sin contrato
                  </span>
                )}
                <span className="text-sm text-gray-500">
                  {current.prnum || 'PR —'} · Revisión {dash(current.revisionnum)} ·
                  PURCHVIEW: {current.purchview_count}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Proveedor" value={<MaximoSupplierCell po={current} />} />
                <Field
                  label="Proveedor en Maximo"
                  value={`${dash(current.vendor_name)} (${dash(current.vendor_id)})`}
                />
                <Field
                  label="MAXVOL"
                  value={
                    current.maxvol === null ? (
                      <NotAvailable />
                    ) : (
                      formatMoney(current.maxvol, current.currency)
                    )
                  }
                />
                <Field label="Monto del contrato" value={formatMoney(current.total_cost, current.currency)} />
                <Field label="Moneda" value={dash(current.currency)} />
                <Field label="Vigencia inicio" value={formatDate(current.start_date)} />
                <Field label="Vigencia fin" value={formatDate(current.end_date)} />
                <Field label="Departamento" value={dash(current.department)} />
                <Field
                  label="Solicitado por"
                  value={
                    current.requested_by_name
                      ? <>{current.requested_by_name} <span className="text-xs text-gray-500">({current.requested_by})</span></>
                      : dash(current.requested_by)
                  }
                />
                <Field label="Ref. contrato" value={dash(current.contract_ref_num)} />
                <Field label="Valor contrato" value={formatMoney(current.contract_value, current.currency)} />
                <Field
                  label="Consumido"
                  value={current.consumed_value === null ? <NotAvailable /> : formatMoney(current.consumed_value, current.currency)}
                />
                <Field
                  label="Saldo (valor − consumido)"
                  value={
                    current.balance_value === null ? (
                      <NotAvailable />
                    ) : (
                      <span className={current.balance_value < 0 ? 'font-semibold text-red-600' : ''}>
                        {formatMoney(current.balance_value, current.currency)}
                      </span>
                    )
                  }
                />
                <Field
                  label="Monto de la PR (Maximo)"
                  value={
                    current.pr_total === null ? (
                      <NotAvailable hint="Maximo no trae el monto (TOTALCOST) de esta PR" />
                    ) : (
                      <span title="Monto de la PR en Maximo (TOTALCOST). No se combina con las solicitudes de SAP">
                        {formatMoney(current.pr_total, current.currency)}
                      </span>
                    )
                  }
                />
                {/* K7.7: fechas y días DE LA PR (K3); sin PR (contrato directo) no hay */}
                {current.prnum && (
                  <>
                    <Field label="Fecha de la PR" value={formatDate(current.pr_issue_date)} />
                    <Field label="Estatus desde" value={formatDate(current.pr_status_date)} />
                    <Field label="Aprobación de la PR" value={formatDate(current.pr_approved_at)} />
                    <Field
                      label="Días de aprobación"
                      value={
                        prDays === null ? (
                          <span className="text-gray-400 italic" title="Sin fecha de la PR o sin aprobación (APPR) en Maximo">
                            N/D
                          </span>
                        ) : (
                          `${prDays} ${prDays === 1 ? 'día' : 'días'}`
                        )
                      }
                    />
                  </>
                )}
                {/* Fechas del contrato (WAPPR y APPR de CONTRACTSTATUS): solo con contrato */}
                {current.has_contract && (
                  <>
                    <Field label="Solicitud del contrato" value={formatDate(current.created_at_source)} />
                    <Field label="Aprobación del contrato" value={formatDate(current.approved_at)} />
                  </>
                )}
              </div>

              {/* K7.7: historial DE LA PR (PRSTATUS), en el orden de la API (fecha y PRSTATUSID) */}
              {current.prnum && (
                <div>
                  <h4 className="text-sm font-semibold text-[#424846] mb-2">
                    Historial de la solicitud (PR) ({data.prStatusHistory.length})
                  </h4>
                  {data.prStatusHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin historial de la PR en Maximo</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha y hora</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nota</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.prStatusHistory.map((entry, idx) => {
                            const badge = maximoPrStatusBadge(entry.status);
                            return (
                              <tr key={idx}>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${badge.className}`}
                                    title={badge.title}
                                  >
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(entry.changedAt)}</td>
                                {/* D6: nombre por alias; el código de Maximo en el title */}
                                <td className="px-3 py-2 text-gray-700" title={entry.changedBy ?? undefined}>
                                  {entry.changedByName ?? dash(entry.changedBy)}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{dash(entry.memo)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Lineas del contrato (derivadas de raw.CONTRACTLINE) */}
              <div>
                <h4 className="text-sm font-semibold text-[#424846] mb-2">
                  Líneas ({data.lines.length})
                </h4>
                {data.lines.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin líneas en el registro de Maximo</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Costo unit.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.lines.map((line, idx) => (
                          <tr key={`${line.lineNum ?? 'x'}-${idx}`}>
                            <td className="px-3 py-2">{dash(line.lineNum)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{dash(line.itemNum)}</td>
                            <td className="px-3 py-2">{dash(line.description)}</td>
                            <td className="px-3 py-2 text-right">{dash(line.quantity)}</td>
                            <td className="px-3 py-2 text-right">
                              {formatMoney(line.unitCost, current.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Historial del contrato (derivado de raw.CONTRACTSTATUS); K7.7: solo con contrato */}
              {current.has_contract && (
                <div>
                  <h4 className="text-sm font-semibold text-[#424846] mb-2">
                    Historial del contrato ({data.statusHistory.length})
                  </h4>
                  {data.statusHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin historial en el registro de Maximo</p>
                  ) : (
                    <ol className="space-y-1">
                      {data.statusHistory.map((entry, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${maximoStatusBadgeClass(entry.status)}`}
                            title={maximoStatusTitle(entry.status)}
                          >
                            {maximoStatusLabel(entry.status)}
                          </span>
                          <span className="text-gray-500">{formatDateTime(entry.changedAt)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contrato</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Último cambio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.revisions.map((rev) => (
                        <tr key={rev.id}>
                          <td className="px-3 py-2">{dash(rev.revisionnum)}</td>
                          <td className="px-3 py-2">{dash(rev.contractnum)}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${maximoStatusBadgeClass(rev.status)}`}
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
