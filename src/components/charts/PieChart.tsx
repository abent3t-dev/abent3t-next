'use client';

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PieChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  nameKey: string;
  colors?: string[];
  formatValue?: (value: number) => string;
  height?: number;
}

// A3T Color Palette
const DEFAULT_COLORS = [
  '#52AF32', // A3T Green Primary
  '#222D59', // A3T Blue Navy
  '#DFA922', // A3T Gold
  '#67B52E', // A3T Green Secondary 1
  '#3b82f6', // Info Blue
  '#f59e0b', // Warning
  '#74B82B', // A3T Green Secondary 2
  '#f97316', // Pending Orange
  '#424846', // A3T Gray Dark
  '#10b981', // Success Green
];

// Label personalizado con mejor estilo
const renderCustomLabel = (entry: any, total: number) => {
  const percent = ((entry.value / total) * 100).toFixed(1);
  return `${percent}%`;
};

export function PieChart({
  data,
  dataKey,
  nameKey,
  colors = DEFAULT_COLORS,
  formatValue,
  height = 400,
}: PieChartProps) {
  const total = data.reduce((acc, item) => acc + item[dataKey], 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const name = payload[0].name;
      const percent = ((value / total) * 100).toFixed(1);

      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-1">{name}</p>
          <p className="text-lg font-bold" style={{ color: payload[0].payload.fill }}>
            {formatValue ? formatValue(value) : value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{percent}% del total</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-700 font-medium">
              {entry.value.length > 20 ? entry.value.substring(0, 20) + '...' : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <defs>
          {colors.map((color, index) => (
            <filter key={`shadow-${index}`} id={`shadow-${index}`} height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.2" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={130}
          paddingAngle={2}
          label={(entry) => renderCustomLabel(entry, total)}
          labelLine={{
            stroke: '#9ca3af',
            strokeWidth: 1,
          }}
          animationDuration={1000}
          animationBegin={0}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke="#ffffff"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
