interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'navy' | 'green' | 'green-light' | 'gold' | 'dark' | 'gray';
  icon?: React.ReactNode;
}

// A3T Brand Colors using bracket syntax for Tailwind
const colorConfig = {
  navy: {
    text: 'text-[#222D59]',
    bg: 'bg-[#222D59]',
    bgLight: 'bg-[#222D59]/10',
    border: 'border-[#222D59]/20',
  },
  green: {
    text: 'text-[#52AF32]',
    bg: 'bg-[#52AF32]',
    bgLight: 'bg-[#52AF32]/10',
    border: 'border-[#52AF32]/20',
  },
  'green-light': {
    text: 'text-[#67B52E]',
    bg: 'bg-[#67B52E]',
    bgLight: 'bg-[#67B52E]/10',
    border: 'border-[#67B52E]/20',
  },
  gold: {
    text: 'text-[#DFA922]',
    bg: 'bg-[#DFA922]',
    bgLight: 'bg-[#DFA922]/10',
    border: 'border-[#DFA922]/20',
  },
  dark: {
    text: 'text-[#424846]',
    bg: 'bg-[#424846]',
    bgLight: 'bg-[#424846]/10',
    border: 'border-[#424846]/20',
  },
  gray: {
    text: 'text-gray-600',
    bg: 'bg-gray-600',
    bgLight: 'bg-gray-100',
    border: 'border-gray-200',
  },
};

export function KpiCard({ title, value, subtitle, color = 'green', icon }: KpiCardProps) {
  const colors = colorConfig[color];

  return (
    <div
      className={`
        relative bg-white p-5 rounded-xl shadow-sm border ${colors.border}
        hover:shadow-md hover:scale-[1.02] transition-all duration-200 ease-in-out
        overflow-hidden
      `}
    >
      {/* Decorative accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colors.bg}`} />

      {/* Icon container (optional) */}
      {icon && (
        <div className={`${colors.bgLight} ${colors.text} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
          {icon}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-[#424846]/70 mb-1">{title}</p>

      {/* Value */}
      <p className={`text-3xl font-bold ${colors.text} tracking-tight`}>{value}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-[#424846]/50 mt-2">{subtitle}</p>
      )}
    </div>
  );
}
