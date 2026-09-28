'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDays, NO_DISPONIBLE } from '@/lib/compras-format';
import { AprobadoresReport, ApproverRow, approverHref } from '@/types/purchases';
import ExportExcelButton from './ExportExcelButton';

/**
 * G5 (reunión con Ingrid 2026-09-28) — Histórico por aprobador con periodo:
 * aprobadas (N y días desde que el documento LE LLEGÓ, no desde que se
 * creó), rechazadas y lo que tiene pendiente hoy con su antigüedad ("aquí
 * parece que David es el mejor aprobador y la verdad me tarda mucho"). El
 * nombre lleva a sus pendientes; el Excel respeta el periodo.
 */

type Preset = '12m' | 'anio' | 'trimestre' | 'mes';

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function rangeOf(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = isoLocal(now);
  if (preset === 'anio') return { from: `${now.getFullYear()}-01-01`, to };
  if (preset === 'trimestre') return { from: isoLocal(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to };
  if (preset === 'mes') return { from: isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  return { from: isoLocal(new Date(now.getFullYear(), now.getMonth() - 11, 1)), to };
}

const PRESETS: Array<[Preset, string]> = [
  ['12m', 'Últimos 12 meses'],
  ['anio', 'Este año'],
  ['trimestre', 'Trimestre'],
  ['mes', 'Este mes'],
];

const days = (v: number | null | undefined) => (v === null || v === undefined ? '—' : formatDays(v));

function ApproverTable({ rows, system }: { rows: ApproverRow[]; system: 'sap' | 'maximo' }) {
  if (rows.length === 0) {
    return <p className="p-6 text-sm text-gray-500">Sin aprobaciones en el periodo.</p>;
  }
  const th = 'px-3 py-2.5 text-xs font-medium text-white uppercase';
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[#424846]">
          <tr>
            <th className={`${th} text-left`}>Aprobador</th>
            {system === 'maximo' && <th className={`${th} text-left`}>Niveles</th>}
            <th className={`${th} text-right`}>Aprobadas</th>
            <th className={`${th} text-right`} title="Días desde que el documento le llegó hasta que lo aprobó">
              Días prom.
            </th>
            <th className={`${th} text-right`}>Mediana</th>
            <th className={`${th} text-right`}>Máx.</th>
            {system === 'sap' && (
              <>
                <th className={`${th} text-right`}>Rechazadas</th>
                <th className={`${th} text-right`}>Pendientes hoy</th>
                <th className={`${th} text-right`} title="Días que llevan con él desde que le llegaron">
                  Antigüedad prom.
                </th>
                <th className={`${th} text-right`}>La más antigua</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, idx) => {
            const pendientes = r.pendientes?.total ?? 0;
            const lento =
              r.pendientes?.dias_max !== null &&
              r.pendientes?.dias_max !== undefined &&
              r.aprobadas.dias_promedio !== null &&
              r.pendientes.dias_max > r.aprobadas.dias_promedio;
            return (
              <tr key={r.usuario} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2.5 text-sm">
                  <Link
                    href={approverHref(system, r.usuario)}
                    className="font-medium text-[#222D59] hover:underline"
                    title={
                      system === 'sap'
                        ? `Usuario SAP: ${r.usuario} · ver sus pendientes`
                        : `Usuario Maximo: ${r.usuario} · ver las órdenes del paso que suele aprobar`
                    }
                  >
                    {r.aprobador}
                  </Link>
                  {r.aprobador !== r.usuario && <span className="block text-xs text-gray-500">{r.usuario}</span>}
                </td>
                {system === 'maximo' && (
                  <td className="px-3 py-2.5 text-xs text-gray-700">{(r.niveles ?? []).join(', ') || '—'}</td>
                )}
                <td className="px-3 py-2.5 text-sm text-right tabular-nums">{r.aprobadas.total.toLocaleString('es-MX')}</td>
                <td className="px-3 py-2.5 text-sm text-right tabular-nums font-medium">{days(r.aprobadas.dias_promedio)}</td>
                <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-700">{days(r.aprobadas.dias_mediana)}</td>
                <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-700">{days(r.aprobadas.dias_max)}</td>
                {system === 'sap' && (
                  <>
                    <td className="px-3 py-2.5 text-sm text-right tabular-nums">{r.rechazadas ?? NO_DISPONIBLE}</td>
                    <td className="px-3 py-2.5 text-sm text-right tabular-nums">
                      {pendientes > 0 ? (
                        <Link href={approverHref('sap', r.usuario)} className="font-semibold text-[#222D59] hover:underline">
                          {pendientes}
                        </Link>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-700">
                      {pendientes > 0 ? days(r.pendientes?.dias_promedio) : '—'}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-sm text-right tabular-nums ${lento ? 'font-semibold text-red-700' : 'text-gray-700'}`}
                      title={lento ? 'Lleva más días que lo que suele tardar en aprobar' : undefined}
                    >
                      {pendientes > 0 ? days(r.pendientes?.dias_max) : '—'}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ApproverHistoryTab() {
  const [preset, setPreset] = useState<Preset>('12m');
  const range = rangeOf(preset);
  const qs = `from=${range.from}&to=${range.to}`;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reportes', 'aprobadores', qs],
    queryFn: () => api.get<AprobadoresReport>(`/compras/reportes/aprobadores?${qs}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreset(value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                preset === value ? 'bg-[#52AF32] text-white' : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-xs text-gray-500">
            Aprobadas y rechazadas por la fecha de la decisión; pendientes al día de hoy.
          </span>
        </div>
        <ExportExcelButton
          path={`/compras/reportes/aprobadores/export?${qs}`}
          filename={`aprobadores_${range.from}_${range.to}.xlsx`}
          disabled={isLoading || isError}
        />
      </div>

      {isError ? (
        <div className="bg-white p-6 rounded-lg shadow text-red-600">No se pudo cargar el histórico por aprobador.</div>
      ) : !data ? (
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-[#424846]">SAP — por aprobador</h3>
              <p className="text-xs text-gray-600">{data.definiciones.sap}</p>
            </div>
            <ApproverTable rows={data.sap} system="sap" />
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-[#424846]">Maximo — por aprobador (cadena de aprobación)</h3>
              <p className="text-xs text-gray-600">{data.definiciones.maximo}</p>
            </div>
            <ApproverTable rows={data.maximo} system="maximo" />
            {data.maximo_niveles.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100">
                <p className="text-sm font-medium text-[#424846] mb-1">Por nivel</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
                  {data.maximo_niveles.map((n) => (
                    <span key={n.nivel}>
                      <strong>{n.nivel}:</strong> {n.aprobaciones.toLocaleString('es-MX')} · {days(n.dias_promedio)} (mediana{' '}
                      {days(n.dias_mediana)})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
