import type { Product, ProductId, SignalRule } from "@/lib/types";

const pending = ["Pendiente de validación con la ficha oficial vigente"];

export const PRODUCTS: Product[] = [
  { id: "cupo-credito", name: "Cupo de crédito", shortName: "Cupo", objective: "Disponibilidad reutilizable para necesidades cotidianas", needs: ["compras cotidianas","educación","farmacia","alimentación","tecnología","vestuario","hogar","viajes","disponibilidad reutilizable"], categoryCaps: { need: 45, intent: 35, evidence: 15, context: 5 }, requirements: pending, status: "PENDIENTE_VALIDACION", version: "catalogo-2026.07" },
  { id: "educativo", name: "Crédito educativo", shortName: "Educativo", objective: "Financiar formación propia o de dependientes", needs: ["posgrado","pregrado","curso","diplomado","matrícula","estudios de hijo","educación"], categoryCaps: { need: 50, intent: 30, evidence: 15, context: 5 }, requirements: pending, status: "PENDIENTE_VALIDACION", version: "catalogo-2026.07" },
  { id: "hipotecario", name: "Crédito hipotecario", shortName: "Vivienda", objective: "Acompañar una intención declarada de compra de vivienda", needs: ["comprar vivienda","vivienda","proyecto de vivienda","cuota inicial"], categoryCaps: { need: 55, intent: 25, evidence: 15, context: 5 }, requirements: pending, status: "PENDIENTE_VALIDACION", version: "catalogo-2026.07" },
  { id: "compra-cartera", name: "Compra de cartera", shortName: "Cartera", objective: "Consolidar obligaciones declaradas y simplificar pagos", needs: ["consolidar obligaciones","compra de cartera","simplificar pagos","mejorar plazo"], categoryCaps: { need: 55, intent: 25, evidence: 15, context: 5 }, requirements: pending, status: "PENDIENTE_VALIDACION", version: "catalogo-2026.07" },
  { id: "mujeres", name: "Crédito Mujeres", shortName: "Mujeres", objective: "Financiar proyectos declarados bajo reglas oficiales configurables", needs: ["emprendimiento","proyecto personal","capital de trabajo"], categoryCaps: { need: 50, intent: 30, evidence: 15, context: 5 }, requirements: pending, status: "PENDIENTE_VALIDACION", version: "catalogo-2026.07" },
  { id: "libre-inversion", name: "Libre inversión", shortName: "Libre inversión", objective: "Financiar proyectos personales y gastos familiares declarados", needs: ["proyecto personal","gastos familiares","remodelación","emprendimiento","libre inversión"], categoryCaps: { need: 50, intent: 30, evidence: 15, context: 5 }, requirements: pending, status: "PENDIENTE_VALIDACION", version: "catalogo-2026.07" },
  { id: "complementario", name: "Complementario hipotecario", shortName: "Complementario", objective: "Financiar acabados, remodelaciones y gastos de vivienda", needs: ["remodelación","acabados","trámites de vivienda","mejoras del hogar"], categoryCaps: { need: 55, intent: 25, evidence: 15, context: 5 }, requirements: pending, status: "PENDIENTE_VALIDACION", version: "catalogo-2026.07" },
  { id: "seguros-impuestos", name: "Rotativo seguros e impuestos", shortName: "Seguros e impuestos", objective: "Atender obligaciones estacionales declaradas", needs: ["impuestos","seguros","gasto estacional"], categoryCaps: { need: 55, intent: 25, evidence: 15, context: 5 }, requirements: pending, status: "PENDIENTE_VALIDACION", version: "catalogo-2026.07" },
];

const weights: Record<ProductId, [number, number, number]> = {
  "cupo-credito": [48, 26, 14], educativo: [55, 24, 14], hipotecario: [58, 22, 13],
  "compra-cartera": [58, 24, 12], mujeres: [50, 28, 14], "libre-inversion": [52, 25, 13],
  complementario: [56, 24, 13], "seguros-impuestos": [58, 24, 12],
};

export const RULES: SignalRule[] = PRODUCTS.flatMap((product) => {
  const [need, intent, evidence] = weights[product.id];
  return [
    { id: `${product.id}-need`, productId: product.id, label: `Necesidad declarada compatible con ${product.shortName}`, category: "need", weight: need, matches: product.needs },
    { id: `${product.id}-intent`, productId: product.id, label: "Finalidad y contexto descritos por la persona", category: "intent", weight: intent, matches: product.needs.slice(0, 3) },
    { id: `${product.id}-evidence`, productId: product.id, label: "Evidencia aportada y trazable", category: "evidence", weight: evidence, matches: product.needs },
  ];
});

export const getProduct = (id: ProductId) => PRODUCTS.find((p) => p.id === id)!;
