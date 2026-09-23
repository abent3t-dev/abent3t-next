'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatAmountLines, NO_DISPONIBLE } from '@/lib/compras-format';
import type { OrdersKpiSource, OrdersKpis } from '@/types/purchases';

/**
 * D5 (2026-09-23, Ingrid) — Arriba de Órdenes: "Ahorro acumulado" (cochinito)
 * y "CAPEX / OPEX" (casita), SAP + Maximo por moneda. Respetan el año (D4)
 * y no cuentan dos veces las OC migradas (D1). Sin captura → "No disponible
 * (sin captura)", nunca 0.
 */

const Icons = {
  piggy: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 11a5 5 0 0 1 5-5h4a5 5 0 0 1 4.9 4H20a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.3a5 5 0 0 1-1.7 2.2V19a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1h-4v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1.8A5 5 0 0 1 5 13v-2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6V4.5a1.5 1.5 0 0 1 3 0V6M4 12H3M15.5 11.5h.01" />
    </svg>
  ),
  house: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-5h4v5" />
    </svg>
  ),
};

function sourceLine(label: string, s: OrdersKpiSource) {
  if (s.documentos === 0) return `${label}: sin captura`;
  return `${label}: ${formatAmountLines(s.por_moneda).join(' · ')} (${s.documentos.toLocaleString('es-MX')} OC)`;
}

export default function OrdersKpiCards({ year }: { year: number | null }) {
  const q = useQuery({
    queryKey: ['compras', 'dashboard', 'ordenes-kpis', year],
    queryFn: () => api.get<OrdersKpis>(`/compras/dashboard/ordenes-kpis${year ? `?year=${year}` : ''}`),
  });
  const kpis = q.data;

  if (q.isError) {
    return (
      <div className="bg-white p-4 rounded-lg shadow text-sm text-red-600">
        No se pudieron cargar las tarjetas de ahorro y CAPEX/OPEX.
      </div>
    );
  }

  const ahorroLines = kpis
    ? kpis.ahorro.disponible
      ? formatAmountLines(kpis.ahorro.por_moneda)
      : []
    : [];
  const capexLines = kpis && kpis.clasificacion.capex.documentos > 0 ? formatAmountLines(kpis.clasificacion.capex.por_moneda) : [];
  const opexLines = kpis && kpis.clasificacion.opex.documentos > 0 ? formatAmountLines(kpis.clasificacion.opex.por_moneda) : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Ahorro acumulado */}
      <div
        className="bg-white p-4 rounded-lg shadow border-l-4 border-[#DFA922]"
        title={kpis?.ahorro.nota ?? 'Ahorro capturado en SAP (U_Imp_ahorro) y Maximo (AB_AHORRO)'}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-gray-600">
              Ahorro acumulado{year ? ` ${year}` : ''}
              <span className="ml-1 text-gray-400 cursor-help" aria-label="Definición">ⓘ</span>
            </p>
            {!kpis ? (
              <div className="mt-2 w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
            ) : !kpis.ahorro.disponible ? (
              <>
                <p className="text-2xl font-bold text-gray-500 italic">{NO_DISPONIBLE}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Sin captura de ahorro en SAP ni Maximo todavía (SAP: campo obligatorio solicitado a Henry; Maximo: pendiente CIISA).
                </p>
              </>
            ) : (
              <>
                <ul className="mt-1 space-y-0.5">
                  {ahorroLines.map((l) => (
                    <li key={l} className="text-2xl font-bold text-[#424846] tabular-nums leading-tight">{l}</li>
                  ))}
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  {kpis.ahorro.documentos.toLocaleString('es-MX')} OC con ahorro capturado ·{' '}
                  {sourceLine('SAP', kpis.ahorro.por_fuente.sap)} · {sourceLine('Maximo', kpis.ahorro.por_fuente.maximo)}
                </p>
              </>
            )}
          </div>
          <div className="text-[#DFA922] shrink-0">{Icons.piggy}</div>
        </div>
      </div>

      {/* CAPEX / OPEX */}
      <div
        className="bg-white p-4 rounded-lg shadow border-l-4 border-[#222D59]"
        title={kpis?.clasificacion.nota ?? 'Clasificación CAPEX/OPEX de las OC (SAP por línea; Maximo AB_CLASFPO)'}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 w-full">
            <p className="text-sm text-gray-600">
              CAPEX / OPEX{year ? ` ${year}` : ''}
              <span className="ml-1 text-gray-400 cursor-help" aria-label="Definición">ⓘ</span>
            </p>
            {!kpis ? (
              <div className="mt-2 w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
            ) : !kpis.clasificacion.disponible ? (
              <>
                <p className="text-2xl font-bold text-gray-500 italic">{NO_DISPONIBLE}</p>
                <p className="text-xs text-gray-600 mt-1">Sin OC clasificadas como CAPEX u OPEX todavía (captura de Compras en SAP; Maximo pendiente CIISA).</p>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-1">
                {[
                  { key: 'CAPEX', lines: capexLines, data: kpis.clasificacion.capex },
                  { key: 'OPEX', lines: opexLines, data: kpis.clasificacion.opex },
                ].map((c) => (
                  <div key={c.key} className="min-w-0">
                    <p className="text-xs font-semibold text-[#222D59]">{c.key}</p>
                    {c.data.documentos === 0 ? (
                      <p className="text-sm text-gray-500 italic">Sin OC</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {c.lines.map((l) => (
                          <li key={l} className="text-lg font-bold text-[#424846] tabular-nums leading-tight break-words">{l}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {c.data.documentos.toLocaleString('es-MX')} OC · SAP {c.data.por_fuente.sap.documentos.toLocaleString('es-MX')} · Maximo {c.data.por_fuente.maximo.documentos.toLocaleString('es-MX')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-[#222D59] shrink-0">{Icons.house}</div>
        </div>
      </div>
    </div>
  );
}
