/**
 * J1 (hilo con César, 2026-10-01) — Cola y bitácora de correo. Todo aviso
 * de la plataforma (contratos, expeditación, comité, capacitación) se encola
 * y un worker lo envía con ritmo, tope diario, pausa y dominio permitido.
 */

export type EmailOutboxStatus =
  | 'pendiente'
  | 'enviando'
  | 'enviado'
  | 'simulado'
  | 'error'
  | 'rechazado';

export const EMAIL_OUTBOX_STATUSES: EmailOutboxStatus[] = [
  'pendiente',
  'enviando',
  'enviado',
  'simulado',
  'error',
  'rechazado',
];

export const EMAIL_STATUS_LABELS: Record<EmailOutboxStatus, string> = {
  pendiente: 'Pendiente',
  enviando: 'Enviando',
  enviado: 'Enviado',
  simulado: 'Simulado',
  error: 'Error',
  rechazado: 'Rechazado',
};

export const EMAIL_STATUS_CLASSES: Record<EmailOutboxStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  enviando: 'bg-blue-100 text-blue-800',
  enviado: 'bg-green-100 text-green-800',
  simulado: 'bg-gray-200 text-gray-700',
  error: 'bg-red-100 text-red-800',
  rechazado: 'bg-orange-100 text-orange-800',
};

/** Nombre del aviso para la bitácora (plantilla del backend). */
export const EMAIL_TEMPLATE_LABELS: Record<string, string> = {
  contract_digest: 'Contratos · resumen diario',
  expediting_preventiva: 'Expeditación · preventiva',
  expediting_recordatorio: 'Expeditación · recordatorio',
  expediting_critica: 'Expeditación · crítica',
  committee_turn: 'Comité · turno de aprobar',
  committee_reminder: 'Comité · recordatorio (+48 h)',
  committee_aprobado: 'Comité · aprobado',
  committee_rechazado: 'Comité · rechazado',
  evidence_reminder: 'Capacitación · recordatorio de evidencia',
  evidence_followup: 'Capacitación · seguimiento de evidencia',
  evidence_escalation: 'Capacitación · escalamiento',
};

export const emailTemplateLabel = (template: string) =>
  EMAIL_TEMPLATE_LABELS[template] ?? template;

export type EmailTransportMode = 'simulacion' | 'graph' | 'smtp';

export const EMAIL_TRANSPORT_LABELS: Record<EmailTransportMode, string> = {
  simulacion: 'Simulación (no sale correo)',
  graph: 'Microsoft Graph',
  smtp: 'SMTP (relay)',
};

export interface EmailQueueState {
  /** activo | pausado (interruptor) | tope (se alcanzó el tope del día). */
  state: 'activo' | 'pausado' | 'tope';
  paused: boolean;
  paused_reason: string | null;
  paused_at: string | null;
  paused_by: { id: string; full_name: string | null } | null;
  transport: {
    mode: EmailTransportMode;
    from: string;
    ready: boolean;
    missing: string[];
  };
  daily_cap: number;
  sent_today: number;
  min_interval_seconds: number;
  allowed_domains: string[];
  pending: number;
  errors_today: number;
  rejected_today: number;
  next_send_after: string | null;
}

export interface EmailOutboxRow {
  id: string;
  template: string;
  entity_type: string | null;
  entity_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: EmailOutboxStatus;
  attempts: number;
  last_error: string | null;
  transport: string | null;
  provider_message_id: string | null;
  created_at: string;
  scheduled_at: string;
  last_attempt_at: string | null;
  sent_at: string | null;
}

export interface EmailOutboxDetail extends EmailOutboxRow {
  idempotency_key: string;
  body: string;
  is_html: boolean;
  updated_at: string;
}

export interface EmailOutboxPage {
  data: EmailOutboxRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  templates: string[];
}
