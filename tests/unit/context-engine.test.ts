import { describe, expect, it } from "vitest";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import {
  applyHousingContextScenario,
  createLiveContextDemoProfile,
  getContextSignals,
  summarizeLiveContext,
} from "@/lib/context-engine";

const NOW = new Date("2026-07-24T15:00:00.000Z");

describe("motor de contexto vivo", () => {
  it("no inventa preferencias cuando no existen señales suficientes", () => {
    const profile = createLiveContextDemoProfile(NOW);
    const summary = summarizeLiveContext(profile, NOW);

    expect(summary.status).toBe("SIN_SENALES");
    expect(summary.confidence).toBe(0);
    expect(summary.nextAction).toMatch(/No contactar/i);
  });

  it("detecta vivienda a partir de actividad propia reciente", () => {
    const profile = applyHousingContextScenario(
      createLiveContextDemoProfile(NOW),
      NOW
    );
    const summary = summarizeLiveContext(profile, NOW);

    expect(summary.status).toBe("CONTEXTO_DETECTADO");
    expect(summary.productId).toBe("hipotecario");
    expect(summary.signals.filter((signal) => signal.status === "VIGENTE")).toHaveLength(3);
    expect(summary.confidence).toBeGreaterThanOrEqual(80);
    expect(summary.channel).toBe("IN_APP");
  });

  it("recalcula la afinidad principal con señales automáticas trazables", () => {
    const profile = applyHousingContextScenario(
      createLiveContextDemoProfile(NOW),
      NOW
    );
    const top = calculateAllAffinities(profile)[0]!;

    expect(top.productId).toBe("hipotecario");
    expect(top.positiveSignals).toContain(
      "3 interacciones propias recientes y autorizadas"
    );
  });

  it("excluye todas las señales si se revoca el consentimiento", () => {
    const profile = applyHousingContextScenario(
      createLiveContextDemoProfile(NOW),
      NOW
    );
    profile.consents = profile.consents?.map((record) => ({
      ...record,
      status: "REVOKED",
      revokedAt: NOW.toISOString(),
    }));

    const signals = getContextSignals(profile, NOW);
    const summary = summarizeLiveContext(profile, NOW);

    expect(signals.every((signal) => signal.status === "EXCLUIDA")).toBe(true);
    expect(summary.status).toBe("SIN_SENALES");
    expect(summary.consented).toBe(false);
  });

  it("descarta señales vencidas en lugar de mantener intereses históricos", () => {
    const profile = applyHousingContextScenario(
      createLiveContextDemoProfile(NOW),
      NOW
    );
    profile.behaviorEvents = profile.behaviorEvents?.map((event) => ({
      ...event,
      expiresAt: "2026-07-23T15:00:00.000Z",
    }));

    const summary = summarizeLiveContext(profile, NOW);

    expect(summary.status).toBe("SIN_SENALES");
    expect(summary.signals.every((signal) => signal.status === "VENCIDA")).toBe(true);
  });
});
