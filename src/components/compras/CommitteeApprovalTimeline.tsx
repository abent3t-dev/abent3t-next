"use client";

import { ROLE_LABELS } from "@/types/auth";
import type { UserRole } from "@/types/auth";
import { CommitteeApproval, CommitteeDetail } from "@/types/purchases";

/**
 * Fase §16 — Linea de tiempo vertical de la cadena de aprobacion: nivel,
 * quien, cuando, comentario. Estados: aprobado (verde), rechazado (rojo),
 * turno vigente (azul pulse), pendiente (gris).
 *
 * H3 (2026-09-29): debajo, el histórico de las versiones anteriores (quién
 * firmó y el comentario del rechazo), que antes dejaba de verse al reenviar.
 */

const formatDateTime = (date: string | null) =>
  date
    ? new Date(date).toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

const roleLabel = (role: string) => ROLE_LABELS[role as UserRole] ?? role;

export default function CommitteeApprovalTimeline({
  detail,
}: {
  detail: CommitteeDetail;
}) {
  // Solo las firmas de la version vigente cuentan para el ciclo actual
  const currentApprovals = new Map<number, CommitteeApproval>(
    detail.approvals
      .filter((a) => a.version === detail.current_version)
      .map((a) => [a.approver_level, a]),
  );

  // Versiones anteriores, de la más reciente a la más vieja
  const previous = new Map<number, CommitteeApproval[]>();
  for (const a of detail.approvals) {
    if (a.version === detail.current_version) continue;
    previous.set(a.version, [...(previous.get(a.version) ?? []), a]);
  }
  const history = [...previous.entries()].sort(([a], [b]) => b - a);

  return (
    <>
      <ol className="space-y-2">
        {detail.levels.map((level) => {
          const approval = currentApprovals.get(level.orden);
          const isCurrent =
            detail.status === "en_aprobacion" &&
            detail.current_approver_level === level.orden;
          const dotClass = approval
            ? approval.action === "aprobado"
              ? "bg-green-500"
              : "bg-red-500"
            : isCurrent
              ? "bg-blue-500 animate-pulse"
              : "bg-gray-300";
          return (
            <li key={level.orden} className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className={`w-3 h-3 rounded-full ${dotClass}`} />
              </div>
              <div className="flex-1 pb-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Nivel {level.orden}</span> ·{" "}
                  {roleLabel(level.role)}
                  {level.has_specific_user && (
                    <span className="text-xs text-gray-400">
                      {" "}
                      (usuario especifico)
                    </span>
                  )}
                  {!level.confirmed && (
                    <span
                      className="ml-1 text-xs text-amber-600"
                      title="Mapeo pendiente de confirmar con Ingrid"
                    >
                      *
                    </span>
                  )}
                </p>
                {approval ? (
                  <p className="text-xs text-gray-500">
                    {approval.action === "aprobado" ? "Aprobo" : "Rechazo"}{" "}
                    <span className="font-medium">
                      {approval.approver?.full_name ?? "—"}
                    </span>
                    {" · "}
                    {formatDateTime(approval.action_at) ?? "—"}
                    {approval.elapsed_hours_since_assigned !== null &&
                      ` · ${approval.elapsed_hours_since_assigned} h en el nivel`}
                    {approval.justification && (
                      <span className="block text-red-700 mt-0.5">
                        &ldquo;{approval.justification}&rdquo;
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    {isCurrent ? "En turno ahora" : "Pendiente"}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Versiones anteriores
          </p>
          <div className="space-y-3">
            {history.map(([version, rows]) => {
              const rejected = rows.some((a) => a.action === "rechazado");
              return (
                <div key={version}>
                  <p className="text-sm font-medium text-gray-800">
                    Versión {version}
                    <span
                      className={`ml-2 text-xs font-normal ${rejected ? "text-red-700" : "text-gray-500"}`}
                    >
                      {rejected ? "rechazada" : "sin cerrar"}
                    </span>
                  </p>
                  <ul className="mt-1 space-y-1">
                    {rows
                      .slice()
                      .sort((a, b) => a.approver_level - b.approver_level)
                      .map((a) => (
                        <li key={a.id} className="text-xs text-gray-600">
                          Nivel {a.approver_level} ·{" "}
                          {a.action === "aprobado" ? "Aprobó" : "Rechazó"}{" "}
                          <span className="font-medium">
                            {a.approver?.full_name ?? "—"}
                          </span>
                          {" · "}
                          {formatDateTime(a.action_at) ?? "—"}
                          {a.justification && (
                            <span className="block text-red-700 mt-0.5">
                              &ldquo;{a.justification}&rdquo;
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
