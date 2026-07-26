import type { Product, ProductId, SignalRule } from "@/lib/types";

const generalRequirements = [
  "Cédula de ciudadanía",
  "Más de 2 meses en el trabajo actual",
  "6 meses si el contrato es diferente a término indefinido",
  "Información orientativa sujeta a validación oficial vigente",
];

const brief = {
  status: "DOCUMENTADO_BRIEF" as const,
  briefSource: "RECURSOS_RETO_CREDITO_PDF" as const,
  requirements: generalRequirements,
  version: "brief-reto-credito-2026.07",
};

export const PRODUCTS: Product[] = [
  { ...brief, catalogClass: "NUCLEO_RETO", id: "cupo-credito", name: "Cupo de crédito / consumo rotativo", shortName: "Cupo", objective: "Monto reutilizable para necesidades cotidianas", needs: ["compras cotidianas","educación","farmacia","alimentación","tecnología","vestuario","hogar","viajes","disponibilidad reutilizable"], categoryCaps: { need: 45, intent: 35, evidence: 15, context: 5 }, facts: ["Monto reutilizable", "Desde $150.000 hasta $5.000.000, sujeto a validación"] },
  { ...brief, catalogClass: "NUCLEO_RETO", id: "hipotecario", name: "Crédito hipotecario", shortName: "Vivienda", objective: "Acompañar una intención declarada de compra de vivienda", needs: ["comprar vivienda","vivienda","proyecto de vivienda","cuota inicial"], categoryCaps: { need: 55, intent: 25, evidence: 15, context: 5 }, facts: ["Compra de vivienda", "Opciones en UVR o pesos"] },
  { ...brief, catalogClass: "NUCLEO_RETO", id: "educativo", name: "Crédito educativo", shortName: "Educativo", objective: "Financiar formación en instituciones acreditadas", needs: ["posgrado","pregrado","curso técnico","matrícula","estudios de hijo","educación"], categoryCaps: { need: 50, intent: 30, evidence: 15, context: 5 }, facts: ["Niveles técnicos, pregrado y posgrado", "Instituciones acreditadas"] },
  { ...brief, catalogClass: "COMPLEMENTARIO_DOCUMENTADO", id: "compra-cartera", name: "Compra de cartera", shortName: "Cartera", objective: "Consolidar obligaciones declaradas y buscar mejores condiciones", needs: ["consolidar obligaciones","compra de cartera","simplificar pagos","mejorar plazo"], categoryCaps: { need: 55, intent: 25, evidence: 15, context: 5 }, facts: ["Consolidación de obligaciones", "Búsqueda de mejores condiciones"] },
  { ...brief, catalogClass: "NUCLEO_RETO", id: "mujeres", name: "Crédito Mujer", shortName: "Mujer", objective: "Acompañar proyectos declarados con montos adaptables", needs: ["emprendimiento","proyecto personal","capital de trabajo"], categoryCaps: { need: 50, intent: 30, evidence: 15, context: 5 }, facts: ["Montos adaptables", "Beneficios adicionales mencionados en el brief, sujetos a validación"] },
  { ...brief, catalogClass: "COMPLEMENTARIO_DOCUMENTADO", id: "complementario", name: "Crédito complementario", shortName: "Complementario", objective: "Línea adicional del portafolio de soluciones financieras", needs: ["remodelación","acabados","trámites de vivienda","mejoras del hogar"], categoryCaps: { need: 55, intent: 25, evidence: 15, context: 5 }, facts: ["Línea adicional del portafolio de soluciones financieras"] },
  { ...brief, catalogClass: "COMPLEMENTARIO_DOCUMENTADO", id: "seguros-impuestos", name: "Crédito rotativo para seguros e impuestos", shortName: "Seguros e impuestos", objective: "Atender pagos declarados de seguros e impuestos", needs: ["impuestos","seguros","gasto estacional"], categoryCaps: { need: 55, intent: 25, evidence: 15, context: 5 }, facts: ["Hasta $5.000.000, sujeto a validación", "Plazo de hasta 11 meses, sujeto a validación"] },
  { catalogClass: "COMPLEMENTARIO_DOCUMENTADO", id: "libre-inversion", name: "Libre inversión", shortName: "Libre inversión", objective: "Financiar proyectos personales con libre destinación", needs: ["proyecto personal","gastos familiares","remodelación","emprendimiento","libre inversión"], categoryCaps: { need: 50, intent: 30, evidence: 15, context: 5 }, requirements: generalRequirements, status: "DOCUMENTADO_BRIEF", briefSource: "COLSUBSIDIO_DOT_COM", facts: ["Hasta $150.000.000, sujeto a validación", "Tasas diferenciales por categoría y modalidad de pago"], version: "colsubsidio-dot-com-2026.07.26" },
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
