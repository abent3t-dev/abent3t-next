'use client';

/**
 * Componentes UI compartidos para la sección de Crehana
 * (página principal y detalle de colaborador).
 */

const AVATAR_GRADIENTS = [
  'from-[#52AF32] to-[#67B52E]',
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-600',
  'from-indigo-500 to-indigo-600',
  'from-rose-500 to-rose-600',
];

function gradientFor(name: string): string {
  const idx = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export function Avatar({
  name,
  linked,
  size = 'md',
}: {
  name: string;
  linked?: boolean;
  size?: 'md' | 'xl';
}) {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?';

  const sizeClasses =
    size === 'xl' ? 'w-20 h-20 text-2xl' : 'w-9 h-9 text-xs';
  const dotClasses =
    size === 'xl' ? 'w-5 h-5 bottom-1 right-1' : 'w-3 h-3 -bottom-0.5 -right-0.5';

  return (
    <div className="relative shrink-0">
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br ${gradientFor(name)} text-white font-semibold flex items-center justify-center ring-2 ring-white shadow-md`}
      >
        {initials}
      </div>
      {linked && (
        <span
          className={`absolute ${dotClasses} rounded-full bg-green-500 ring-2 ring-white`}
          title="Enlazado a ABENT"
        />
      )}
    </div>
  );
}

/**
 * Normaliza una URL externa que puede venir sin protocolo desde Crehana
 * (p.ej. "crehana.com/diplomas/abc"). Si ya viene con http(s) la deja igual.
 * Devuelve null si la URL es vacía o inválida.
 */
export function normalizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color =
    v >= 100
      ? 'bg-green-500'
      : v >= 70
      ? 'bg-[#52AF32]'
      : v >= 40
      ? 'bg-yellow-400'
      : v > 0
      ? 'bg-orange-400'
      : 'bg-gray-200';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-9 text-right">{v}%</span>
    </div>
  );
}
