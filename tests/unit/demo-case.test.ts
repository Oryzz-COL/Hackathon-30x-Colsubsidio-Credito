/**
 * El handoff del afiliado a la asesora es la promesa que la demostración hace
 * en voz alta, así que conviene que esté cubierta: durante un tiempo se rompió
 * en producción sin que ninguna prueba se enterara.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CASE_TTL_MS, clearCases, loadCases, localMessages, localProfiles, saveCase } from "@/lib/demo-case";
import type { OutboxMessage } from "@/lib/notificaciones";
import type { Profile } from "@/lib/types";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(key); },
    setItem: (key: string, value: string) => { map.set(key, value); },
  };
}

const profile = (id: string): Profile => ({
  id,
  fullName: "Juez Demo",
  documentType: "CC",
  documentNumber: "1020304050",
  city: "Bogotá D.C.",
  email: "juez@example.com",
  phone: "",
  affiliation: "Pendiente",
  needs: ["educación"],
  consent: true,
  synthetic: true,
  origin: "AFFILIATE_SELF_SERVICE",
  evidence: [],
} as unknown as Profile);

const message = (id: string, profileId: string): OutboxMessage => ({
  id,
  to: "juez@example.com",
  toLabel: "Juez Demo",
  audience: "AFILIADO",
  subject: "Tu resultado",
  html: "<p>Hola</p>",
  text: "Hola",
  profileId,
  createdAt: new Date().toISOString(),
  delivery: "SIMULADO",
});

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: memoryStorage() });
});

describe("caso guardado en el navegador", () => {
  it("devuelve el caso que acaba de guardarse", () => {
    saveCase(profile("caso-1"), [message("mail-1", "caso-1")]);
    const cases = loadCases();

    expect(cases).toHaveLength(1);
    expect(localProfiles(cases)[0]!.fullName).toBe("Juez Demo");
    expect(localMessages(cases)[0]!.subject).toBe("Tu resultado");
  });

  it("deja el más reciente de primero", () => {
    saveCase(profile("caso-1"), []);
    saveCase(profile("caso-2"), []);

    expect(loadCases().map((item) => item.profile.id)).toEqual(["caso-2", "caso-1"]);
  });

  it("no duplica un caso que se vuelve a guardar", () => {
    saveCase(profile("caso-1"), []);
    saveCase(profile("caso-1"), [message("mail-1", "caso-1")]);

    const cases = loadCases();
    expect(cases).toHaveLength(1);
    expect(cases[0]!.notifications).toHaveLength(1);
  });

  it("olvida el caso cuando pasa su vigencia", () => {
    const saved = new Date("2026-07-26T08:00:00.000Z");
    saveCase(profile("caso-1"), [], saved);

    expect(loadCases(saved.getTime() + CASE_TTL_MS - 1000)).toHaveLength(1);
    expect(loadCases(saved.getTime() + CASE_TTL_MS + 1000)).toHaveLength(0);
  });

  it("borra todo cuando el titular lo pide", () => {
    saveCase(profile("caso-1"), [message("mail-1", "caso-1")]);
    clearCases();

    expect(loadCases()).toHaveLength(0);
  });

  it("sobrevive a un almacenamiento con basura", () => {
    window.localStorage.setItem("creasy.casos.v1", "{ esto no es json");
    expect(loadCases()).toEqual([]);
  });

  it("descarta entradas con forma desconocida sin perder las válidas", () => {
    saveCase(profile("caso-1"), []);
    const raw = JSON.parse(window.localStorage.getItem("creasy.casos.v1")!) as unknown[];
    window.localStorage.setItem("creasy.casos.v1", JSON.stringify([{ roto: true }, ...raw]));

    expect(loadCases().map((item) => item.profile.id)).toEqual(["caso-1"]);
  });

  it("no falla en el servidor, donde no hay navegador", () => {
    vi.stubGlobal("window", undefined);
    expect(loadCases()).toEqual([]);
    expect(() => clearCases()).not.toThrow();
  });
});
