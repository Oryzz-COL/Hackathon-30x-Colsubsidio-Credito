import { describe, expect, it } from "vitest";
import { buildBatchOutputCsv, summarizeBatchDiversity } from "@/lib/batch/export";
import { classifyNeeds, deriveChannel, deriveTiming, parseDeclaredGender } from "@/lib/batch/derive";
import { batchRowSchema, rowToProfile, validateRows, type BatchRow } from "@/lib/validation/batch-row";

const row = (overrides: Partial<Record<string, string>> = {}) => ({
  tipo_documento: "CC",
  documento: "9900123",
  nombre: "Persona De Prueba",
  ciudad: "Bogotá",
  categoria: "A",
  necesidades: "educación|posgrado",
  consentimiento: "SI",
  ...overrides,
});

const parse = (overrides: Partial<Record<string, string>> = {}): BatchRow =>
  batchRowSchema.parse(row(overrides));

describe("clasificación de necesidades", () => {
  it("reconoce cada familia que cambia canal y momento", () => {
    expect(classifyNeeds(["impuestos"])).toBe("estacional");
    expect(classifyNeeds(["posgrado"])).toBe("educativa");
    expect(classifyNeeds(["comprar vivienda"])).toBe("vivienda");
    expect(classifyNeeds(["consolidar obligaciones"])).toBe("alivio");
    expect(classifyNeeds(["emprendimiento"])).toBe("emprendimiento");
    expect(classifyNeeds(["tecnología"])).toBe("cotidiana");
    expect(classifyNeeds(["algo que nadie previó"])).toBe("sin_clasificar");
  });
});

describe("derivación de canal", () => {
  it("respeta el canal declarado por encima de cualquier deducción", () => {
    const result = deriveChannel(["comprar vivienda"], { declaredChannel: "WhatsApp", phone: "3005550000" });
    expect(result.value).toBe("WHATSAPP");
    expect(result.reason).toMatch(/declara/i);
  });

  it("usa el portal cuando el archivo no aporta ninguna vía autorizada", () => {
    const result = deriveChannel(["posgrado"], {});
    expect(result.value).toBe("IN_APP");
    expect(result.reason).toMatch(/no trae un canal autorizado/i);
  });

  it("elige llamada para decisiones que se conversan y hay teléfono", () => {
    expect(deriveChannel(["comprar vivienda"], { phone: "3005550000" }).value).toBe("CALL");
    expect(deriveChannel(["consolidar obligaciones"], { phone: "3005550000" }).value).toBe("CALL");
  });

  it("prioriza un canal inmediato cuando la necesidad tiene fecha de corte", () => {
    expect(deriveChannel(["impuestos"], { phone: "3005550000", email: "a@b.test" }).value).toBe("WHATSAPP");
  });

  it("siempre devuelve una razón escrita", () => {
    for (const needs of [["impuestos"], ["posgrado"], ["comprar vivienda"], ["tecnología"]]) {
      expect(deriveChannel(needs, { email: "a@b.test" }).reason.length).toBeGreaterThan(20);
    }
  });
});

describe("derivación de momento", () => {
  it("da urgencia alta a lo que vence y baja a lo que se planea", () => {
    expect(deriveTiming(["impuestos"]).urgency).toBe("HIGH");
    expect(deriveTiming(["comprar vivienda"]).urgency).toBe("LOW");
  });

  it("cede ante un disparador con fecha concreta", () => {
    const derived = deriveTiming(["posgrado"], {
      timing: "Faltan 3 semanas para el cierre de matrículas",
      reason: "Calendario académico del periodo",
      urgency: "HIGH",
    });
    expect(derived.timing).toMatch(/3 semanas/);
    expect(derived.horizon).toBe("NOW");
  });
});

describe("género declarado", () => {
  it("acepta las formas en que la gente escribe el dato", () => {
    expect(parseDeclaredGender("Mujer")).toBe("WOMAN");
    expect(parseDeclaredGender("FEMENINO")).toBe("WOMAN");
    expect(parseDeclaredGender("hombre")).toBe("MAN");
  });

  it("no lo inventa cuando la columna falta o es ilegible", () => {
    expect(parseDeclaredGender()).toBeUndefined();
    expect(parseDeclaredGender("")).toBeUndefined();
    expect(parseDeclaredGender("Laura Cárdenas")).toBeUndefined();
  });
});

describe("perfiles del lote", () => {
  it("no produce el mismo canal ni el mismo momento para necesidades distintas", () => {
    const profiles = [
      rowToProfile(parse({ necesidades: "impuestos|seguros", telefono: "3005550001" }), "lote.csv"),
      rowToProfile(parse({ necesidades: "comprar vivienda", telefono: "3005550002" }), "lote.csv"),
      rowToProfile(parse({ necesidades: "posgrado", correo: "a@b.test" }), "lote.csv"),
    ];
    const channels = new Set(profiles.map((p) => p.preferences?.preferredChannel));
    const horizons = new Set(profiles.map((p) => p.goalHorizon));
    expect(channels.size).toBeGreaterThanOrEqual(3);
    expect(horizons.size).toBeGreaterThanOrEqual(2);
  });

  it("deja la autorización de contacto registrada para que la política pueda evaluarla", () => {
    const granted = rowToProfile(parse(), "lote.csv");
    expect(granted.consents?.some((c) => c.purpose === "COMMERCIAL_CONTACT" && c.status === "GRANTED")).toBe(true);

    const denied = rowToProfile(parse({ consentimiento: "NO" }), "lote.csv");
    expect(denied.consents).toHaveLength(0);
  });

  it("escribe la razón de cada derivación en la evidencia, marcada como derivada", () => {
    const profile = rowToProfile(parse({ necesidades: "impuestos", telefono: "3005550001" }), "lote.csv");
    const derived = profile.evidence.filter((item) => item.dataNature === "DERIVED");
    expect(derived).toHaveLength(2);
    expect(derived.every((item) => item.notes && item.notes.length > 20)).toBe(true);
    expect(derived.every((item) => item.confidence < 0.85)).toBe(true);
  });

  it("no asigna género cuando el archivo no lo declara", () => {
    expect(rowToProfile(parse({ nombre: "Laura Cárdenas" }), "lote.csv").gender).toBeUndefined();
    expect(rowToProfile(parse({ genero: "mujer" }), "lote.csv").gender).toBe("WOMAN");
  });

  it("sigue aceptando un archivo con solo las siete columnas del reto", () => {
    const [result] = validateRows([row()]);
    expect(result!.status).toBe("VALID");
  });
});

describe("exportación del lote", () => {
  const profiles = [
    rowToProfile(parse({ necesidades: "impuestos", telefono: "3005550001" }), "lote.csv"),
    rowToProfile(parse({ necesidades: "comprar vivienda", telefono: "3005550002" }), "lote.csv"),
  ];
  const validation = validateRows([
    row({ necesidades: "impuestos" }),
    row({ necesidades: "comprar vivienda" }),
    row({ documento: "x" }),
  ]);

  it("entrega el contrato mínimo de salida por persona", () => {
    const csv = buildBatchOutputCsv(profiles, validation);
    const [header] = csv.split("\n");
    for (const column of ["producto_recomendado", "canal_recomendado", "momento_recomendado", "senal_1", "explicacion_afiliado", "version_regla"]) {
      expect(header).toContain(column);
    }
  });

  it("incluye las filas rechazadas con su motivo y no las pierde", () => {
    const csv = buildBatchOutputCsv(profiles, validation);
    expect(csv.split("\n")).toHaveLength(4);
    expect(csv).toContain("ERROR");
  });

  it("nunca exporta el documento completo", () => {
    const csv = buildBatchOutputCsv(profiles, validation);
    expect(csv).not.toContain("9900123");
    expect(csv).toContain("••••");
  });

  it("mide la diversidad real del lote", () => {
    const diversity = summarizeBatchDiversity(profiles);
    expect(diversity.channels).toBeGreaterThanOrEqual(2);
    expect(diversity.timings).toBeGreaterThanOrEqual(2);
  });
});
