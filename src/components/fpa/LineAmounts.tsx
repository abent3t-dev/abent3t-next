'use client';

import { MONTH_LABELS, type FpaLine, type FpaMonthInput } from '@/types/fpa';
import { formatNumber, formatWithCurrency } from '@/lib/fpa-format';
import FpaAmount, { noDisponibleTitle } from './FpaAmount';

/**
 * FP&A (A3) — lo guardado de una línea, mes por mes: lo que se capturó
 * (veces, precio del mes, monto o viajes) y lo que calculó el API, con
 * centavos, en la moneda de la línea y en pesos. Solo lectura.
 */

const quantityText = (value: string) =>
  Number.isFinite(Number(value))
    ? Number(value).toLocaleString('es-MX', { maximumFractionDigits: 4 })
    : value;

const priceText = (value: string) =>
  Number.isFinite(Number(value))
    ? Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    : value;

interface CapturedRow {
  label: string;
  get: (m: FpaMonthInput) => string | null;
}

function capturedRows(line: FpaLine): CapturedRow[] {
  if (line.calc_method === 'precio_veces') {
    const rows: CapturedRow[] = [
      { label: 'Veces', get: (m) => (m.quantity ? quantityText(m.quantity) : null) },
    ];
    if (line.months_input.some((m) => m.unit_price)) {
      rows.push({
        label: `Precio del mes (${line.currency})`,
        get: (m) => (m.unit_price ? priceText(m.unit_price) : null),
      });
    }
    return rows;
  }
  if (line.calc_method === 'monto_mes') {
    return [{ label: `Monto capturado (${line.currency})`, get: (m) => (m.amount ? formatNumber(m.amount, true) : null) }];
  }
  return [
    {
      label: 'Viajes',
      get: (m) => (m.trips !== null && m.trips !== undefined ? m.trips.toLocaleString('es-MX') : null),
    },
  ];
}

const TH = 'px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap';
const ROW_TH = 'px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap bg-white sticky left-0';
const TD = 'px-2 py-1.5 text-right tabular-nums whitespace-nowrap';

export default function LineAmounts({ line }: { line: FpaLine }) {
  const inputs = new Map(line.months_input.map((m) => [m.month, m]));
  const amounts = new Map(line.months.map((m) => [m.month, m]));
  const rows = capturedRows(line);
  const isMxn = line.currency === 'MXN';

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className={`${ROW_TH} bg-gray-50 text-gray-500`}>
              <span className="sr-only">Concepto</span>
            </th>
            {MONTH_LABELS.map((label) => (
              <th key={label} scope="col" className={TH}>
                {label}
              </th>
            ))}
            <th scope="col" className={`${TH} border-l border-gray-200`}>Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className={ROW_TH}>{row.label}</th>
              {MONTH_LABELS.map((label, i) => {
                const input = inputs.get(i + 1);
                return (
                  <td key={label} className={`${TD} text-gray-700`}>
                    {input ? row.get(input) : null}
                  </td>
                );
              })}
              <td className={`${TD} border-l border-gray-200`} />
            </tr>
          ))}
          {!isMxn && (
            <tr>
              <th scope="row" className={ROW_TH}>Monto en {line.currency}</th>
              {MONTH_LABELS.map((label, i) => (
                <td key={label} className={`${TD} text-gray-900`}>
                  <FpaAmount
                    value={amounts.get(i + 1)?.amount_currency}
                    kind="original"
                    cents
                    blankZero
                    compact
                    reason={line.unavailable_reason}
                    title={formatWithCurrency(amounts.get(i + 1)?.amount_currency ?? null, line.currency)}
                  />
                </td>
              ))}
              <td className={`${TD} font-semibold text-gray-900 border-l border-gray-200`}>
                <FpaAmount value={line.total_currency} kind="original" cents reason={line.unavailable_reason} />
              </td>
            </tr>
          )}
          <tr className="bg-[#f2f8ef]">
            <th scope="row" className={`${ROW_TH} bg-[#f2f8ef] text-[#3d8425]`}>Monto en pesos</th>
            {MONTH_LABELS.map((label, i) => (
              <td key={label} className={`${TD} text-gray-900`}>
                <FpaAmount value={amounts.get(i + 1)?.amount_mxn} cents blankZero compact reason={line.unavailable_reason} />
              </td>
            ))}
            <td
              className={`${TD} font-bold text-[#222D59] border-l border-gray-200`}
              title={line.total_mxn === null ? noDisponibleTitle(line.unavailable_reason) : undefined}
            >
              <FpaAmount value={line.total_mxn} cents reason={line.unavailable_reason} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
