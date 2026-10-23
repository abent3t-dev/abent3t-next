'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFpaConsolidated, useFpaVersions } from '@/hooks/useFpa';
import VersionPicker from '@/components/fpa/VersionPicker';
import FpaAmount from '@/components/fpa/FpaAmount';
import ExportExcelButton from '@/components/compras/ExportExcelButton';
import { defaultVersionId } from '@/lib/fpa-format';
import { GROUP_BY_LABELS, MONTH_LABELS, type FpaGroupBy } from '@/types/fpa';

/**
 * FP&A (A3, lunes 26-oct) — Consolidado de una versión en pesos, mes por mes:
 * por área, por categoría (hace de "cuenta" mientras llega el Chart of
 * Accounts) o área › categoría, con totales de renglón y de columna. Todos
 * los montos los suma el API; "Exportar a Excel" baja lo mismo que se ve.
 *
 * Versión y agrupación viajan en la URL (?version=&agrupar=).
 */

const GROUP_OPTIONS: FpaGroupBy[] = ['area', 'categoria', 'area_categoria'];

const isGroupBy = (value: string | null): value is FpaGroupBy =>
  value !== null && (GROUP_OPTIONS as string[]).includes(value);

const FIRST_COLUMN: Record<FpaGroupBy, string> = {
  area: 'Área',
  categoria: 'Categoría',
  area_categoria: 'Área › categoría',
};

/** Ancho de la primera columna (fija): área › categoría necesita más. */
const FIRST_WIDTH: Record<FpaGroupBy, { cell: string; inner: string }> = {
  area: { cell: 'w-52 min-w-52 max-w-52', inner: 'w-48' },
  categoria: { cell: 'w-56 min-w-56 max-w-56', inner: 'w-52' },
  area_categoria: { cell: 'w-72 min-w-72 max-w-72', inner: 'w-68' },
};

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const TH ='sticky top-0 bg-[#424846] px-2 py-2.5 text-xs font-medium uppercase text-white whitespace-nowrap';
const TD = 'px-2 py-2 border-b border-gray-200 bg-white group-hover:bg-[#f2f8ef] text-sm';
const FOOT = 'sticky bottom-0 px-2 py-2.5 bg-[#222D59] text-sm font-bold text-white';

function ConsolidadoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const versionsQ = useFpaVersions();

  const versions = versionsQ.data ?? [];
  const requested = searchParams.get('version');
  const versionId =
    requested && versions.some((v) => v.id === requested) ? requested : defaultVersionId(versions);
  const groupParam = searchParams.get('agrupar');
  const groupBy: FpaGroupBy = isGroupBy(groupParam) ? groupParam : 'area';
  const version = versions.find((v) => v.id === versionId) ?? null;

  const consolidatedQ = useFpaConsolidated(versionId, groupBy);
  const data = consolidatedQ.data;
  const rows = data?.rows ?? [];

  const go = (next: { version?: string; agrupar?: FpaGroupBy }) => {
    const qs = new URLSearchParams();
    const nextVersion = next.version ?? versionId;
    if (nextVersion) qs.set('version', nextVersion);
    qs.set('agrupar', next.agrupar ?? groupBy);
    router.replace(`/fpa/consolidado?${qs.toString()}`, { scroll: false });
  };

  const exportPath = versionId
    ? `/fpa/consolidado/export?version_id=${encodeURIComponent(versionId)}&agrupar=${groupBy}`
    : '';
  const exportName = `FPA_consolidado_${(version?.code ?? 'version').replace(/[^\w-]+/g, '_')}_${groupBy}.xlsx`;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Consolidado</h1>
          <p className="text-gray-500">Suma en pesos de los presupuestos de la versión, mes por mes</p>
        </div>
        {versionId && (
          <ExportExcelButton
            path={exportPath}
            filename={exportName}
            disabled={!data || rows.length === 0}
            label="Exportar a Excel"
            title="Descarga en Excel el consolidado con la versión y la agrupación elegidas"
          />
        )}
      </div>

      {/* Versión y agrupación */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        {versionsQ.isLoading ? (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
            Cargando versiones…
          </div>
        ) : versionsQ.isError ? (
          <p className="text-sm text-red-600">
            No se pudieron cargar las versiones: {errorText(versionsQ.error, 'intenta de nuevo')}
          </p>
        ) : versions.length === 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#424846]">Todavía no hay versiones de presupuesto disponibles</p>
            <p className="text-sm text-gray-500">Una versión aparece aquí cuando FP&amp;A la abre a captura.</p>
          </div>
        ) : (
          <>
            <VersionPicker versions={versions} value={versionId} onChange={(id) => go({ version: id })} />
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4" role="group" aria-label="Agrupar el consolidado">
              <span className="text-sm text-gray-600 mr-1">Agrupar:</span>
              {GROUP_OPTIONS.map((option) => {
                const active = option === groupBy;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => go({ agrupar: option })}
                    aria-pressed={active}
                    className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                      active
                        ? 'bg-[#222D59] text-white'
                        : 'bg-white text-[#424846] border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {GROUP_BY_LABELS[option]}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Tabla */}
      {versionId && (
        <div className="bg-white rounded-lg shadow">
          {consolidatedQ.isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : consolidatedQ.isError || !data ? (
            <p className="p-8 text-center text-red-600">
              No se pudo cargar el consolidado: {errorText(consolidatedQ.error, 'intenta de nuevo')}
            </p>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500">Todavía no hay líneas capturadas en esta versión</p>
            </div>
          ) : (
            <>
              <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                {rows.length.toLocaleString('es-MX')} {rows.length === 1 ? 'renglón' : 'renglones'} · montos en pesos, sin
                centavos (pasa el cursor sobre un monto para verlos)
              </p>
              <div className="overflow-auto max-h-[calc(100vh-16rem)] min-h-[12rem] rounded-b-lg">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th scope="col" className={`${TH} left-0 z-30 ${FIRST_WIDTH[groupBy].cell} text-left border-r border-white/20`}>
                        {FIRST_COLUMN[groupBy]}
                      </th>
                      {MONTH_LABELS.map((label) => (
                        <th key={label} scope="col" className={`${TH} z-20 text-right min-w-20`}>
                          {label}
                        </th>
                      ))}
                      <th scope="col" className={`${TH} z-20 text-right min-w-[7.5rem] border-l border-white/20`}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="group">
                        <th
                          scope="row"
                          className={`${TD} sticky left-0 z-10 ${FIRST_WIDTH[groupBy].cell} text-left font-normal border-r border-gray-200`}
                        >
                          <div
                            className={`${FIRST_WIDTH[groupBy].inner} truncate`}
                            title={row.sublabel ? `${row.label} › ${row.sublabel}` : row.label}
                          >
                            <span className="font-medium text-[#424846]">{row.label}</span>
                            {row.sublabel && (
                              <>
                                <span className="text-gray-400"> › </span>
                                <span className="text-gray-700">{row.sublabel}</span>
                              </>
                            )}
                          </div>
                        </th>
                        {MONTH_LABELS.map((label, i) => (
                          <td key={label} className={`${TD} text-right text-gray-900`}>
                            <FpaAmount value={row.months_mxn[i]} blankZero />
                          </td>
                        ))}
                        <td className={`${TD} text-right font-semibold text-gray-900 border-l border-gray-200`}>
                          <FpaAmount value={row.total_mxn} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" className={`${FOOT} left-0 z-30 text-left border-r border-white/20`}>
                        Total
                      </th>
                      {MONTH_LABELS.map((label, i) => (
                        <td key={label} className={`${FOOT} z-20 text-right`}>
                          <FpaAmount value={data.totals.months_mxn[i]} blankZero onDark />
                        </td>
                      ))}
                      <td className={`${FOOT} z-20 text-right border-l border-white/20`}>
                        <FpaAmount value={data.totals.total_mxn} onDark />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Versión y agrupación viven en la URL: useSearchParams pide Suspense. */
export default function FpaConsolidadoPage() {
  return (
    <Suspense fallback={null}>
      <ConsolidadoContent />
    </Suspense>
  );
}
