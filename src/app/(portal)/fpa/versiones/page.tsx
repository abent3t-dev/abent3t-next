'use client';

import { Suspense, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { fpaKeys, useFpaContext, useFpaVersion, useFpaVersions } from '@/hooks/useFpa';
import FpaModal from '@/components/fpa/FpaModal';
import { VersionStatusBadge } from '@/components/fpa/StatusBadges';
import VersionParamsForm from '@/components/fpa/VersionParamsForm';
import VersionHistory from '@/components/fpa/VersionHistory';
import { formatDateTime, formatInflation, formatPesos, formatRate } from '@/lib/fpa-format';
import {
  MONTH_LABELS,
  VERSION_KIND_LABELS,
  type FpaCheck,
  type FpaCreateVersionInput,
  type FpaVersion,
  type FpaVersionDetail,
  type VersionKind,
} from '@/types/fpa';

/**
 * FP&A (B2, 28-oct) — Versiones: cada versión (B-26, B-27, F2-26…) con sus
 * parámetros (inflación, tipos de cambio, tarifas de viaje y fuente), el
 * visto bueno de planeación y su historial.
 *
 * Reunión del 26-oct: Laura fija el tipo de cambio y la inflación con las
 * proyecciones de Santander y David da el visto bueno, para que quede
 * trazable con qué parámetros se calcula el presupuesto. Planeación edita en
 * preparación, el firmante da el visto bueno y con él se abre a captura;
 * abierta, los parámetros no cambian. El CFO ve todo sin cambiar nada. Qué
 * puede hacer cada quien lo decide el API (actions).
 */

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function Spinner() {
  return (
    <div className="p-8 text-center">
      <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

const INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]';
const LABEL = 'block text-sm font-medium text-gray-700 mb-1';
const BTN_PRIMARY =
  'px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50';
const BTN_SECONDARY =
  'px-4 py-2 text-sm font-medium rounded-lg border border-[#222D59]/30 text-[#222D59] hover:bg-[#222D59]/5 transition-colors disabled:opacity-50';
const BTN_CANCEL = 'px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors';

/** Refresca todo lo que depende de una versión (su estado y sus parámetros). */
function useRefreshVersion() {
  const qc = useQueryClient();
  return (saved: FpaVersionDetail) => {
    qc.setQueryData(fpaKeys.version(saved.version.id), saved);
    void qc.invalidateQueries({ queryKey: fpaKeys.versions });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetsAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.consolidatedAll });
  };
}

// ── Modales ─────────────────────────────────────────────────────────────────

interface ConfirmSpec {
  title: string;
  message: string;
  confirmLabel: string;
  /** none: sin comentario; optional: se puede; required: obligatorio (10 caracteres). */
  comment: 'none' | 'optional' | 'required';
  run: (comment: string | null) => Promise<FpaVersionDetail>;
  success: string;
}

function ConfirmActionModal({
  spec,
  versionId,
  onClose,
}: {
  spec: ConfirmSpec;
  versionId: string | null;
  onClose: () => void;
}) {
  const uid = useId();
  const qc = useQueryClient();
  const refresh = useRefreshVersion();
  const [comment, setComment] = useState('');
  const mutation = useMutation({
    mutationFn: (text: string | null) => spec.run(text),
    onSuccess: (saved) => {
      refresh(saved);
      notify.success(spec.success);
      onClose();
    },
    onError: (err: Error) => {
      // La versión cambió mientras tanto: se trae otra vez para reintentar sobre lo nuevo
      if (err instanceof ApiError && err.status === 409) {
        if (versionId) void qc.invalidateQueries({ queryKey: fpaKeys.version(versionId) });
        void qc.invalidateQueries({ queryKey: fpaKeys.versions });
        onClose();
      }
      notify.error(err.message || 'No se pudo completar');
    },
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = comment.trim();
    if (spec.comment === 'required' && text.length < 10) {
      notify.error('Escribe por qué (al menos 10 caracteres).');
      return;
    }
    mutation.mutate(spec.comment === 'none' ? null : text || null);
  };
  return (
    <FpaModal title={spec.title} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700 whitespace-pre-line">{spec.message}</p>
          {spec.comment !== 'none' && (
            <div>
              <label htmlFor={`${uid}-comment`} className={LABEL}>
                {spec.comment === 'required' ? 'Por qué *' : 'Comentario (opcional)'}
              </label>
              <textarea
                id={`${uid}-comment`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                className={INPUT}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onClose} className={BTN_CANCEL}>
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className={BTN_PRIMARY}>
            {mutation.isPending ? 'Guardando…' : spec.confirmLabel}
          </button>
        </div>
      </form>
    </FpaModal>
  );
}

function NewVersionModal({
  versions,
  onClose,
  onCreated,
}: {
  versions: FpaVersion[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const uid = useId();
  const refresh = useRefreshVersion();
  const nextYear = new Date().getFullYear() + 1;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState(String(nextYear));
  const [kind, setKind] = useState<VersionKind>('presupuesto');
  const [cutoff, setCutoff] = useState('');
  const [copyFrom, setCopyFrom] = useState('');

  const mutation = useMutation({
    mutationFn: (input: FpaCreateVersionInput) => api.post<FpaVersionDetail>('/fpa/versiones', input),
    onSuccess: (saved) => {
      refresh(saved);
      notify.success(`Versión ${saved.version.code} creada en preparación`);
      onCreated(saved.version.id);
    },
    onError: (err: Error) => notify.error(err.message || 'No se pudo crear la versión'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fiscalYear = Number(year);
    if (!code.trim()) return notify.error('Escribe la clave (p. ej. B-27).');
    if (!name.trim()) return notify.error('Escribe el nombre (p. ej. Presupuesto 2027).');
    if (!Number.isInteger(fiscalYear) || fiscalYear < 2020 || fiscalYear > 2100) {
      return notify.error('El ejercicio es un año (p. ej. 2027).');
    }
    if (kind === 'forecast' && !cutoff) return notify.error('Elige el mes de corte del forecast.');
    mutation.mutate({
      code: code.trim(),
      name: name.trim(),
      fiscal_year: fiscalYear,
      kind,
      cutoff_month: kind === 'forecast' ? Number(cutoff) : null,
      copy_params_from: copyFrom || null,
    });
  };

  return (
    <FpaModal title="Nueva versión" size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${uid}-code`} className={LABEL}>Clave *</label>
              <input id={`${uid}-code`} type="text" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="B-27" className={INPUT} />
            </div>
            <div>
              <label htmlFor={`${uid}-year`} className={LABEL}>Ejercicio *</label>
              <input id={`${uid}-year`} type="text" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} maxLength={4} className={`${INPUT} tabular-nums`} />
            </div>
          </div>
          <div>
            <label htmlFor={`${uid}-name`} className={LABEL}>Nombre *</label>
            <input id={`${uid}-name`} type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Presupuesto 2027" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${uid}-kind`} className={LABEL}>Tipo *</label>
              <select id={`${uid}-kind`} value={kind} onChange={(e) => setKind(e.target.value as VersionKind)} className={INPUT}>
                {(Object.keys(VERSION_KIND_LABELS) as VersionKind[]).map((k) => (
                  <option key={k} value={k}>{VERSION_KIND_LABELS[k]}</option>
                ))}
              </select>
            </div>
            {kind === 'forecast' && (
              <div>
                <label htmlFor={`${uid}-cutoff`} className={LABEL}>Mes de corte *</label>
                <select id={`${uid}-cutoff`} value={cutoff} onChange={(e) => setCutoff(e.target.value)} className={INPUT}>
                  <option value="" disabled>Elige…</option>
                  {MONTH_LABELS.slice(0, 11).map((m, i) => (
                    <option key={m} value={String(i + 1)}>Real hasta {m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label htmlFor={`${uid}-copy`} className={LABEL}>Copiar parámetros de</label>
            <select id={`${uid}-copy`} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={INPUT}>
              <option value="">Ninguna: capturarlos desde cero</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>{v.code} · {v.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Copia la inflación, los tipos de cambio, las tarifas de viaje y la fuente (no las líneas). Quedan para
              revisarlos y sin visto bueno.
            </p>
          </div>
          {kind === 'comparacion' && (
            <p className="text-xs text-amber-700">
              Una versión de comparación (P-27, P-28) no se abre a captura: sus montos se cargan aparte.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onClose} className={BTN_CANCEL}>Cancelar</button>
          <button type="submit" disabled={mutation.isPending} className={BTN_PRIMARY}>
            {mutation.isPending ? 'Creando…' : 'Crear en preparación'}
          </button>
        </div>
      </form>
    </FpaModal>
  );
}

function EditInfoModal({ detail, onClose }: { detail: FpaVersionDetail; onClose: () => void }) {
  const uid = useId();
  const refresh = useRefreshVersion();
  const [name, setName] = useState(detail.version.name);
  const [notes, setNotes] = useState(detail.version.notes ?? '');
  const mutation = useMutation({
    mutationFn: () =>
      api.put<FpaVersionDetail>(`/fpa/versiones/${detail.version.id}`, { name: name.trim(), notes: notes.trim() || null }),
    onSuccess: (saved) => {
      refresh(saved);
      notify.success('Datos de la versión guardados');
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'No se pudieron guardar los datos'),
  });
  return (
    <FpaModal title={`Datos de ${detail.version.code}`} size="md" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return notify.error('El nombre no puede quedar vacío.');
          mutation.mutate();
        }}
        className="flex flex-col min-h-0"
      >
        <div className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor={`${uid}-name`} className={LABEL}>Nombre *</label>
            <input id={`${uid}-name`} type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={INPUT} />
          </div>
          <div>
            <label htmlFor={`${uid}-notes`} className={LABEL}>Notas</label>
            <textarea id={`${uid}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} className={INPUT} />
          </div>
          <p className="text-xs text-gray-500">La clave, el ejercicio y el tipo no cambian.</p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onClose} className={BTN_CANCEL}>Cancelar</button>
          <button type="submit" disabled={mutation.isPending} className={BTN_PRIMARY}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </FpaModal>
  );
}

// ── Detalle ─────────────────────────────────────────────────────────────────

const TRIP_TEXT: Record<string, string> = { nacional: 'Nacional', internacional: 'Internacional' };

/** Los parámetros completos, para confirmar el visto bueno: se aprueba lo que se ve. */
function paramsSummary(d: FpaVersionDetail): string {
  const p = d.params;
  const lines = [
    `Inflación: ${formatInflation(p.inflation_pct) ?? 'sin fijar'}`,
    `Tipo de cambio: ${p.exchange_rates.length > 0 ? p.exchange_rates.map((r) => `${r.currency} ${formatRate(r.rate_mxn)}`).join(' · ') : 'solo pesos'}`,
  ];
  if (p.cutoff_month) lines.push(`Mes de corte: real hasta ${MONTH_LABELS[p.cutoff_month - 1]}`);
  if (p.source) lines.push(`Fuente: ${p.source}`);
  lines.push('Tarifas de viaje (pesos):');
  for (const t of p.travel_rates) {
    lines.push(
      `• ${TRIP_TEXT[t.trip_type] ?? t.trip_type}, ${t.traveler_type}: vuelo ${formatPesos(t.flight_per_person, true)} · hotel ${formatPesos(t.hotel_per_night, true)} · transporte ${formatPesos(t.transport_per_day, true)} · alimentos ${formatPesos(t.meals_per_day, true)}`,
    );
  }
  if (p.travel_rates.length < 4) lines.push(`• Faltan ${4 - p.travel_rates.length} de las 4 tarifas`);
  return lines.join('\n');
}

/** ¿Tiene algún parámetro capturado? */
const hasParams = (d: FpaVersionDetail) =>
  d.params.inflation_pct !== null || d.params.exchange_rates.length > 0 || d.params.travel_rates.length > 0;

function Reason({ check }: { check: FpaCheck }) {
  if (check.ok || !check.reason) return null;
  return <p className="text-xs text-gray-500">{check.reason}</p>;
}

function ApprovalCard({
  detail,
  canAdmin,
  blocked,
  onApprove,
}: {
  detail: FpaVersionDetail;
  canAdmin: boolean;
  /** Por qué no se puede dar ahora desde esta pantalla (p. ej. cambios sin guardar). */
  blocked: string | null;
  onApprove: () => void;
}) {
  const approved = detail.params_approved;
  const signers = detail.signers;
  // El motivo "lo da el firmante: X" ya lo dice el renglón de quién lo da
  const repeatsSigner =
    signers.rule === 'registrados' &&
    !!signers.titular &&
    !!detail.actions.approve.reason?.includes(signers.titular.full_name);
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${approved ? 'border-[#52AF32]/40 bg-[#f2f8ef]' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#424846]">Visto bueno de planeación</h2>
          {approved ? (
            <p className="text-sm text-[#3d8425]">
              ✓ Lo dio <strong>{approved.by?.full_name ?? 'planeación'}</strong> el {formatDateTime(approved.at)}
            </p>
          ) : (
            <p className="text-sm text-amber-800">Sin visto bueno: los parámetros todavía no están aprobados.</p>
          )}
        </div>
        {canAdmin && !approved && (
          <button
            type="button"
            onClick={onApprove}
            disabled={!detail.actions.approve.ok || !!blocked}
            className={BTN_PRIMARY}
          >
            Dar visto bueno
          </button>
        )}
      </div>
      {canAdmin && !approved && detail.actions.approve.ok && blocked && (
        <p className="text-xs text-amber-800">{blocked}</p>
      )}
      {canAdmin && !approved && !repeatsSigner && <Reason check={detail.actions.approve} />}
      <p className="text-xs text-gray-600">
        {signers.rule === 'registrados' ? (
          <>
            Lo da el firmante de planeación: <strong>{signers.titular?.full_name ?? '—'}</strong>
            {signers.suplentes.length > 0 && ` (suplente: ${signers.suplentes.map((s) => s.full_name).join(', ')})`}.
          </>
        ) : (
          <>
            No hay firmante de planeación registrado: lo puede dar cualquiera de planeación que no haya hecho el último
            cambio. Al firmante lo registra soporte (super_admin) en Áreas.{' '}
            {canAdmin && (
              <Link href="/fpa/areas" className="font-medium text-[#222D59] hover:underline">
                Ver los firmantes
              </Link>
            )}
          </>
        )}
      </p>
      <p className="text-xs text-gray-500">
        {detail.params_updated
          ? `Último cambio a los parámetros: ${detail.params_updated.by?.full_name ?? 'carga inicial'} · ${formatDateTime(detail.params_updated.at)}`
          : hasParams(detail)
            ? 'Los parámetros se cargaron con la carga inicial (sin cambios por pantalla).'
            : 'Todavía no se capturan los parámetros.'}
      </p>
    </div>
  );
}

function VersionDetailPanel({
  detail,
  canAdmin,
  onAction,
}: {
  detail: FpaVersionDetail;
  canAdmin: boolean;
  onAction: (spec: ConfirmSpec | 'edit') => void;
}) {
  const v = detail.version;
  const a = detail.actions;
  const base = `/fpa/versiones/${v.id}`;
  // Con cambios sin guardar no se da el visto bueno ni se abre: se aprobaría otra cosa
  const [paramsDirty, setParamsDirty] = useState(false);
  const unsaved = paramsDirty ? 'Guarda o deshaz tus cambios a los parámetros antes de seguir.' : null;
  const isComparison = v.kind === 'comparacion';

  const approveSpec: ConfirmSpec = {
    title: `Visto bueno a ${v.code}`,
    message: `¿Das el visto bueno a estos parámetros?\n\n${paramsSummary(detail)}\n\nQueda tu nombre y la hora. Si alguien los cambia después, el visto bueno se quita.`,
    confirmLabel: 'Dar visto bueno',
    comment: 'none',
    run: () => api.post<FpaVersionDetail>(`${base}/visto-bueno`, { params_hash: detail.params.hash }),
    success: `Visto bueno dado a los parámetros de ${v.code}`,
  };
  const openSpec: ConfirmSpec = {
    title: `Abrir ${v.code} a captura`,
    message:
      'Las áreas la van a ver y a cada área activa se le crea su presupuesto en borrador.\n\nAbierta, los parámetros ya no cambian: para corregirlos hay que regresarla a preparación mientras nadie haya enviado.',
    confirmLabel: 'Abrir a captura',
    comment: 'none',
    run: () => api.post<FpaVersionDetail>(`${base}/abrir`, {}),
    success: `${v.code} abierta a captura`,
  };
  const giveBackSpec: ConfirmSpec = {
    title: `Regresar ${v.code} a preparación`,
    message:
      'Sirve para corregir los parámetros. Las áreas dejan de ver la versión hasta que se vuelva a abrir; lo capturado no se pierde.',
    confirmLabel: 'Regresar a preparación',
    comment: 'optional',
    run: (comment) => api.post<FpaVersionDetail>(`${base}/regresar`, { comment }),
    success: `${v.code} regresó a preparación`,
  };
  const closeSpec: ConfirmSpec = {
    title: `Cerrar ${v.code}`,
    message: 'Todo queda de solo lectura: líneas, presupuestos y parámetros. Se puede reabrir con un comentario.',
    confirmLabel: 'Cerrar versión',
    comment: 'optional',
    run: (comment) => api.post<FpaVersionDetail>(`${base}/cerrar`, { comment }),
    success: `${v.code} cerrada`,
  };
  const reopenSpec: ConfirmSpec = {
    title: `Reabrir ${v.code}`,
    message: 'La versión vuelve a captura. Queda en el historial con tu comentario.',
    confirmLabel: 'Reabrir',
    comment: 'required',
    run: (comment) => api.post<FpaVersionDetail>(`${base}/reabrir`, { comment }),
    success: `${v.code} reabierta`,
  };

  return (
    <div className="space-y-5">
      {/* Encabezado y pasos */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
              <span className="font-mono text-lg font-semibold text-[#222D59]">{v.code}</span>
              <span className="font-medium text-[#424846]">{v.name}</span>
              <VersionStatusBadge status={v.status} />
            </p>
            <p className="text-xs text-gray-500">
              Ejercicio {v.fiscal_year} · {VERSION_KIND_LABELS[v.kind] ?? v.kind}
              {v.base_version && ` · copia de ${v.base_version.code}`} · {detail.usage.budgets}{' '}
              {detail.usage.budgets === 1 ? 'presupuesto' : 'presupuestos'} · {detail.usage.lines}{' '}
              {detail.usage.lines === 1 ? 'línea' : 'líneas'}
            </p>
            {v.notes && <p className="text-sm text-gray-600">{v.notes}</p>}
          </div>
          {canAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              {a.edit_info.ok && (
                <button type="button" onClick={() => onAction('edit')} className={BTN_SECONDARY}>
                  Editar datos
                </button>
              )}
              {v.status === 'preparacion' && (
                <button
                  type="button"
                  onClick={() => onAction(openSpec)}
                  disabled={!a.open.ok || !!unsaved}
                  className={BTN_PRIMARY}
                >
                  Abrir a captura
                </button>
              )}
              {v.status === 'captura' && (
                <>
                  <button type="button" onClick={() => onAction(giveBackSpec)} disabled={!a.give_back.ok} className={BTN_SECONDARY}>
                    Regresar a preparación
                  </button>
                  <button type="button" onClick={() => onAction(closeSpec)} disabled={!a.close.ok} className={BTN_SECONDARY}>
                    Cerrar versión
                  </button>
                </>
              )}
              {v.status === 'cerrada' && (
                <button type="button" onClick={() => onAction(reopenSpec)} disabled={!a.reopen.ok} className={BTN_SECONDARY}>
                  Reabrir
                </button>
              )}
            </div>
          )}
        </div>
        {canAdmin && (
          <div className="space-y-0.5">
            {v.status === 'preparacion' && <Reason check={a.open} />}
            {v.status === 'preparacion' && a.open.ok && unsaved && <p className="text-xs text-amber-800">{unsaved}</p>}
            {v.status === 'captura' && <Reason check={a.give_back} />}
            {v.status === 'captura' && <Reason check={a.close} />}
          </div>
        )}
      </div>

      {!isComparison && (
        <ApprovalCard detail={detail} canAdmin={canAdmin} blocked={unsaved} onApprove={() => onAction(approveSpec)} />
      )}

      {!isComparison && detail.gaps.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-amber-800">Para el visto bueno y para abrir a captura falta:</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
            {detail.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Parámetros */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-[#424846]">Parámetros</h2>
          {canAdmin && !a.edit_params.ok && a.edit_params.reason && (
            <p className="text-xs text-gray-500">{a.edit_params.reason}</p>
          )}
        </div>
        <VersionParamsForm
          key={`${v.id}-${v.status}`}
          detail={detail}
          canEdit={canAdmin && a.edit_params.ok}
          onDirtyChange={setParamsDirty}
        />
      </div>

      {/* Historial */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <h2 className="text-base font-semibold text-[#424846]">Historial</h2>
        <VersionHistory events={detail.events} />
      </div>
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

function VersionesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const versionsQ = useFpaVersions();
  const contextQ = useFpaContext();
  const canAdmin = contextQ.data?.can_admin ?? false;
  const versions = versionsQ.data ?? [];

  const requested = searchParams.get('version');
  const selectedId =
    requested && versions.some((v) => v.id === requested)
      ? requested
      : (versions.find((v) => v.status === 'preparacion') ?? versions.find((v) => v.status === 'captura') ?? versions[0])
          ?.id ?? null;
  const detailQ = useFpaVersion(selectedId);

  const [showNew, setShowNew] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [editing, setEditing] = useState(false);

  const select = (id: string) => router.replace(`/fpa/versiones?version=${encodeURIComponent(id)}`, { scroll: false });

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Versiones</h1>
          <p className="text-gray-500">
            Parámetros de cada versión (inflación, tipo de cambio y tarifas de viaje), con el visto bueno de planeación
          </p>
        </div>
        {canAdmin && (
          <button type="button" onClick={() => setShowNew(true)} className={`${BTN_PRIMARY} flex items-center gap-2`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva versión
          </button>
        )}
      </div>

      {versionsQ.isLoading ? (
        <Spinner />
      ) : versionsQ.isError ? (
        <p className="text-sm text-red-600">No se pudieron cargar las versiones: {errorText(versionsQ.error, 'intenta de nuevo')}</p>
      ) : versions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center space-y-2">
          <p className="text-gray-500">Todavía no hay versiones</p>
          {canAdmin && <p className="text-sm text-gray-400">Usa &quot;Nueva versión&quot; para crear la primera</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-6 items-start">
          <nav aria-label="Versiones" className="bg-white rounded-lg shadow divide-y divide-gray-100 overflow-hidden">
            {versions.map((v) => {
              const active = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => select(v.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`w-full text-left px-4 py-3 transition-colors ${active ? 'bg-[#52AF32]/10' : 'hover:bg-gray-50'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[#222D59]">{v.code}</span>
                    <VersionStatusBadge status={v.status} />
                  </span>
                  <span className="block text-sm text-gray-700 truncate">{v.name}</span>
                  {v.kind === 'comparacion' ? (
                    <span className="block text-xs text-gray-500">Comparación</span>
                  ) : (
                    <span className={`block text-xs ${v.params_approved ? 'text-[#3d8425]' : 'text-amber-700'}`}>
                      {v.params_approved ? `✓ Visto bueno de ${v.params_approved.by.full_name}` : 'Sin visto bueno'}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="min-w-0">
            {detailQ.isLoading ? (
              <Spinner />
            ) : detailQ.isError ? (
              <p className="text-sm text-red-600">No se pudo cargar la versión: {errorText(detailQ.error, 'intenta de nuevo')}</p>
            ) : detailQ.data ? (
              <VersionDetailPanel
                detail={detailQ.data}
                canAdmin={canAdmin}
                onAction={(spec) => (spec === 'edit' ? setEditing(true) : setConfirm(spec))}
              />
            ) : null}
          </div>
        </div>
      )}

      {showNew && (
        <NewVersionModal
          versions={versions}
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            select(id);
          }}
        />
      )}
      {confirm && <ConfirmActionModal spec={confirm} versionId={selectedId} onClose={() => setConfirm(null)} />}
      {editing && detailQ.data && <EditInfoModal detail={detailQ.data} onClose={() => setEditing(false)} />}
    </div>
  );
}

export default function FpaVersionesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VersionesContent />
    </Suspense>
  );
}
