/**
 * El caso de negocio es aritmética sobre el calendario publicado, así que se
 * puede comprobar. Si alguna de estas cuentas dejara de cuadrar, la cifra que
 * el proyecto dice en voz alta delante de un jurado sería falsa.
 */

import { describe, expect, it } from "vitest";
import { campaignArithmetic, productTimings, BUSINESS_CASE_ASSUMPTIONS } from "@/lib/business-case";
import { CALENDAR } from "@/lib/exogenous/calendar";

describe("temporada de cada línea", () => {
  it("solo incluye productos con ventana declarada en el calendario", () => {
    const covered = new Set(CALENDAR.flatMap((trigger) => trigger.productIds));
    expect(productTimings().map((item) => item.productId).sort()).toEqual([...covered].sort());
  });

  it("cuenta los meses de matrícula sin duplicar los que se solapan", () => {
    const educativo = productTimings().find((item) => item.productId === "educativo");

    /* Noviembre a febrero, mayo a julio y la temporada escolar de diciembre y
       enero, que ya estaban contados. Siete meses distintos de doce. */
    expect(educativo?.monthsInWindow).toBe(7);
    expect(educativo?.shareInWindow).toBeCloseTo(7 / 12, 5);
  });

  it("la parte dentro y fuera de la ventana suma el año entero", () => {
    for (const timing of productTimings()) {
      expect(timing.shareInWindow + timing.shareOutOfWindow).toBeCloseTo(1, 10);
      expect(timing.monthsInWindow).toBeGreaterThan(0);
      expect(timing.monthsInWindow).toBeLessThanOrEqual(12);
      expect(timing.windows.length).toBeGreaterThan(0);
    }
  });
});

describe("aritmética de una campaña", () => {
  it("reparte el volumen sin perder ni inventar envíos", () => {
    const result = campaignArithmetic("educativo", 10_000)!;

    expect(result.inWindow + result.outOfWindow).toBe(10_000);
    expect(result.outOfWindow).toBe(10_000 - Math.round(10_000 * (7 / 12)));
  });

  it("no responde nada cuando no hay volumen", () => {
    expect(campaignArithmetic("educativo", 0)).toBeUndefined();
  });

  /*
   * Vivienda no tiene ventana en el almanaque, y no la va a tener por analogía:
   * una hipoteca no se decide contra un calendario público. Callar es la
   * respuesta correcta.
   */
  it("calla sobre las líneas que el calendario no cubre", () => {
    expect(productTimings().some((item) => item.productId === "hipotecario")).toBe(false);
    expect(campaignArithmetic("hipotecario", 1_000)).toBeUndefined();
  });

  it("dice la cifra en la frase que se lee en voz alta", () => {
    const result = campaignArithmetic("educativo", 10_000)!;
    expect(result.headline).toContain(result.outOfWindow.toLocaleString("es-CO"));
    expect(result.headline).not.toMatch(/conversi[oó]n|ventas|ingresos/i);
  });
});

describe("los supuestos", () => {
  it("dicen en voz alta que esto no promete conversión", () => {
    const texts = BUSINESS_CASE_ASSUMPTIONS.map((item) => `${item.label} ${item.detail}`).join(" ");
    expect(texts).toMatch(/no hay una promesa de conversión/i);
  });
});
