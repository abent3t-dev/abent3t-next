'use client';

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PieChartProps<T extends object> {
  data: T[];
  dataKey: string;
  nameKey: string;
  colors?: string[];
  formatValue?: (value: number) => string;
  /** Alto del área de la dona; la leyenda va debajo y no le quita espacio. */
  height?: number;
  /** Texto bajo el total en el centro de la dona. */
  centerCaption?: string;
  /** Clic en una rebanada o en su renglón de la leyenda (sprint compras A2). */
  onSliceClick?: (entry: Record<string, unknown>) => void;
}

// A3T Color Palette
const DEFAULT_COLORS = [
  '#52AF32', // A3T Green Primary
  '#222D59', // A3T Blue Navy
  '#DFA922', // A3T Gold
  '#3b82f6', // Info Blue
  '#f97316', // Pending Orange
  '#424846', // A3T Gray Dark
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#ec4899', // Pink
  '#9ca3af', // Gray
];

/** Por debajo de este porcentaje la rebanada no lleva texto: se lee en la leyenda. */
const MIN_LABEL_PERCENT = 0.07;
const RADIAN = Math.PI / 180;

interface Slice {
  row: Record<string, unknown>;
  name: string;
  value: number;
  percent: number;
  color: string;
}

const formatPercent = (percent: number) =>
  `${(percent * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

interface SliceLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  payload?: { color?: string };
}

/** Rebanada clara (gris, naranja, dorado): el blanco encima no se lee. */
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** Porcentaje dentro del anillo (nunca fuera: afuera se corta o se enciman). */
function SliceLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, payload }: SliceLabelProps) {
  // Una sola rebanada (100%): la etiqueta no cabe en el anillo y ya está en la leyenda y al centro
  if (percent < MIN_LABEL_PERCENT || percent > 0.999) return null;
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const light = isLight(payload?.color ?? '#000000');
  return (
    <text
      x={x}
      y={y}
      fill={light ? '#1f2937' : '#ffffff'}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
      style={
        light
          ? { pointerEvents: 'none' }
          : { pointerEvents: 'none', paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.25)', strokeWidth: 2 }
      }
    >
      {formatPercent(percent)}
    </text>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { name?: string; value?: number; percent?: number; color?: string } }>;
  formatValue?: (value: number) => string;
}

function PieTooltip({ active, payload, formatValue }: TooltipProps) {
  const slice = active ? payload?.[0]?.payload : undefined;
  if (!slice || slice.value === undefined) return null;
  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-semibold text-gray-900 mb-1">{slice.name}</p>
      <p
        className="text-lg font-bold"
        style={{ color: slice.color && !isLight(slice.color) ? slice.color : '#374151' }}
      >
        {formatValue ? formatValue(slice.value) : slice.value.toLocaleString('es-MX')}
      </p>
      <p className="text-xs text-gray-600 mt-1">{formatPercent(slice.percent ?? 0)} del total</p>
    </div>
  );
}

export function PieChart<T extends object>({
  data,
  dataKey,
  nameKey,
  colors = DEFAULT_COLORS,
  formatValue,
  height = 280,
  centerCaption = 'total',
  onSliceClick,
}: PieChartProps<T>) {
  const rows = data as Array<Record<string, unknown>>;
  const total = rows.reduce((acc, row) => acc + (Number(row[dataKey]) || 0), 0);
  const slices: Slice[] = rows.map((row, index) => {
    const value = Number(row[dataKey]) || 0;
    return {
      row,
      name: String(row[nameKey] ?? ''),
      value,
      percent: total > 0 ? value / total : 0,
      color: colors[index % colors.length],
    };
  });
  const format = (value: number) => (formatValue ? formatValue(value) : value.toLocaleString('es-MX'));
  const nonZero = slices.filter((s) => s.value > 0).length;

  return (
    <div className="@container">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={nonZero > 1 ? 1.5 : 0}
              label={SliceLabel}
              labelLine={false}
              isAnimationActive={false}
              onClick={
                onSliceClick
                  ? (entry: unknown) => {
                      const slice = (entry as { payload?: Slice } | undefined)?.payload;
                      if (slice) onSliceClick(slice.row);
                    }
                  : undefined
              }
              style={onSliceClick ? { cursor: 'pointer' } : undefined}
            >
              {slices.map((slice, index) => (
                <Cell key={`cell-${index}`} fill={slice.color} stroke="#ffffff" strokeWidth={nonZero > 1 ? 2 : 0} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ zIndex: 20 }}
              content={(props) => <PieTooltip {...(props as TooltipProps)} formatValue={formatValue} />}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
        {/* Total al centro de la dona */}
        <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center px-[30%]">
          <span className="text-lg font-bold text-[#424846] leading-tight break-all">{format(total)}</span>
          <span className="text-xs text-gray-600">{centerCaption}</span>
        </div>
      </div>

      {/* Leyenda con nombre, valor y %: nada se corta ni se encima.
          Columnas según el ancho de la tarjeta (@container), no de la ventana. */}
      <ul className="mt-4 grid grid-cols-1 @md:grid-cols-2 gap-x-6 gap-y-1">
        {slices.map((slice, index) => {
          const content = (
            <>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="flex-1 min-w-0 text-left text-gray-800 break-words">{slice.name}</span>
              <span className="shrink-0 text-gray-900 font-semibold tabular-nums">{format(slice.value)}</span>
              <span className="shrink-0 w-14 text-right text-gray-600 tabular-nums">{formatPercent(slice.percent)}</span>
            </>
          );
          return (
            <li key={`legend-${index}`}>
              {onSliceClick ? (
                <button
                  type="button"
                  onClick={() => onSliceClick(slice.row)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm hover:bg-gray-100 transition-colors"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1 text-sm">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
