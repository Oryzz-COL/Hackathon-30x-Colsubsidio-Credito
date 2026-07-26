import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { deriveMetrics } from "@/lib/metrics";

describe("denominadores del tablero", () => {
  it("la leyenda de confianza suma exactamente los perfiles analizados", () => {
    const metrics = deriveMetrics(PROFILES);
    expect(metrics.confidence.reduce((sum, item) => sum + item.value, 0))
      .toBe(metrics.profiles);
  });

  it("la distribución por producto suma exactamente los perfiles analizados", () => {
    const metrics = deriveMetrics(PROFILES);
    expect(metrics.distribution.reduce((sum, item) => sum + item.value, 0))
      .toBe(metrics.profiles);
  });
});
