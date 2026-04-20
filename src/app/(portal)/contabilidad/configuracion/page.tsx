'use client';

import { useState } from 'react';
import { SYNC_STATUS_LABELS, SYNC_STATUS_COLORS, SyncStatus } from '@/types/accounting';

export default function ConfiguracionPage() {
  const [sapConfig, setSapConfig] = useState({
    base_url: '',
    company_db: '',
    username: '',
    password: '',
  });

  const [satConfig, setSatConfig] = useState({
    rfc: '',
    ciec: '',
    has_efirma: false,
  });

  const sapStatus: SyncStatus = 'pending';
  const satStatus: SyncStatus = 'pending';

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-[#424846]">Configuracion del Modulo</h1>
        <p className="text-gray-500">Credenciales SAP B1 y SAT para integraciones</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* SAP Configuration */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#424846]">SAP Business One</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${SYNC_STATUS_COLORS[sapStatus]}`}>
              {SYNC_STATUS_LABELS[sapStatus]}
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL del Service Layer</label>
              <input
                type="url"
                value={sapConfig.base_url}
                onChange={(e) => setSapConfig({ ...sapConfig, base_url: e.target.value })}
                placeholder="https://sap-server:50000/b1s/v1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base de Datos</label>
              <input
                type="text"
                value={sapConfig.company_db}
                onChange={(e) => setSapConfig({ ...sapConfig, company_db: e.target.value })}
                placeholder="ABENT_PROD"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={sapConfig.username}
                onChange={(e) => setSapConfig({ ...sapConfig, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
              <input
                type="password"
                value={sapConfig.password}
                onChange={(e) => setSapConfig({ ...sapConfig, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors">
                Guardar
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Probar Conexion
              </button>
            </div>
          </div>
        </div>

        {/* SAT Configuration */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#424846]">SAT (Servicio de Administracion Tributaria)</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${SYNC_STATUS_COLORS[satStatus]}`}>
              {SYNC_STATUS_LABELS[satStatus]}
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Las credenciales del SAT deben ser validadas por el equipo de
                ciberseguridad antes de su configuracion. Contacta a tu administrador.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
              <input
                type="text"
                value={satConfig.rfc}
                onChange={(e) => setSatConfig({ ...satConfig, rfc: e.target.value.toUpperCase() })}
                placeholder="ABC123456XYZ"
                maxLength={13}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32] uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CIEC</label>
              <input
                type="password"
                value={satConfig.ciec}
                onChange={(e) => setSatConfig({ ...satConfig, ciec: e.target.value })}
                placeholder="Clave CIEC"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has_efirma"
                checked={satConfig.has_efirma}
                onChange={(e) => setSatConfig({ ...satConfig, has_efirma: e.target.checked })}
                className="w-4 h-4 text-[#52AF32] border-gray-300 rounded focus:ring-[#52AF32]"
              />
              <label htmlFor="has_efirma" className="text-sm text-gray-700">
                Configurar e.firma (certificado y llave privada)
              </label>
            </div>
            {satConfig.has_efirma && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificado (.cer)</label>
                  <input type="file" accept=".cer" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#52AF32] file:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Llave Privada (.key)</label>
                  <input type="file" accept=".key" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#52AF32] file:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena de la llave</label>
                  <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]" />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors" disabled>
                Guardar (Requiere Aprobacion)
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" disabled>
                Validar Credenciales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Logs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#424846]">Historial de Sincronizaciones</h3>
        </div>
        <div className="p-8 text-center text-gray-500">
          <p>No hay sincronizaciones registradas.</p>
          <p className="text-sm mt-1">Configure las credenciales para iniciar la sincronizacion.</p>
        </div>
      </div>
    </div>
  );
}
