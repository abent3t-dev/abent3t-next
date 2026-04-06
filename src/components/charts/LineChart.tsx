'use client';

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

interface LineChartProps {
  data: Array<Record<string, any>>;
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  xAxisKey: string;
  formatValue?: (value: number) => string;
  height?: number;
}

// Tooltip personalizado
const CustomTooltip = ({ active, payload, formatValue }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-2">
          {payload[0].payload[Object.keys(payload[0].payload)[0]]}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-600">{entry.name}:</span>
            <span className="text-sm font-bold" style={{ color: entry.color }}>
              {formatValue ? formatValue(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Legend personalizada
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex justify-center gap-6 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-700 font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function LineChart({
  data,
  lines,
  xAxisKey,
  formatValue,
  height = 400,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
        <defs>
          {lines.map((line) => (
            <linearGradient
              key={`gradient-${line.dataKey}`}
              id={`gradient-${line.dataKey}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={line.color} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.5} />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        <Legend content={<CustomLegend />} />

        {/* Áreas de fondo para efecto visual */}
        {lines.map((line) => (
          <Area
            key={`area-${line.dataKey}`}
            type="monotone"
            dataKey={line.dataKey}
            fill={`url(#gradient-${line.dataKey})`}
            stroke="none"
            animationDuration={1000}
          />
        ))}

        {/* Líneas principales */}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={3}
            dot={{
              r: 5,
              fill: '#ffffff',
              stroke: line.color,
              strokeWidth: 2,
            }}
            activeDot={{
              r: 7,
              fill: line.color,
              stroke: '#ffffff',
              strokeWidth: 2,
            }}
            animationDuration={1000}
            animationBegin={0}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
