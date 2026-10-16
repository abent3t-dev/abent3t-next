'use client';

import React, { useId } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  Legend,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

interface BarChartProps<T extends object> {
  data: T[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  colors?: string[];
  horizontal?: boolean;
  formatValue?: (value: number) => string;
  height?: number;
  /**
   * M1/M2 (2026-10-14): contenido propio del tooltip. Recibe el elemento
   * original de `data` (con el nombre completo, sin recortar).
   */
  tooltip?: (item: T) => React.ReactNode;
  /** M2: texto al final de cada barra (p. ej. la N: "45 OC"). */
  barLabel?: (item: T) => string;
  /**
   * Barras horizontales: ancho del eje de nombres. Con él, el margen
   * izquierdo fijo de 100 px baja a 8 px (el ancho ya alcanza para el nombre).
   */
  yAxisWidth?: number;
  /** Caracteres del nombre antes de recortarlo con "..." (20 si no se dice). */
  maxLabelLength?: number;
  /**
   * N1 (2026-10-16): barras verticales AGRUPADAS, una por serie (p. ej.
   * "Monto adjudicado" y "Ahorro" por persona), con leyenda. Sin `series` la
   * gráfica es la de una sola serie de siempre (`dataKey`). `colors` por
   * barra (índice de `data`) y `label` (texto arriba de la barra) son por
   * serie. Solo en vertical. `axis: 'right'` pone la serie en un segundo eje
   * (a la derecha, con su color): para montos de escalas muy distintas, como
   * el ahorro junto al monto adjudicado.
   */
  series?: Array<{
    dataKey: string;
    name: string;
    color: string;
    colors?: string[];
    label?: (item: T) => string;
    axis?: 'left' | 'right';
  }>;
  /** Vertical: ángulo de los nombres del eje X (-45 si no se dice). */
  xLabelAngle?: number;
  /** Vertical: alto del eje X (80 si no se dice), para nombres largos. */
  xAxisHeight?: number;
}

/** Posición del elemento en `data` (para el tooltip y la etiqueta propios). */
const INDEX_KEY = '__index';

type DefaultTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; fill?: string; payload?: Record<string, unknown> }>;
  formatValue?: (value: number) => string;
};

// Tooltip personalizado
const CustomTooltip = ({ active, payload, formatValue }: DefaultTooltipProps) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload ?? {};
    const value = payload[0].value;
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-1">
          {String(item[Object.keys(item)[0]] ?? '')}
        </p>
        <p className="text-lg font-bold" style={{ color: payload[0].fill }}>
          {formatValue ? formatValue(Number(value)) : String(value ?? '')}
        </p>
      </div>
    );
  }
  return null;
};

export function BarChart<T extends object>({
  data,
  dataKey,
  xAxisKey,
  color = '#52AF32', // A3T Green Primary
  colors,
  horizontal = false,
  formatValue,
  height = 400,
  tooltip,
  barLabel,
  yAxisWidth,
  maxLabelLength = 20,
  series,
  xLabelAngle = -45,
  xAxisHeight = 80,
}: BarChartProps<T>) {
  const chartId = useId();
  const chartData = data.map((item, index) => {
    const label = (item as Record<string, unknown>)[xAxisKey];
    return {
      ...item,
      [xAxisKey]:
        typeof label === 'string' && label.length > maxLabelLength
          ? label.substring(0, maxLabelLength) + '...'
          : label,
      [INDEX_KEY]: index,
    };
  });
  const original = (entry: unknown): T | undefined => {
    const index = (entry as Record<string, unknown> | undefined)?.[INDEX_KEY];
    return typeof index === 'number' ? data[index] : undefined;
  };

  // Gradiente con ID estable y único por gráfica (antes Math.random en cada render)
  const gradientId = `gradient-${dataKey}-${chartId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const tooltipContent = tooltip ? (
    (props: TooltipContentProps) => {
      const item = props.active ? original(props.payload?.[0]?.payload) : undefined;
      if (!item) return null;
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm text-gray-700 max-w-xs">
          {tooltip(item)}
        </div>
      );
    }
  ) : (
    <CustomTooltip formatValue={formatValue} />
  );
  const labelList = barLabel ? (
    <LabelList
      dataKey={(entry: unknown) => {
        const item = original(entry);
        return item ? barLabel(item) : '';
      }}
      position={horizontal ? 'right' : 'top'}
      fill="#4b5563"
      fontSize={11}
    />
  ) : null;

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={chartData}
          layout="vertical"
          margin={{ left: yAxisWidth ? 8 : 100, right: barLabel ? 64 : 30, top: 10, bottom: 10 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.5} />
          <XAxis
            type="number"
            tickFormatter={formatValue}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            type="category"
            dataKey={xAxisKey}
            width={yAxisWidth ?? 100}
            tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(82, 175, 50, 0.05)' }} />
          <Bar
            dataKey={dataKey}
            radius={[0, 8, 8, 0]}
            animationDuration={800}
            animationBegin={0}
            // con etiqueta, una barra en 0 se dibuja mínima para que su texto (la N) se vea
            minPointSize={barLabel ? 2 : 0}
          >
            {colors ? (
              chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))
            ) : (
              chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} />
              ))
            )}
            {labelList}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  if (series) {
    const right = series.find((x) => x.axis === 'right');
    const order = series.map((x) => x.dataKey);
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={chartData} margin={{ bottom: 10, left: 10, right: 10, top: 24 }} barGap={2}>
          <CartesianGrid yAxisId="left" strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.5} />
          <XAxis
            dataKey={xAxisKey}
            angle={xLabelAngle}
            textAnchor={xLabelAngle === 0 ? 'middle' : 'end'}
            height={xAxisHeight}
            interval={0}
            tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={formatValue}
            tick={{ fill: right ? (series.find((x) => x.axis !== 'right')?.color ?? '#6b7280') : '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          {right && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatValue}
              tick={{ fill: right.color, fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
          )}
          <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(82, 175, 50, 0.05)' }} />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="square"
            wrapperStyle={{ fontSize: 12 }}
            // en el orden de las series (por defecto las ordena alfabéticamente)
            itemSorter={(item) => order.indexOf(String(item.dataKey))}
          />
          {series.map((s) => (
            <Bar
              key={s.dataKey}
              yAxisId={s.axis === 'right' ? 'right' : 'left'}
              dataKey={s.dataKey}
              name={s.axis === 'right' ? `${s.name} (eje derecho)` : s.name}
              fill={s.color}
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationBegin={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${s.dataKey}-${index}`} fill={s.colors?.[index] ?? s.color} />
              ))}
              {s.label && (
                <LabelList
                  dataKey={(entry: unknown) => {
                    const item = original(entry);
                    return item && s.label ? s.label(item) : '';
                  }}
                  position="top"
                  fill="#4b5563"
                  fontSize={11}
                />
              )}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={chartData} margin={{ bottom: 60, left: 10, right: 10, top: barLabel ? 24 : 10 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.5} />
        <XAxis
          dataKey={xAxisKey}
          angle={xLabelAngle}
          textAnchor="end"
          height={xAxisHeight}
          interval={0}
          tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(82, 175, 50, 0.05)' }} />
        <Bar
          dataKey={dataKey}
          radius={[8, 8, 0, 0]}
          animationDuration={800}
          animationBegin={0}
          minPointSize={barLabel ? 2 : 0}
        >
          {colors ? (
            chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))
          ) : (
            chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} />
            ))
          )}
          {labelList}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
