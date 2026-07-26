/**
 * Estado compartido mínimo del servidor.
 *
 * El catálogo contiene únicamente perfiles sintéticos de solo lectura. Los
 * datos declarados durante el recorrido se calculan y permanecen en el
 * navegador (`lib/demo-case.ts`), fuera de este estado compartido.
 *
 * El registro compartido conserva solo eventos redactados sin PII.
 */

import { PROFILES } from "@/data/profiles";
import type { AuditEvent, Profile } from "@/lib/types";

/* Congelado en el arranque: nadie muta el catálogo de demostración. */
const profiles: readonly Profile[] = Object.freeze(structuredClone(PROFILES));

let audit: AuditEvent[] = [
  { id: "aud-1", action: "DEMO_LOGIN", actor: "Asesora demo", detail: "Inicio de sesión demo", createdAt: "2026-07-23T13:45:00.000Z" },
  { id: "aud-2", action: "BATCH_IMPORT", actor: "Sistema", detail: "Lote sintético: 36 filas procesadas", createdAt: "2026-07-23T13:48:00.000Z" },
  { id: "aud-3", action: "AFFINITY_CALCULATED", actor: "Motor de orientación v2026.07.1", detail: "Correspondencias actualizadas sin PII", createdAt: "2026-07-23T13:49:00.000Z" },
];

/** Techo defensivo para evitar crecimiento ilimitado en memoria. */
const AUDIT_LIMIT = 200;

export const store = {
  list: (): Profile[] => structuredClone(profiles) as Profile[],
  get: (id: string) => profiles.find((p) => p.id === id),
  audit: () => audit,
  log: (event: Omit<AuditEvent, "id" | "createdAt">) => {
    audit = [{ ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...audit].slice(0, AUDIT_LIMIT);
  },
};
