'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { fpaKeys } from '@/hooks/useFpa';
import FpaModal from '@/components/fpa/FpaModal';
import { formatDateTime, formatDay, todayMx } from '@/lib/fpa-format';
import type { FpaBudgetDetail, FpaVersionDetail } from '@/types/fpa';

/**
 * FP&A (C4) — fecha límite de captura y prórroga por área. Lo que contestó
 * Laura el 10-nov: una fecha para todas las áreas; al vencer, el área que no
 * envió ya no captura ni envía; las firmas no llevan fecha. Planeación le da a
 * un área una fecha nueva ("le abro este cacho y lo vuelvo a cerrar"). Las
 * reglas las cuida el API; aquí solo se enseñan y se piden.
 */

const INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]';
const LABEL = 'block text-sm font-medium text-gray-700 mb-1';
const BTN_PRIMARY =
  'px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50';
const BTN_SECONDARY =
  'px-4 py-2 text-sm font-medium rounded-lg border border-[#222D59]/30 text-[#222D59] hover:bg-[#222D59]/5 transition-colors disabled:opacity-50';
const BTN_CANCEL = 'px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors';
const BTN_REMOVE =
  'px-4 py-2 text-sm font-medium rounded-lg text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50';

/** El día siguiente ("AAAA-MM-DD"). */
const nextDay = (day: string) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);

const later = (a: string, b: string) => (a > b ? a : b);

/** Un día con comentario opcional; "Quitar" manda null. */
function DayModal({
  title,
  message,
  label,
  initial,
  min,
  removeLabel,
  saveLabel,
  run,
  onDone,
  onClose,
}: {
  title: string;
  message: string;
  label: string;
  initial: string | null;
  min: string;
  /** Si viene, se puede quitar (manda null). */
  removeLabel?: string;
  saveLabel: string;
  run: (day: string | null, comment: string | null) => Promise<unknown>;
  onDone: (day: string | null) => void;
  onClose: () => void;
}) {
  const uid = useId();
  const [day, setDay] = useState(initial && initial >= min ? initial : '');
  const [comment, setComment] = useState('');
  const mutation = useMutation({
    mutationFn: (value: string | null) => run(value, comment.trim() || null),
    onSuccess: (_saved, value) => {
      onDone(value);
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'No se pudo guardar'),
  });
  return (
    <FpaModal title={title} size="md" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!day) return notify.error('Elige el día.');
          if (day < min) return notify.error(`El día va desde el ${formatDay(min)}.`);
          mutation.mutate(day);
        }}
        className="flex flex-col min-h-0"
      >
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
          <div>
            <label htmlFor={`${uid}-day`} className={LABEL}>
              {label} *
            </label>
            <input
              id={`${uid}-day`}
              type="date"
              value={day}
              min={min}
              onChange={(e) => setDay(e.target.value)}
              className={INPUT}
            />
            {day && <p className="mt-1 text-xs text-gray-500">Hasta el {formatDay(day)}, hora de México.</p>}
          </div>
          <div>
            <label htmlFor={`${uid}-comment`} className={LABEL}>
              Comentario (opcional)
            </label>
            <textarea
              id={`${uid}-comment`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={1000}
              className={INPUT}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div>
            {removeLabel && (
              <button
                type="button"
                onClick={() => mutation.mutate(null)}
                disabled={mutation.isPending}
                className={BTN_REMOVE}
              >
                {removeLabel}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={BTN_CANCEL}>
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className={BTN_PRIMARY}>
              {mutation.isPending ? 'Guardando…' : saveLabel}
            </button>
          </div>
        </div>
      </form>
    </FpaModal>
  );
}

/** Lo que cambia con la fecha o una prórroga: la versión, las listas, el presupuesto y su flujo. */
function useRefreshCapture() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: fpaKeys.versionAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.versions });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetsAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.flowAll });
  };
}

/** Versiones: la fecha límite de captura, las áreas que no enviaron a tiempo y las prórrogas. */
export function CaptureDeadlineCard({ detail, canAdmin }: { detail: FpaVersionDetail; canAdmin: boolean }) {
  const qc = useQueryClient();
  const refresh = useRefreshCapture();
  const [editing, setEditing] = useState(false);
  const v = detail.version;
  if (v.kind === 'comparacion') return null;
  const deadline = v.capture_deadline ?? null;
  const check = detail.actions.set_deadline;
  const closed = detail.capture?.closed_areas ?? [];
  const extensions = detail.capture?.extensions ?? [];
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[#424846]">Fecha límite de captura</h2>
          {deadline && v.status === 'captura' && todayMx() > deadline ? (
            <p className="text-sm text-gray-700">
              La captura cerró el <strong className="text-[#222D59]">{formatDay(deadline)}</strong>: las áreas que no
              enviaron ya no capturan, salvo con prórroga.
            </p>
          ) : deadline ? (
            <p className="text-sm text-gray-700">
              Las áreas capturan y envían hasta el <strong className="text-[#222D59]">{formatDay(deadline)}</strong>, hora
              de México.
            </p>
          ) : (
            <p className="text-sm text-gray-500">Sin fecha: las áreas capturan mientras la versión esté abierta.</p>
          )}
        </div>
        {canAdmin && check?.ok && (
          <button type="button" onClick={() => setEditing(true)} className={BTN_SECONDARY}>
            {deadline ? 'Cambiar fecha' : 'Poner fecha'}
          </button>
        )}
      </div>
      {canAdmin && check && !check.ok && check.reason && <p className="text-xs text-gray-500">{check.reason}</p>}
      <p className="text-xs text-gray-500">
        Es una para todas las áreas. Al pasar, el área que no envió ya no captura ni envía, y planeación le puede dar una
        prórroga desde su presupuesto. Las firmas no llevan fecha: un presupuesto devuelto se corrige y se reenvía.
      </p>
      {closed.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            {closed.length === 1 ? 'Esta área no envió a tiempo:' : `Estas ${closed.length} áreas no enviaron a tiempo:`}
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {closed.map((c) => (
              <li key={c.budget_id}>
                <Link href={`/fpa/presupuestos/${c.budget_id}`} className="font-medium text-[#222D59] hover:underline">
                  {c.area}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {extensions.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-medium text-[#424846]">Con prórroga:</p>
          <ul className="mt-1 space-y-0.5 text-sm text-gray-700">
            {extensions.map((x) => (
              <li key={x.budget_id}>
                <Link href={`/fpa/presupuestos/${x.budget_id}`} className="font-medium text-[#222D59] hover:underline">
                  {x.area}
                </Link>{' '}
                hasta el {formatDay(x.until)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {editing && (
        <DayModal
          title={`Fecha límite de ${v.code}`}
          message="Es el último día para capturar y enviar, el mismo para todas las áreas. Después, el área que no envió ya no captura ni envía hasta que planeación le dé una prórroga. A quienes capturan les llega un aviso 2 días hábiles antes."
          label="Último día"
          initial={deadline}
          min={todayMx()}
          removeLabel={deadline ? 'Quitar la fecha' : undefined}
          saveLabel="Guardar fecha"
          run={(day, comment) =>
            api.put<FpaVersionDetail>(`/fpa/versiones/${v.id}/fecha-limite`, { capture_deadline: day, comment })
          }
          onDone={(day) => {
            refresh();
            void qc.invalidateQueries({ queryKey: fpaKeys.version(v.id) });
            notify.success(day ? `Fecha límite: ${formatDay(day)}` : 'Se quitó la fecha límite');
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

/**
 * El presupuesto: hasta cuándo captura el área, el aviso de que ya cerró y,
 * para planeación, la prórroga.
 */
export function CaptureNotice({ detail, canAdmin }: { detail: FpaBudgetDetail; canAdmin: boolean }) {
  const refresh = useRefreshCapture();
  const [editing, setEditing] = useState(false);
  const cap = detail.capture;
  const deadline = detail.version.capture_deadline ?? null;
  const ext = detail.capture_extension ?? null;
  // Solo cuenta mientras el área no ha enviado (o puede retirar lo enviado)
  const relevant = detail.version.status === 'captura' && (detail.status === 'borrador' || detail.status === 'enviado');
  if (!cap?.until || !deadline || !relevant) return null;
  const canExtend = canAdmin;
  const extensionText = ext
    ? ` Tiene prórroga${ext.by ? ` de ${ext.by.full_name}` : ''} (${formatDateTime(ext.at)}).`
    : '';
  return (
    <>
      {cap.closed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-800">
                La captura cerró el {formatDay(cap.until)} y este presupuesto no se envió.
              </p>
              <p className="text-sm text-red-800">
                Quien captura el área ya no agrega, cambia ni envía.{' '}
                {canAdmin
                  ? 'Tú puedes darle una prórroga para que capture y envíe hasta otro día (planeación sí puede editar las líneas).'
                  : 'Pide a planeación una prórroga.'}
                {extensionText}
              </p>
            </div>
            {canExtend && (
              <button type="button" onClick={() => setEditing(true)} className={BTN_PRIMARY}>
                {ext ? 'Cambiar prórroga' : 'Dar prórroga'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700">
            {detail.status === 'borrador' ? 'Se captura y se envía' : 'Se puede retirar'} hasta el{' '}
            <strong className="text-[#222D59]">{formatDay(cap.until)}</strong>
            {ext ? ` (prórroga; la fecha de la versión es el ${formatDay(deadline)})` : ''}.{extensionText}
          </p>
          {canExtend && (
            <button type="button" onClick={() => setEditing(true)} className={BTN_SECONDARY}>
              {ext ? 'Cambiar prórroga' : 'Dar prórroga'}
            </button>
          )}
        </div>
      )}
      {editing && (
        <DayModal
          title={`Prórroga de ${detail.area.name}`}
          message={`La fecha de la versión es el ${formatDay(deadline)}. Con la prórroga, ${detail.area.name} captura y envía hasta el día que elijas; al pasar, vuelve a cerrar. Queda en el historial de la versión.`}
          label="Hasta el día"
          initial={ext?.until ?? null}
          min={later(todayMx(), nextDay(deadline))}
          removeLabel={ext ? 'Quitar prórroga' : undefined}
          saveLabel="Guardar prórroga"
          run={(until, comment) => api.post(`/fpa/presupuestos/${detail.id}/prorroga`, { until, comment })}
          onDone={(until) => {
            refresh();
            notify.success(
              until ? `${detail.area.name} captura hasta el ${formatDay(until)}` : 'Se quitó la prórroga',
            );
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
