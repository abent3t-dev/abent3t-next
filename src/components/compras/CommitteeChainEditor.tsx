'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notify } from '@/lib/notifications';
import { ROLE_LABELS, type UserRole } from '@/types/auth';
import type { CommitteeApprovalLevel } from '@/types/purchases';
import { COMMITTEE_SIGNER_ROLES } from '@/hooks/useComitePendientes';
import ProfileCombobox, { type ProfileOption } from './ProfileCombobox';

/**
 * H3 (reunión con Ingrid 2026-09-29) — Editor de la cadena de aprobación del
 * comité, para super_admin y lider_procura: quién firma cada nivel (una
 * persona o cualquiera con el rol), orden, activo y confirmado. Usa
 * PUT /compras/comite/niveles/:id, PUT …/niveles/orden y POST …/niveles.
 *
 * Candados del backend (sus mensajes se muestran tal cual): con comités en
 * aprobación no se reordena ni se desactiva el nivel que tiene uno esperando,
 * la cadena conserva al menos un nivel activo y quien firma por persona
 * necesita un rol de aprobador de compras.
 */

const LEVEL_ROLES: UserRole[] = [
  'lider_procura',
  'aprobador_nivel_1',
  'aprobador_nivel_2',
  'aprobador_nivel_3',
  'director_general',
  'coordinador_compras',
  'comprador',
];

const LEVELS_KEY = ['committee-levels'];

const errorText = (err: unknown) =>
  err instanceof Error ? err.message : 'No se pudo guardar';

/** ¿La persona elegida podrá firmar? (el guard de aprobar pide estos roles) */
const canSign = (profile: ProfileOption | null) =>
  !profile?.purchase_roles ||
  profile.purchase_roles.some((r) => COMMITTEE_SIGNER_ROLES.includes(r as UserRole));

interface Draft {
  role: UserRole;
  profile: ProfileOption | null;
  notes: string;
}

const draftOf = (level: CommitteeApprovalLevel): Draft => ({
  role: level.role as UserRole,
  profile: level.profile,
  notes: level.notes ?? '',
});

function LevelRow({
  level,
  index,
  total,
  onMove,
  busy,
}: {
  level: CommitteeApprovalLevel;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  busy: boolean;
}) {
  const qc = useQueryClient();
  // La fila se re-monta cuando cambia el nivel guardado (ver `key` abajo)
  const [draft, setDraft] = useState<Draft>(() => draftOf(level));

  const dirty =
    draft.role !== level.role ||
    (draft.profile?.id ?? null) !== level.profile_id ||
    draft.notes !== (level.notes ?? '');

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.put<CommitteeApprovalLevel>(`/compras/comite/niveles/${level.id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEVELS_KEY });
      notify.success(`Nivel ${level.orden} guardado`);
    },
    onError: (err) => notify.error(errorText(err)),
  });

  const save = () =>
    update.mutate({
      role: draft.role,
      profile_id: draft.profile?.id ?? null,
      notes: draft.notes.trim() || undefined,
    });

  const inputId = `nivel-${level.id}-persona`;
  const warning = draft.profile && !canSign(draft.profile);

  return (
    <li
      className={`p-4 rounded-lg border ${
        level.is_active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50'
      }`}
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              level.is_active ? 'bg-[#52AF32] text-white' : 'bg-gray-300 text-gray-600'
            }`}
            title={level.is_active ? `Nivel ${level.orden}` : 'Nivel inactivo: no se firma'}
          >
            {level.orden}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onMove(index, index - 1)}
              disabled={busy || index === 0}
              className="px-1.5 text-gray-500 hover:text-[#424846] disabled:opacity-30"
              title="Subir"
              aria-label={`Subir el nivel ${level.orden}`}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove(index, index + 1)}
              disabled={busy || index === total - 1}
              className="px-1.5 text-gray-500 hover:text-[#424846] disabled:opacity-30"
              title="Bajar"
              aria-label={`Bajar el nivel ${level.orden}`}
            >
              ↓
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-[16rem] grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={inputId}>
              Firma
            </label>
            <ProfileCombobox
              id={inputId}
              value={draft.profile}
              onChange={(profile) => setDraft({ ...draft, profile })}
            />
            <p className="text-xs text-gray-500 mt-1">
              {draft.profile
                ? 'Solo esta persona puede firmar el nivel.'
                : `Sin persona: firma cualquiera con el rol ${ROLE_LABELS[draft.role]}.`}
            </p>
            {warning && (
              <p className="text-xs text-amber-700 mt-1">
                Esta persona no tiene rol de aprobador de compras: asígnaselo en Compras → Roles
                para que pueda firmar.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`nivel-${level.id}-rol`}>
              Rol del nivel
            </label>
            <select
              id={`nivel-${level.id}-rol`}
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              {LEVEL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Nota (opcional)"
              maxLength={500}
              className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400"
              aria-label={`Nota del nivel ${level.orden}`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-[10rem]">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={level.confirmed}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ confirmed: e.target.checked })}
              className="w-4 h-4 accent-[#52AF32]"
            />
            Confirmado por Compras
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={level.is_active}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ is_active: e.target.checked })}
              className="w-4 h-4 accent-[#52AF32]"
            />
            Activo (se firma)
          </label>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || update.isPending || !!warning}
            className="mt-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#52AF32] text-white hover:bg-[#52AF32]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function CommitteeChainEditor() {
  const qc = useQueryClient();
  const levelsQuery = useQuery({
    queryKey: LEVELS_KEY,
    queryFn: () => api.get<CommitteeApprovalLevel[]>('/compras/comite/niveles'),
  });
  const levels = levelsQuery.data ?? [];

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      api.put<CommitteeApprovalLevel[]>('/compras/comite/niveles/orden', { ids }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEVELS_KEY });
      notify.success('Orden de la cadena guardado');
    },
    onError: (err) => notify.error(errorText(err)),
  });

  const [newRole, setNewRole] = useState<UserRole>('director_general');
  const [newProfile, setNewProfile] = useState<ProfileOption | null>(null);
  const create = useMutation({
    mutationFn: () =>
      api.post<CommitteeApprovalLevel>('/compras/comite/niveles', {
        role: newRole,
        profile_id: newProfile?.id ?? null,
      }),
    onSuccess: (level) => {
      void qc.invalidateQueries({ queryKey: LEVELS_KEY });
      setNewProfile(null);
      notify.success(`Nivel ${level.orden} agregado al final de la cadena`);
    },
    onError: (err) => notify.error(errorText(err)),
  });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= levels.length) return;
    const ids = levels.map((l) => l.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    reorder.mutate(ids);
  };

  const active = levels.filter((l) => l.is_active);
  const unconfirmed = active.filter((l) => !l.confirmed).length;

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 space-y-1">
        <p>
          El comité se firma en este orden; con todas las firmas activas queda{' '}
          <strong>aprobado</strong>. Un rechazo lo regresa al autor con los comentarios.
        </p>
        <p>
          {active.length} {active.length === 1 ? 'nivel activo' : 'niveles activos'}
          {unconfirmed > 0 &&
            ` · ${unconfirmed} sin confirmar (el flujo opera igual con la asignación propuesta)`}
          .
        </p>
      </div>

      {levelsQuery.isLoading ? (
        <div className="py-6 text-center">
          <div className="w-6 h-6 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : levelsQuery.isError ? (
        <p className="text-sm text-red-600">No se pudo cargar la cadena.</p>
      ) : (
        <ol className="space-y-3">
          {levels.map((level, index) => (
            <LevelRow
              key={`${level.id}:${level.role}:${level.profile_id ?? ''}:${level.notes ?? ''}`}
              level={level}
              index={index}
              total={levels.length}
              onMove={move}
              busy={reorder.isPending}
            />
          ))}
        </ol>
      )}

      <div className="p-4 rounded-lg border border-dashed border-[#52AF32]/50 bg-[#52AF32]/5">
        <p className="text-sm font-medium text-[#424846] mb-2">Agregar un nivel al final</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="nuevo-nivel-persona">
              Persona (opcional)
            </label>
            <ProfileCombobox id="nuevo-nivel-persona" value={newProfile} onChange={setNewProfile} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="nuevo-nivel-rol">
              Rol
            </label>
            <select
              id="nuevo-nivel-rol"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              {LEVEL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending || (!!newProfile && !canSign(newProfile))}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#52AF32] text-white hover:bg-[#52AF32]/90 disabled:opacity-40"
          >
            {create.isPending ? 'Agregando…' : 'Agregar nivel'}
          </button>
        </div>
        {newProfile && !canSign(newProfile) && (
          <p className="text-xs text-amber-700 mt-2">
            Esta persona no tiene rol de aprobador de compras: asígnaselo en Compras → Roles para
            que pueda firmar.
          </p>
        )}
      </div>
    </div>
  );
}
