'use client';

import {
  MONTH_LABELS,
  VERSION_KIND_LABELS,
  VERSION_STATUS_LABELS,
  type FpaVersion,
} from '@/types/fpa';
import { NO_DISPONIBLE, formatExchangeRates, formatInflation } from '@/lib/fpa-format';
import { VersionStatusBadge } from './StatusBadges';

/**
 * FP&A (A3) — chips de versión (B-26, F2-26, B-27…) y, debajo, los datos de
 * la elegida: nombre, ejercicio, tipo, estado, tipos de cambio e inflación.
 * Los parámetros los fija FP&A; para las áreas son de solo lectura.
 */

/** Tipos de cambio, inflación y mes de corte de una versión (una línea de texto). */
export function VersionFacts({ version }: { version: FpaVersion }) {
  const rates = formatExchangeRates(version.exchange_rates);
  const inflation = formatInflation(version.inflation_pct);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
      <span>
        Tipo de cambio:{' '}
        {rates ? (
          <strong className="font-semibold text-[#424846]">{rates}</strong>
        ) : (
          <span className="text-gray-500">sin otras monedas (solo pesos)</span>
        )}
      </span>
      <span>
        Inflación:{' '}
        {inflation ? (
          <strong className="font-semibold text-[#424846]">{inflation}</strong>
        ) : (
          <span className="font-medium text-amber-700" title="FP&A todavía no fija la inflación de esta versión">
            {NO_DISPONIBLE}
          </span>
        )}
      </span>
      {version.cutoff_month !== null && version.cutoff_month >= 1 && version.cutoff_month <= 12 && (
        <span>
          Mes de corte: <strong className="font-semibold text-[#424846]">{MONTH_LABELS[version.cutoff_month - 1]}</strong>
        </span>
      )}
    </div>
  );
}

interface VersionPickerProps {
  versions: FpaVersion[];
  value: string | null;
  onChange: (versionId: string) => void;
}

export default function VersionPicker({ versions, value, onChange }: VersionPickerProps) {
  const selected = versions.find((v) => v.id === value) ?? null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Versión del presupuesto">
        <span className="text-sm text-gray-600 mr-1">Versión:</span>
        {versions.map((version) => {
          const active = version.id === value;
          return (
            <button
              key={version.id}
              type="button"
              onClick={() => onChange(version.id)}
              aria-pressed={active}
              title={`${version.name} · Ejercicio ${version.fiscal_year} · ${VERSION_STATUS_LABELS[version.status] ?? version.status}`}
              className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                active
                  ? 'bg-[#52AF32] text-white'
                  : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {version.code}
              {version.status !== 'captura' && (
                <span className={`ml-1 text-xs font-normal ${active ? 'text-white/85' : 'text-gray-500'}`}>
                  ({VERSION_STATUS_LABELS[version.status] ?? version.status})
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
            <span className="font-mono font-semibold text-[#222D59]">{selected.code}</span>
            <span className="text-gray-400">·</span>
            <span className="font-medium text-[#424846]">{selected.name}</span>
            <span className="text-gray-400">·</span>
            <span>Ejercicio {selected.fiscal_year}</span>
            <span className="text-gray-400">·</span>
            <span>{VERSION_KIND_LABELS[selected.kind] ?? selected.kind}</span>
            <VersionStatusBadge status={selected.status} />
          </p>
          <VersionFacts version={selected} />
        </div>
      )}
    </div>
  );
}
