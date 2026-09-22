'use client';

import { useState } from 'react';
import { downloadFile } from '@/lib/api';
import { notify } from '@/lib/notifications';

/**
 * Sprint 2026-09-22 (B1) — "Exportar Excel" de una tabla: descarga el
 * listado con los MISMOS filtros activos (sin paginar) desde el endpoint
 * `…/export` del backend. Solo GET.
 */
interface ExportExcelButtonProps {
  /** Path relativo del export, ya con los query params del filtro. */
  path: string;
  filename: string;
  disabled?: boolean;
  label?: string;
}

export default function ExportExcelButton({
  path,
  filename,
  disabled = false,
  label = 'Exportar Excel',
}: ExportExcelButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const blob = await downloadFile(path);
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
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-[#52AF32] text-[#52AF32] bg-white hover:bg-[#52AF32]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Descarga en Excel lo que ves con los filtros actuales"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {busy ? 'Generando…' : label}
    </button>
  );
}
