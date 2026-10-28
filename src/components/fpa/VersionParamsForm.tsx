'use client';

import { useEffect, useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { fpaKeys } from '@/hooks/useFpa';
import { formatInflation, formatPesos, formatRate, parseDecimal, trimDecimal } from '@/lib/fpa-format';
import {
  MONTH_LABELS,
  type FpaTravelRateParams,
  type FpaVersionDetail,
  type FpaVersionParamsInput,
  type TravelerTypeKey,
  type TripType,
} from '@/types/fpa';

/**
 * FP&A (B2) — parámetros de una versión: fuente, inflación, mes de corte
 * (forecast), tipos de cambio y tarifas de viaje (la tabla de la hoja '2' de
 * los B-26). Planeación los edita mientras la versión está en preparación;
 * guardar quita el visto bueno. Los demás los ven de solo lectura.
 *
 * El formulario manda el hash de lo que cargó: si otra persona los cambió
 * mientras tanto, el API responde 409 y no se pisa nada. Lo que otra persona
 * guarde se carga solo si no hay cambios propios; si los hay, se avisa y no se
 * pierden hasta que la persona decide cargar lo guardado.
 */

const COMBOS: Array<{ trip: TripType; traveler: TravelerTypeKey; label: string; tripLabel: string }> = [
  { trip: 'nacional', traveler: 'colaborador', label: 'Nacional · colaborador', tripLabel: 'Nacional' },
  { trip: 'nacional', traveler: 'director', label: 'Nacional · director', tripLabel: 'Nacional' },
  { trip: 'internacional', traveler: 'colaborador', label: 'Internacional · colaborador', tripLabel: 'Internacional' },
  { trip: 'internacional', traveler: 'director', label: 'Internacional · director', tripLabel: 'Internacional' },
];

/** Encabezado de una columna de tarifas en dos renglones, para que la tabla quepa a 1280. */
function ComboHeader({ combo }: { combo: (typeof COMBOS)[number] }) {
  return (
    <th scope="col" className="px-3 py-2 text-right font-medium">
      <span className="block">{combo.tripLabel}</span>
      <span className="block font-normal">{combo.traveler}</span>
    </th>
  );
}

type TravelField = 'flight_per_person' | 'hotel_per_night' | 'transport_per_day' | 'meals_per_day';

const FIELDS: Array<{ key: TravelField; label: string; hint: string }> = [
  { key: 'flight_per_person', label: 'Vuelo', hint: 'por persona, redondo' },
  { key: 'hotel_per_night', label: 'Hotel', hint: 'por noche y persona' },
  { key: 'transport_per_day', label: 'Transporte', hint: 'por día, una vez por viaje' },
  { key: 'meals_per_day', label: 'Alimentos', hint: 'por día y persona' },
];

const comboKey = (trip: string, traveler: string) => `${trip}|${traveler}`;

interface RateRow {
  key: string;
  currency: string;
  rate: string;
}

interface FormState {
  source: string;
  inflation: string;
  cutoff: string;
  rates: RateRow[];
  travel: Record<string, Record<TravelField, string>>;
}

let rowSeq = 0;
const newRowKey = () => `r${++rowSeq}`;

function initialForm(detail: FpaVersionDetail): FormState {
  const p = detail.params;
  const travel: FormState['travel'] = {};
  for (const c of COMBOS) {
    const row = p.travel_rates.find((t) => t.trip_type === c.trip && t.traveler_type === c.traveler);
    travel[comboKey(c.trip, c.traveler)] = {
      flight_per_person: trimDecimal(row?.flight_per_person),
      hotel_per_night: trimDecimal(row?.hotel_per_night),
      transport_per_day: trimDecimal(row?.transport_per_day),
      meals_per_day: trimDecimal(row?.meals_per_day),
    };
  }
  return {
    source: p.source ?? '',
    inflation: trimDecimal(p.inflation_pct),
    cutoff: p.cutoff_month === null ? '' : String(p.cutoff_month),
    rates: p.exchange_rates.map((r) => ({ key: newRowKey(), currency: r.currency, rate: trimDecimal(r.rate_mxn) })),
    travel,
  };
}

const sameForm = (a: FormState, b: FormState) =>
  JSON.stringify({ ...a, rates: a.rates.map(({ currency, rate }) => ({ currency, rate })) }) ===
  JSON.stringify({ ...b, rates: b.rates.map(({ currency, rate }) => ({ currency, rate })) });

type BuildResult = { ok: true; payload: FpaVersionParamsInput } | { ok: false; error: string };

function buildPayload(form: FormState, detail: FpaVersionDetail, baseHash: string): BuildResult {
  const fail = (error: string): BuildResult => ({ ok: false, error });
  const inflation = parseDecimal(form.inflation, { maxDecimals: 3, maxIntDigits: 2 });
  if (!inflation.ok) return fail(`Inflación: ${inflation.error}.`);

  let cutoff: number | null = null;
  if (detail.version.kind === 'forecast') {
    if (!form.cutoff) return fail('Elige el mes de corte del forecast.');
    cutoff = Number(form.cutoff);
  }

  const seen = new Set<string>();
  const rates: FpaVersionParamsInput['exchange_rates'] = [];
  for (const row of form.rates) {
    const currency = row.currency.trim().toUpperCase();
    if (!currency && !row.rate.trim()) continue; // renglón vacío
    if (!/^[A-Z]{3}$/.test(currency)) return fail('La moneda va en código de 3 letras (USD, EUR).');
    if (currency === 'MXN' || currency === 'MXP') return fail('El peso no lleva tipo de cambio: vale 1.');
    if (seen.has(currency)) return fail(`La moneda ${currency} viene dos veces.`);
    seen.add(currency);
    const rate = parseDecimal(row.rate, { maxDecimals: 6, maxIntDigits: 12 });
    if (!rate.ok) return fail(`Tipo de cambio de ${currency}: ${rate.error}.`);
    if (rate.value === null || Number(rate.value) <= 0) return fail(`Escribe el tipo de cambio de ${currency} (mayor a 0).`);
    rates.push({ currency, rate_mxn: rate.value });
  }

  const travel: FpaTravelRateParams[] = [];
  for (const c of COMBOS) {
    const values = form.travel[comboKey(c.trip, c.traveler)];
    const filled = FIELDS.filter((f) => values[f.key].trim() !== '');
    if (filled.length === 0) continue; // sin tarifa: la pantalla lo marca como faltante
    if (filled.length < FIELDS.length) return fail(`Completa la tarifa ${c.label.toLowerCase()} (los cuatro conceptos).`);
    const parsed: Partial<Record<TravelField, string>> = {};
    for (const f of FIELDS) {
      const v = parseDecimal(values[f.key], { maxDecimals: 2, maxIntDigits: 13 });
      if (!v.ok) return fail(`${f.label} ${c.label.toLowerCase()}: ${v.error}.`);
      parsed[f.key] = v.value ?? '0';
    }
    travel.push({
      trip_type: c.trip,
      traveler_type: c.traveler,
      flight_per_person: parsed.flight_per_person as string,
      hotel_per_night: parsed.hotel_per_night as string,
      transport_per_day: parsed.transport_per_day as string,
      meals_per_day: parsed.meals_per_day as string,
    });
  }

  const source = form.source.trim().replace(/\s+/g, ' ');
  return {
    ok: true,
    payload: {
      inflation_pct: inflation.value,
      cutoff_month: detail.version.kind === 'forecast' ? cutoff : null,
      params_source: source || null,
      exchange_rates: rates,
      travel_rates: travel,
      expected_hash: baseHash,
    },
  };
}

const INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]';
const NUM_INPUT =
  'w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right tabular-nums text-gray-900 bg-white focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]';
const LABEL = 'block text-sm font-medium text-gray-700 mb-1';

/** Lo guardado, de solo lectura. */
function ParamsReadOnly({ detail }: { detail: FpaVersionDetail }) {
  const p = detail.params;
  const travel = (trip: string, traveler: string) =>
    p.travel_rates.find((t) => t.trip_type === trip && t.traveler_type === traveler);
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <dt className="text-xs uppercase text-gray-500">Inflación</dt>
          <dd className="text-sm font-semibold text-[#424846]">
            {formatInflation(p.inflation_pct) ?? <span className="font-medium text-amber-700">Sin fijar</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-gray-500">Tipo de cambio</dt>
          <dd className="text-sm font-semibold text-[#424846]">
            {p.exchange_rates.length > 0
              ? p.exchange_rates.map((r) => `${r.currency} ${formatRate(r.rate_mxn)}`).join(' · ')
              : 'Solo pesos'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-gray-500">Fuente</dt>
          <dd className="text-sm text-[#424846]">{p.source ?? <span className="text-gray-400">Sin dato</span>}</dd>
        </div>
        {detail.version.kind === 'forecast' && (
          <div>
            <dt className="text-xs uppercase text-gray-500">Mes de corte</dt>
            <dd className="text-sm font-semibold text-[#424846]">
              {p.cutoff_month ? `Real hasta ${MONTH_LABELS[p.cutoff_month - 1]}` : 'Sin fijar'}
            </dd>
          </div>
        )}
      </dl>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <caption className="sr-only">Tarifas de viaje de la versión, en pesos</caption>
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">Tarifas de viaje (pesos)</th>
              {COMBOS.map((c) => (
                <ComboHeader key={c.label} combo={c} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {FIELDS.map((f) => (
              <tr key={f.key}>
                <th scope="row" className="px-3 py-2 text-left font-medium text-gray-700">
                  {f.label} <span className="block text-xs font-normal text-gray-400">{f.hint}</span>
                </th>
                {COMBOS.map((c) => {
                  const row = travel(c.trip, c.traveler);
                  return (
                    <td key={c.label} className="px-3 py-2 text-right tabular-nums text-gray-900">
                      {row ? formatPesos(row[f.key], true) : <span className="text-amber-700">Falta</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VersionParamsForm({
  detail,
  canEdit,
  onDirtyChange,
}: {
  detail: FpaVersionDetail;
  canEdit: boolean;
  /** Avisa si hay cambios sin guardar (con ellos, la página no deja dar el visto bueno ni abrir). */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const uid = useId();
  // Lo cargado (con su hash) y lo que se está editando encima
  const [base, setBase] = useState(() => ({ hash: detail.params.hash, form: initialForm(detail) }));
  const [form, setForm] = useState<FormState>(base.form);
  const dirty = canEdit && !sameForm(form, base.form);
  const stale = detail.params.hash !== base.hash;
  const versionId = detail.version.id;

  const reload = (from: FpaVersionDetail) => {
    const next = { hash: from.params.hash, form: initialForm(from) };
    setBase(next);
    setForm(next.form);
  };
  // Sin cambios propios, lo que guardó otra persona se carga solo
  if (stale && !dirty) reload(detail);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const save = useMutation({
    mutationFn: (payload: FpaVersionParamsInput) =>
      api.put<FpaVersionDetail>(`/fpa/versiones/${versionId}/parametros`, payload),
    onSuccess: (saved) => {
      const changed = saved.params.hash !== base.hash;
      reload(saved);
      qc.setQueryData(fpaKeys.version(versionId), saved);
      void qc.invalidateQueries({ queryKey: fpaKeys.versions });
      void qc.invalidateQueries({ queryKey: fpaKeys.budgetsAll });
      void qc.invalidateQueries({ queryKey: fpaKeys.budgetAll });
      void qc.invalidateQueries({ queryKey: fpaKeys.consolidatedAll });
      notify.success(changed ? 'Parámetros guardados. Falta el visto bueno de planeación' : 'Los parámetros no cambiaron');
    },
    onError: (err: Error) => {
      // Otra persona los cambió: se trae lo guardado para que salga el aviso
      if (err instanceof ApiError && err.status === 409) {
        void qc.invalidateQueries({ queryKey: fpaKeys.version(versionId) });
      }
      notify.error(err.message || 'No se pudieron guardar los parámetros');
    },
  });

  if (!canEdit) return <ParamsReadOnly detail={detail} />;

  const setTravel = (key: string, field: TravelField, value: string) =>
    setForm((f) => ({ ...f, travel: { ...f.travel, [key]: { ...f.travel[key], [field]: value } } }));

  const setRate = (key: string, patch: Partial<RateRow>) =>
    setForm((f) => ({ ...f, rates: f.rates.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildPayload(form, detail, base.hash);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    save.mutate(result.payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {stale && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <p>
            Otra persona guardó cambios a estos parámetros mientras editabas. Para no pisarlos, carga lo guardado y vuelve a
            hacer tus cambios.
          </p>
          <button
            type="button"
            onClick={() => reload(detail)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          >
            Cargar lo guardado
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label htmlFor={`${uid}-source`} className={LABEL}>Fuente</label>
          <input
            id={`${uid}-source`}
            type="text"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            maxLength={200}
            placeholder="Ej. Proyecciones Santander, sep-2026"
            className={INPUT}
          />
          <p className="mt-1 text-xs text-gray-500">De dónde salen el tipo de cambio y la inflación</p>
        </div>
        <div>
          <label htmlFor={`${uid}-inflation`} className={LABEL}>Inflación (%)</label>
          <input
            id={`${uid}-inflation`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={form.inflation}
            onChange={(e) => setForm((f) => ({ ...f, inflation: e.target.value }))}
            placeholder="Ej. 3.7"
            className={`${INPUT} text-right tabular-nums`}
          />
          <p className="mt-1 text-xs text-gray-500">Se aplica a las líneas con índice Inflación</p>
        </div>
        {detail.version.kind === 'forecast' && (
          <div>
            <label htmlFor={`${uid}-cutoff`} className={LABEL}>Mes de corte</label>
            <select
              id={`${uid}-cutoff`}
              value={form.cutoff}
              onChange={(e) => setForm((f) => ({ ...f, cutoff: e.target.value }))}
              className={INPUT}
            >
              <option value="" disabled>Elige…</option>
              {MONTH_LABELS.slice(0, 11).map((m, i) => (
                <option key={m} value={String(i + 1)}>Real hasta {m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <fieldset className="min-w-0 space-y-2">
        <legend className="text-sm font-medium text-gray-700">Tipo de cambio (pesos por unidad)</legend>
        {form.rates.length === 0 && <p className="text-sm text-gray-500">Sin otras monedas: todo en pesos.</p>}
        <div className="space-y-2">
          {form.rates.map((row, i) => (
            <div key={row.key} className="flex items-center gap-2">
              <input
                type="text"
                value={row.currency}
                onChange={(e) => setRate(row.key, { currency: e.target.value.toUpperCase().slice(0, 3) })}
                placeholder="USD"
                aria-label={`Moneda del renglón ${i + 1}`}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase text-gray-900 focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={row.rate}
                onChange={(e) => setRate(row.key, { rate: e.target.value })}
                placeholder="Ej. 19.50"
                aria-label={`Tipo de cambio de ${row.currency || 'la moneda'}`}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right tabular-nums text-gray-900 focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, rates: f.rates.filter((r) => r.key !== row.key) }))}
                aria-label={`Quitar ${row.currency || `el renglón ${i + 1}`}`}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, rates: [...f.rates, { key: newRowKey(), currency: '', rate: '' }] }))}
          className="text-sm font-medium text-[#222D59] hover:underline"
        >
          + Agregar moneda
        </button>
        {detail.usage.currencies.length > 0 && (
          <p className="text-xs text-gray-500">Las líneas de esta versión usan: {detail.usage.currencies.join(', ')}</p>
        )}
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="text-sm font-medium text-gray-700">Tarifas de viaje (pesos)</legend>
        <p className="text-xs text-gray-500">
          La política de viajes de la versión: con ellas se calcula cada viaje que capturan las áreas.
        </p>
        <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Concepto</th>
                {COMBOS.map((c) => (
                  <ComboHeader key={c.label} combo={c} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FIELDS.map((f) => (
                <tr key={f.key}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-gray-700">
                    {f.label} <span className="block text-xs font-normal text-gray-400">{f.hint}</span>
                  </th>
                  {COMBOS.map((c) => {
                    const key = comboKey(c.trip, c.traveler);
                    return (
                      <td key={c.label} className="px-2 py-1.5 min-w-[6rem]">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={form.travel[key][f.key]}
                          onChange={(e) => setTravel(key, f.key, e.target.value)}
                          aria-label={`${f.label}, ${c.label.toLowerCase()}`}
                          className={NUM_INPUT}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          {detail.params_approved
            ? 'Guardar un cambio quita el visto bueno: planeación lo vuelve a dar.'
            : 'Al guardar, falta el visto bueno de planeación (lo da otra persona).'}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(base.form)}
            disabled={!dirty || save.isPending}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-40"
          >
            Deshacer
          </button>
          <button
            type="submit"
            disabled={!dirty || stale || save.isPending}
            title={stale ? 'Primero carga lo que guardó la otra persona' : undefined}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50"
          >
            {save.isPending ? 'Guardando…' : 'Guardar parámetros'}
          </button>
        </div>
      </div>
    </form>
  );
}
