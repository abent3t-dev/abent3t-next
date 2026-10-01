'use client';

import { useEffect, useState } from 'react';
import { downloadFile } from '@/lib/api';
import { notify } from '@/lib/notifications';
import ExportExcelButton from './ExportExcelButton';
import PdfViewerModal from './PdfViewerModal';

/**
 * H1 (reunión con Ingrid 2026-09-29) — "Reporte de avance semanal" en PDF:
 * la hoja semanal de gestiones que arma Jorge, generada por la plataforma.
 * PDF de la semana elegida, acumulado del año (una página por semana, de la
 * más nueva a la más vieja, como su archivo) y vista previa. Solo GET.
 *
 * I3 (go-live 2026-09-30, Ingrid): "uno de Maximo, uno de SAP y esté
 * homologado". Por defecto, una página de Maximo y una de SAP por semana; el
 * acumulado trae primero todas las semanas de Maximo y luego las de SAP. La
 * suma de los dos sistemas (`todas`) ya no se ofrece aquí.
 */

type Fuente = 'ambos' | 'maximo' | 'sap';

const FUENTES: Array<[Fuente, string]> = [
  ['ambos', 'Maximo y SAP'],
  ['maximo', 'Solo Maximo'],
  ['sap', 'Solo SAP'],
];

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const parseDay = (s: string) => new Date(`${s}T00:00:00Z`);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Primer lunes del año: el acumulado de Jorge arranca ahí (5-ene-2026). */
function firstMonday(year: number): string {
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
  return isoDay(d);
}

/** "del 21 al 25 de septiembre de 2026" (lunes a viernes). */
function etiquetaSemana(lunes: string): string {
  const l = parseDay(lunes);
  const v = new Date(l.getTime() + 4 * 86_400_000);
  const [m1, m2] = [MESES[l.getUTCMonth()], MESES[v.getUTCMonth()]];
  const [y1, y2] = [l.getUTCFullYear(), v.getUTCFullYear()];
  if (y1 !== y2) return `del ${l.getUTCDate()} de ${m1} de ${y1} al ${v.getUTCDate()} de ${m2} de ${y2}`;
  if (m1 !== m2) return `del ${l.getUTCDate()} de ${m1} al ${v.getUTCDate()} de ${m2} de ${y2}`;
  return `del ${l.getUTCDate()} al ${v.getUTCDate()} de ${m2} de ${y2}`;
}

interface AvanceSemanalCardProps {
  /** Lunes de la semana (YYYY-MM-DD). */
  lunes: string;
  /** La semana viene del selector "Semana" (si no, es la última completa). */
  elegida: boolean;
}

export default function AvanceSemanalCard({ lunes, elegida }: AvanceSemanalCardProps) {
  const [fuente, setFuente] = useState<Fuente>('ambos');
  const [preview, setPreview] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fq = fuente === 'ambos' ? '' : `&fuente=${fuente}`;
  const suffix = fuente === 'ambos' ? '' : `_${fuente}`;
  const ambos = fuente === 'ambos';
  const anio = parseDay(lunes).getUTCFullYear();
  const desde = firstMonday(anio);
  const semanaPath = `/compras/reportes/avance-semanal/pdf?semana=${lunes}${fq}`;

  // libera el PDF de la vista previa al cerrarla o al cambiar de semana
  useEffect(() => {
    return () => {
      if (preview) window.URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const openPreview = async () => {
    setPreviewOpen(true);
    setPreview(null);
    try {
      const blob = await downloadFile(semanaPath);
      setPreview(window.URL.createObjectURL(blob));
    } catch (err: unknown) {
      setPreviewOpen(false);
      notify.error(err instanceof Error ? err.message : 'No se pudo generar el reporte');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-[#52AF32]">
      <div className="min-w-[16rem] flex-1">
        <h3 className="text-base font-semibold text-[#424846]">Reporte de avance semanal (PDF)</h3>
        <p className="text-sm text-gray-600">
          Semana {etiquetaSemana(lunes)}
          {!elegida && ' (la última completa; elige “Semana” para otra)'}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          La hoja semanal de gestiones de Compras: recibidas, cerradas, tiempos, montos
          adjudicados y comparación anual, con una página de Maximo y una de SAP por
          semana (mismo formato). El acumulado arranca el {Number(desde.slice(8))} de enero
          {ambos ? ': primero todas las semanas de Maximo y luego las de SAP.' : '.'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm text-gray-600" htmlFor="avance-fuente">
          Fuente
        </label>
        <select
          id="avance-fuente"
          value={fuente}
          onChange={(e) => setFuente(e.target.value as Fuente)}
          className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
          title="Maximo y SAP: dos páginas por semana, una de cada sistema. El reporte de Jorge solo trae Maximo"
        >
          {FUENTES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openPreview}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-[#424846] bg-white hover:bg-gray-50"
          title="Ver el PDF de la semana sin descargarlo"
        >
          Vista previa
        </button>
        <ExportExcelButton
          path={semanaPath}
          filename={`reporte_avance_semanal_${lunes}${suffix}.pdf`}
          label="PDF de la semana"
          title={ambos ? 'Dos páginas: Maximo y luego SAP' : 'Una página con la semana elegida'}
        />
        <ExportExcelButton
          path={`/compras/reportes/avance-semanal/pdf?desde=${desde}&hasta=${lunes}${fq}`}
          filename={`reporte_avance_semanal_${desde}_al_${lunes}${suffix}.pdf`}
          label={`Acumulado ${anio} (PDF)`}
          title={
            ambos
              ? 'Primero todas las semanas de Maximo y luego las de SAP, de la más nueva a la más vieja (índice en los marcadores del PDF)'
              : 'Una página por semana, de la más nueva a la más vieja, como el archivo de Jorge'
          }
        />
      </div>
      <PdfViewerModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        url={preview}
        title={`Reporte de avance semanal${ambos ? ' (Maximo y SAP)' : fuente === 'maximo' ? ' (Maximo)' : ' (SAP)'} · semana ${etiquetaSemana(lunes)}`}
      />
    </div>
  );
}
