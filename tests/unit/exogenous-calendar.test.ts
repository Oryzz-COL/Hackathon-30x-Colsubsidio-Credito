import { describe, expect, it } from "vitest";
import { activeTriggers, CALENDAR, triggerForNeed } from "@/lib/exogenous/calendar";
import { rowToProfile, batchRowSchema } from "@/lib/validation/batch-row";

/* Fechas fijas: un calendario que se prueba contra "hoy" falla en enero. */
const ENERO = new Date("2026-01-12T10:00:00-05:00");
const ABRIL = new Date("2026-04-10T10:00:00-05:00");
const JUNIO = new Date("2026-06-18T10:00:00-05:00");
const AGOSTO = new Date("2026-08-14T10:00:00-05:00");

describe("catálogo del calendario", () => {
  it("cada ventana cita su fuente y declara su precisión", () => {
    for (const trigger of CALENDAR) {
      expect(trigger.sourceLabel.length).toBeGreaterThan(10);
      expect(["DIA", "MES"]).toContain(trigger.precision);
      expect(trigger.rationale.length).toBeGreaterThan(30);
    }
  });

  it("solo afirma un día exacto cuando la fecha es legal", () => {
    for (const trigger of CALENDAR) {
      if (trigger.closingDay) expect(trigger.precision).toBe("DIA");
    }
  });
});

describe("ventanas vigentes", () => {
  it("abre matrículas y temporada escolar en enero", () => {
    const ids = activeTriggers("Bogotá", ENERO).map((item) => item.id);
    expect(ids).toContain("matriculas-primer-semestre");
    expect(ids).toContain("temporada-escolar");
  });

  it("abre el predial de Bogotá en abril y no lo aplica a otra ciudad", () => {
    expect(activeTriggers("Bogotá", ABRIL).map((i) => i.id)).toContain("predial-bogota");
    expect(activeTriggers("Medellín, Antioquia", ABRIL).map((i) => i.id)).not.toContain("predial-bogota");
  });

  it("reconoce la ciudad en los tres formatos en que llega", () => {
    for (const city of ["Bogotá", "Bogotá D.C.", "bogota d.c."]) {
      expect(activeTriggers(city, ABRIL).map((i) => i.id)).toContain("predial-bogota");
    }
  });

  it("marca la prima con urgencia alta cuando quedan pocos días", () => {
    const prima = activeTriggers("Bogotá", JUNIO).find((item) => item.id === "prima-legal");
    expect(prima?.urgency).toBe("HIGH");
    expect(prima?.timing).toMatch(/Faltan \d+ días/);
  });

  it("no inventa ventanas en un mes sin nada abierto", () => {
    expect(activeTriggers("Bogotá", AGOSTO)).toHaveLength(0);
  });

  it("ordena por lo que vence antes", () => {
    const days = activeTriggers("Bogotá", ENERO).map((item) => item.daysToClose);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
  });
});

describe("cruce con la necesidad declarada", () => {
  it("solo dispara sobre el producto que la persona ya buscaba", () => {
    expect(triggerForNeed("Bogotá", ["educativo"], JUNIO)?.id).toBe("matriculas-segundo-semestre");
    expect(triggerForNeed("Bogotá", ["hipotecario"], ENERO)).toBeUndefined();
  });

  it("entre dos ventanas del mismo producto gana la que cierra antes", () => {
    /* En enero coinciden matrículas (cierra en febrero) y temporada escolar
       (cierra el 31). Avisar de la que vence después sería llegar tarde. */
    expect(triggerForNeed("Bogotá", ["educativo"], ENERO)?.id).toBe("temporada-escolar");
  });

  it("una ventana abierta no arrastra a quien no declaró esa necesidad", () => {
    expect(triggerForNeed("Bogotá", ["educativo"], ABRIL)).toBeUndefined();
  });
});

describe("efecto en el lote", () => {
  const row = (necesidades: string, ciudad: string) => batchRowSchema.parse({
    tipo_documento: "CC", documento: "9900123", nombre: "Persona De Prueba",
    ciudad, categoria: "A", necesidades, consentimiento: "SI",
  });

  it("el perfil hereda la urgencia de la ventana cuando aplica", () => {
    const profile = rowToProfile(row("posgrado|educación", "Bogotá"), "lote.csv");
    const momento = profile.evidence.find((item) => item.label === "Momento derivado");
    /* En enero cae la ventana de matrículas; el resto del año, la deducción por
       familia de necesidad. Ambas rutas tienen que dejar razón escrita. */
    expect(momento?.notes?.length ?? 0).toBeGreaterThan(30);
    expect(momento?.dataNature).toBe("DERIVED");
  });
});
