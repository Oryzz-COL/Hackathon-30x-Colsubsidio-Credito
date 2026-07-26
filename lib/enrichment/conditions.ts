import type {
  StaticAffiliateSnapshot,
} from "@/lib/enrichment/types";
import type { ProductId } from "@/lib/types";

const CONDITIONS: Record<ProductId, string> = {
  "cupo-credito": "Cupo reutilizable entre $150.000 y $5.000.000; monto sujeto a validación.",
  educativo: "Plazo flexible alineado con el periodo académico; institución y capacidad por confirmar.",
  hipotecario: "Comparar pesos y UVR con un plazo adaptado a la capacidad de pago.",
  "compra-cartera": "Unificar obligaciones en una cuota; tasa y plazo se comparan tras validar saldos.",
  mujeres: "Monto adaptable para el proyecto y beneficios adicionales sujetos a validación.",
  "libre-inversion": "De 1 a 150 SMMLV; plazo de 6 a 72 meses con libranza o de 6 a 60 meses sin libranza.",
  complementario: "Línea adicional para completar el proyecto de vivienda; monto por validar.",
  "seguros-impuestos": "Hasta $5.000.000 y hasta 11 meses; condiciones sujetas a validación.",
};

export function conditionFor(
  productId: ProductId,
  snapshot: StaticAffiliateSnapshot
): string {
  const payroll = snapshot.contractType.toLowerCase().includes("indefinido")
    ? "Libranza disponible para validar"
    : "Modalidad de pago por validar";
  return `${CONDITIONS[productId]} ${payroll}.`;
}

export function nextStepFor(productId: ProductId): string {
  if (productId === "compra-cartera") return "Confirmar saldos, entidades y autorizaciones antes de comparar.";
  if (productId === "hipotecario") return "Revisar proyecto, cuota inicial y capacidad con una persona asesora.";
  if (productId === "educativo") return "Confirmar institución, valor de matrícula y fecha límite.";
  return "Validar monto, capacidad y requisitos con revisión humana.";
}
