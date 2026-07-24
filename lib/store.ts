import { PROFILES } from "@/data/profiles";
import type { AuditEvent, Profile } from "@/lib/types";

let profiles = structuredClone(PROFILES);
let audit: AuditEvent[] = [
  { id: "aud-1", action: "DEMO_LOGIN", actor: "Asesora demo", detail: "Inicio de sesión demo", createdAt: "2026-07-23T13:45:00.000Z" },
  { id: "aud-2", action: "BATCH_IMPORT", actor: "Sistema", detail: "Lote sintético: 36 filas procesadas", createdAt: "2026-07-23T13:48:00.000Z" },
  { id: "aud-3", action: "AFFINITY_CALCULATED", actor: "Motor v2026.07.1", detail: "Índices recalculados sin PII", createdAt: "2026-07-23T13:49:00.000Z" },
];

export const store = {
  list: () => profiles,
  get: (id: string) => profiles.find((p) => p.id === id),
  add: (profile: Profile) => { profiles = [profile, ...profiles]; return profile; },
  update: (id: string, patch: Partial<Profile>) => { profiles = profiles.map((p) => p.id === id ? { ...p, ...patch } : p); return profiles.find((p) => p.id === id); },
  anonymize: (id: string) => store.update(id, { fullName: "Titular anonimizado", documentNumber: "00000000", email: "anonimo@eliminado.test", phone: "0000000000", needs: [], evidence: [] }),
  audit: () => audit,
  log: (event: Omit<AuditEvent, "id" | "createdAt">) => { audit = [{ ...event, id: `aud-${audit.length + 1}`, createdAt: new Date().toISOString() }, ...audit]; },
};
