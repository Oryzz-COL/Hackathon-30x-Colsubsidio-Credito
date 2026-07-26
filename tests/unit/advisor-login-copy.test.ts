import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/advisor-access.tsx", "utf8");

describe("entrada del portal asesor", () => {
  it("prioriza un único acceso demo y una propuesta de valor directa", () => {
    expect(source).toContain("La oferta correcta ya está en tus datos.");
    expect(source).toContain("Usuario demo listo");
    expect(source).not.toContain("Conoce Creasy sin registrarte");
    expect(source).not.toContain("Explorar demostración");
  });
});
