'use client';

import { useRef, useState } from 'react';
import { notify } from '@/lib/notifications';

/**
 * Fase §15 — Subida del PDF de un contrato (multipart al endpoint de
 * documentos, patron de solicitudes/propuestas: valida MIME y tamano en
 * cliente Y revisa res.ok). Solo PDF, max 20MB (mismo limite del backend).
 */

const MAX_PDF_BYTES = 20 * 1024 * 1024;

interface ContractFileUploaderProps {
  contractId: string;
  disabled?: boolean;
  onUploaded: () => void;
}

export default function ContractFileUploader({
  contractId,
  disabled,
  onUploaded,
}: ContractFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      notify.error(`"${file.name}": solo se aceptan archivos PDF`);
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      notify.error(`"${file.name}": excede el tamano maximo de 20MB`);
      return;
    }

    setUploading(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `${apiUrl}/compras/contratos/${contractId}/documents`,
        { method: 'POST', credentials: 'include', body: formData },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(err.message || `Error al subir "${file.name}"`);
      }
      notify.success('PDF subido como nueva version vigente');
      onUploaded();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Error al subir el PDF');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 text-sm bg-[#222D59] text-white rounded-lg hover:bg-[#222D59]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {uploading ? 'Subiendo PDF...' : 'Subir nueva version (PDF)'}
      </button>
    </div>
  );
}
