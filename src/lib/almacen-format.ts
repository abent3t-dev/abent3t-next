/**
 * Almacén — formatos de la página del inventario al corte. Las fechas llegan
 * sin zona ('AAAA-MM-DDTHH:MM:SS', hora de México como en Maximo) y se
 * muestran tal cual: pasarlas por Date las correría según la zona del equipo.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2026-10-30T11:13:38' → '30-oct-2026'. */
export function fechaCorta(f: string | null): string {
  if (!f) return '—';
  return `${f.slice(8, 10)}-${MESES[Number(f.slice(5, 7)) - 1]}-${f.slice(0, 4)}`;
}

/** '2026-10-30T11:13:38' → '30-oct-2026 11:13'. */
export function fechaHora(f: string | null): string {
  if (!f) return '—';
  return `${fechaCorta(f)} ${f.slice(11, 16)}`;
}

/** '2026-11-09T08:00:00' → '9 de noviembre de 2026 a las 8:00'. */
export function fechaCorteLarga(f: string): string {
  const hora = `${Number(f.slice(11, 13))}:${f.slice(14, 16)}`;
  return `${Number(f.slice(8, 10))} de ${MESES_LARGOS[Number(f.slice(5, 7)) - 1]} de ${f.slice(0, 4)} a las ${hora}`;
}

const PESOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** $32,333,461.76 */
export function pesos(x: number | null): string {
  return x === null ? '—' : PESOS.format(x);
}

/** $32.3 M, $431.2 mil o $988 para las gráficas. */
export function pesosCorto(x: number): string {
  const a = Math.abs(x);
  if (a >= 1_000_000) return `$${(x / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} M`;
  if (a >= 1_000) return `$${(x / 1_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} mil`;
  return `$${x.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
}

/** Cantidades: hasta 4 decimales, sin ceros de más (34,449.86). */
export function cantidad(x: number): string {
  return x.toLocaleString('es-MX', { maximumFractionDigits: 4 });
}

/** Costo en su moneda: 145.56 USD. */
export function costoMoneda(costo: number | null, moneda: string | null): string {
  if (costo === null || !moneda) return '—';
  return `${costo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${moneda}`;
}

/** Tipo de cambio con 4 decimales; en pesos, 1. */
export function tipoCambio(x: number | null): string {
  if (x === null) return '—';
  return x === 1 ? '1' : x.toLocaleString('es-MX', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/** Primer nivel de la clasificación ('PARTES \ MEC \ BOYA' → 'PARTES'). */
export function clasificacionNivel1(c: string | null): string {
  const n = (c ?? '').split('\\').map((s) => s.trim()).filter(Boolean);
  return n[0] ?? 'Sin clasificación';
}
