'use client';

import { useId, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { notify } from '@/lib/notifications';
import SupplierCombobox, { type SupplierOption } from '@/components/compras/SupplierCombobox';
import { fpaKeys } from '@/hooks/useFpa';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  CALC_METHOD_LABELS,
  MONTH_LABELS,
  PRICE_INDEX_LABELS,
  PRIORITY_LABELS,
  TRIP_TYPE_LABELS,
  type CalcMethod,
  type FpaBudgetDetail,
  type FpaCalcInput,
  type FpaCalcResult,
  type FpaCatalog,
  type FpaLine,
  type FpaLineInput,
  type FpaMonthInput,
  type FpaTripInput,
  type PriceIndex,
  type Priority,
  type TripType,
} from '@/types/fpa';
import {
  MONTH_NAMES,
  NO_DISPONIBLE,
  centsToDecimal,
  formatInflation,
  formatPesos,
  formatRate,
  formatWithCurrency,
  moneyToCents,
  parseDecimal,
  spreadCents,
  trimDecimal,
} from '@/lib/fpa-format';
import FpaModal from './FpaModal';
import LineAmounts, { type LineAmountsData } from './LineAmounts';
import TripBreakdownTable from './TripBreakdownTable';

/**
 * FP&A (A3) — alta, edición y consulta de una línea del presupuesto.
 *
 * - Forma de cálculo, moneda e índice son obligatorios y sin valor por
 *   omisión (reunión, 35:00: "que el sistema pregunte todo de entrada").
 * - Precio × veces, monto por mes o viaje. Se mandan solo los meses con dato.
 * - Proveedor del catálogo (SupplierCombobox) u OTROS; la base exige
 *   proveedor en todo gasto que no es viaje. Los viajes van en pesos, con
 *   precio acordado y sin proveedor.
 * - El front no calcula montos. Mientras se captura, el API calcula la vista
 *   previa con los parámetros de la versión (POST /fpa/calcular, B1): los
 *   meses, el total y, en un viaje, su desglose; al guardar vuelve a
 *   calcular. "Repartir un total" solo llena las casillas de monto por mes.
 * - Valida lo mínimo (obligatorios y números como los acepta la base); el
 *   resto lo valida el API y aquí se muestra su mensaje.
 */

interface LineModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: FpaBudgetDetail;
  /** null = alta de una línea nueva. */
  line: FpaLine | null;
  /** can_edit del presupuesto; sin permiso, el modal es de solo lectura. */
  canEdit: boolean;
  catalog: FpaCatalog | undefined;
  /** Mensaje si el catálogo no cargó (sin él no se puede editar). */
  catalogError: string | null;
}

export default function LineModal(props: LineModalProps) {
  if (!props.isOpen) return null;
  if (!props.canEdit) {
    return props.line ? <LineReadOnlyModal line={props.line} budget={props.budget} onClose={props.onClose} /> : null;
  }
  if (!props.catalog) {
    return (
      <FpaModal title={props.line ? `Línea ${props.line.folio}` : 'Nueva línea'} onClose={props.onClose}>
        <div className="flex-1 px-6 py-10 text-center">
          {props.catalogError ? (
            <p className="text-sm text-red-600">No se pudo cargar el catálogo: {props.catalogError}</p>
          ) : (
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          )}
        </div>
      </FpaModal>
    );
  }
  // key: al cambiar de línea se remonta el formulario y su estado sale de props
  return <LineFormModal key={props.line?.id ?? 'nueva'} {...props} catalog={props.catalog} />;
}

// ── Piezas comunes ──────────────────────────────────────────────────────────

function Field({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 md:col-span-3' : undefined}>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <div className="text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

function tripText(line: FpaLine): string {
  if (!line.trip) return '—';
  const t = line.trip;
  return [
    TRIP_TYPE_LABELS[t.trip_type] ?? t.trip_type,
    `${t.travelers_colaborador} ${t.travelers_colaborador === 1 ? 'colaborador' : 'colaboradores'}`,
    `${t.travelers_director} ${t.travelers_director === 1 ? 'director' : 'directores'}`,
    `${t.nights} ${t.nights === 1 ? 'noche' : 'noches'}`,
    t.car_rental ? 'con renta de vehículo' : 'sin renta de vehículo',
  ].join(' · ');
}

const priceText = (value: string) =>
  Number.isFinite(Number(value))
    ? Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    : value;

/** Total de la línea (lo calculó el API) y, si no se pudo, por qué. */
function LineTotal({ line }: { line: LineAmountsData }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      <p className="text-sm text-gray-600">
        Total en pesos:{' '}
        {line.total_mxn === null ? (
          <span className="font-semibold text-amber-700">{NO_DISPONIBLE}</span>
        ) : (
          <span className="text-lg font-bold text-[#222D59] tabular-nums">{formatPesos(line.total_mxn, true)}</span>
        )}
      </p>
      {line.currency !== 'MXN' && (
        <p className="text-sm text-gray-600">
          Total en {line.currency}:{' '}
          <span className="font-semibold text-gray-900 tabular-nums">{formatWithCurrency(line.total_currency, line.currency)}</span>
        </p>
      )}
      {line.unavailable_reason && (
        <p className="w-full text-xs text-amber-700">
          {NO_DISPONIBLE}: {line.unavailable_reason}
        </p>
      )}
    </div>
  );
}

// ── Solo lectura ────────────────────────────────────────────────────────────

function LineReadOnlyModal({ line, budget, onClose }: { line: FpaLine; budget: FpaBudgetDetail; onClose: () => void }) {
  return (
    <FpaModal
      title={`Línea ${line.folio}`}
      subtitle={`${budget.area.name} · ${budget.version.code} · solo consulta`}
      onClose={onClose}
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Concepto" value={line.concept} wide />
          <Field label="Departamento" value={line.department.name} />
          <Field label="Categoría" value={line.category.name} />
          <Field label="Clasificación" value={line.classification.name} />
          <Field
            label="Proveedor"
            value={line.supplier_name ?? (line.calc_method === 'viaje' ? 'Sin proveedor (viaje)' : '—')}
          />
          <Field label="Prioridad" value={line.priority ? PRIORITY_LABELS[line.priority] : '—'} />
          <Field label="Forma de cálculo" value={CALC_METHOD_LABELS[line.calc_method] ?? line.calc_method} />
          <Field label="Moneda" value={line.currency} />
          <Field label="Índice" value={PRICE_INDEX_LABELS[line.price_index] ?? line.price_index} />
          {line.calc_method === 'precio_veces' && line.unit_price !== null && (
            <Field label="Precio sin IVA" value={`${line.currency} ${priceText(line.unit_price)}`} />
          )}
          {line.calc_method === 'viaje' && <Field label="Viaje" value={tripText(line)} wide />}
          {line.justification && <Field label="Justificación" value={line.justification} wide />}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[#424846]">Meses</h3>
          <LineAmounts line={line} />
        </div>
        <LineTotal line={line} />
        {line.trip_breakdown && (
          <TripBreakdownTable breakdown={line.trip_breakdown} totalMxn={line.total_mxn} versionCode={budget.version.code} />
        )}
      </div>
      <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
        >
          Cerrar
        </button>
      </div>
    </FpaModal>
  );
}

// ── Formulario ──────────────────────────────────────────────────────────────

/** 12 casillas (índice 0 = enero), como se teclearon. */
type Months = string[];

interface FormState {
  department_id: string;
  category_id: string;
  classification_id: string;
  concept: string;
  justification: string;
  priority: Priority | '';
  calc_method: CalcMethod | '';
  currency: string;
  price_index: PriceIndex | '';
  unit_price: string;
  quantities: Months;
  perMonthPrice: boolean;
  monthPrices: Months;
  amounts: Months;
  trip_type: TripType | '';
  travelers_colaborador: string;
  travelers_director: string;
  nights: string;
  car_rental: boolean;
  trips: Months;
}

type MonthField = 'quantities' | 'monthPrices' | 'amounts' | 'trips';

const emptyMonths = (): Months => Array.from({ length: 12 }, () => '');

function monthsFrom(line: FpaLine, pick: (m: FpaMonthInput) => string | number | null | undefined): Months {
  const out = emptyMonths();
  for (const m of line.months_input) {
    if (m.month < 1 || m.month > 12) continue;
    const value = pick(m);
    out[m.month - 1] = value === null || value === undefined ? '' : trimDecimal(String(value));
  }
  return out;
}

function initialForm(line: FpaLine | null, budget: FpaBudgetDetail): FormState {
  if (!line) {
    return {
      // Propuesta: el departamento propio del área que captura
      department_id: budget.area.department_id ?? '',
      category_id: '',
      classification_id: '',
      concept: '',
      justification: '',
      priority: '',
      // Sin valor por omisión: el sistema pregunta todo de entrada
      calc_method: '',
      currency: '',
      price_index: '',
      unit_price: '',
      quantities: emptyMonths(),
      perMonthPrice: false,
      monthPrices: emptyMonths(),
      amounts: emptyMonths(),
      trip_type: '',
      travelers_colaborador: '',
      travelers_director: '',
      nights: '',
      car_rental: false,
      trips: emptyMonths(),
    };
  }
  const monthPrices = monthsFrom(line, (m) => m.unit_price);
  return {
    department_id: line.department.id,
    category_id: line.category.id,
    classification_id: line.classification.id,
    concept: line.concept,
    justification: line.justification ?? '',
    priority: line.priority ?? '',
    calc_method: line.calc_method,
    currency: line.currency,
    price_index: line.price_index,
    unit_price: trimDecimal(line.unit_price),
    quantities: monthsFrom(line, (m) => m.quantity),
    perMonthPrice: monthPrices.some((v) => v !== ''),
    monthPrices,
    amounts: monthsFrom(line, (m) => m.amount),
    trip_type: line.trip?.trip_type ?? '',
    travelers_colaborador: line.trip ? String(line.trip.travelers_colaborador) : '',
    travelers_director: line.trip ? String(line.trip.travelers_director) : '',
    nights: line.trip ? String(line.trip.nights) : '',
    car_rental: line.trip?.car_rental ?? false,
    trips: monthsFrom(line, (m) => m.trips),
  };
}

/** Lo que se manda como proveedor. */
type SupplierChoice =
  | { kind: 'catalog'; id: string; name: string }
  | { kind: 'otros' }
  /** Nombre capturado sin catálogo (p. ej. de un Excel importado): se conserva. */
  | { kind: 'text'; name: string }
  | { kind: 'none' };

const isOtrosName = (name: string | null | undefined) => (name ?? '').trim().toUpperCase() === 'OTROS';

/** Lo que usa el cálculo: lo mismo que va a POST /fpa/calcular, sin el presupuesto. */
type CalcFields = Omit<FpaCalcInput, 'budget_id'>;

type CalcBuild = { ok: true; fields: CalcFields } | { ok: false; error: string };
type BuildResult = { ok: true; payload: FpaLineInput } | { ok: false; error: string };

/**
 * Valida y arma la parte del cálculo (forma, moneda, índice, precio, viaje y
 * los meses con dato). La usan el guardado y la vista previa.
 */
function buildCalcFields(form: FormState, allowsNegative: boolean): CalcBuild {
  const fail = (error: string): CalcBuild => ({ ok: false, error });

  if (!form.calc_method) return fail('Elige la forma de cálculo.');
  if (!form.currency) return fail('Elige la moneda.');
  if (!form.price_index) return fail('Elige el índice.');

  const months: FpaMonthInput[] = [];
  let unitPrice: string | null = null;
  let trip: FpaTripInput | null = null;
  const moneyRules = { maxDecimals: 2, maxIntDigits: 13, allowNegative: allowsNegative };
  const priceRules = { maxDecimals: 4, maxIntDigits: 11, allowNegative: allowsNegative };
  const countRules = { maxDecimals: 0, maxIntDigits: 4, integer: true };

  if (form.calc_method === 'precio_veces') {
    const price = parseDecimal(form.unit_price, priceRules);
    if (!price.ok) return fail(`Precio sin IVA: ${price.error}.`);
    if (price.value === null) return fail('Escribe el precio sin IVA.');
    unitPrice = price.value;
    for (let i = 0; i < 12; i++) {
      const quantity = parseDecimal(form.quantities[i], { maxDecimals: 4, maxIntDigits: 8 });
      if (!quantity.ok) return fail(`Veces de ${MONTH_NAMES[i]}: ${quantity.error}.`);
      let monthPrice: string | null = null;
      if (form.perMonthPrice) {
        const parsed = parseDecimal(form.monthPrices[i], priceRules);
        if (!parsed.ok) return fail(`Precio de ${MONTH_NAMES[i]}: ${parsed.error}.`);
        monthPrice = parsed.value;
      }
      if (quantity.value === null || Number(quantity.value) === 0) {
        if (monthPrice !== null) return fail(`En ${MONTH_NAMES[i]} hay precio pero no veces.`);
        continue;
      }
      months.push({ month: i + 1, quantity: quantity.value, unit_price: monthPrice });
    }
  } else if (form.calc_method === 'monto_mes') {
    for (let i = 0; i < 12; i++) {
      const amount = parseDecimal(form.amounts[i], moneyRules);
      if (!amount.ok) return fail(`Monto de ${MONTH_NAMES[i]}: ${amount.error}.`);
      if (amount.value === null || Number(amount.value) === 0) continue;
      months.push({ month: i + 1, amount: amount.value });
    }
  } else {
    if (!form.trip_type) return fail('Elige el tipo de viaje.');
    const colaboradores = parseDecimal(form.travelers_colaborador, countRules);
    if (!colaboradores.ok) return fail(`Colaboradores: ${colaboradores.error}.`);
    const directores = parseDecimal(form.travelers_director, countRules);
    if (!directores.ok) return fail(`Directores: ${directores.error}.`);
    const c = colaboradores.value === null ? 0 : Number(colaboradores.value);
    const d = directores.value === null ? 0 : Number(directores.value);
    if (c + d < 1) return fail('Indica al menos un colaborador o un director.');
    const nights = parseDecimal(form.nights, countRules);
    if (!nights.ok) return fail(`Noches: ${nights.error}.`);
    if (nights.value === null) return fail('Escribe las noches (0 si es de ida y vuelta el mismo día).');
    trip = {
      trip_type: form.trip_type,
      travelers_colaborador: c,
      travelers_director: d,
      nights: Number(nights.value),
      car_rental: form.car_rental,
    };
    for (let i = 0; i < 12; i++) {
      const trips = parseDecimal(form.trips[i], countRules);
      if (!trips.ok) return fail(`Viajes de ${MONTH_NAMES[i]}: ${trips.error}.`);
      if (trips.value === null || Number(trips.value) === 0) continue;
      months.push({ month: i + 1, trips: Number(trips.value) });
    }
  }

  const isTrip = form.calc_method === 'viaje';
  return {
    ok: true,
    fields: {
      calc_method: form.calc_method,
      // Viaje: siempre en pesos y con precio acordado (las tarifas ya son de la versión)
      currency: isTrip ? 'MXN' : form.currency,
      price_index: isTrip ? 'precio_acordado' : form.price_index,
      unit_price: unitPrice,
      trip,
      months,
    },
  };
}

/** Valida lo mínimo y arma el cuerpo de POST/PUT con solo los meses con dato. */
function buildPayload(form: FormState, supplier: SupplierChoice, allowsNegative: boolean): BuildResult {
  const fail = (error: string): BuildResult => ({ ok: false, error });

  if (!form.department_id) return fail('Elige el departamento.');
  if (!form.classification_id) {
    return fail(form.category_id ? 'Elige la clasificación.' : 'Elige la categoría y la clasificación.');
  }
  const concept = form.concept.trim();
  if (!concept) return fail('Escribe el concepto.');

  const calc = buildCalcFields(form, allowsNegative);
  if (!calc.ok) return fail(calc.error);

  let supplierId: string | null = null;
  let supplierName: string | null = null;
  if (form.calc_method !== 'viaje') {
    if (supplier.kind === 'catalog') {
      supplierId = supplier.id;
      supplierName = supplier.name;
    } else if (supplier.kind === 'otros') {
      supplierName = 'OTROS';
    } else if (supplier.kind === 'text') {
      supplierName = supplier.name;
    } else {
      return fail('Elige el proveedor del catálogo o marca OTROS.');
    }
  }

  return {
    ok: true,
    payload: {
      department_id: form.department_id,
      classification_id: form.classification_id,
      concept,
      justification: form.justification.trim() || null,
      supplier_id: supplierId,
      supplier_name: supplierName,
      priority: form.priority || null,
      ...calc.fields,
    },
  };
}

/** "Elige la moneda." → "elige la moneda." (para "Para ver el cálculo: …"). */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * Lo que regresa la vista previa: el cálculo del API junto con la entrada con
 * la que se pidió. Mientras llega el siguiente (keepPreviousData) se enseña el
 * anterior completo, sin mezclarlo con lo que ya cambió en el formulario.
 */
interface CalcPreview {
  input: CalcFields;
  result: FpaCalcResult;
}

const isThrottled = (error: Error | null) => error instanceof ApiError && error.status === 429;

/**
 * Vista previa del cálculo (B1): lo que calcula el API con lo capturado, sin
 * guardar. Mientras faltan datos dice cuál; si el alta lo rechazaría, dice
 * por qué y no enseña montos.
 */
function LiveCalc({
  build,
  preview: data,
  error,
  loading,
  updating,
  versionCode,
  saveLabel,
}: {
  build: CalcBuild;
  preview: CalcPreview | undefined;
  error: Error | null;
  loading: boolean;
  /** Hay cambios que aún no se calculan (tecleando o en camino). */
  updating: boolean;
  versionCode: string;
  saveLabel: string;
}) {
  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold text-[#424846]">
        Cálculo{updating && <span className="ml-2 text-xs font-normal text-gray-400">calculando…</span>}
      </h3>
      <p className="text-xs text-gray-500">
        Con los parámetros de la versión {versionCode}. Se guarda al dar «{saveLabel}».
      </p>
    </div>
  );

  if (!build.ok) {
    return (
      <div className="space-y-1">
        {header}
        <p className="text-sm text-gray-500">Para ver el cálculo: {lowerFirst(build.error)}</p>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="space-y-1">
        {header}
        <p className="text-sm text-amber-700">
          {isThrottled(error)
            ? 'Hay muchos cálculos seguidos; espera un momento y vuelve a cambiar un dato.'
            : `No se pudo calcular: ${error.message}`}
        </p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-1">
        {header}
        {loading && (
          <div role="status" className="w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin">
            <span className="sr-only">Calculando…</span>
          </div>
        )}
      </div>
    );
  }
  const { input, result } = data;
  if (result.errors.length > 0) {
    return (
      <div className={`space-y-1 transition-opacity ${updating ? 'opacity-60' : ''}`}>
        {header}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">Así no se puede guardar:</p>
          <ul className="list-disc pl-5">
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  const preview: LineAmountsData = {
    calc_method: input.calc_method,
    currency: input.currency,
    months_input: input.months,
    months: result.months,
    total_currency: result.total_currency,
    total_mxn: result.total_mxn,
    unavailable_reason: result.unavailable_reason,
  };
  return (
    <div className={`space-y-3 transition-opacity ${updating ? 'opacity-60' : ''}`}>
      {header}
      <LineAmounts line={preview} />
      <div aria-live="polite">
        <LineTotal line={preview} />
      </div>
      {result.trip_breakdown && (
        <TripBreakdownTable breakdown={result.trip_breakdown} totalMxn={result.total_mxn} versionCode={versionCode} />
      )}
    </div>
  );
}

// disabled: opacidad, porque globals.css fija el fondo y el color de los
// select (sin capa) y le gana a disabled:bg-*
const INPUT_SHAPE =
  'w-full px-3 py-2 border border-gray-300 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] disabled:opacity-60 disabled:cursor-not-allowed';
const INPUT = `${INPUT_SHAPE} rounded-lg`;
const LABEL = 'block text-sm font-medium text-gray-700 mb-1';
const MONTH_INPUT =
  'w-full px-1.5 py-1.5 text-sm text-right tabular-nums border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-300 focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]';

function MonthGrid({
  idPrefix,
  label,
  hint,
  values,
  onChange,
  integer = false,
  placeholder,
}: {
  idPrefix: string;
  label: string;
  hint?: string;
  values: Months;
  onChange: (index: number, value: string) => void;
  integer?: boolean;
  placeholder?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700">{label}</legend>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <div className="mt-1.5 grid grid-cols-6 lg:grid-cols-12 gap-1.5">
        {MONTH_LABELS.map((month, i) => (
          <div key={month}>
            <label htmlFor={`${idPrefix}-${i}`} className="block text-center text-[11px] font-medium text-gray-500">
              {month}
            </label>
            <input
              id={`${idPrefix}-${i}`}
              type="text"
              inputMode={integer ? 'numeric' : 'decimal'}
              autoComplete="off"
              value={values[i]}
              placeholder={placeholder}
              onChange={(e) => onChange(i, e.target.value)}
              aria-label={`${label}: ${MONTH_NAMES[i]}`}
              className={MONTH_INPUT}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function LineFormModal({ onClose, budget, line, catalog }: LineModalProps & { catalog: FpaCatalog }) {
  const qc = useQueryClient();
  const uid = useId();
  const isEditing = line !== null;
  const version = budget.version;

  const [form, setForm] = useState<FormState>(() => initialForm(line, budget));
  // Proveedor: undefined = sin tocar (se conserva el de la línea)
  const [supplierPick, setSupplierPick] = useState<SupplierOption | null | undefined>(undefined);
  const [otros, setOtros] = useState(() => !!line && line.supplier_id === null && isOtrosName(line.supplier_name));
  const [legacyName, setLegacyName] = useState<string | null>(() =>
    line && line.supplier_id === null && line.supplier_name && !isOtrosName(line.supplier_name)
      ? line.supplier_name
      : null,
  );
  // Apoyo "Repartir un total"
  const [spreadOpen, setSpreadOpen] = useState(false);
  const [spreadTotal, setSpreadTotal] = useState('');
  const [spreadMonths, setSpreadMonths] = useState<boolean[]>(() => Array.from({ length: 12 }, () => true));

  // Para mostrar el RFC del proveedor guardado en el buscador (GET abierto a
  // cualquier autenticado); mientras llega, se muestra el nombre guardado.
  const savedSupplierId = line?.supplier_id ?? null;
  const supplierQ = useQuery({
    queryKey: fpaKeys.supplier(savedSupplierId),
    queryFn: () => api.get<SupplierOption>(`/suppliers/${savedSupplierId}`),
    enabled: !!savedSupplierId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const comboValue: SupplierOption | null =
    supplierPick !== undefined
      ? supplierPick
      : line?.supplier_id
        ? (supplierQ.data ?? { id: line.supplier_id, legal_name: line.supplier_name ?? 'Proveedor guardado', tax_id: '…' })
        : null;

  const supplierChoice: SupplierChoice = otros
    ? { kind: 'otros' }
    : supplierPick !== undefined
      ? supplierPick
        ? { kind: 'catalog', id: supplierPick.id, name: supplierPick.legal_name }
        : { kind: 'none' }
      : line?.supplier_id
        ? // Sin tocar: se conserva el nombre guardado (copia del de SAP al capturar)
          { kind: 'catalog', id: line.supplier_id, name: line.supplier_name ?? supplierQ.data?.legal_name ?? '' }
        : legacyName
          ? { kind: 'text', name: legacyName }
          : { kind: 'none' };

  // ── Catálogo ──
  const categories = [...catalog.categories].sort((a, b) => a.sort_order - b.sort_order);
  if (line && !categories.some((c) => c.id === line.category.id)) {
    // Categoría dada de baja en el catálogo: se muestra para no perder el dato
    categories.push({
      id: line.category.id,
      name: `${line.category.name} (ya no está en el catálogo)`,
      sort_order: Number.MAX_SAFE_INTEGER,
      classifications: [{ id: line.classification.id, name: line.classification.name, allows_negative: false }],
    });
  }
  const category = categories.find((c) => c.id === form.category_id) ?? null;
  const classifications = [...(category?.classifications ?? [])];
  if (line && category?.id === line.category.id && !classifications.some((c) => c.id === line.classification.id)) {
    classifications.push({
      id: line.classification.id,
      name: `${line.classification.name} (ya no está en el catálogo)`,
      allows_negative: false,
    });
  }
  const classification = classifications.find((c) => c.id === form.classification_id) ?? null;
  const allowsNegative = !!classification?.allows_negative;

  const departments = catalog.departments;
  const ownDepartments = departments.filter((d) => d.area_id === budget.area.id);
  const otherDepartments = departments.filter((d) => d.area_id !== budget.area.id);
  const departmentKnown = departments.some((d) => d.id === form.department_id);
  const departmentLabel = (d: FpaCatalog['departments'][number]) =>
    d.cost_center ? `${d.name} (${d.cost_center})` : d.name;

  // ── Moneda: pesos y las monedas con tipo de cambio en la versión ──
  const currencies = ['MXN', ...version.exchange_rates.map((r) => r.currency).filter((c) => c !== 'MXN')];
  if (form.currency && !currencies.includes(form.currency)) currencies.push(form.currency);
  const rate = version.exchange_rates.find((r) => r.currency === form.currency) ?? null;
  const inflation = formatInflation(version.inflation_pct);
  const isTrip = form.calc_method === 'viaje';

  // ── Vista previa del cálculo (B1): se pide al API al dejar de teclear ──
  const calcBuild = buildCalcFields(form, allowsNegative);
  const calcInput = calcBuild.ok ? JSON.stringify(calcBuild.fields) : null;
  const debouncedInput = useDebouncedValue(calcInput, 350);
  const calcQ = useQuery({
    queryKey: fpaKeys.calc(budget.id, debouncedInput),
    queryFn: async (): Promise<CalcPreview> => {
      const input = JSON.parse(debouncedInput as string) as CalcFields;
      const result = await api.post<FpaCalcResult>('/fpa/calcular', { budget_id: budget.id, ...input });
      return { input, result };
    },
    enabled: debouncedInput !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    // Solo se reintenta si el límite de peticiones respondió 429
    retry: (count, error) => isThrottled(error) && count < 2,
    retryDelay: 2_000,
  });
  const calcUpdating = calcInput !== null && (calcInput !== debouncedInput || calcQ.isFetching);

  // ── Cambios ──
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateMonth = (key: MonthField, index: number, value: string) =>
    setForm((f) => {
      const next = [...f[key]];
      next[index] = value;
      return { ...f, [key]: next };
    });

  const changeCategory = (categoryId: string) => {
    const next = categories.find((c) => c.id === categoryId);
    // Con una sola clasificación, se elige sola
    const only = next?.classifications.length === 1 ? next.classifications[0].id : '';
    setForm((f) => ({ ...f, category_id: categoryId, classification_id: only }));
  };

  const changeCalcMethod = (value: CalcMethod | '') => {
    setForm((f) => {
      if (value === 'viaje') {
        return { ...f, calc_method: value, currency: 'MXN', price_index: 'precio_acordado' };
      }
      // Al salir de Viaje, moneda e índice se vuelven a pedir: los fijó el
      // viaje, no la persona (la reunión pidió preguntar todo de entrada)
      if (f.calc_method === 'viaje') {
        return { ...f, calc_method: value, currency: '', price_index: '' };
      }
      return { ...f, calc_method: value };
    });
  };

  const pickSupplier = (supplier: SupplierOption | null) => {
    setSupplierPick(supplier);
    setLegacyName(null);
  };

  const toggleOtros = (checked: boolean) => {
    setOtros(checked);
    if (checked) setLegacyName(null);
  };

  const applySpread = () => {
    const total = parseDecimal(spreadTotal, { maxDecimals: 2, maxIntDigits: 13, allowNegative: allowsNegative });
    if (!total.ok) {
      notify.error(`Total a repartir: ${total.error}.`);
      return;
    }
    if (total.value === null) {
      notify.error('Escribe el total a repartir.');
      return;
    }
    const picked = spreadMonths.flatMap((on, i) => (on ? [i] : []));
    if (picked.length === 0) {
      notify.error('Marca al menos un mes para repartir.');
      return;
    }
    const parts = spreadCents(moneyToCents(total.value), picked.length);
    const amounts = emptyMonths();
    picked.forEach((monthIndex, k) => {
      amounts[monthIndex] = centsToDecimal(parts[k]);
    });
    update('amounts', amounts);
  };

  // ── Guardar y dar de baja ──
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetsAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.consolidatedAll });
    // B3: las líneas deciden si se puede enviar (sin líneas o con una "No disponible", no)
    void qc.invalidateQueries({ queryKey: fpaKeys.flowAll });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: FpaLineInput) =>
      line
        ? api.put<FpaLine>(`/fpa/lineas/${line.id}`, payload)
        : api.post<FpaLine>(`/fpa/presupuestos/${budget.id}/lineas`, payload),
    onSuccess: (saved) => {
      invalidate();
      const total = saved.total_mxn === null ? NO_DISPONIBLE : formatPesos(saved.total_mxn, true);
      notify.success(`${isEditing ? 'Línea guardada' : 'Línea agregada'} (${saved.folio}). Total en pesos: ${total}`);
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'No se pudo guardar la línea'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (lineId: string) => api.post<{ ok: true }>(`/fpa/lineas/${lineId}/baja`, {}),
    onSuccess: () => {
      invalidate();
      notify.success('Línea dada de baja');
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'No se pudo dar de baja la línea'),
  });

  const busy = saveMutation.isPending || deactivateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildPayload(form, supplierChoice, allowsNegative);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    // Los campos opcionales que la pantalla aún no muestra se conservan tal cual
    const payload: FpaLineInput = line
      ? {
          ...result.payload,
          contract_label: line.contract_label,
          project_tag: line.project_tag,
          outside_ebitda: line.outside_ebitda,
          spend_type: line.spend_type,
        }
      : result.payload;
    saveMutation.mutate(payload);
  };

  const handleDeactivate = async () => {
    if (!line) return;
    const confirmed = await notify.confirm(
      `¿Dar de baja la línea ${line.folio} (${line.concept})? Deja de contar en el presupuesto.`,
    );
    if (confirmed) deactivateMutation.mutate(line.id);
  };

  const currencyLabel = form.currency || 'moneda de la línea';

  return (
    <FpaModal
      title={isEditing ? `Editar línea ${line.folio}` : 'Nueva línea'}
      subtitle={`${budget.area.name} · ${version.code} · ${version.name}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          {/* Clasificación del gasto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor={`${uid}-dep`} className={LABEL}>Departamento *</label>
              <select
                id={`${uid}-dep`}
                value={form.department_id}
                onChange={(e) => update('department_id', e.target.value)}
                className={INPUT}
              >
                <option value="" disabled>Elige…</option>
                {form.department_id && !departmentKnown && (
                  <option value={form.department_id}>{line?.department.name ?? 'Departamento del área'}</option>
                )}
                {ownDepartments.length > 0 && otherDepartments.length > 0 ? (
                  <>
                    <optgroup label={`De ${budget.area.name}`}>
                      {ownDepartments.map((d) => (
                        <option key={d.id} value={d.id}>{departmentLabel(d)}</option>
                      ))}
                    </optgroup>
                    <optgroup label="De otras áreas">
                      {otherDepartments.map((d) => (
                        <option key={d.id} value={d.id}>{departmentLabel(d)}</option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  departments.map((d) => (
                    <option key={d.id} value={d.id}>{departmentLabel(d)}</option>
                  ))
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">A qué departamento se carga el gasto</p>
            </div>
            <div>
              <label htmlFor={`${uid}-cat`} className={LABEL}>Categoría *</label>
              <select
                id={`${uid}-cat`}
                value={form.category_id}
                onChange={(e) => changeCategory(e.target.value)}
                className={INPUT}
              >
                <option value="" disabled>Elige…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-cls`} className={LABEL}>Clasificación *</label>
              <select
                id={`${uid}-cls`}
                value={form.classification_id}
                onChange={(e) => update('classification_id', e.target.value)}
                disabled={!category}
                className={INPUT}
              >
                <option value="" disabled>{category ? 'Elige…' : 'Primero la categoría'}</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {allowsNegative && (
                <p className="mt-1 text-xs text-gray-500">Acepta montos negativos (descuentos y ajustes)</p>
              )}
            </div>
          </div>

          {/* Concepto, prioridad y justificación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor={`${uid}-concept`} className={LABEL}>Concepto *</label>
              <input
                id={`${uid}-concept`}
                type="text"
                value={form.concept}
                onChange={(e) => update('concept', e.target.value)}
                maxLength={255}
                placeholder="Ej. Evaluación de proveedores"
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-priority`} className={LABEL}>Prioridad</label>
              <select
                id={`${uid}-priority`}
                value={form.priority}
                onChange={(e) => update('priority', e.target.value as Priority | '')}
                className={INPUT}
              >
                <option value="">Sin prioridad</option>
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label htmlFor={`${uid}-just`} className={LABEL}>Justificación</label>
              <textarea
                id={`${uid}-just`}
                value={form.justification}
                onChange={(e) => update('justification', e.target.value)}
                rows={2}
                placeholder="Para qué es el gasto (opcional)"
                className={INPUT}
              />
            </div>
          </div>

          {/* Proveedor */}
          <div>
            <label htmlFor={`${uid}-supplier`} className={LABEL}>Proveedor{isTrip ? '' : ' *'}</label>
            {isTrip ? (
              <p className="text-sm text-gray-500">Los viajes van sin proveedor: su costo sale de las tarifas de viaje de la versión.</p>
            ) : (
              <div className="flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 min-w-0">
                  {otros ? (
                    <p className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600">
                      OTROS: el proveedor no está en el catálogo de SAP
                    </p>
                  ) : (
                    <SupplierCombobox id={`${uid}-supplier`} value={comboValue} onChange={pickSupplier} />
                  )}
                  {!otros && legacyName && supplierPick === undefined && (
                    <p className="mt-1 text-xs text-amber-700">
                      Capturado sin catálogo: «{legacyName}». Elige uno del catálogo o marca OTROS para cambiarlo.
                    </p>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 py-2 text-sm text-[#424846] select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={otros}
                    onChange={(e) => toggleOtros(e.target.checked)}
                    className="rounded border-gray-300 text-[#52AF32] focus:ring-[#52AF32]"
                  />
                  OTROS
                </label>
              </div>
            )}
          </div>

          {/* Cálculo: forma, moneda e índice (obligatorios, sin valor por omisión) */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor={`${uid}-method`} className={LABEL}>Forma de cálculo *</label>
                <select
                  id={`${uid}-method`}
                  value={form.calc_method}
                  onChange={(e) => changeCalcMethod(e.target.value as CalcMethod | '')}
                  className={INPUT}
                >
                  <option value="" disabled>Elige…</option>
                  {(Object.keys(CALC_METHOD_LABELS) as CalcMethod[]).map((m) => (
                    <option key={m} value={m}>{CALC_METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-currency`} className={LABEL}>Moneda *</label>
                <select
                  id={`${uid}-currency`}
                  value={form.currency}
                  onChange={(e) => update('currency', e.target.value)}
                  disabled={isTrip}
                  className={INPUT}
                >
                  <option value="" disabled>Elige…</option>
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c === 'MXN' ? 'MXN (pesos)' : c}</option>
                  ))}
                </select>
                {isTrip ? (
                  <p className="mt-1 text-xs text-gray-500">Los viajes van en pesos</p>
                ) : form.currency && form.currency !== 'MXN' ? (
                  rate ? (
                    <p className="mt-1 text-xs text-gray-500">Tipo de cambio de la versión: {formatRate(rate.rate_mxn)}</p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">La versión no tiene tipo de cambio para {form.currency}</p>
                  )
                ) : null}
              </div>
              <div>
                <label htmlFor={`${uid}-index`} className={LABEL}>Índice *</label>
                <select
                  id={`${uid}-index`}
                  value={form.price_index}
                  onChange={(e) => update('price_index', e.target.value as PriceIndex | '')}
                  disabled={isTrip}
                  className={INPUT}
                >
                  <option value="" disabled>Elige…</option>
                  {(Object.keys(PRICE_INDEX_LABELS) as PriceIndex[]).map((p) => (
                    <option key={p} value={p}>{PRICE_INDEX_LABELS[p]}</option>
                  ))}
                </select>
                {isTrip ? (
                  <p className="mt-1 text-xs text-gray-500">Los viajes van con precio acordado</p>
                ) : form.price_index === 'inflacion' ? (
                  inflation ? (
                    <p className="mt-1 text-xs text-gray-500">Inflación de la versión: {inflation}</p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">
                      La versión aún no tiene inflación: la línea saldrá &quot;No disponible&quot;
                    </p>
                  )
                ) : form.price_index === 'precio_acordado' ? (
                  <p className="mt-1 text-xs text-gray-500">El precio no cambia (amarrado por contrato o cotización)</p>
                ) : null}
              </div>
            </div>

            {/* Precio × veces */}
            {form.calc_method === 'precio_veces' && (
              <div className="space-y-4">
                <div className="max-w-xs">
                  <label htmlFor={`${uid}-price`} className={LABEL}>Precio sin IVA *</label>
                  <div className="flex items-stretch">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-xs font-semibold text-gray-600">
                      {form.currency || '—'}
                    </span>
                    <input
                      id={`${uid}-price`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={form.unit_price}
                      onChange={(e) => update('unit_price', e.target.value)}
                      placeholder="0.00"
                      className={`${INPUT_SHAPE} rounded-r-lg text-right tabular-nums`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Hasta 4 decimales</p>
                </div>
                <MonthGrid
                  idPrefix={`${uid}-qty`}
                  label="Veces por mes"
                  hint="Cuántas veces se paga en cada mes (vacío = ninguna)"
                  values={form.quantities}
                  onChange={(i, v) => updateMonth('quantities', i, v)}
                />
                <label className="inline-flex items-center gap-2 text-sm text-[#424846] select-none">
                  <input
                    type="checkbox"
                    checked={form.perMonthPrice}
                    onChange={(e) => update('perMonthPrice', e.target.checked)}
                    className="rounded border-gray-300 text-[#52AF32] focus:ring-[#52AF32]"
                  />
                  Precio distinto por mes
                </label>
                {form.perMonthPrice && (
                  <MonthGrid
                    idPrefix={`${uid}-mprice`}
                    label={`Precio del mes (${currencyLabel})`}
                    hint="Vacío = el precio de la línea"
                    values={form.monthPrices}
                    onChange={(i, v) => updateMonth('monthPrices', i, v)}
                    placeholder={form.unit_price || undefined}
                  />
                )}
              </div>
            )}

            {/* Monto por mes */}
            {form.calc_method === 'monto_mes' && (
              <div className="space-y-4">
                <MonthGrid
                  idPrefix={`${uid}-amount`}
                  label={`Monto por mes (${currencyLabel})`}
                  hint="Sin IVA, en la moneda de la línea (vacío = sin gasto ese mes)"
                  values={form.amounts}
                  onChange={(i, v) => updateMonth('amounts', i, v)}
                />
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                  <button
                    type="button"
                    onClick={() => setSpreadOpen((open) => !open)}
                    aria-expanded={spreadOpen}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#222D59] hover:underline"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${spreadOpen ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Repartir un total
                  </button>
                  {spreadOpen && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="w-56">
                          <label htmlFor={`${uid}-spread`} className={LABEL}>Total a repartir ({currencyLabel})</label>
                          <input
                            id={`${uid}-spread`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={spreadTotal}
                            onChange={(e) => setSpreadTotal(e.target.value)}
                            placeholder="1,000,000"
                            className={`${INPUT} text-right tabular-nums`}
                          />
                        </div>
                        <div className="flex items-center gap-3 pb-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setSpreadMonths(Array.from({ length: 12 }, () => true))}
                            className="text-[#222D59] hover:underline"
                          >
                            Todos los meses
                          </button>
                          <button
                            type="button"
                            onClick={() => setSpreadMonths(Array.from({ length: 12 }, () => false))}
                            className="text-[#222D59] hover:underline"
                          >
                            Ninguno
                          </button>
                        </div>
                      </div>
                      <fieldset>
                        <legend className="sr-only">Meses en los que se reparte</legend>
                        <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5">
                          {MONTH_LABELS.map((month, i) => (
                            <label
                              key={month}
                              className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-gray-600 select-none"
                            >
                              {month}
                              <input
                                type="checkbox"
                                checked={spreadMonths[i]}
                                onChange={(e) =>
                                  setSpreadMonths((list) => list.map((on, k) => (k === i ? e.target.checked : on)))
                                }
                                aria-label={`Repartir en ${MONTH_NAMES[i]}`}
                                className="rounded border-gray-300 text-[#52AF32] focus:ring-[#52AF32]"
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={applySpread}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[#52AF32] text-[#52AF32] bg-white hover:bg-[#52AF32]/10 transition-colors"
                        >
                          Repartir
                        </button>
                        <p className="flex-1 min-w-[16rem] text-xs text-gray-500">
                          Partes iguales redondeadas a centavos; el último mes marcado absorbe la diferencia
                          (1,000,000 entre 12 = 83,333.33 × 11 + 83,333.37). Los meses sin marcar quedan vacíos.
                          Se guardan los montos por mes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Viaje */}
            {isTrip && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label htmlFor={`${uid}-trip-type`} className={LABEL}>Tipo de viaje *</label>
                    <select
                      id={`${uid}-trip-type`}
                      value={form.trip_type}
                      onChange={(e) => update('trip_type', e.target.value as TripType | '')}
                      className={INPUT}
                    >
                      <option value="" disabled>Elige…</option>
                      {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map((t) => (
                        <option key={t} value={t}>{TRIP_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-colab`} className={LABEL}>Colaboradores</label>
                    <input
                      id={`${uid}-colab`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.travelers_colaborador}
                      onChange={(e) => update('travelers_colaborador', e.target.value)}
                      placeholder="0"
                      className={`${INPUT} text-right tabular-nums`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${uid}-dir`} className={LABEL}>Directores</label>
                    <input
                      id={`${uid}-dir`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.travelers_director}
                      onChange={(e) => update('travelers_director', e.target.value)}
                      placeholder="0"
                      className={`${INPUT} text-right tabular-nums`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${uid}-nights`} className={LABEL}>Noches *</label>
                    <input
                      id={`${uid}-nights`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.nights}
                      onChange={(e) => update('nights', e.target.value)}
                      placeholder="0"
                      className={`${INPUT} text-right tabular-nums`}
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 py-2 text-sm text-[#424846] select-none">
                    <input
                      type="checkbox"
                      checked={form.car_rental}
                      onChange={(e) => update('car_rental', e.target.checked)}
                      className="rounded border-gray-300 text-[#52AF32] focus:ring-[#52AF32]"
                    />
                    Renta de vehículo
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  La renta de vehículo todavía no tiene tarifa y no suma al viaje: captúrala como una línea aparte de monto por mes (clasificación Renta de autos).
                </p>
                <MonthGrid
                  idPrefix={`${uid}-trips`}
                  label="Viajes por mes"
                  hint="Cuántos viajes hay en cada mes (vacío = ninguno). El costo sale de las tarifas de la versión."
                  values={form.trips}
                  onChange={(i, v) => updateMonth('trips', i, v)}
                  integer
                />
              </div>
            )}

            {!form.calc_method && (
              <p className="text-sm text-gray-500">Elige la forma de cálculo para capturar los meses.</p>
            )}
          </div>

          {/* Vista previa: la calcula el API con lo capturado (se recalcula al guardar) */}
          <LiveCalc
            build={calcBuild}
            preview={calcQ.data}
            error={calcQ.error}
            loading={calcQ.isLoading}
            updating={calcUpdating}
            versionCode={version.code}
            saveLabel={isEditing ? 'Guardar cambios' : 'Agregar línea'}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div>
            {line && (
              <button
                type="button"
                onClick={() => void handleDeactivate()}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deactivateMutation.isPending ? 'Dando de baja…' : 'Dar de baja'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Agregar línea'}
            </button>
          </div>
        </div>
      </form>
    </FpaModal>
  );
}
