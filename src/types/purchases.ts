// ==========================================
// TIPOS PARA MODULO DE COMPRAS
// ==========================================

// Estados de Requisicion (segun DB enum)
export type RequisitionStatus =
  | 'en_revision'
  | 'en_aprobacion'
  | 'aprobada'
  | 'en_progreso'
  | 'cerrada'
  | 'cancelada';

// Tipo de gasto
export type ExpenseType = 'CAPEX' | 'OPEX';

// Fuente de la requisicion
export type RequisitionSource = 'manual' | 'maximo' | 'sap';

// Estados del workflow de aprobacion
export type ApprovalWorkflowStatus = 'pendiente' | 'aprobado' | 'rechazado';

// Estados de aprobacion individual
export type ApprovalStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'esperando';

// Estados de PO
export type POStatus =
  | 'borrador'
  | 'enviada'
  | 'confirmada'
  | 'en_transito'
  | 'entregada_parcial'
  | 'entregada_completa'
  | 'cancelada';

// Tipos de adquisicion
export type ProcurementType =
  | 'adjudicacion_directa'
  | 'licitacion_publica'
  | 'invitacion_restringida'
  | 'convenio_marco'
  | 'compra_consolidada';

// ==========================================
// INTERFACES
// ==========================================

// Proveedor
export interface Supplier {
  id: string;
  legal_name: string;
  commercial_name: string | null;
  tax_id: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  performance_score: number;
  is_blocked: boolean;
  blocked_reason: string | null;
  is_active: boolean;
  // Origen del registro (espejo de SAP): los basicos de source='sap' son de
  // solo lectura; puntuacion/bloqueo siguen siendo de ABENT.
  source: 'manual' | 'sap';
  external_id: string | null;
  currency: string | null;
  sap_valid: boolean | null;
  sap_frozen: boolean | null;
  created_at: string;
  updated_at: string;
}

// Desempeno del proveedor
export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  performance_score: number;
  total_orders: number;
  delivered_orders: number;
  on_time_delivery_rate: number;
  total_amount: number;
  is_blocked: boolean;
}

// Tipo de compra
export interface PurchaseType {
  id: string;
  name: string;
  key: string;
  requires_contract: boolean;
  description: string | null;
  is_active: boolean;
}

// Dia festivo
export interface Holiday {
  id: string;
  holiday_date: string;
  description: string;
  is_active: boolean;
}

// Requisicion de compra
export interface Requisition {
  id: string;
  rq_number: string;
  description: string;
  requester_id: string;
  department_id: string | null;
  buyer_id: string | null;
  status: RequisitionStatus;
  expense_type: ExpenseType;
  source: RequisitionSource;
  external_id: string | null;
  estimated_amount: number;
  justification: string | null;
  created_date: string;
  required_date: string | null;
  closed_date: string | null;
  business_days_elapsed: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  requester?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  buyer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

// Historial de cambios de requisicion
export interface RequisitionHistory {
  id: string;
  requisition_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string;
  changed_by: string;
  changed_at: string;
  changed_by_user?: {
    id: string;
    full_name: string;
  } | null;
}

// Workflow de aprobaciones
export interface ApprovalWorkflow {
  id: string;
  requisition_id: string;
  current_level: number;
  status: ApprovalWorkflowStatus;
  started_at: string;
  completed_at: string | null;
  is_active: boolean;
  approvals?: Approval[];
  level_names?: Record<number, string>;
}

// Aprobacion individual
export interface Approval {
  id: string;
  workflow_id: string;
  level: number;
  approver_id: string;
  status: ApprovalStatus;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  time_to_approve: number | null;
  is_active: boolean;
  approver?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
  workflow?: ApprovalWorkflow & {
    requisition?: Requisition;
  };
}

// Orden de compra
export interface PurchaseOrder {
  id: string;
  po_number: string;
  requisition_id: string;
  supplier_id: string;
  contract_id: string | null;
  purchase_type_id: string | null;
  expense_type: ExpenseType;
  amount: number;
  currency: string;
  expected_delivery_date: string;
  actual_delivery_date: string | null;
  status: POStatus;
  notes: string | null;
  buyer_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  requisition?: {
    id: string;
    rq_number: string;
    description: string;
    expense_type: ExpenseType;
    requester_id: string;
  } | null;
  supplier?: {
    id: string;
    legal_name: string;
    commercial_name: string | null;
    tax_id: string;
    email: string | null;
  } | null;
  buyer?: {
    id: string;
    full_name: string;
  } | null;
  purchase_type?: {
    id: string;
    name: string;
    key: string;
  } | null;
}

// ==========================================
// ESTADISTICAS
// ==========================================

// Estadisticas de requisiciones
export interface RequisitionStats {
  total: number;
  by_status: Record<RequisitionStatus, number>;
  by_type: Record<ExpenseType, number>;
  total_estimated_amount: number;
  average_business_days: number;
}

// Estadisticas de aprobaciones por nivel
export interface ApprovalStats {
  [level: number]: {
    level: number;
    level_name: string;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    approval_rate: number;
    average_time_days: number;
    approver: {
      id: string;
      full_name: string;
      role: string;
    } | null;
  };
}

// Estadisticas de POs
export interface PurchaseOrderStats {
  total: number;
  total_amount: number;
  by_status: Record<POStatus, { count: number; amount: number }>;
  by_type: Record<ExpenseType, { count: number; amount: number }>;
  by_purchase_type: Record<string, { count: number; amount: number }>;
}

// ==========================================
// FILTROS
// ==========================================

export interface RequisitionFilters {
  status?: RequisitionStatus;
  expense_type?: ExpenseType;
  buyer_id?: string;
  requester_id?: string;
  department_id?: string;
  source?: RequisitionSource;
  date_from?: string;
  date_to?: string;
}

export interface PurchaseOrderFilters {
  status?: POStatus;
  supplier_id?: string;
  purchase_type_id?: string;
  expense_type?: ExpenseType;
  date_from?: string;
  date_to?: string;
}

// ==========================================
// LABELS PARA UI
// ==========================================

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  en_revision: 'En Revisión',
  en_aprobacion: 'En Aprobación',
  aprobada: 'Aprobada',
  en_progreso: 'En Progreso',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
};

export const REQUISITION_STATUS_COLORS: Record<RequisitionStatus, string> = {
  en_revision: 'blue',
  en_aprobacion: 'yellow',
  aprobada: 'green',
  en_progreso: 'yellow',
  cerrada: 'green',
  cancelada: 'red',
};

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  confirmada: 'Confirmada',
  en_transito: 'En Tránsito',
  entregada_parcial: 'Entregada Parcial',
  entregada_completa: 'Entregada Completa',
  cancelada: 'Cancelada',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  borrador: 'gray',
  enviada: 'blue',
  confirmada: 'indigo',
  en_transito: 'yellow',
  entregada_parcial: 'orange',
  entregada_completa: 'green',
  cancelada: 'red',
};

export const PROCUREMENT_TYPE_LABELS: Record<ProcurementType, string> = {
  adjudicacion_directa: 'Adjudicacion Directa',
  licitacion_publica: 'Licitacion Publica',
  invitacion_restringida: 'Invitacion Restringida',
  convenio_marco: 'Convenio Marco',
  compra_consolidada: 'Compra Consolidada',
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  CAPEX: 'CAPEX',
  OPEX: 'OPEX',
};

export const APPROVAL_LEVEL_NAMES: Record<number, string> = {
  1: 'Nivel 1 (David)',
  2: 'Nivel 2 (Gilberto)',
  3: 'Nivel 3 (Uriel)',
  4: 'Director General',
};

// ==========================================
// INTEGRACION MAXIMO (Fase INT-5) — lectura de staging
// Fuente: GET /maximo/* (dominio) y GET /integrations/maximo/* (sync Int-3).
// Los campos son snake_case como los entrega la API; null = dato que Maximo
// no trae (historicos, decision 20.A.1: la UI muestra "—", no oculta filas).
// ==========================================

export type MaximoSyncTarget = 'purchase_orders' | 'contracts';

export interface MaximoPurchaseOrder {
  id: string;
  ponum: string;
  siteid: string | null;
  revisionnum: number | null;
  status: string | null;
  description: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  total_cost: number | null;
  currency: string | null;
  ab_ahorro: number | null;
  ab_tipocomp: string | null;
  ab_clasfpo: string | null;
  requested_by: string | null;
  /** D6 (2026-09-23): nombre según los alias de Maximo; null = sin alias (se muestra el código). */
  requested_by_name: string | null;
  department: string | null;
  approved_at: string | null;
  /** Usuario Maximo que aprobó (sprint 2026-09-22, B3); null si no aplica. */
  approved_by: string | null;
  approved_by_name: string | null;
  /** Primer WAPPR; approved_at − waiting_approval_at = días de aprobación. */
  waiting_approval_at: string | null;
  created_at_source: string | null;
  last_changed_at: string | null;
  last_seen_at: string;
  raw?: unknown; // solo llega en el detalle para PURCHASE_ADMINS
}

export interface MaximoRevision {
  id: string;
  revisionnum: number | null;
  siteid: string | null;
  status: string | null;
  rowstamp: string | null;
  last_changed_at: string | null;
  last_seen_at: string;
}

export interface MaximoPurchaseOrderDetail {
  current: MaximoPurchaseOrder;
  revisions: MaximoRevision[];
}

export interface MaximoContract {
  id: string;
  prnum: string | null;
  contractnum: string | null;
  revisionnum: number | null;
  status: string | null;
  maxvol: number | null;
  total_cost: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  department: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  created_at_source: string | null;
  contract_ref_num: string | null;
  contract_value: number | null;
  /** D7: monto de la PR; null = la Object Structure no lo expone ("No disponible"). */
  pr_total: number | null;
  /** D8: consumido del contrato; null = no expuesto por la OS. */
  consumed_value: number | null;
  /** D8: valor − consumido; null si falta alguno (nunca 0). */
  balance_value: number | null;
  purchview_count: number;
  has_contract: boolean;
  last_changed_at: string | null;
  last_seen_at: string;
  raw?: unknown;
}

export interface MaximoContractRevision {
  id: string;
  contractnum: string | null;
  revisionnum: number | null;
  status: string | null;
  pr_rowstamp: string | null;
  contract_rowstamp: string | null;
  last_changed_at: string | null;
  last_seen_at: string;
}

export interface MaximoContractLine {
  lineNum: number | null;
  itemNum: string | null;
  description: string | null;
  quantity: number | null;
  unitCost: number | null;
}

export interface MaximoContractStatusEntry {
  status: string | null;
  changedAt: string | null;
}

export interface MaximoContractDetail {
  current: MaximoContract;
  revisions: MaximoContractRevision[];
  lines: MaximoContractLine[];
  statusHistory: MaximoContractStatusEntry[];
}

export interface MaximoStatusCount {
  status: string | null;
  count: number;
}

export interface MaximoSyncRun {
  id: string;
  target: MaximoSyncTarget;
  triggered_by: 'cron' | 'manual' | 'seed';
  triggered_by_user_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  pages_total: number | null;
  pages_ok: number;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_unchanged: number;
  records_failed: number;
  filter_warnings: unknown;
  error_summary: string | null;
  mapper_version: string;
}

export interface MaximoSyncStatus {
  enabled: boolean;
  contractsEnabled: boolean;
  intervalMinutes: number;
  pageSize: number;
  running: MaximoSyncTarget[];
  lastRuns: Record<MaximoSyncTarget, MaximoSyncRun | null>;
  counts: Record<MaximoSyncTarget, number>;
}

export interface MaximoSummaryLastRun {
  status: string;
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  records_inserted: number;
  records_updated: number;
  records_unchanged: number;
  records_failed: number;
}

export interface MaximoSummary {
  syncEnabled: boolean;
  /** D4: año aplicado (null = todo). */
  year: number | null;
  purchaseOrders: { total: number; byStatus: MaximoStatusCount[] };
  contracts: {
    total: number;
    withContract: number;
    byStatus: MaximoStatusCount[];
  };
  lastSync: Record<MaximoSyncTarget, MaximoSummaryLastRun | null>;
}

// Estatus de Maximo: vocabulario libre de la fuente — se muestran tal cual,
// solo se colorean los conocidos (clases completas, patron de platforms.ts).
export const MAXIMO_STATUS_BADGE_CLASSES: Record<string, string> = {
  APPR: 'bg-green-100 text-green-800',
  CLOSE: 'bg-gray-200 text-gray-700',
  COMP: 'bg-green-100 text-green-800',
  WAPPR: 'bg-yellow-100 text-yellow-800',
  PNDREV: 'bg-yellow-100 text-yellow-800',
  REVISD: 'bg-blue-100 text-blue-800',
  INPRG: 'bg-blue-100 text-blue-800',
  CAN: 'bg-red-100 text-red-800',
  CANCEL: 'bg-red-100 text-red-800',
};

/** Etiquetas en español de los estatus conocidos de Maximo (A2). */
export const MAXIMO_STATUS_LABELS: Record<string, string> = {
  APPR: 'Aprobada',
  WAPPR: 'En espera de aprobación',
  PNDREV: 'Pendiente de revisión',
  REVISD: 'Revisada',
  INPRG: 'En progreso',
  COMP: 'Completada',
  CLOSE: 'Cerrada',
  CAN: 'Cancelada',
  CANCEL: 'Cancelada',
  DRAFT: 'Borrador',
};

/**
 * D2 (2026-09-23): las PR de Maximo sin contrato no traen estatus porque la
 * Object Structure AB_CONTRATOS no expone el de la PR (pendiente CIISA) —
 * no es un error de la plataforma, por eso se nombra explícitamente.
 */
export const MAXIMO_NO_STATUS_LABEL = 'Sin estatus en Maximo';
export const MAXIMO_NO_STATUS_HINT =
  'La Object Structure de Maximo (AB_CONTRATOS) no expone el estatus de la solicitud sin contrato; pedido a CIISA. Las pendientes (WAPPR/PNDREV) sí cuentan.';

export function maximoStatusLabel(status: string | null): string {
  return (status && MAXIMO_STATUS_LABELS[status]) || (status ?? MAXIMO_NO_STATUS_LABEL);
}

/** Colores de gráfica por estatus (mismo criterio que los badges). */
export const MAXIMO_STATUS_CHART_COLORS: Record<string, string> = {
  APPR: '#52AF32',
  COMP: '#2f7d1c',
  WAPPR: '#f59e0b',
  PNDREV: '#DFA922',
  REVISD: '#3b82f6',
  INPRG: '#222D59',
  CLOSE: '#9ca3af',
  CAN: '#ef4444',
  CANCEL: '#ef4444',
  DRAFT: '#a78bfa',
};

export const SAP_STATUS_CHART_COLORS: Record<string, string> = {
  open: '#52AF32',
  bost_Open: '#52AF32',
  close: '#9ca3af',
  bost_Close: '#9ca3af',
  cancelled: '#ef4444',
};

/** Estatus nulo o desconocido: gris pizarra, distinto de "Cerrada". */
export const UNKNOWN_STATUS_CHART_COLOR = '#475569';

const EXTRA_CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

/**
 * Un color por estatus: el fijo si se conoce, gris pizarra si es nulo y, para
 * estatus nuevos, uno de reserva que no repita un color ya usado en la gráfica.
 */
export function statusChartColors(
  statuses: Array<string | null>,
  known: Record<string, string>,
): string[] {
  const used = new Set<string>();
  const fixed = statuses.map((s) => {
    const color = s === null ? UNKNOWN_STATUS_CHART_COLOR : known[s];
    if (color) used.add(color);
    return color;
  });
  const spare = EXTRA_CHART_COLORS.filter((c) => !used.has(c));
  let next = 0;
  return fixed.map((c) => c ?? spare[next++ % spare.length] ?? UNKNOWN_STATUS_CHART_COLOR);
}

export function maximoStatusBadgeClass(status: string | null): string {
  return (
    (status && MAXIMO_STATUS_BADGE_CLASSES[status]) ||
    'bg-gray-100 text-gray-800'
  );
}

export const MAXIMO_RUN_STATUS_LABELS: Record<MaximoSyncRun['status'], string> = {
  running: 'En curso',
  success: 'Exitosa',
  partial: 'Parcial',
  failed: 'Fallida',
};

export const MAXIMO_RUN_STATUS_CLASSES: Record<MaximoSyncRun['status'], string> = {
  running: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  partial: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

export const MAXIMO_TARGET_LABELS: Record<MaximoSyncTarget, string> = {
  purchase_orders: 'Órdenes (PO)',
  contracts: 'Contratos',
};

export const MAXIMO_TRIGGER_LABELS: Record<MaximoSyncRun['triggered_by'], string> = {
  cron: 'Automático',
  manual: 'Manual',
  seed: 'Carga inicial (dev)',
};

// ==========================================
// GESTION DE CONTRATOS (§15) — repositorio documental
// NO confundir con MaximoContract (staging de solo lectura): son dos mundos
// separados sin vinculo (regla 1 de la fase §15).
// ==========================================

export type ContractDocumentType =
  | 'contrato'
  | 'addenda'
  | 'convenio'
  | 'carta_compromiso'
  | 'otro';

export type ContractStatus = 'vigente' | 'vencido' | 'renovado' | 'cancelado';

export interface ContractDocument {
  id: string;
  contract_id: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  version: number;
  is_current: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  // storage_key NUNCA viaja al cliente (la descarga es por signed URL)
}

export interface Contract {
  id: string;
  contract_number: string;
  tomo: string | null;
  document_type: ContractDocumentType;
  service_description: string;
  supplier_id: string;
  start_date: string;
  end_date: string;
  total_amount: number | null;
  /** Consumido capturado por Compras (B4); null = "No disponible". */
  consumed_amount: number | null;
  /** total − consumido, calculado en backend; null si falta cualquiera. */
  balance_amount: number | null;
  /** Expediente en SharePoint (lo cargan ellos). */
  external_link: string | null;
  currency: string | null;
  buyer_profile_id: string | null;
  responsible_user_email: string | null;
  responsible_user_name: string | null;
  status: ContractStatus;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier?: { id: string; legal_name: string; tax_id: string } | null;
  buyer?: { id: string; full_name: string; email: string } | null;
  documents?: ContractDocument[];
}

export interface ContractFilters {
  status?: ContractStatus;
  supplier_id?: string;
  vence_en_dias?: number;
  search?: string;
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  vigente: 'Vigente',
  vencido: 'Vencido',
  renovado: 'Renovado',
  cancelado: 'Cancelado',
};

export const CONTRACT_STATUS_CLASSES: Record<ContractStatus, string> = {
  vigente: 'bg-green-100 text-green-800',
  vencido: 'bg-red-100 text-red-800',
  renovado: 'bg-blue-100 text-blue-800',
  cancelado: 'bg-gray-200 text-gray-700',
};

export const CONTRACT_DOCUMENT_TYPE_LABELS: Record<ContractDocumentType, string> = {
  contrato: 'Contrato',
  addenda: 'Addenda',
  convenio: 'Convenio',
  carta_compromiso: 'Carta compromiso',
  otro: 'Otro',
};

// ==========================================
// COMITE DE COMPRAS (§16) — workflow secuencial data-driven
// La cadena vive en committee_approval_levels (backend); el mapeo esta
// PENDIENTE de confirmar con Ingrid (§20.A.5): la UI muestra un aviso a
// PURCHASE_ADMINS mientras exista algun nivel confirmed=false.
// ==========================================

export type CommitteeStatus =
  | 'borrador'
  | 'en_aprobacion'
  | 'aprobado'
  | 'rechazado'
  | 'cancelado';

export interface PurchaseCommittee {
  id: string;
  committee_number: string;
  committee_date: string;
  title: string;
  description: string | null;
  status: CommitteeStatus;
  current_version: number;
  current_approver_level: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  total_elapsed_hours: number | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean;
  author: { id: string; full_name: string | null; email: string } | null;
  current_level: { orden: number; role: string } | null;
  is_my_turn: boolean;
}

export interface CommitteeVersion {
  id: string;
  committee_id: string;
  version: number;
  file_name: string | null;
  external_link: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
}

export interface CommitteeApproval {
  id: string;
  version: number;
  approver_level: number;
  approver: { id: string; full_name: string | null } | null;
  approver_role: string;
  action: 'aprobado' | 'rechazado';
  justification: string | null;
  action_at: string | null;
  elapsed_hours_since_assigned: number | null;
}

export interface CommitteeLevelInfo {
  orden: number;
  role: string;
  has_specific_user: boolean;
  confirmed: boolean;
}

export interface CommitteeDetail extends PurchaseCommittee {
  versions: CommitteeVersion[];
  approvals: CommitteeApproval[];
  levels: CommitteeLevelInfo[];
}

export interface CommitteeApprovalLevel {
  id: string;
  orden: number;
  role: string;
  profile_id: string | null;
  confirmed: boolean;
  is_active: boolean;
  notes: string | null;
}

export const COMMITTEE_STATUS_LABELS: Record<CommitteeStatus, string> = {
  borrador: 'Borrador',
  en_aprobacion: 'En aprobacion',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export const COMMITTEE_STATUS_CLASSES: Record<CommitteeStatus, string> = {
  borrador: 'bg-gray-200 text-gray-700',
  en_aprobacion: 'bg-blue-100 text-blue-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-500',
};

// ==========================================
// EXPEDITACION — seguimiento de entregas de POs PROPIAS
// (las POs de Maximo son de solo lectura y no se expeditan desde ABENT).
// El estatus es DERIVADO de fechas + capturas; umbrales T9: riesgo <= 15
// dias naturales, critica desde 7 dias de vencida.
// ==========================================

export type DeliveryStatus =
  | 'sin_fecha'
  | 'en_tiempo'
  | 'en_riesgo'
  | 'retrasada'
  | 'parcial'
  | 'entregada';

export type ExpeditingSource = 'abent' | 'sap' | 'maximo';

export const EXPEDITING_SOURCE_LABELS: Record<ExpeditingSource, string> = {
  abent: 'ABENT',
  sap: 'SAP',
  maximo: 'Maximo',
};

export interface ExpeditingItem {
  /** null = OC de un ERP (solo lectura, sin acciones ni detalle). */
  purchase_order_id: string | null;
  source: ExpeditingSource;
  external_key: string;
  po_number: string;
  po_status: string | null;
  currency: string | null;
  requested_by: string | null;
  /** D1: OC de SAP que nació en Maximo (se muestra una sola vez, con este badge). */
  maximo_ponum: string | null;
  supplier: { id: string | null; legal_name: string; email: string | null } | null;
  buyer: { id: string; full_name: string | null; email: string } | null;
  requisition: { id: string; rq_number: string } | null;
  amount: number | null;
  expected_delivery_date: string | null;
  effective_expected_date: string | null;
  actual_delivery_date: string | null;
  delivery_status: DeliveryStatus;
  days_left: number | null;
  tracking: {
    id: string;
    current_status: string;
    alert_count: number;
    last_alert_sent: string | null;
    notes: string | null;
  } | null;
}

export interface DeliveryTrackingEvent {
  id: string;
  event_type:
    | 'seguimiento'
    | 'reprogramacion'
    | 'recepcion_parcial'
    | 'recepcion_total';
  comment: string | null;
  previous_expected_date: string | null;
  new_expected_date: string | null;
  received_date: string | null;
  quantity: number | null;
  created_by_name: string | null;
  created_at: string | null;
}

export interface ExpeditingAlert {
  id: string;
  alert_type: string;
  alert_date: string;
  sent_to: string[];
  sent_at: string | null;
}

export interface ExpeditingDetail extends ExpeditingItem {
  events: DeliveryTrackingEvent[];
  alerts: ExpeditingAlert[];
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  sin_fecha: 'Sin fecha',
  en_tiempo: 'En tiempo',
  en_riesgo: 'En riesgo',
  retrasada: 'Retrasada',
  parcial: 'Parcial',
  entregada: 'Entregada',
};

export const DELIVERY_STATUS_CLASSES: Record<DeliveryStatus, string> = {
  sin_fecha: 'bg-gray-100 text-gray-500',
  en_tiempo: 'bg-green-100 text-green-800',
  en_riesgo: 'bg-amber-100 text-amber-800',
  retrasada: 'bg-red-100 text-red-800',
  parcial: 'bg-orange-100 text-orange-800',
  entregada: 'bg-gray-200 text-gray-700',
};

export const DELIVERY_EVENT_LABELS: Record<
  DeliveryTrackingEvent['event_type'],
  string
> = {
  seguimiento: 'Seguimiento',
  reprogramacion: 'Reprogramacion',
  recepcion_parcial: 'Recepcion parcial',
  recepcion_total: 'Recepcion total',
};

/**
 * Chip aproximado para tablas que solo tienen la PO (sin tracking): misma
 * regla base del backend sobre las fechas de la orden. El dato exacto (con
 * reprogramaciones) lo da GET /compras/expeditacion.
 */
export function deriveDeliveryChip(po: {
  status: POStatus;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
}): DeliveryStatus {
  if (po.status === 'entregada_completa' || po.actual_delivery_date) {
    return 'entregada';
  }
  if (po.status === 'entregada_parcial') return 'parcial';
  if (!po.expected_delivery_date) return 'sin_fecha';
  const daysLeft = Math.round(
    (new Date(po.expected_delivery_date).getTime() - Date.now()) / 86_400_000,
  );
  if (daysLeft < 0) return 'retrasada';
  if (daysLeft <= 15) return 'en_riesgo';
  return 'en_tiempo';
}

// ==========================================
// INTEGRACION SAP B1 (Fase INT-4) — lectura de staging
// Fuente: GET /sap/* (dominio) y GET /integrations/sap/* (sync).
// null en clasificacion/proceso/ahorro = SIN CAPTURAR en el ERP (la captura
// arranco el 2026-09-15 y es incremental): la UI muestra "No disponible",
// nunca 0 ni el placeholder "SELECCIONAR" (T10 / regla 6).
// ==========================================

export type SapSyncTarget =
  | 'purchase_orders'
  | 'purchase_requests'
  | 'business_partners'
  | 'approval_requests';

export type SapDocStatusKey = 'open' | 'close' | 'cancelled';

export interface SapPurchaseOrder {
  id: string;
  doc_entry: number;
  doc_num: number | null;
  doc_date: string | null;
  doc_due_date: string | null;
  update_date_source: string | null;
  document_status: string | null;
  /** Estatus DERIVADO (A6): cancelled manda sobre bost_Close. null = sin re-sync. */
  status_key: SapDocStatusKey | null;
  cancelled: boolean | null;
  authorization_status: string | null;
  closing_date: string | null;
  comments: string | null;
  card_code: string | null;
  card_name: string | null;
  /** Total con IVA en la moneda del documento. */
  doc_total: number | null;
  currency: string | null;
  lines_total: number;
  lines_classified: number;
  ahorro_total: number | null;
  /**
   * Saldo disponible: lo que falta por recibir/facturar, con IVA y en la
   * moneda del documento. null = sin calcular (sync previo).
   */
  open_total: number | null;
  /** Usuario de SAP que capturó la OC (UserSign). */
  user_sign: number | null;
  created_by_name: string | null;
  /** PONUM de Maximo si la OC la creó la integración Maximo → SAP. */
  maximo_ponum: string | null;
  /** D1: la OC migrada existe en el staging de Maximo (se cuenta una vez en los totales). */
  maximo_po_exists: boolean;
  /** Solicitante en Maximo (REQUESTEDBY de su PR; nombre si hay alias, D6). */
  maximo_requested_by: string | null;
  base_request_entries: number[];
  /** Solicitantes de las solicitudes de las que nació la OC (vacío = sin solicitud). */
  requester_names: string[];
  last_changed_at: string | null;
  last_seen_at: string;
}

export interface SapPurchaseRequest {
  id: string;
  doc_entry: number;
  doc_num: number | null;
  doc_date: string | null;
  doc_due_date: string | null;
  required_date: string | null;
  update_date_source: string | null;
  document_status: string | null;
  status_key: SapDocStatusKey | null;
  cancelled: boolean | null;
  authorization_status: string | null;
  closing_date: string | null;
  comments: string | null;
  requester: string | null;
  requester_name: string | null;
  doc_total: number | null;
  currency: string | null;
  lines_total: number;
  lines_classified: number;
  ahorro_total: number | null;
  last_changed_at: string | null;
  last_seen_at: string;
}

export interface SapDocumentLine {
  lineNum: number | null;
  itemCode: string | null;
  itemDescription: string | null;
  /** Sin IVA, en la moneda del documento. */
  lineTotal: number | null;
  currency: string | null;
  quantity: number | null;
  /** Cantidad aún no recibida/facturada. */
  openQuantity: number | null;
  lineStatus: 'open' | 'close' | null;
  /** Pendiente de la línea con IVA; 0 si está cerrada, null si no se sabe. */
  openTotal: number | null;
  clasGts: string | null;
  impAhorro: number | null;
  procComp: string | null;
}

export interface SapPurchaseOrderDetail {
  document: SapPurchaseOrder;
  lines: SapDocumentLine[];
  raw?: unknown; // solo llega para PURCHASE_ADMINS
}

export interface SapPurchaseRequestDetail {
  document: SapPurchaseRequest;
  lines: SapDocumentLine[];
  raw?: unknown;
}

export interface SapStatusCount {
  status: string | null;
  count: number;
}

export interface SapSyncRun {
  id: string;
  target: SapSyncTarget;
  triggered_by: 'cron' | 'manual';
  triggered_by_user_id: string | null;
  mode: 'full' | 'incremental';
  since_filter: string | null;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  pages_total: number | null;
  pages_ok: number;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_unchanged: number;
  records_failed: number;
  error_summary: string | null;
  mapper_version: string;
}

export interface SapSyncStatus {
  enabled: boolean;
  intervalMinutes: number;
  pageSize: number;
  running: SapSyncTarget[];
  lastRuns: Record<SapSyncTarget, SapSyncRun | null>;
  counts: Record<SapSyncTarget, number>;
}

export interface SapSummaryLastRun {
  status: string;
  triggered_by: string;
  mode: string;
  started_at: string;
  finished_at: string | null;
  records_inserted: number;
  records_updated: number;
  records_unchanged: number;
  records_failed: number;
}

export interface CurrencyAmount {
  currency: string | null;
  total: number;
  count: number;
}

export interface SapEntitySummary {
  total: number;
  /** Conteo por estatus DERIVADO: 'open' | 'close' | 'cancelled'. */
  byStatus: SapStatusCount[];
  montoTotal: number;
  /** Montos por moneda (nunca sumados entre monedas). */
  montoPorMoneda: CurrencyAmount[];
  /** Abiertas no canceladas ("por recibir"). */
  abiertas: { count: number; montoPorMoneda: CurrencyAmount[] };
  linesTotal: number;
  linesClassified: number;
  docsConAhorro: number;
  /** null = sin base ("No disponible"), nunca 0. */
  diasPromedioGestion: number | null;
}

export interface SapSummary {
  syncEnabled: boolean;
  /** D4: año aplicado (null = todo). */
  year: number | null;
  /** D1: OC creadas desde Maximo (NumAtCard = PONUM) y cuántas existen allá. */
  migradas: { total: number; en_maximo: number };
  purchaseOrders: SapEntitySummary;
  purchaseRequests: SapEntitySummary;
  approvalRequests: { total: number; pending: number };
  lastSync: {
    purchase_orders: SapSummaryLastRun | null;
    purchase_requests: SapSummaryLastRun | null;
    approval_requests: SapSummaryLastRun | null;
  };
}

// ── Cola de autorización de SAP (B5) — solo lectura ─────────────────────
export interface SapApprovalLine {
  stage_code: number | null;
  stage_name: string | null;
  user_id: number | null;
  user_name: string | null;
  status: string | null; // ardPending | ardApproved | ardNotApproved
  update_date: string | null;
}

export interface SapApprovalRequest {
  id: string;
  code: number;
  template_name: string | null;
  object_type: string | null;
  document_kind: 'purchase_order' | 'purchase_request' | 'other';
  is_draft: boolean | null;
  draft_entry: number | null;
  object_entry: number | null;
  status: string | null; // arsPending | arsApproved | arsNotApproved | arsGenerated
  remarks: string | null;
  current_stage_name: string | null;
  originator_name: string | null;
  creation_date: string | null;
  days_waiting: number | null;
  doc_num: number | null;
  doc_date: string | null;
  doc_total: number | null;
  currency: string | null;
  card_name: string | null;
  requester_name: string | null;
  approvers: SapApprovalLine[];
}

export const SAP_APPROVAL_STATUS_LABELS: Record<string, string> = {
  arsPending: 'Pendiente',
  arsApproved: 'Autorizada',
  arsNotApproved: 'Rechazada',
  arsGenerated: 'Generada',
};

export const SAP_APPROVAL_STATUS_CLASSES: Record<string, string> = {
  arsPending: 'bg-yellow-100 text-yellow-800',
  arsApproved: 'bg-green-100 text-green-800',
  arsNotApproved: 'bg-red-100 text-red-800',
  arsGenerated: 'bg-blue-100 text-blue-800',
};

export const SAP_APPROVAL_LINE_LABELS: Record<string, string> = {
  ardPending: 'Pendiente',
  ardApproved: 'Autorizó',
  ardNotApproved: 'Rechazó',
};

// ── Resumen del dashboard (A1) — GET /compras/dashboard/summary ─────────
export interface DashboardSourceCount {
  total: number;
  pendientes: number;
}
export interface DashboardSourceOrders {
  count: number;
  monto_por_moneda: CurrencyAmount[];
}
export interface DashboardSummary {
  /** D4: año aplicado (null = todo). */
  anio: number | null;
  solicitudes: {
    total: number;
    pendientes: number;
    por_fuente: { sap: DashboardSourceCount; maximo: DashboardSourceCount; abent: DashboardSourceCount };
  };
  dias_gestion: {
    sap_solicitudes: number | null;
    sap_ordenes: number | null;
    maximo_ordenes: number | null;
    abent_requisiciones: number | null;
  };
  /** D3: base del promedio de SAP OC (N visible). */
  dias_gestion_base: {
    sap_ordenes: { total: number; descartadas: number; definicion: string };
  };
  ordenes: {
    total: number;
    monto_por_moneda: CurrencyAmount[];
    por_fuente: { sap: DashboardSourceOrders; maximo: DashboardSourceOrders; abent: DashboardSourceOrders };
    /** D1: OC de SAP creadas desde Maximo; `en_maximo` = descontadas del total. */
    migradas: { total: number; en_maximo: number };
  };
  por_recibir: {
    total: number;
    monto_por_moneda: CurrencyAmount[];
    por_fuente: { sap: DashboardSourceOrders; maximo: DashboardSourceOrders; abent: DashboardSourceOrders };
  };
  /** D4: desde cuándo hay datos y última sincronización exitosa. */
  datos: {
    sap_desde: string | null;
    maximo_desde: string | null;
    ultima_sync: { sap: string | null; maximo: string | null };
    anios: number[];
  };
  fuentes: { sap_sync_enabled: boolean; maximo_sync_enabled: boolean };
  generated_at: string;
}

/** D5 — GET /compras/dashboard/ordenes-kpis: ahorro acumulado y CAPEX/OPEX. */
export interface OrdersKpiSource {
  documentos: number;
  por_moneda: CurrencyAmount[];
}
export interface OrdersKpis {
  anio: number | null;
  ahorro: {
    disponible: boolean;
    documentos: number;
    por_moneda: CurrencyAmount[];
    por_fuente: { sap: OrdersKpiSource; maximo: OrdersKpiSource };
    nota: string;
  };
  clasificacion: {
    disponible: boolean;
    capex: { por_moneda: CurrencyAmount[]; documentos: number; por_fuente: { sap: OrdersKpiSource; maximo: OrdersKpiSource } };
    opex: { por_moneda: CurrencyAmount[]; documentos: number; por_fuente: { sap: OrdersKpiSource; maximo: OrdersKpiSource } };
    nota: string;
  };
  generated_at: string;
}

/** D6 — equivalencias de usuarios de SAP/Maximo (/compras/erp-aliases). */
export type ErpAliasSystem = 'sap' | 'maximo';
export interface ErpAlias {
  id: string;
  system: ErpAliasSystem;
  code: string;
  display_name: string;
  profile_id: string | null;
  profile: { full_name: string | null; email: string } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export const ERP_ALIAS_SYSTEM_LABELS: Record<ErpAliasSystem, string> = {
  sap: 'SAP',
  maximo: 'Maximo',
};

/** GET /compras/reportes/tiempos-aprobacion */
export interface ApprovalTimesReport {
  maximo: {
    ordenes: { promedio_dias: number | null; total: number };
    /** `aprobador` = nombre (alias D6) o el usuario de Maximo; `usuario` = código. */
    ordenes_por_aprobador: Array<{ aprobador: string; usuario: string | null; promedio_dias: number; total: number }>;
    contratos: { promedio_dias: number | null; total: number };
  };
  sap: {
    /** D3: gestión de OC = fecha de la OC − fecha de su solicitud de pedido. */
    gestion_oc: { promedio_dias: number | null; total: number; descartadas: number; definicion: string };
    solicitudes_autorizadas: { promedio_dias: number | null; total: number };
    por_aprobador: Array<{ aprobador: string; usuario: string | null; promedio_dias: number; total: number }>;
    pendientes: { total: number; dias_esperando_promedio: number | null };
    pendientes_por_aprobador: Array<{
      aprobador: string;
      usuario: string | null;
      pendientes: number;
      dias_esperando_max: number | null;
      dias_esperando_promedio: number | null;
    }>;
  };
  maximo_pendientes: {
    total: number;
    dias_esperando_max: number | null;
    dias_esperando_promedio: number | null;
  };
  /** D6: `erp_usuarios` = usuarios SAP/Maximo ligados a los perfiles del nivel; `sap_pendientes` = autorizaciones que tienen en SAP. */
  abent_niveles: Array<{
    level: number;
    role: string;
    aprobadores: string[];
    erp_usuarios: Array<{ system: ErpAliasSystem; code: string }>;
    sap_pendientes: number;
  }>;
}

// Estatus de documento de SAP (bost_*): etiquetas y colores conocidos;
// cualquier otro valor se muestra tal cual con badge neutro.
export const SAP_STATUS_LABELS: Record<string, string> = {
  bost_Open: 'Abierta',
  bost_Close: 'Cerrada',
  // Estatus DERIVADOS (A6): cancelled manda sobre bost_Close
  open: 'Abierta',
  close: 'Cerrada',
  cancelled: 'Cancelada',
};

export const SAP_STATUS_BADGE_CLASSES: Record<string, string> = {
  bost_Open: 'bg-green-100 text-green-800',
  bost_Close: 'bg-gray-200 text-gray-700',
  open: 'bg-green-100 text-green-800',
  close: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};

/** Opciones del filtro multi-estatus de SAP (A5/A6). */
export const SAP_STATUS_OPTIONS: Array<{ value: SapDocStatusKey; label: string }> = [
  { value: 'open', label: 'Abierta' },
  { value: 'close', label: 'Cerrada' },
  { value: 'cancelled', label: 'Cancelada' },
];

export function sapStatusLabel(status: string | null): string {
  return (status && SAP_STATUS_LABELS[status]) || (status ?? 'Sin estatus');
}

export function sapStatusBadgeClass(status: string | null): string {
  return (
    (status && SAP_STATUS_BADGE_CLASSES[status]) || 'bg-gray-100 text-gray-800'
  );
}

/** Estatus a mostrar de un documento SAP: el derivado si ya se sincronizó. */
export function sapDocStatus(doc: {
  status_key: SapDocStatusKey | null;
  document_status: string | null;
}): string | null {
  return doc.status_key ?? doc.document_status;
}

export const SAP_TARGET_LABELS: Record<SapSyncTarget, string> = {
  purchase_orders: 'Órdenes (OC)',
  purchase_requests: 'Solicitudes de Pedido',
  business_partners: 'Proveedores',
  approval_requests: 'Cola de autorización',
};

export const SAP_RUN_MODE_LABELS: Record<SapSyncRun['mode'], string> = {
  full: 'Completa',
  incremental: 'Incremental',
};
