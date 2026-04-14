'use client';

import { useState, useEffect } from 'react';
import {
  PlatformIntegration,
  CreateIntegrationDto,
  PlatformType,
  PLATFORM_LABELS,
} from '@/types/platforms';
import { Institution } from '@/types/catalogs';

interface PlatformIntegrationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateIntegrationDto) => void;
  integration: PlatformIntegration | null;
  institutions: Institution[];
  loading?: boolean;
}

const PLATFORM_OPTIONS: { value: PlatformType; label: string }[] = [
  { value: 'crehana', label: 'Crehana' },
  { value: 'udemy_business', label: 'Udemy Business' },
  { value: 'linkedin_learning', label: 'LinkedIn Learning' },
  { value: 'coursera', label: 'Coursera' },
  { value: 'other', label: 'Otra' },
];

export default function PlatformIntegrationModal({
  open,
  onClose,
  onSubmit,
  integration,
  institutions,
  loading,
}: PlatformIntegrationModalProps) {
  const isEditing = !!integration;

  const [form, setForm] = useState<CreateIntegrationDto>({
    institution_id: '',
    platform_type: 'crehana',
    api_url: '',
    public_key: '',
    private_key: '',
    sync_enabled: true,
    sync_frequency_hours: 24,
    sso_enabled: false,
    sso_type: '',
  });

  // Reset form cuando cambia la integración
  useEffect(() => {
    if (integration) {
      setForm({
        institution_id: integration.institution_id,
        platform_type: integration.platform_type,
        api_url: integration.api_url || '',
        public_key: integration.public_key || '',
        private_key: '', // Nunca se devuelve del backend
        sync_enabled: integration.sync_enabled,
        sync_frequency_hours: integration.sync_frequency_hours,
        sso_enabled: integration.sso_enabled,
        sso_type: integration.sso_type || '',
      });
    } else {
      setForm({
        institution_id: institutions[0]?.id || '',
        platform_type: 'crehana',
        api_url: '',
        public_key: '',
        private_key: '',
        sync_enabled: true,
        sync_frequency_hours: 24,
        sso_enabled: false,
        sso_type: '',
      });
    }
  }, [integration, institutions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!form.institution_id) {
      alert('Selecciona una institución');
      return;
    }

    // Solo enviar private_key si se ingresó una nueva
    const submitData: CreateIntegrationDto = {
      ...form,
    };

    if (!form.private_key) {
      delete submitData.private_key;
    }

    onSubmit(submitData);
  };

  const updateField = <K extends keyof CreateIntegrationDto>(
    key: K,
    value: CreateIntegrationDto[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-lg">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#52AF32] to-[#67B52E] px-6 py-4">
              <h3 className="text-lg font-semibold text-white">
                {isEditing ? 'Editar Integración' : 'Nueva Integración de Plataforma'}
              </h3>
              <p className="text-green-100 text-sm mt-1">
                {isEditing ? 'Modifica las credenciales y configuración' : 'Conecta con una plataforma de e-learning'}
              </p>
            </div>

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

              <div className="space-y-4">
                {/* Institución */}
                <label className="block text-sm font-medium text-gray-700">
                  Institución / Plataforma
                  <select
                    required
                    disabled={isEditing}
                    value={form.institution_id}
                    onChange={(e) => updateField('institution_id', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] disabled:bg-gray-100"
                  >
                    <option value="">Seleccionar...</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Tipo de plataforma */}
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de Plataforma
                  <select
                    value={form.platform_type}
                    onChange={(e) => updateField('platform_type', e.target.value as PlatformType)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
                  >
                    {PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Credenciales API */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Credenciales de API</h4>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      URL de API
                      <input
                        type="url"
                        value={form.api_url}
                        onChange={(e) => updateField('api_url', e.target.value)}
                        placeholder="https://api.crehana.com/v1"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Clave Pública (Public Key)
                      <input
                        type="text"
                        value={form.public_key}
                        onChange={(e) => updateField('public_key', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Clave Privada (Private Key)
                      <input
                        type="password"
                        value={form.private_key}
                        onChange={(e) => updateField('private_key', e.target.value)}
                        placeholder={isEditing && integration?.has_private_key ? '••••••••' : ''}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
                      />
                      {isEditing && integration?.has_private_key && (
                        <p className="mt-1 text-xs text-gray-500">
                          Dejar en blanco para mantener la clave actual
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                {/* Configuración de sincronización */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Sincronización</h4>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.sync_enabled}
                        onChange={(e) => updateField('sync_enabled', e.target.checked)}
                        className="rounded"
                      />
                      Sincronización automática habilitada
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Frecuencia (horas)
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={form.sync_frequency_hours}
                        onChange={(e) => updateField('sync_frequency_hours', parseInt(e.target.value) || 24)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
                      />
                    </label>
                  </div>
                </div>

                {/* SSO (opcional) */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Single Sign-On (SSO)</h4>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.sso_enabled}
                        onChange={(e) => updateField('sso_enabled', e.target.checked)}
                        className="rounded"
                      />
                      Habilitar SSO
                    </label>

                    {form.sso_enabled && (
                      <label className="block text-sm font-medium text-gray-700">
                        Tipo de SSO
                        <select
                          value={form.sso_type}
                          onChange={(e) => updateField('sso_type', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="saml2">SAML 2.0</option>
                          <option value="microsoft">Microsoft (Azure AD)</option>
                        </select>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#52AF32] text-white rounded-xl hover:bg-[#67B52E] disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Integración'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
