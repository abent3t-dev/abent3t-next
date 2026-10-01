'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import Pagination from '@/components/ui/Pagination';
import {
  EMAIL_OUTBOX_STATUSES,
  EMAIL_STATUS_CLASSES,
  EMAIL_STATUS_LABELS,
  EMAIL_TRANSPORT_LABELS,
  emailTemplateLabel,
  type EmailOutboxDetail,
  type EmailOutboxPage,
  type EmailOutboxRow,
  type EmailOutboxStatus,
  type EmailQueueState,
} from '@/types/email';

/**
 * J1 (hilo con César, 2026-10-01) — Bitácora de correo: qué se envió, a
 * quién, cuándo y con qué resultado, con filtros; estado de la cola (ritmo,
 * tope diario, dominio permitido) y el interruptor "Pausar envíos", que solo
 * usa super_admin. Acceso: super_admin, lider_procura y admin_rh.
 */

// Uno de los tamaños del selector de Pagination (10, 25, 50, 100)
const PAGE_SIZE = 25;
const REFRESH_MS = 30_000;

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

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/** Fecha arriba y hora abajo, para que la tabla quepa. */
function DateCell({ date, note }: { date: string | null; note?: string }) {
  if (!date) return <>—</>;
  return (
    <>
      <p className="text-gray-700">{formatDate(date)}</p>
      <p className="text-xs text-gray-500">
        {formatTime(date)}
        {note ? ` · ${note}` : ''}
      </p>
    </>
  );
}

/** "Contratos · resumen diario" → módulo arriba y aviso abajo. */
function TemplateCell({ template }: { template: string }) {
  const [section, ...rest] = emailTemplateLabel(template).split(' · ');
  return (
    <>
      <p className="text-gray-900">{section}</p>
      {rest.length > 0 && (
        <p className="text-xs text-gray-500">{rest.join(' · ')}</p>
      )}
    </>
  );
}

const TRANSPORT_SHORT: Record<string, string> = {
  simulacion: 'Simulación',
  graph: 'Graph',
  smtp: 'SMTP',
};

const STATE_LABELS: Record<EmailQueueState['state'], string> = {
  activo: 'Activo',
  pausado: 'En pausa',
  tope: 'Tope del día',
};

const STATE_CLASSES: Record<EmailQueueState['state'], string> = {
  activo: 'bg-green-100 text-green-800',
  pausado: 'bg-amber-100 text-amber-800',
  tope: 'bg-orange-100 text-orange-800',
};

const inputClass =
  'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] text-gray-900 bg-white text-sm';

function StatusBadge({ status }: { status: EmailOutboxStatus }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${EMAIL_STATUS_CLASSES[status]}`}
    >
      {EMAIL_STATUS_LABELS[status]}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-lg font-semibold text-[#424846]">{value}</p>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function CorreoPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canPause = hasRole('super_admin');

  const [status, setStatus] = useState<'' | EmailOutboxStatus>('');
  const [template, setTemplate] = useState('');
  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [detailId, setDetailId] = useState<string | null>(null);
  const term = useDebouncedValue(search.trim(), 300);

  const estadoQuery = useQuery({
    queryKey: ['correo-estado'],
    queryFn: () => api.get<EmailQueueState>('/correo/estado'),
    refetchInterval: REFRESH_MS,
  });

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set('status', status);
  if (template) params.set('template', template);
  if (term) params.set('search', term);
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const query = params.toString();

  const bitacoraQuery = useQuery({
    queryKey: ['correo-bitacora', query],
    queryFn: () => api.get<EmailOutboxPage>(`/correo/bitacora?${query}`),
    refetchInterval: REFRESH_MS,
    placeholderData: (previous) => previous,
  });

  const estado = estadoQuery.data;
  const rows = bitacoraQuery.data?.data ?? [];
  const meta = bitacoraQuery.data?.meta;
  const templates = bitacoraQuery.data?.templates ?? [];
  const hasFilters = !!(status || template || search || desde || hasta);

  // Cualquier filtro nuevo regresa a la primera página
  const withReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const clearFilters = () => {
    setStatus('');
    setTemplate('');
    setSearch('');
    setDesde('');
    setHasta('');
    setPage(1);
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['correo-estado'] });
    void queryClient.invalidateQueries({ queryKey: ['correo-bitacora'] });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Correo</h1>
        <p className="text-gray-500">
          Cola y bitácora de los avisos por correo de la plataforma: qué salió,
          a quién, cuándo y con qué resultado
        </p>
      </div>

      {/* Estado de la cola */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-[#424846]">
              Estado del envío
            </h3>
            {estado && (
              <span
                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${STATE_CLASSES[estado.state]}`}
              >
                {STATE_LABELS[estado.state]}
              </span>
            )}
          </div>
          {estado && canPause && (
            <PauseControl estado={estado} onChanged={refresh} />
          )}
        </div>

        {estadoQuery.isLoading || !estado ? (
          estadoQuery.isError ? (
            <p className="text-sm text-red-700">
              No se pudo cargar el estado del correo
            </p>
          ) : (
            <div className="p-4 text-center">
              <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )
        ) : (
          <>
            {estado.state === 'pausado' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900">
                En pausa desde {formatDateTime(estado.paused_at)}
                {estado.paused_by?.full_name
                  ? ` (${estado.paused_by.full_name})`
                  : ''}
                {estado.paused_reason ? `: ${estado.paused_reason}` : ''}. Los
                avisos se siguen registrando y salen al reanudar.
              </div>
            )}
            {estado.state === 'tope' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-900">
                Se alcanzó el tope de {estado.daily_cap} correos de hoy. El
                envío se pausó solo; lo pendiente sale mañana.
              </div>
            )}
            {estado.transport.mode !== 'simulacion' &&
              !estado.transport.ready && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
                  Faltan variables para enviar:{' '}
                  {estado.transport.missing.join(', ')}
                </div>
              )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Stat
                label="Transporte"
                value={
                  <span className="text-base">
                    {EMAIL_TRANSPORT_LABELS[estado.transport.mode] ??
                      estado.transport.mode}
                  </span>
                }
                hint={`Remitente: ${estado.transport.from}`}
              />
              <Stat
                label="Hoy"
                value={`${estado.sent_today} de ${estado.daily_cap}`}
                hint="enviados o simulados (tope diario)"
              >
                <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${estado.sent_today >= estado.daily_cap ? 'bg-orange-500' : 'bg-[#52AF32]'}`}
                    style={{
                      width: `${Math.min(100, (estado.sent_today / Math.max(1, estado.daily_cap)) * 100)}%`,
                    }}
                  />
                </div>
              </Stat>
              <Stat
                label="Ritmo"
                value={`1 cada ${estado.min_interval_seconds} s`}
                hint={
                  estado.next_send_after
                    ? `Siguiente desde las ${formatTime(estado.next_send_after)}`
                    : 'Listo para el siguiente'
                }
              />
              <Stat label="En cola" value={estado.pending} hint="pendientes" />
              <Stat
                label="Errores hoy"
                value={estado.errors_today}
                hint="tras 3 intentos"
              />
              <Stat
                label="Rechazados hoy"
                value={estado.rejected_today}
                hint={`Solo ${estado.allowed_domains.map((d) => `@${d}`).join(', ')}`}
              />
            </div>
          </>
        )}
      </div>

      {/* Bitácora */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 space-y-3">
          <h3 className="text-lg font-semibold text-[#424846]">Bitácora</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              Buscar
              <input
                type="search"
                value={search}
                onChange={(e) => withReset(setSearch)(e.target.value)}
                placeholder="Destinatario o asunto"
                className={`${inputClass} w-64`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              Estado
              <select
                value={status}
                onChange={(e) =>
                  withReset(setStatus)(e.target.value as '' | EmailOutboxStatus)
                }
                className={inputClass}
              >
                <option value="">Todos</option>
                {EMAIL_OUTBOX_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {EMAIL_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              Aviso
              <select
                value={template}
                onChange={(e) => withReset(setTemplate)(e.target.value)}
                className={inputClass}
              >
                <option value="">Todos</option>
                {templates.map((t) => (
                  <option key={t} value={t}>
                    {emailTemplateLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              Desde
              <input
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => withReset(setDesde)(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              Hasta
              <input
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => withReset(setHasta)(e.target.value)}
                className={inputClass}
              />
            </label>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-[#52AF32] hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {bitacoraQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : bitacoraQuery.isError ? (
          <p className="px-6 py-8 text-center text-red-700">
            No se pudo cargar la bitácora
          </p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">
            {hasFilters
              ? 'Ningún correo coincide con los filtros'
              : 'Aún no hay correos en la bitácora'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#424846]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Registrado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Aviso</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Destinatario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Asunto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Intentos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Salida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, idx) => (
                    <OutboxRow
                      key={row.id}
                      row={row}
                      idx={idx}
                      queueState={estado?.state}
                      onOpen={() => setDetailId(row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {meta && (
              <Pagination
                meta={meta}
                onPageChange={setPage}
                onLimitChange={withReset(setLimit)}
              />
            )}
          </>
        )}
      </div>

      {detailId && (
        <DetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

function OutboxRow({
  row,
  idx,
  queueState,
  onOpen,
}: {
  row: EmailOutboxRow;
  idx: number;
  queueState?: EmailQueueState['state'];
  onOpen: () => void;
}) {
  const waiting =
    row.status === 'pendiente' && queueState && queueState !== 'activo'
      ? queueState === 'pausado'
        ? 'en pausa'
        : 'sale mañana'
      : null;
  return (
    <tr
      onClick={onOpen}
      className={`cursor-pointer hover:bg-[#52AF32]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
    >
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <DateCell date={row.created_at} />
      </td>
      <td className="px-4 py-3 text-sm">
        <TemplateCell template={row.template} />
      </td>
      <td className="px-4 py-3 text-sm">
        {row.recipient_name && (
          <p className="text-gray-900">{row.recipient_name}</p>
        )}
        <p className="text-gray-500 text-xs">{row.recipient_email}</p>
      </td>
      <td className="px-4 py-3 text-sm max-w-xs">
        {/* El asunto abre el detalle (también con teclado) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          title={row.subject}
          className="block max-w-full truncate text-left text-gray-800 hover:text-[#52AF32] hover:underline"
        >
          {row.subject}
        </button>
      </td>
      <td className="px-4 py-3 text-center">
        <StatusBadge status={row.status} />
        {waiting && <p className="text-xs text-gray-500 mt-1">{waiting}</p>}
        {(row.status === 'error' || row.status === 'rechazado') &&
          row.last_error && (
            <p
              className="text-xs text-gray-500 mt-1 max-w-[12rem] mx-auto truncate"
              title={row.last_error}
            >
              {row.last_error}
            </p>
          )}
      </td>
      <td className="px-4 py-3 text-center text-sm text-gray-600">
        {row.attempts}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        <DateCell
          date={row.sent_at}
          note={
            row.transport
              ? (TRANSPORT_SHORT[row.transport] ?? row.transport)
              : undefined
          }
        />
      </td>
    </tr>
  );
}

function PauseControl({
  estado,
  onChanged,
}: {
  estado: EmailQueueState;
  onChanged: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (paused: boolean) => {
    setSaving(true);
    try {
      await api.put<EmailQueueState>(
        '/correo/pausa',
        paused ? { paused, motivo: motivo.trim() || undefined } : { paused },
      );
      notify.success(
        paused ? 'Envío de correo en pausa' : 'Envío de correo reanudado',
      );
      setAsking(false);
      setMotivo('');
      onChanged();
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'No se pudo cambiar la pausa',
      );
    } finally {
      setSaving(false);
    }
  };

  if (estado.paused) {
    return (
      <button
        onClick={() => void save(false)}
        disabled={saving}
        className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50 text-sm"
      >
        {saving ? 'Reanudando...' : 'Reanudar envíos'}
      </button>
    );
  }
  if (!asking) {
    return (
      <button
        onClick={() => setAsking(true)}
        className="px-4 py-2 border border-amber-500 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors text-sm"
      >
        Pausar envíos
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={500}
        placeholder="Motivo (opcional)"
        aria-label="Motivo de la pausa"
        className={`${inputClass} w-64`}
        autoFocus
      />
      <button
        onClick={() => void save(true)}
        disabled={saving}
        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 text-sm"
      >
        {saving ? 'Pausando...' : 'Pausar'}
      </button>
      <button
        onClick={() => {
          setAsking(false);
          setMotivo('');
        }}
        disabled={saving}
        className="px-3 py-2 text-sm text-gray-600 hover:underline"
      >
        Cancelar
      </button>
    </div>
  );
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ['correo-detalle', id],
    queryFn: () => api.get<EmailOutboxDetail>(`/correo/bitacora/${id}`),
  });
  const mail = detailQuery.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fields: Array<[string, React.ReactNode]> = mail
    ? [
        ['Aviso', emailTemplateLabel(mail.template)],
        [
          'Destinatario',
          mail.recipient_name
            ? `${mail.recipient_name} <${mail.recipient_email}>`
            : mail.recipient_email,
        ],
        ['Estado', <StatusBadge key="estado" status={mail.status} />],
        ['Intentos', mail.attempts],
        ['Registrado', formatDateTime(mail.created_at)],
        ['Programado', formatDateTime(mail.scheduled_at)],
        ['Último intento', formatDateTime(mail.last_attempt_at)],
        ['Salida', formatDateTime(mail.sent_at)],
        [
          'Transporte',
          mail.transport ? (TRANSPORT_SHORT[mail.transport] ?? mail.transport) : '—',
        ],
        ['Id del proveedor', mail.provider_message_id ?? '—'],
      ]
    : [];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="correo-detalle-titulo"
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-[#424846]">
          <h2
            id="correo-detalle-titulo"
            className="text-lg font-bold text-white truncate"
          >
            {mail?.subject ?? 'Correo'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          {detailQuery.isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !mail ? (
            <p className="text-sm text-red-700">No se pudo cargar el correo</p>
          ) : (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {fields.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-gray-500 uppercase">{label}</dt>
                    <dd className="text-sm text-gray-900 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
              {mail.last_error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-red-700 uppercase">
                    Último error
                  </p>
                  <p className="text-sm text-red-800 whitespace-pre-wrap">
                    {mail.last_error}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Contenido
                </p>
                {mail.is_html ? (
                  // sandbox vacío: sin scripts ni navegación desde el correo
                  <iframe
                    title="Contenido del correo"
                    sandbox=""
                    srcDoc={mail.body}
                    className="w-full h-[420px] border border-gray-200 rounded-lg bg-white"
                  />
                ) : (
                  <pre className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                    {mail.body}
                  </pre>
                )}
              </div>
              <p className="text-xs text-gray-400 break-all">
                Llave: {mail.idempotency_key}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
