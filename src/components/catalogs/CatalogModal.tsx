'use client';

interface CatalogModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  loading?: boolean;
}

export default function CatalogModal({
  title,
  open,
  onClose,
  onSubmit,
  children,
  loading,
}: CatalogModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - fondo oscuro semitransparente con click para cerrar */}
      <div
        className="absolute inset-0 bg-[#222D59]/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Container del modal con animacion de entrada */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
        {/* Header del modal */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#424846]">{title}</h3>
          {/* Boton de cerrar (X) */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#424846] hover:bg-gray-100 transition-colors duration-200"
            aria-label="Cerrar modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Contenido del formulario */}
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {children}
          </div>

          {/* Footer con botones */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
            {/* Boton Cancelar - gris con borde */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-[#424846] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#52AF32]/20 focus:border-[#52AF32] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>

            {/* Boton Guardar - verde A3T solido */}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#52AF32] rounded-lg hover:bg-[#67B52E] focus:outline-none focus:ring-2 focus:ring-[#52AF32]/40 focus:ring-offset-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  {/* Spinner de carga */}
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
