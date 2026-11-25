'use client';

import { useState } from 'react';
import { downloadFile } from '@/lib/api';
import { notify } from '@/lib/notifications';

/**
 * Sprint 2026-09-22 (B1) — "Exportar Excel" de una tabla: descarga el
 * listado con los MISMOS filtros activos (sin paginar) desde el endpoint
 * `…/export` del backend. Solo GET.
 *
 * Mientras trabaja, el ícono gira y dice "Generando…" hasta que empieza a
 * llegar el archivo; después, "Descargando… N %" con una barra, si el api
 * dice su tamaño. Así una descarga lenta (p. ej., el inventario de Almacén)
 * no parece detenida.
 */
interface ExportExcelButtonProps {
  /** Path relativo del export, ya con los query params del filtro. */
  path: string;
  filename: string;
  disabled?: boolean;
  label?: string;
  title?: string;
}

export default function ExportExcelButton({
  path,
  filename,
  disabled = false,
  label = 'Exportar Excel',
  title = 'Descarga en Excel lo que ves con los filtros actuales',
}: ExportExcelButtonProps) {
  const [busy, setBusy] = useState(false);
  // Lo que lleva la descarga (0 a 99), cuando el api dice el tamaño del archivo.
  const [avance, setAvance] = useState<number | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setAvance(null);
    try {
      const blob = await downloadFile(path, (recibido, total) => {
        if (total && recibido <= total) setAvance(Math.min(99, Math.floor((recibido / total) * 100)));
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : 'No se pudo exportar');
    } finally {
      setBusy(false);
      setAvance(null);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`relative overflow-hidden inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-[#52AF32] text-[#52AF32] transition-colors ${
        busy
          ? 'bg-[#52AF32]/10 cursor-wait'
          : 'bg-white hover:bg-[#52AF32]/10 disabled:opacity-50 disabled:cursor-not-allowed'
      }`}
      title={busy ? 'Preparando el archivo; puede tardar unos segundos' : title}
    >
      {busy ? (
        <span className="w-4 h-4 border-2 border-[#52AF32] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      <span className="tabular-nums">{busy ? (avance === null ? 'Generando…' : `Descargando… ${avance} %`) : label}</span>
      {busy && avance !== null && (
        <span className="absolute left-0 bottom-0 h-0.5 bg-[#52AF32] transition-[width] duration-200" style={{ width: `${avance}%` }} aria-hidden="true" />
      )}
    </button>
  );
}
