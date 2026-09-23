'use client';

/**
 * D11 (2026-09-23, César) — Visor de PDF embebido (drill-down): abre el
 * documento del contrato en un iframe con la URL firmada de MinIO en vez
 * de solo descargarlo. Si el contrato solo tiene link externo (SharePoint),
 * ese se abre en pestaña nueva desde la tabla/modal, no aquí.
 */
interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  title: string;
}

export default function PdfViewerModal({ isOpen, onClose, url, title }: PdfViewerModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-[#424846] px-5 py-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white truncate" title={title}>
            {title}
          </h3>
          <div className="flex items-center gap-3 shrink-0">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-200 hover:text-white underline"
                title="Abrir en pestaña nueva o descargar"
              >
                Abrir en pestaña nueva
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors"
              title="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100">
          {url ? (
            <iframe title={title} src={url} className="w-full h-full border-0" />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
