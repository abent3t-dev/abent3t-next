'use client';

import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { fpaKeys, useFpaAreas, useFpaSigners } from '@/hooks/useFpa';
import FpaModal from '@/components/fpa/FpaModal';
import FpaPersonCombobox from '@/components/fpa/FpaPersonCombobox';
import type { FpaAreaRow, FpaAssignInput, FpaPerson, FpaSigners } from '@/types/fpa';

/**
 * FP&A (A3, lunes 26-oct) — Áreas (planeación y super_admin): las áreas que
 * cargan presupuesto, con su departamento propio y su titular de captura y de
 * aprobación. Alta de área y cambio de titular con el directorio de FP&A.
 * B2: arriba, los firmantes generales: planeación (da el visto bueno a los
 * parámetros de cada versión y aprueba el paso de planeación) y CFO (paso
 * final). Suplentes y consulta van en B4.
 */

type Duty = FpaAssignInput['duty'];

const DUTY_TITLES: Record<Duty, string> = {
  captura: 'Titular de captura',
  aprobacion: 'Titular de aprobación',
};

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Lo que muestran Presupuestos (quién captura y aprueba) y el contexto cambia con un titular nuevo. */
function useInvalidateAreas() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: fpaKeys.areas });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetsAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.budgetAll });
    void qc.invalidateQueries({ queryKey: fpaKeys.context });
    void qc.invalidateQueries({ queryKey: fpaKeys.catalog });
  };
}

function NewAreaModal({ onClose }: { onClose: () => void }) {
  const inputId = useId();
  const invalidate = useInvalidateAreas();
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: (areaName: string) => api.post<FpaAreaRow>('/fpa/areas', { name: areaName }),
    onSuccess: (area) => {
      invalidate();
      notify.success(`Área "${area.name}" dada de alta`);
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'No se pudo dar de alta el área'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      notify.error('Escribe el nombre del área.');
      return;
    }
    createMutation.mutate(trimmed);
  };

  return (
    <FpaModal title="Nueva área" size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
        <div className="px-6 py-5 space-y-3">
          <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">Nombre del área *</label>
            <input
              id={inputId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Ej. Compras"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#52AF32] focus:border-[#52AF32]"
            />
          </div>
          <p className="text-xs text-gray-500">
            Se crea también su departamento propio, con el mismo nombre: es el que proponen sus líneas.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Guardando…' : 'Dar de alta'}
          </button>
        </div>
      </form>
    </FpaModal>
  );
}

function AssignModal({ area, duty, onClose }: { area: FpaAreaRow; duty: Duty; onClose: () => void }) {
  const inputId = useId();
  const invalidate = useInvalidateAreas();
  const current = duty === 'captura' ? area.capturer : area.approver;
  const other = duty === 'captura' ? area.approver : area.capturer;
  const [person, setPerson] = useState<FpaPerson | null>(current);

  const assignMutation = useMutation({
    mutationFn: (input: FpaAssignInput) => api.post<FpaAreaRow>('/fpa/responsables', input),
    onSuccess: () => {
      invalidate();
      notify.success(`${DUTY_TITLES[duty]} de ${area.name}: ${person?.full_name ?? ''}`);
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'No se pudo nombrar al titular'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!person) {
      notify.error('Elige a la persona del directorio de FP&A.');
      return;
    }
    if (person.id === current?.id) {
      onClose();
      return;
    }
    if (person.id === other?.id) {
      notify.error(
        duty === 'captura'
          ? `${person.full_name} ya aprueba ${area.name}: quien captura un área no puede aprobarla.`
          : `${person.full_name} ya captura ${area.name}: quien captura un área no puede aprobarla.`,
      );
      return;
    }
    assignMutation.mutate({ area_id: area.id, duty, profile_id: person.id });
  };

  return (
    <FpaModal title={DUTY_TITLES[duty]} subtitle={area.name} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
        <div className="px-6 py-5 space-y-3">
          <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">Persona *</label>
            <FpaPersonCombobox id={inputId} value={person} onChange={setPerson} />
          </div>
          <p className="text-xs text-gray-500">
            {current
              ? `Hoy: ${current.full_name}. Al nombrar a otra persona, deja de ser titular.`
              : 'El área todavía no tiene titular.'}{' '}
            Solo se puede nombrar a quien tiene un rol de FP&amp;A; si alguien no aparece, pide a un super administrador
            que se lo asigne en Usuarios.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={assignMutation.isPending}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Guardando…' : 'Nombrar titular'}
          </button>
        </div>
      </form>
    </FpaModal>
  );
}

type SignerDuty = 'planeacion' | 'cfo';

const SIGNERS: Record<SignerDuty, { title: string; help: string; role: 'fpa_planeacion' | 'fpa_cfo'; roleLabel: string }> = {
  planeacion: {
    title: 'Firmante de planeación',
    help: 'Da el visto bueno a los parámetros de cada versión (tipo de cambio, inflación y tarifas) y aprueba el paso de planeación.',
    role: 'fpa_planeacion',
    roleLabel: 'Planeación (FP&A)',
  },
  cfo: {
    title: 'Firmante del CFO',
    help: 'Aprueba el paso final de cada presupuesto.',
    role: 'fpa_cfo',
    roleLabel: 'CFO (FP&A)',
  },
};

function SignerModal({ duty, current, onClose }: { duty: SignerDuty; current: FpaPerson | null; onClose: () => void }) {
  const inputId = useId();
  const qc = useQueryClient();
  const meta = SIGNERS[duty];
  const [person, setPerson] = useState<FpaPerson | null>(current);
  const mutation = useMutation({
    mutationFn: (profileId: string) => api.post<FpaSigners>('/fpa/firmantes', { duty, profile_id: profileId }),
    onSuccess: (signers) => {
      qc.setQueryData(fpaKeys.signers, signers);
      void qc.invalidateQueries({ queryKey: fpaKeys.versionAll });
      notify.success(`${meta.title}: ${person?.full_name ?? ''}`);
      onClose();
    },
    onError: (err: Error) => notify.error(err.message || 'No se pudo nombrar al firmante'),
  });
  return (
    <FpaModal title={meta.title} size="md" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!person) {
            notify.error('Elige a la persona del directorio de FP&A.');
            return;
          }
          if (person.id === current?.id) {
            onClose();
            return;
          }
          mutation.mutate(person.id);
        }}
        className="flex flex-col min-h-0"
      >
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700">{meta.help}</p>
          <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">Persona *</label>
            <FpaPersonCombobox id={inputId} value={person} onChange={setPerson} role={meta.role} />
          </div>
          <p className="text-xs text-gray-500">
            Solo aparece quien tiene el rol {meta.roleLabel}; si alguien no aparece, pide a un super administrador que
            se lo asigne en Usuarios.{current ? ` Hoy: ${current.full_name}; al nombrar a otra persona, deja de serlo.` : ''}
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando…' : 'Nombrar firmante'}
          </button>
        </div>
      </form>
    </FpaModal>
  );
}

function SignersCard() {
  const signersQ = useFpaSigners();
  const [editing, setEditing] = useState<SignerDuty | null>(null);
  const signers = signersQ.data;
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-[#424846]">Firmantes generales</h2>
        <p className="text-xs text-gray-500">
          Sin firmante registrado, el paso lo puede firmar cualquiera con el rol; con firmante, solo esa persona.
        </p>
      </div>
      {signersQ.isLoading ? (
        <div className="w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin" />
      ) : signersQ.isError ? (
        <p className="text-sm text-red-600">No se pudieron cargar los firmantes: {errorText(signersQ.error, 'intenta de nuevo')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(SIGNERS) as SignerDuty[]).map((duty) => (
            <div key={duty} className="rounded-lg border border-gray-200 p-3 space-y-1.5">
              <p className="text-sm font-medium text-[#424846]">{SIGNERS[duty].title}</p>
              <p className="text-xs text-gray-500">{SIGNERS[duty].help}</p>
              {signers?.can_assign[duty] ? (
                <PersonCell person={signers[duty].titular} onChange={() => setEditing(duty)} />
              ) : (
                <>
                  <p className="text-sm text-gray-900">
                    {signers?.[duty].titular?.full_name ?? <span className="italic text-gray-400">Sin asignar</span>}
                  </p>
                  {/* Planeación no elige quién le da el visto bueno */}
                  <p className="text-xs text-gray-500">Lo registra soporte (super_admin).</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <SignerModal
          key={editing}
          duty={editing}
          current={signers?.[editing].titular ?? null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PersonCell({ person, onChange }: { person: FpaPerson | null; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      {person ? (
        <span className="text-sm text-gray-900">{person.full_name}</span>
      ) : (
        <span className="text-sm italic text-gray-400">Sin asignar</span>
      )}
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-lg border border-[#222D59]/30 text-[#222D59] hover:bg-[#222D59]/5 transition-colors"
      >
        {person ? 'Cambiar' : 'Asignar'}
      </button>
    </div>
  );
}

export default function FpaAreasPage() {
  const areasQ = useFpaAreas();
  const areas = [...(areasQ.data ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'es'));
  const [showNew, setShowNew] = useState(false);
  const [assign, setAssign] = useState<{ area: FpaAreaRow; duty: Duty } | null>(null);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#424846]">Áreas</h1>
          <p className="text-gray-500">
            Áreas que cargan presupuesto: su departamento propio, quién captura y quién aprueba
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-[#52AF32] text-white rounded-lg hover:bg-[#52AF32]/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva área
        </button>
      </div>

      <SignersCard />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {areasQ.isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : areasQ.isError ? (
          <p className="p-8 text-center text-red-600">
            No se pudieron cargar las áreas: {errorText(areasQ.error, 'intenta de nuevo')}
          </p>
        ) : areas.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500">Todavía no hay áreas</p>
            <p className="text-sm text-gray-400">Usa &quot;Nueva área&quot; para dar de alta la primera</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#424846]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Área</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase">Departamento propio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase min-w-[14rem]">Captura</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase min-w-[14rem]">Aprueba</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {areas.map((area, idx) => (
                  <tr key={area.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-[#424846]">{area.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {area.department?.name ?? <span className="italic text-gray-400">Sin departamento</span>}
                    </td>
                    <td className="px-4 py-3">
                      <PersonCell person={area.capturer} onChange={() => setAssign({ area, duty: 'captura' })} />
                    </td>
                    <td className="px-4 py-3">
                      <PersonCell person={area.approver} onChange={() => setAssign({ area, duty: 'aprobacion' })} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {area.is_active ? (
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Inactiva
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && <NewAreaModal onClose={() => setShowNew(false)} />}
      {assign && (
        <AssignModal
          key={`${assign.area.id}-${assign.duty}`}
          area={assign.area}
          duty={assign.duty}
          onClose={() => setAssign(null)}
        />
      )}
    </div>
  );
}
