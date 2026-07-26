import { describe, expect, it } from "vitest";
import {
  EXTERNAL_PROFILES,
  EXTERNAL_PROFILE_BY_DOCUMENT,
} from "@/data/external-profiles";

describe("perfiles externos sintéticos", () => {
  it("reserva cédulas únicas solo para la demostración", () => {
    const documents = EXTERNAL_PROFILES.map((profile) => profile.documentNumber);
    expect(new Set(documents).size).toBe(documents.length);
    expect(documents.every((document) => /^10100010\d{2}$/.test(document))).toBe(true);
  });

  it("incluye la pareja de control con perfil estático idéntico", () => {
    const laura = EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001001")!;
    const nicolas = EXTERNAL_PROFILE_BY_DOCUMENT.get("1010001002")!;
    const { fullName: lauraName, ...lauraStatic } = laura.snapshot;
    const { fullName: nicolasName, ...nicolasStatic } = nicolas.snapshot;
    expect(lauraName).not.toBe(nicolasName);
    expect(lauraStatic).toEqual(nicolasStatic);
    expect(laura.raw.declaredGoal?.productIds).not.toEqual(nicolas.raw.declaredGoal?.productIds);
  });
});
