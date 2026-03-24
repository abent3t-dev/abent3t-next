interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'gray';
}

const colorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  gray: 'text-gray-600',
};

export function KpiCard({ title, value, subtitle, color = 'blue' }: KpiCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
