import { describe, expect, it } from "vitest";
import { parseChispyLine } from "@/lib/chispy/client";

describe("cliente de streaming de Chispy", () => {
  it("acepta una respuesta completa", () => {
    expect(parseChispyLine(JSON.stringify({
      tipo: "respuesta",
      texto: "Resumen listo",
      fuentes: ["Registro de auditoría"],
      proveedor: "local",
    }))).toEqual({
      tipo: "respuesta",
      texto: "Resumen listo",
      fuentes: ["Registro de auditoría"],
      proveedor: "local",
    });
  });

  it("ignora líneas vacías, inválidas o incompletas", () => {
    expect(parseChispyLine("")).toBeNull();
    expect(parseChispyLine("{")).toBeNull();
    expect(parseChispyLine(JSON.stringify({ tipo: "respuesta" }))).toBeNull();
  });
});
