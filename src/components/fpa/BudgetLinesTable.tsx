'use client';

import {
  CALC_METHOD_LABELS,
  MONTH_LABELS,
  TRIP_TYPE_LABELS,
  type FpaBudgetDetail,
  type FpaCategoryTotal,
  type FpaLine,
  type FpaMonthAmount,
  type Money,
} from '@/types/fpa';
import { formatWithCurrency } from '@/lib/fpa-format';
import FpaAmount from './FpaAmount';

/**
 * FP&A (A3) — líneas de un presupuesto agrupadas por categoría (en el orden
 * de totals.by_category), con los 12 meses y el total, en pesos o en la
 * moneda de cada línea (nunca las dos juntas: 26 columnas no caben a 1280).
 *
 * Encabezado, folio y concepto fijos; el resto se desplaza dentro de la
 * tabla. Las celdas fijas llevan fondo sólido para tapar lo que pasa debajo.
 * Todos los montos son del API; aquí solo se acomodan.
 */

export type AmountMode = 'pesos' | 'original';

export interface LineGroup {
  categoryId: string;
  categoryName: string;
  lines: FpaLine[];
  totals: FpaCategoryTotal | null;
}

const byOrder = (a: FpaLine, b: FpaLine) =>
  a.sort_order - b.sort_order || a.folio.localeCompare(b.folio);

/** Grupos por categoría en el orden de totals.by_category; solo los que tienen líneas. */
export function groupLines(detail: FpaBudgetDetail): LineGroup[] {
  const byCategory = new Map<string, FpaLine[]>();
  for (const line of detail.lines) {
    const list = byCategory.get(line.category.id) ?? [];
    list.push(line);
    byCategory.set(line.category.id, list);
  }
  const groups: LineGroup[] = [];
  for (const totals of detail.totals.by_category) {
    const lines = byCategory.get(totals.category_id);
    if (!lines?.length) continue;
    groups.push({
      categoryId: totals.category_id,
      categoryName: totals.category_name,
      lines: [...lines].sort(byOrder),
      totals,
    });
    byCategory.delete(totals.category_id);
  }
  // Una categoría con líneas que no vino en by_category (no debería pasar):
  // se muestra al final, sin subtotal
  for (const [categoryId, lines] of byCategory) {
    groups.push({ categoryId, categoryName: lines[0].category.name, lines: [...lines].sort(byOrder), totals: null });
  }
  return groups;
}

// ── Clases ──────────────────────────────────────────────────────────────────

const TH_BASE = 'sticky top-0 bg-[#424846] px-2 py-2.5 text-xs font-medium uppercase text-white';
const TH = `${TH_BASE} whitespace-nowrap`;
const TH_FOLIO = `${TH} left-0 z-30 w-20 min-w-20 max-w-20 text-left`;
const TH_CONCEPT = `${TH} left-20 z-30 w-60 min-w-60 max-w-60 text-left border-r border-white/20`;
const TH_PLAIN = `${TH} z-20`;

const TD = 'px-2 py-2 border-b border-gray-200 bg-white group-hover:bg-[#f2f8ef]';
const TD_FOLIO = `${TD} sticky left-0 z-10 w-20 min-w-20 max-w-20`;
const TD_CONCEPT = `${TD} sticky left-20 z-10 w-60 min-w-60 max-w-60 border-r border-gray-200`;
const TD_MONTH = `${TD} min-w-20 text-right text-sm text-gray-900`;
const TD_TOTAL = `${TD} min-w-[7.5rem] text-right text-sm font-semibold text-gray-900 border-l border-gray-200`;

const SUB = 'px-2 py-2 border-b border-gray-300 bg-[#eef0f5] text-sm font-semibold text-[#222D59]';
const FOOT = 'sticky bottom-0 px-2 py-2.5 bg-[#222D59] text-sm font-bold text-white';

const COLUMN_COUNT = 4 + MONTH_LABELS.length + 1;

/** Tooltip de un monto: el modo elegido primero, con centavos, y la otra moneda si aplica. */
function amountTitle(month: FpaMonthAmount | undefined, line: FpaLine, mode: AmountMode): string | undefined {
  if (!month) return undefined;
  const pesos = formatWithCurrency(month.amount_mxn, 'MXN');
  if (line.currency === 'MXN') return pesos;
  const original = formatWithCurrency(month.amount_currency, line.currency);
  return mode === 'pesos' ? `${pesos} · ${original}` : `${original} · ${pesos}`;
}

function totalTitle(line: FpaLine, mode: AmountMode): string {
  const pesos = formatWithCurrency(line.total_mxn, 'MXN');
  if (line.currency === 'MXN') return pesos;
  const original = formatWithCurrency(line.total_currency, line.currency);
  return mode === 'pesos' ? `${pesos} · ${original}` : `${original} · ${pesos}`;
}

/** Debajo del concepto: el proveedor; en un viaje, de qué viaje se trata. */
function lineSubtitle(line: FpaLine): string | null {
  if (line.calc_method === 'viaje' && line.trip) {
    const people: string[] = [];
    if (line.trip.travelers_colaborador > 0) {
      people.push(`${line.trip.travelers_colaborador} ${line.trip.travelers_colaborador === 1 ? 'colaborador' : 'colaboradores'}`);
    }
    if (line.trip.travelers_director > 0) {
      people.push(`${line.trip.travelers_director} ${line.trip.travelers_director === 1 ? 'director' : 'directores'}`);
    }
    const nights = `${line.trip.nights} ${line.trip.nights === 1 ? 'noche' : 'noches'}`;
    return [`Viaje ${TRIP_TYPE_LABELS[line.trip.trip_type]?.toLowerCase() ?? ''}`.trim(), ...people, nights].join(' · ');
  }
  return line.supplier_name;
}

interface BudgetLinesTableProps {
  detail: FpaBudgetDetail;
  groups: LineGroup[];
  mode: AmountMode;
  onOpenLine: (line: FpaLine) => void;
}

function SubtotalCells({ months, total, mode }: { months: Money[] | undefined; total: Money | undefined; mode: AmountMode }) {
  return (
    <>
      {MONTH_LABELS.map((label, i) => (
        <td key={label} className={`${SUB} text-right`}>
          {mode === 'pesos' ? <FpaAmount value={months?.[i]} blankZero /> : <span className="text-gray-400">—</span>}
        </td>
      ))}
      <td className={`${SUB} text-right border-l border-gray-300`}>
        {mode === 'pesos' ? <FpaAmount value={total} /> : <span className="text-gray-400">—</span>}
      </td>
    </>
  );
}

export default function BudgetLinesTable({ detail, groups, mode, onOpenLine }: BudgetLinesTableProps) {
  const onRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, line: FpaLine) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenLine(line);
    }
  };

  return (
    <div className="overflow-auto max-h-[calc(100vh-14rem)] min-h-[16rem] rounded-b-lg">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th scope="col" className={TH_FOLIO}>Folio</th>
            <th scope="col" className={TH_CONCEPT}>Concepto</th>
            {/* En dos renglones: la columna queda del ancho de "Precio × veces" */}
            <th scope="col" className={`${TH_BASE} z-20 text-left leading-tight w-24 min-w-24`}>Forma de cálculo</th>
            <th scope="col" className={`${TH_PLAIN} text-center min-w-[4.5rem]`}>Moneda</th>
            {MONTH_LABELS.map((label) => (
              <th key={label} scope="col" className={`${TH_PLAIN} text-right min-w-20`}>
                {label}
              </th>
            ))}
            <th scope="col" className={`${TH_PLAIN} text-right min-w-[7.5rem] border-l border-white/20`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows key={group.categoryId} group={group} mode={mode} onOpenLine={onOpenLine} onRowKey={onRowKey} />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className={`${FOOT} left-0 z-30 border-r border-white/20`}>
              Total del presupuesto
            </td>
            <td colSpan={2} className={`${FOOT} z-20 text-xs font-normal text-white/80`}>
              {mode === 'pesos' ? 'En pesos' : ''}
            </td>
            {MONTH_LABELS.map((label, i) => (
              <td key={label} className={`${FOOT} z-20 text-right`}>
                {mode === 'pesos' ? (
                  <FpaAmount value={detail.totals.months_mxn[i]} blankZero onDark />
                ) : (
                  <span className="text-white/60">—</span>
                )}
              </td>
            ))}
            <td className={`${FOOT} z-20 text-right border-l border-white/20`}>
              {mode === 'pesos' ? (
                <FpaAmount value={detail.totals.total_mxn} onDark />
              ) : (
                <span className="text-white/60">—</span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function GroupRows({
  group,
  mode,
  onOpenLine,
  onRowKey,
}: {
  group: LineGroup;
  mode: AmountMode;
  onOpenLine: (line: FpaLine) => void;
  onRowKey: (e: React.KeyboardEvent<HTMLTableRowElement>, line: FpaLine) => void;
}) {
  return (
    <>
      {/* Categoría */}
      <tr>
        <th
          scope="rowgroup"
          colSpan={2}
          className="sticky left-0 z-10 px-3 py-1.5 bg-gray-100 border-b border-gray-200 border-r text-left text-xs font-semibold uppercase tracking-wide text-[#424846]"
        >
          {group.categoryName}
          <span className="ml-2 font-normal normal-case tracking-normal text-gray-500">
            {group.lines.length} {group.lines.length === 1 ? 'línea' : 'líneas'}
          </span>
        </th>
        <td colSpan={COLUMN_COUNT - 2} className="bg-gray-100 border-b border-gray-200" />
      </tr>

      {/* Líneas */}
      {group.lines.map((line) => {
        const byMonth = new Map(line.months.map((m) => [m.month, m]));
        const subtitle = lineSubtitle(line);
        return (
          <tr
            key={line.id}
            className="group cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-[#52AF32]"
            tabIndex={0}
            onClick={() => onOpenLine(line)}
            onKeyDown={(e) => onRowKey(e, line)}
          >
            <td className={TD_FOLIO}>
              <div className="w-16 overflow-hidden text-ellipsis font-mono text-xs text-[#222D59]" title={line.folio}>
                {line.folio}
              </div>
            </td>
            <td className={TD_CONCEPT}>
              <div className="w-56 overflow-hidden">
                <p
                  className="truncate text-sm font-medium text-gray-900"
                  title={`${line.concept}\n${line.classification.name} · ${line.department.name}`}
                >
                  {line.concept}
                </p>
                {subtitle && (
                  <p className="truncate text-xs text-gray-500" title={subtitle}>
                    {subtitle}
                  </p>
                )}
              </div>
            </td>
            <td className={`${TD} text-xs text-gray-700 whitespace-nowrap`}>{CALC_METHOD_LABELS[line.calc_method] ?? line.calc_method}</td>
            <td className={`${TD} text-center`}>
              <span className="text-xs font-semibold text-[#424846]">{line.currency}</span>
              {line.price_index === 'inflacion' && (
                <span className="block text-[10px] text-gray-500" title="Al precio se le aplica la inflación de la versión">
                  + inflación
                </span>
              )}
            </td>
            {MONTH_LABELS.map((label, i) => {
              const month = byMonth.get(i + 1);
              const value = month ? (mode === 'pesos' ? month.amount_mxn : month.amount_currency) : undefined;
              return (
                <td key={label} className={TD_MONTH}>
                  <FpaAmount
                    value={value}
                    kind={mode}
                    blankZero
                    compact
                    reason={line.unavailable_reason}
                    title={amountTitle(month, line, mode)}
                  />
                </td>
              );
            })}
            <td className={TD_TOTAL}>
              <FpaAmount
                value={mode === 'pesos' ? line.total_mxn : line.total_currency}
                kind={mode}
                reason={line.unavailable_reason}
                title={totalTitle(line, mode)}
              />
            </td>
          </tr>
        );
      })}

      {/* Subtotal de la categoría (en pesos; en moneda original mezclaría monedas) */}
      <tr>
        <td colSpan={2} className={`${SUB} sticky left-0 z-10 border-r`}>
          Subtotal {group.categoryName}
        </td>
        <td colSpan={2} className={SUB} />
        <SubtotalCells months={group.totals?.months_mxn} total={group.totals?.total_mxn} mode={mode} />
      </tr>
    </>
  );
}
