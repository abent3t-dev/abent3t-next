'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  xAxisKey: string;
  color?: string;
  colors?: string[];
  horizontal?: boolean;
  formatValue?: (value: number) => string;
  height?: number;
}

// Tooltip personalizado
const CustomTooltip = ({ active, payload, formatValue }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-1">
          {payload[0].payload[Object.keys(payload[0].payload)[0]]}
        </p>
        <p className="text-lg font-bold" style={{ color: payload[0].fill }}>
          {formatValue ? formatValue(payload[0].value) : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function BarChart({
  data,
  dataKey,
  xAxisKey,
  color = '#52AF32', // A3T Green Primary
  colors,
  horizontal = false,
  formatValue,
  height = 400,
}: BarChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    [xAxisKey]: item[xAxisKey]?.length > 20
      ? item[xAxisKey].substring(0, 20) + '...'
      : item[xAxisKey],
  }));

  // Definir gradiente ID único
  const gradientId = `gradient-${dataKey}-${Math.random().toString(36).substr(2, 9)}`;

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 100, right: 30, top: 10, bottom: 10 }}>
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
            width={100}
            tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip formatValue={formatValue} />} cursor={{ fill: 'rgba(82, 175, 50, 0.05)' }} />
          <Bar
            dataKey={dataKey}
            radius={[0, 8, 8, 0]}
            animationDuration={800}
            animationBegin={0}
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
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={chartData} margin={{ bottom: 60, left: 10, right: 10, top: 10 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.5} />
        <XAxis
          dataKey={xAxisKey}
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} cursor={{ fill: 'rgba(82, 175, 50, 0.05)' }} />
        <Bar
          dataKey={dataKey}
          radius={[8, 8, 0, 0]}
          animationDuration={800}
          animationBegin={0}
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
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
