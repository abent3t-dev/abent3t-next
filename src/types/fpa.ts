/**
 * FP&A (A3, lunes 26-oct) — contrato entre el API (/fpa/*) y el front.
 *
 * Diseño: documentation/FPA.md, sección "Diseño" (§8: pantallas y endpoints
 * del lunes). El API calcula todos los montos; el front solo los muestra.
 *
 * Montos: string decimal con 2 decimales ("2659000.00"). `null` = "No
 * disponible" (falta un parámetro de la versión: inflación, tipo de cambio o
 * tarifa de viaje). Nunca se muestra como $0.
 *
 * Meses: 1..12. Los arreglos `months_mxn` siempre traen 12 posiciones
 * (índice 0 = enero).
 */

export type Money = string | null;

export type FpaRole = 'fpa_area' | 'fpa_planeacion' | 'fpa_cfo';
export type FpaDuty = 'captura' | 'aprobacion' | 'consulta';
export type CalcMethod = 'precio_veces' | 'monto_mes' | 'viaje';
export type PriceIndex = 'precio_acordado' | 'inflacion';
export type Priority = 'contractual' | 'necesario' | 'deseable';
export type BudgetStatus =
  | 'borrador'
  | 'enviado'
  | 'aprobado_area'
  | 'aprobado_planeacion'
  | 'aprobado_cfo'
  | 'devuelto';
export type VersionKind = 'presupuesto' | 'forecast' | 'comparacion';
export type VersionStatus = 'preparacion' | 'captura' | 'cerrada';
export type TripType = 'nacional' | 'internacional';
export type SpendType = 'recurrente' | 'extraordinario' | 'inversion';
/** Agrupación del consolidado. */
export type FpaGroupBy = 'area' | 'categoria' | 'area_categoria';

export interface FpaPerson {
  id: string;
  full_name: string;
}

/** GET /fpa/contexto — para menú y botones. */
export interface FpaContext {
  /** super_admin o fpa_planeacion: administra áreas y edita cualquier presupuesto. */
  can_admin: boolean;
  /** super_admin, fpa_planeacion o fpa_cfo: ve todas las áreas. */
  sees_all: boolean;
  /** Áreas donde la persona tiene una responsabilidad vigente. */
  areas: { area_id: string; area_name: string; duties: FpaDuty[] }[];
}

export interface FpaExchangeRate {
  currency: string;
  /** Pesos por una unidad de la moneda ("20.000000"). */
  rate_mxn: string;
}

/** GET /fpa/versiones (las áreas solo ven las que están en captura o cerradas). */
export interface FpaVersion {
  id: string;
  code: string;
  name: string;
  fiscal_year: number;
  kind: VersionKind;
  status: VersionStatus;
  /** Inflación en % ("4.000"). null = FP&A no la ha fijado. */
  inflation_pct: string | null;
  cutoff_month: number | null;
  exchange_rates: FpaExchangeRate[];
}

/** GET /fpa/catalogo — categorías con sus clasificaciones y departamentos. */
export interface FpaCatalog {
  categories: {
    id: string;
    name: string;
    sort_order: number;
    classifications: { id: string; name: string; allows_negative: boolean }[];
  }[];
  departments: {
    id: string;
    name: string;
    area_id: string | null;
    cost_center: string | null;
  }[];
}

/** GET /fpa/presupuestos?version_id= — un renglón por área. */
export interface FpaBudgetSummary {
  id: string;
  version_id: string;
  area: { id: string; name: string; department_id: string | null };
  status: BudgetStatus;
  current_round: number;
  capturer: FpaPerson | null;
  approver: FpaPerson | null;
  line_count: number;
  /** null = alguna línea "No disponible". */
  total_mxn: Money;
  /** La persona puede agregar y editar líneas ahora (rol, área, estado y versión). */
  can_edit: boolean;
}

/** Lo capturado en un mes: un solo dato según la forma de cálculo. */
export interface FpaMonthInput {
  month: number;
  /** Precio × veces: veces del mes ("1", "28", "0.5"). */
  quantity?: string | null;
  /** Precio × veces: precio del mes cuando cambia (si no, el de la línea). */
  unit_price?: string | null;
  /** Monto por mes: monto del mes en la moneda de la línea. */
  amount?: string | null;
  /** Viaje: viajes en el mes. */
  trips?: number | null;
}

export interface FpaTripInput {
  trip_type: TripType;
  travelers_colaborador: number;
  travelers_director: number;
  nights: number;
  car_rental: boolean;
}

/**
 * POST /fpa/presupuestos/:id/lineas y PUT /fpa/lineas/:id.
 * OTROS: supplier_id null y supplier_name "OTROS". Viaje: currency "MXN",
 * price_index "precio_acordado", sin proveedor ni unit_price.
 */
export interface FpaLineInput {
  department_id: string;
  classification_id: string;
  concept: string;
  justification?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  priority?: Priority | null;
  calc_method: CalcMethod;
  currency: string;
  price_index: PriceIndex;
  /** Precio sin IVA (hasta 4 decimales). Solo en precio_veces. */
  unit_price?: string | null;
  trip?: FpaTripInput | null;
  /** Solo los meses con dato. */
  months: FpaMonthInput[];
  contract_label?: string | null;
  project_tag?: string | null;
  outside_ebitda?: boolean | null;
  spend_type?: SpendType | null;
}

export interface FpaMonthAmount {
  month: number;
  amount_currency: Money;
  amount_mxn: Money;
}

export interface FpaLine {
  id: string;
  /** Folio visible de la línea (L-000123). */
  folio: string;
  line_key_id: string;
  sort_order: number;
  department: { id: string; name: string };
  category: { id: string; name: string };
  classification: { id: string; name: string };
  concept: string;
  justification: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  priority: Priority | null;
  calc_method: CalcMethod;
  currency: string;
  price_index: PriceIndex;
  unit_price: string | null;
  trip: FpaTripInput | null;
  /** Lo capturado, tal cual, para editar en el modal. */
  months_input: FpaMonthInput[];
  /** Siempre 12 meses (1..12); "0.00" en los meses sin dato. */
  months: FpaMonthAmount[];
  total_currency: Money;
  total_mxn: Money;
  /** Por qué la línea sale "No disponible" (null si se pudo calcular). */
  unavailable_reason: string | null;
  contract_label: string | null;
  project_tag: string | null;
  outside_ebitda: boolean | null;
  spend_type: SpendType | null;
  source_ref: string | null;
}

export interface FpaCategoryTotal {
  category_id: string;
  category_name: string;
  months_mxn: Money[];
  total_mxn: Money;
}

/** GET /fpa/presupuestos/:id */
export interface FpaBudgetDetail extends FpaBudgetSummary {
  version: FpaVersion;
  lines: FpaLine[];
  totals: {
    months_mxn: Money[];
    total_mxn: Money;
    by_category: FpaCategoryTotal[];
  };
}

export interface FpaConsolidatedRow {
  key: string;
  label: string;
  /** En área › categoría, la categoría; si no, null. */
  sublabel: string | null;
  months_mxn: Money[];
  total_mxn: Money;
}

/**
 * GET /fpa/consolidado?version_id=&agrupar=area|categoria|area_categoria
 * GET /fpa/consolidado/export (mismos parámetros) → .xlsx
 */
export interface FpaConsolidated {
  version: FpaVersion;
  group_by: FpaGroupBy;
  rows: FpaConsolidatedRow[];
  totals: { months_mxn: Money[]; total_mxn: Money };
}

/** GET /fpa/areas (planeación y super_admin). */
export interface FpaAreaRow {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  department: { id: string; name: string } | null;
  capturer: FpaPerson | null;
  approver: FpaPerson | null;
}

/** POST /fpa/responsables — nombra al titular (revoca al anterior). */
export interface FpaAssignInput {
  area_id: string;
  duty: 'captura' | 'aprobacion';
  profile_id: string;
}

export const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const;

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado_area: 'Aprobado por el área',
  aprobado_planeacion: 'Aprobado por planeación',
  aprobado_cfo: 'Aprobado',
  devuelto: 'Devuelto',
};

export const CALC_METHOD_LABELS: Record<CalcMethod, string> = {
  precio_veces: 'Precio × veces',
  monto_mes: 'Monto por mes',
  viaje: 'Viaje',
};

export const PRICE_INDEX_LABELS: Record<PriceIndex, string> = {
  precio_acordado: 'Precio acordado',
  inflacion: 'Inflación',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  contractual: 'Contractual',
  necesario: 'Necesario',
  deseable: 'Deseable',
};

// ---------------------------------------------------------------------------
// Agregado por el front (A3, 23-oct): etiquetas de pantalla que el contrato no
// traía. No cambian ningún campo ni valor del API.
// ---------------------------------------------------------------------------

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  preparacion: 'En preparación',
  captura: 'En captura',
  cerrada: 'Cerrada',
};

export const VERSION_KIND_LABELS: Record<VersionKind, string> = {
  presupuesto: 'Presupuesto',
  forecast: 'Forecast',
  comparacion: 'Comparación',
};

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  nacional: 'Nacional',
  internacional: 'Internacional',
};

export const DUTY_LABELS: Record<FpaDuty, string> = {
  captura: 'captura',
  aprobacion: 'aprobación',
  consulta: 'consulta',
};

export const GROUP_BY_LABELS: Record<FpaGroupBy, string> = {
  area: 'Por área',
  categoria: 'Por categoría',
  area_categoria: 'Área › categoría',
};
