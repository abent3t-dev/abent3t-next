'use client';

import { useId } from 'react';

/**
 * FP&A (A3) — armazón de los modales del módulo: fondo, encabezado gris
 * oscuro con título y cierre, y el contenido (cuerpo con scroll y pie) que
 * pone cada modal. No cierra con clic afuera para no perder lo capturado.
 */
interface FpaModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** xl: captura de líneas (12 meses en una fila); md: formularios cortos. */
  size?: 'md' | 'xl';
  children: React.ReactNode;
}

export default function FpaModal({ title, subtitle, onClose, size = 'xl', children }: FpaModalProps) {
  const titleId = useId();
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white rounded-lg shadow-xl w-full ${size === 'xl' ? 'max-w-5xl' : 'max-w-lg'} max-h-[92vh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-[#424846]">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-white truncate">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-gray-300 truncate">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-300 hover:text-white" title="Cerrar" aria-label="Cerrar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
