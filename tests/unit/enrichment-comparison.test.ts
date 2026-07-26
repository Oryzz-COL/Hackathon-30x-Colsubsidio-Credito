import { describe, expect, it } from "vitest";
import { runEnrichment } from "@/lib/enrichment/engine";

const consent = {
  socialDemo: true,
  lifeEvents: true,
  authorizedFinancial: true,
  commercialContact: true,
};

describe("prueba fuerte de hiperpersonalización", () => {
  it("cambia producto, condición y canal con el mismo perfil estático", () => {
    const laura = runEnrichment({
      documentNumber: "1010001001",
      consent,
      now: "2026-07-26T12:00:00.000Z",
    });
    const nicolas = runEnrichment({
      documentNumber: "1010001002",
      consent,
      now: "2026-07-26T12:00:00.000Z",
    });

    const { fullName: lauraName, ...lauraStatic } = laura.before!;
    const { fullName: nicolasName, ...nicolasStatic } = nicolas.before!;
    expect(lauraName).not.toBe(nicolasName);
    expect(lauraStatic).toEqual(nicolasStatic);
    expect(laura.recommendation?.productId).toBe("educativo");
    expect(nicolas.recommendation?.productId).toBe("compra-cartera");
    expect(laura.recommendation?.conditionLabel).not.toBe(nicolas.recommendation?.conditionLabel);
    expect(laura.recommendation?.channel).not.toBe(nicolas.recommendation?.channel);
  });
});
