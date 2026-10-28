'use client';

import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { fpaKeys, useFpaFlow } from '@/hooks/useFpa';
import FpaModal from '@/components/fpa/FpaModal';
import { BudgetStatusBadge } from '@/components/fpa/StatusBadges';
import { formatDateTime, formatPesos } from '@/lib/fpa-format';
import {
  FLOW_ACTING_AS_LABELS,
  FLOW_STEP_OF,
  type FpaBudgetFlow,
  type FpaFlowActionInput,
  type FpaFlowCheck,
  type FpaFlowEvent,
  type FpaFlowRound,
  type FpaRoundChanges,
  type Money,
} from '@/types/fpa';

/**
 * FP&A (B3) — flujo de aprobación de un presupuesto: de quién es el turno,
 * los pasos que le tocan a quien mira (enviar, aprobar, regresar, retirar o
 * reabrir) y la línea de tiempo por ronda, con qué cambió entre envíos.
 * Quién puede hacer qué lo decide el API (actions); la pantalla manda el
 * estado y la ronda que tenía, para que un cambio de otra persona no se pise.
 */

type ActionKey = keyof FpaBudgetFlow['actions'];

interface ActionSpec {
  key: ActionKey;
  path: 'enviar' | 'aprobar' | 'rechazar' | 'retirar' | 'reabrir';
  label: string;
  title: string;
  message: string;
  /** optional: se puede comentar; required: obligatorio (10 caracteres). */
  comment: 'optional' | 'required';
  success: string;
  tone: 'primary' | 'secondary' | 'danger';
}

const BTN = {
  primary: 'px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50',
  secondary:
    'px-4 py-2 text-sm font-medium rounded-lg border border-[#222D59]/30 text-[#222D59] hover:bg-[#222D59]/5 transition-colors disabled:opacity-50',
  danger:
    'px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50',
};
const INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]';

/** Los pasos que tienen sentido en cada estado (lo demás no se enseña). */
function specsFor(flow: FpaBudgetFlow): ActionSpec[] {
  const { status } = flow.budget;
  const step = flow.turn.step;
  const area = flow.budget.area.name;
  if (status === 'borrador' || status === 'devuelto') {
    return [
      {
        key: 'submit',
        path: 'enviar',
        label: 'Enviar a aprobación',
        title: `Enviar el presupuesto de ${area}`,
        message:
          'Se guarda una foto de lo enviado y le avisa a quien aprueba el área. Mientras está en aprobación no se edita; lo puedes retirar antes de la primera firma.',
        comment: 'optional',
        success: 'Presupuesto enviado a aprobación',
        tone: 'primary',
      },
    ];
  }
  if (step) {
    const specs: ActionSpec[] = [
      {
        key: 'approve',
        path: 'aprobar',
        label: step === 'cfo' ? 'Aprobar (final)' : 'Aprobar',
        title: `Aprobar el paso ${FLOW_STEP_OF[step]}`,
        message:
          step === 'cfo'
            ? 'Es la aprobación final: el presupuesto queda aprobado. Planeación lo puede reabrir con un comentario.'
            : 'Pasa al siguiente paso y le avisa a quien sigue.',
        comment: 'optional',
        success: step === 'cfo' ? 'Presupuesto aprobado' : 'Paso aprobado',
        tone: 'primary',
      },
      {
        key: 'reject',
        path: 'rechazar',
        label: 'Regresar a captura',
        title: `Regresar el presupuesto de ${area}`,
        message:
          'Regresa a quien captura con tu comentario. Al reenviarlo empieza otra ronda, otra vez desde el área.',
        comment: 'required',
        success: 'Presupuesto regresado a captura',
        tone: 'danger',
      },
    ];
    if (status === 'enviado') {
      specs.push({
        key: 'withdraw',
        path: 'retirar',
        label: 'Retirar el envío',
        title: 'Retirar el envío',
        message: 'Regresa a borrador para seguir capturando. Se puede mientras nadie lo haya firmado.',
        comment: 'optional',
        success: 'Envío retirado: el presupuesto regresó a borrador',
        tone: 'secondary',
      });
    }
    return specs;
  }
  if (status === 'aprobado_cfo') {
    return [
      {
        key: 'reopen',
        path: 'reabrir',
        label: 'Reabrir',
        title: `Reabrir el presupuesto de ${area}`,
        message:
          'Ya estaba aprobado: regresa a captura con tu comentario y, al reenviarse, vuelve a pasar por el área, planeación y el CFO.',
        comment: 'required',
        success: 'Presupuesto reabierto',
        tone: 'danger',
      },
    ];
  }
  return [];
}

/** Lo que cambió en el flujo vuelve a pedir el detalle, la lista, el consolidado y la bandeja. */
function useRefreshFlow() {
  const qc = useQueryClient();
  return (budgetId: string, saved?: FpaBudgetFlow) => {
    if (saved) qc.setQueryData(fpaKeys.flow(budgetId), saved);
    else void qc.invalidateQueries({ queryKey: fpaKeys.flow(budgetId) });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetsAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.consolidatedAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.pending });
  };
}

function FlowActionModal({
  flow,
  spec,
  onClose,
}: {
  flow: FpaBudgetFlow;
  spec: ActionSpec;
  onClose: () => void;
}) {
  const uid = useId();
  const refresh = useRefreshFlow();
  const [comment, setComment] = useState('');
  const budgetId = flow.budget.id;
  // Lo que había en pantalla al abrir el modal: si mientras tanto cambió, el API responde 409
  const [seen] = useState(() => ({ status: flow.budget.status, round: flow.budget.current_round }));
  const mutation = useMutation({
    mutationFn: (text: string | null) =>
      api.post<FpaBudgetFlow>(`/fpa/presupuestos/${budgetId}/${spec.path}`, {
        expected_status: seen.status,
        expected_round: seen.round,
        comment: text,
      } satisfies FpaFlowActionInput),
    onSuccess: (saved) => {
      refresh(budgetId, saved);
      notify.success(spec.success);
      onClose();
    },
    onError: (err: Error) => {
      // Otra persona ya lo movió: se trae cómo quedó
      if (err instanceof ApiError && err.status === 409) {
        refresh(budgetId);
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
    mutation.mutate(text || null);
  };
  return (
    <FpaModal
      title={spec.title}
      subtitle={`${flow.budget.version.code} · ronda ${spec.key === 'submit' ? seen.round + 1 : seen.round}`}
      size="md"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700">{spec.message}</p>
          <div>
            <label htmlFor={`${uid}-comment`} className="block text-sm font-medium text-gray-700 mb-1">
              {spec.comment === 'required' ? 'Por qué *' : 'Comentario (opcional)'}
            </label>
            <textarea
              id={`${uid}-comment`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-required={spec.comment === 'required'}
              className={INPUT}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className={spec.tone === 'danger' ? BTN.danger : BTN.primary}>
            {mutation.isPending ? 'Guardando…' : spec.label}
          </button>
        </div>
      </form>
    </FpaModal>
  );
}

function names(who: FpaBudgetFlow['turn']['who']): string {
  return who.map((p) => (p.is_alternate ? `${p.full_name} (suplente)` : p.full_name)).join(', ');
}

/** Tarjeta del flujo: estado, ronda, de quién es el turno y los pasos de quien mira. */
export function BudgetFlowCard({ budgetId }: { budgetId: string }) {
  const uid = useId();
  const flowQ = useFpaFlow(budgetId);
  const [open, setOpen] = useState<ActionSpec | null>(null);
  const flow = flowQ.data;
  if (flowQ.isLoading) {
    return <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-500">Cargando el flujo de aprobación…</div>;
  }
  if (flowQ.isError || !flow) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-sm text-red-600">
        No se pudo cargar el flujo de aprobación: {flowQ.error instanceof Error ? flowQ.error.message : 'intenta de nuevo'}
      </div>
    );
  }
  const specs = specsFor(flow);
  // Un "no" por la persona no se enseña: el paso es de otra; uno por el estado sí, con su motivo
  const visible = specs.filter((s) => flow.actions[s.key].ok || flow.actions[s.key].code === 'estado');
  const { status, current_round: round } = flow.budget;
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[#424846]">Flujo de aprobación</h2>
          <p className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <BudgetStatusBadge status={status} />
            {round > 0 && <span className="text-xs text-gray-500">Ronda {round}</span>}
            <span>{flow.turn.label}</span>
          </p>
          {flow.turn.who.length > 0 && (
            <p className="text-xs text-gray-600">
              {flow.turn.step ? 'Le toca a' : 'Captura'}: <strong>{names(flow.turn.who)}</strong>
              {flow.turn.rule === 'rol' && flow.turn.step && ' (por rol: no hay firmante registrado)'}
            </p>
          )}
          {flow.turn.blocked && (
            <p className="text-xs text-amber-800">
              Ninguno de los responsables puede firmar este paso en esta ronda (nadie firma lo que envió ni dos pasos de la
              misma ronda). Planeación puede registrar otro firmante, o soporte firmarlo.
            </p>
          )}
        </div>
        {visible.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {visible.map((s) => {
              const check = flow.actions[s.key];
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setOpen(s)}
                  disabled={!check.ok}
                  aria-describedby={check.ok ? undefined : `${uid}-${s.key}`}
                  title={check.acting_as === 'super_admin' ? 'Como soporte (super_admin): queda dicho en el historial' : undefined}
                  className={BTN[s.tone]}
                >
                  {s.label}
                  {check.acting_as === 'super_admin' && ' (soporte)'}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {visible.map((s) => (
        <Reason key={s.key} id={`${uid}-${s.key}`} check={flow.actions[s.key]} />
      ))}
      {open && <FlowActionModal flow={flow} spec={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Reason({ id, check }: { id: string; check: FpaFlowCheck }) {
  if (check.ok || !check.reason) return null;
  return (
    <p id={id} className="text-xs text-amber-800">
      {check.reason}
    </p>
  );
}

// ── Línea de tiempo ─────────────────────────────────────────────────────────

const pesos = (v: Money) => (v === null ? 'No disponible' : formatPesos(v, true));

function eventText(e: FpaFlowEvent): string {
  const step = e.step ? FLOW_STEP_OF[e.step] : null;
  switch (e.action) {
    case 'enviado':
      return 'lo envió a aprobación';
    case 'aprobado':
      return step ? `aprobó el paso ${step}` : 'lo aprobó';
    case 'rechazado':
      return step ? `lo regresó a captura en el paso ${step}` : 'lo regresó a captura';
    case 'retirado':
      return 'retiró el envío';
    case 'reabierto':
      return 'lo reabrió';
  }
}

const DOT: Record<FpaFlowEvent['action'], string> = {
  enviado: 'bg-blue-500',
  aprobado: 'bg-[#52AF32]',
  rechazado: 'bg-red-500',
  retirado: 'bg-gray-500',
  reabierto: 'bg-amber-500',
};

function Changes({ changes, round }: { changes: FpaRoundChanges; round: number }) {
  const none = changes.added.length + changes.removed.length + changes.changed.length === 0;
  // La diferencia ya viene calculada del API: solo se le da signo y formato
  const delta = changes.delta;
  const moved = delta !== null && Number(delta) !== 0;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1.5">
      <p className="font-medium text-[#424846]">
        Contra la ronda {round - 1}: {pesos(changes.total_before)} → {pesos(changes.total_after)}
        {moved && (
          <span className="text-gray-600">
            {' '}
            ({delta.startsWith('-') ? '−' : '+'}
            {formatPesos(delta.replace(/^-/, ''), true)})
          </span>
        )}
      </p>
      {none && <p className="text-gray-600">Sin cambios en las líneas.</p>}
      {changes.added.length > 0 && (
        <p className="text-gray-700">
          <span className="font-medium">Nuevas:</span>{' '}
          {changes.added.map((l) => `${l.folio} ${l.concept} (${pesos(l.total_mxn)})`).join(' · ')}
        </p>
      )}
      {changes.removed.length > 0 && (
        <p className="text-gray-700">
          <span className="font-medium">Quitadas:</span>{' '}
          {changes.removed.map((l) => `${l.folio} ${l.concept} (${pesos(l.total_mxn)})`).join(' · ')}
        </p>
      )}
      {changes.changed.length > 0 && (
        <ul className="list-disc pl-5 text-gray-700">
          {changes.changed.map((l) => (
            <li key={l.folio}>
              {l.folio} {l.concept}: {l.fields.join(', ').toLowerCase()}
              {l.fields.includes('Monto') && ` (${pesos(l.total_before)} → ${pesos(l.total_mxn)})`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoundBlock({ r }: { r: FpaFlowRound }) {
  return (
    <li className="space-y-2">
      <p className="text-sm font-semibold text-[#424846]">
        Ronda {r.round}
        {r.sent && (
          <span className="font-normal text-gray-600">
            {' '}
            · {pesos(r.sent.total_mxn)} enviados
          </span>
        )}
      </p>
      {r.changes && <Changes changes={r.changes} round={r.round} />}
      <ol className="space-y-2">
        {r.events.map((e) => {
          const actingAs = FLOW_ACTING_AS_LABELS[e.acting_as];
          return (
            <li key={e.id} className="relative pl-6">
              <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${DOT[e.action]}`} aria-hidden="true" />
              <p className="text-sm text-gray-800">
                <strong>{e.actor.full_name}</strong> {eventText(e)}
                {actingAs && <span className="text-gray-500"> ({actingAs})</span>}
              </p>
              <p className="text-xs text-gray-500">{formatDateTime(e.created_at)}</p>
              {e.comment && (
                <blockquote className="mt-1 border-l-2 border-gray-300 pl-3 text-sm text-gray-700 whitespace-pre-line">
                  {e.comment}
                </blockquote>
              )}
            </li>
          );
        })}
      </ol>
    </li>
  );
}

/** Historial del flujo por ronda (la más reciente primero), con qué cambió entre envíos. */
export function BudgetFlowHistory({ budgetId }: { budgetId: string }) {
  const flowQ = useFpaFlow(budgetId);
  const rounds = flowQ.data?.rounds ?? [];
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <h2 className="text-base font-semibold text-[#424846]">Historial del flujo</h2>
      {flowQ.isLoading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : flowQ.isError ? (
        <p className="text-sm text-red-600">
          No se pudo cargar el historial: {flowQ.error instanceof Error ? flowQ.error.message : 'intenta de nuevo'}
        </p>
      ) : rounds.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no se ha enviado.</p>
      ) : (
        <ol className="space-y-5">
          {rounds.map((r) => (
            <RoundBlock key={r.round} r={r} />
          ))}
        </ol>
      )}
    </div>
  );
}
