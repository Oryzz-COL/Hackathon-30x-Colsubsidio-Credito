import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/config/products";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { PROFILES } from "@/data/profiles";

describe("catálogo público", () => {
  it("contiene ocho identificadores únicos y separa el producto adicional", () => {
    expect(PRODUCTS).toHaveLength(8);
    expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(8);
    const additional = PRODUCTS.find((product) => product.id === "libre-inversion");
    expect(additional?.status).toBe("PENDIENTE_VALIDACION_OFICIAL");
    expect(additional?.briefSource).toBe("MVP_ADDITIONAL");
    expect(additional?.notice).toContain("pendiente de validación");
    expect(PRODUCTS.filter((product) => product.briefSource === "RECURSOS_RETO_CREDITO_PDF")).toHaveLength(7);
  });

  it.each(PRODUCTS)("$name participa en el motor de afinidad", (product) => {
    const base = PROFILES[0]!;
    const profile = { ...base, needs: product.needs.slice(0, 2), consent: true, declaredObligations: product.id === "compra-cartera" };
    const result = calculateAllAffinities(profile).find((item) => item.productId === product.id);
    expect(result?.affinityScore).toBeGreaterThan(0);
  });
});
