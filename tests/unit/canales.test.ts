import { describe, expect, it } from "vitest";
import { composeForChannel, SMS_LIMIT, trimToLimit } from "@/lib/notificaciones/canales";
import type { ContactChannel } from "@/lib/types";

const base = {
  firstName: "Valentina",
  productName: "Crédito educativo",
  message: "Valentina, te recomendamos explorar crédito educativo porque tu meta es iniciar una especialización, encontramos 4 señales relacionadas y elegiste WhatsApp como canal. Esta orientación no es una aprobación de crédito.",
};

const CHANNELS: ContactChannel[] = ["WHATSAPP", "SMS", "EMAIL", "CALL", "IN_APP"];

describe("recorte para SMS", () => {
  it("no toca lo que ya cabe", () => {
    expect(trimToLimit("mensaje corto")).toBe("mensaje corto");
  });

  it("corta por palabra y cierra con puntos suspensivos", () => {
    const result = trimToLimit("a".repeat(40) + " " + "b".repeat(200));
    expect(result.length).toBeLessThanOrEqual(SMS_LIMIT);
    expect(result.endsWith("…")).toBe(true);
  });

  it("no deja un signo de puntuación colgando antes de los puntos", () => {
    expect(trimToLimit(`${"palabra ".repeat(19)}fin, y más texto que sobra sin ninguna duda`, 160)).not.toContain(",…");
  });
});

describe("composición por canal", () => {
  it("cada canal produce una pieza distinta", () => {
    const bodies = CHANNELS.map((channel) => composeForChannel({ ...base, channel }).body);
    expect(new Set(bodies).size).toBeGreaterThan(1);
  });

  it("el SMS respeta el segmento de 160 caracteres", () => {
    const piece = composeForChannel({ ...base, channel: "SMS" });
    expect(piece.body.length).toBeLessThanOrEqual(SMS_LIMIT);
  });

  it("el correo conserva el mensaje completo y su asunto", () => {
    const piece = composeForChannel({ ...base, channel: "EMAIL" });
    expect(piece.body).toBe(base.message);
    expect(piece.header).toContain("Valentina");
  });

  it("la llamada entrega un guion, no algo que se envíe", () => {
    const piece = composeForChannel({ ...base, channel: "CALL", timeBand: "SATURDAY" });
    expect(piece.header).toMatch(/sábado/i);
    expect(piece.note).toMatch(/no se envía/i);
    expect(piece.cta).toBeUndefined();
  });

  it("todas las piezas explican qué implica ese canal", () => {
    for (const channel of CHANNELS) {
      expect(composeForChannel({ ...base, channel }).note.length).toBeGreaterThan(25);
    }
  });
});
