import type { AmountLine } from '@/lib/compras-format';

/**
 * K6.3 (2026-10-05) — montos por moneda, uno por renglón, para las tarjetas
 * del tablero y de Reportes. Un renglón `AmountLine` lleva debajo, en letra
 * chica, su dato secundario (el subtotal sin IVA de `formatOrderAmountLines`).
 */
export default function AmountList({ lines, className }: { lines: Array<string | AmountLine>; className: string }) {
  return (
    <ul className={className}>
      {lines.map((line) => {
        const { text, sub } = typeof line === 'string' ? { text: line, sub: undefined } : line;
        return (
          <li key={text} className="tabular-nums break-words">
            {text}
            {sub && <span className="block text-xs text-gray-500 leading-snug">{sub}</span>}
          </li>
        );
      })}
    </ul>
  );
}
