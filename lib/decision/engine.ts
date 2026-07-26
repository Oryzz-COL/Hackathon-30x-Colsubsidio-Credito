/**
 * Motor de viabilidad preliminar.
 *
 * Responde la pregunta que el afiliado hace de verdad —"¿me lo van a dar?"—
 * sin fingir que somos el estudio de crédito. Es determinista y versionado: las
 * mismas entradas dan siempre la misma salida, y cada estado viene con sus
 * motivos, sus faltantes y, cuando no da, con el escenario que sí daría.
 *
 * Separación deliberada respecto al motor de afinidad: la afinidad dice QUÉ
 * producto corresponde a la necesidad; esto dice SI el escenario planteado se
 * sostiene. Un afiliado puede tener 95 de afinidad educativa y aun así pedir
 * una cuota que se come su ingreso entero. Antes, la pantalla decía "100 %
 * crédito educativo" y se quedaba tan tranquila.
 *
 * Lo que este motor NO hace, y hay que decirlo en pantalla: no consulta
 * centrales de riesgo, no verifica ingresos, no aprueba. Es una viabilidad
 * preliminar sobre datos declarados.
 */

import { getProduct } from "@/config/products";
import type { AffiliationCategory, DeclaredGender, ProductId } from "@/lib/types";

/** Regla versionada: si cambia un umbral, cambia esta cadena. */
export const DECISION_RULE_VERSION = "viabilidad-2026.07.1";

/**
 * Salario mínimo de referencia. Vive aquí y no disperso por el código porque
 * cambia cada enero y quien lo actualice tiene que encontrarlo a la primera.
 */
export const SMMLV = 1_623_500;

/**
 * Tasas efectivas anuales publicadas por Colsubsidio para enero de 2026.
 *
 * No son ilustrativas: salen del reglamento vigente, cambian cada mes y por eso
 * viajan junto a su fecha. La libranza descuenta de nómina y por eso cobra
 * menos; la categoría de afiliación mueve la tasa, que es la única forma en que
 * la categoría entra en el cálculo — nunca como criterio adverso.
 */
export const RATES = {
  vigencia: "enero de 2026",
  libranza: {
    "compra-cartera": { A: 0.1426, B: 0.1506, C: 0.1586 },
    general: { A: 0.1763, B: 0.1843, C: 0.1923 },
  },
  sinLibranza: {
    "compra-cartera": { A: 0.1671, B: 0.1763, C: 0.1855 },
    general: { A: 0.1912, B: 0.2004, C: 0.2096 },
  },
} as const;

/** Tasa por defecto cuando aún no se conoce la categoría (la más frecuente). */
export const EA_ILUSTRATIVA: number = RATES.sinLibranza.general.B;

/**
 * ¿La cuota puede descontarse de nómina?
 *
 * Solo quien tiene contrato laboral vigente puede acogerse a libranza. Es una
 * inferencia sobre lo declarado, no un dato verificado, y se dice en pantalla.
 */
export function hasPayrollOption(employmentStatus?: string): boolean {
  const value = (employmentStatus ?? "").toLowerCase();
  return value.includes("indefinido") || value.includes("fijo");
}

/** Tasa efectiva anual aplicable al escenario declarado. */
export function rateFor(
  productId: ProductId,
  category: AffiliationCategory | undefined,
  payroll: boolean
): number {
  const bucket = payroll ? RATES.libranza : RATES.sinLibranza;
  const line = productId === "compra-cartera" ? bucket["compra-cartera"] : bucket.general;
  const key: "A" | "B" | "C" = category === "A" ? "A" : category === "C" ? "C" : "B";
  return line[key];
}

/** Tope de endeudamiento sobre ingreso disponible. Por encima, no se sostiene. */
const DTI_COMODO = 0.3;
const DTI_LIMITE = 0.4;

/** Antigüedad mínima declarada, según el brief del reto. */
const MESES_INDEFINIDO = 2;
const MESES_OTRO_CONTRATO = 6;

/** Plazo máximo que ofrecemos al construir una contraoferta. */
const PLAZO_MAXIMO = 72;

export type DecisionStatus = "PREAPROBADO" | "REQUIERE_REVISION" | "NO_VIABLE_HOY";

export interface DecisionReason {
  /** Etiqueta corta para la tarjeta: "Capacidad de pago", "Antigüedad laboral". */
  label: string;
  /** Frase completa, en segunda persona, que el afiliado entiende sin traducción. */
  detail: string;
  impact: "POSITIVO" | "ATENCION" | "BLOQUEANTE";
}

export interface CounterOffer {
  amount: number;
  termMonths: number;
  monthlyPayment: number;
  explanation: string;
}

export interface DecisionInput {
  productId: ProductId;
  amount: number;
  termMonths: number;
  incomeRange?: string;
  category?: AffiliationCategory;
  employmentStatus?: string;
  tenureMonths?: number;
  dependents?: number;
  declaredObligations?: boolean;
  gender?: DeclaredGender;
  consent: boolean;
}

export interface DecisionResult {
  status: DecisionStatus;
  headline: string;
  summary: string;
  monthlyPayment: number;
  estimatedIncome: number;
  disposableIncome: number;
  paymentToIncome: number;
  /** Tasa efectiva anual aplicada, con su vigencia, para poder citarla. */
  annualRate: number;
  rateValidity: string;
  payrollDeduction: boolean;
  reasons: DecisionReason[];
  missing: string[];
  counterOffer?: CounterOffer;
  requirements: { label: string; status: "CUMPLE" | "POR_VERIFICAR" | "NO_CUMPLE" }[];
  ruleVersion: string;
  disclaimer: string;
}

/** Cuota fija mensual de una anualidad vencida. */
export function estimateMonthlyPayment(amount: number, months: number, ea = EA_ILUSTRATIVA): number {
  if (amount <= 0 || months <= 0) return 0;
  const monthlyRate = Math.pow(1 + ea, 1 / 12) - 1;
  return Math.round((amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)));
}

/** Monto máximo cuya cuota cabe en un presupuesto mensual dado. */
export function maxAmountForPayment(payment: number, months: number, ea = EA_ILUSTRATIVA): number {
  if (payment <= 0 || months <= 0) return 0;
  const monthlyRate = Math.pow(1 + ea, 1 / 12) - 1;
  return Math.round((payment * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate);
}

/**
 * Ingreso mensual estimado a partir de lo declarado.
 *
 * El rango declarado manda. La categoría solo se usa cuando la persona no
 * declaró ingreso, y siempre por el extremo BAJO de su banda: preferimos
 * quedarnos cortos y pedir verificación a inflar una capacidad que no existe.
 * La categoría nunca penaliza por sí misma; solo rellena un dato ausente.
 */
export function estimateIncome(incomeRange?: string, category?: AffiliationCategory): number {
  const declared = incomeRange?.toLowerCase().trim() ?? "";
  if (declared.includes("hasta 1")) return SMMLV;
  if (declared.includes("1 y 2") || declared.includes("1–2") || declared.includes("1-2")) return SMMLV * 1.5;
  if (declared.includes("2 y 4") || declared.includes("2–4") || declared.includes("2-4")) return SMMLV * 3;
  if (declared.includes("4 y 6") || declared.includes("4–6") || declared.includes("4-6")) return SMMLV * 5;
  if (declared.includes("más de 6") || declared.includes("mas de 6")) return SMMLV * 7;
  if (declared.includes("más de 4") || declared.includes("mas de 4")) return SMMLV * 5;

  if (category === "A") return SMMLV;
  if (category === "B") return SMMLV * 2;
  if (category === "C") return SMMLV * 4;
  return SMMLV;
}

/**
 * Ingreso libre para atender una cuota nueva.
 *
 * Descuenta un mínimo vital y una carga por persona a cargo. No es un modelo de
 * riesgo: es la aritmética que cualquiera haría en una servilleta, hecha
 * explícita para poder discutirla.
 */
function disposable(income: number, dependents: number, declaredObligations: boolean): number {
  const vital = income <= SMMLV * 1.5 ? income * 0.65 : income * 0.5;
  const perDependent = income * 0.08 * Math.min(dependents, 5);
  const obligations = declaredObligations ? income * 0.1 : 0;
  return Math.max(0, income - vital - perDependent - obligations);
}

/**
 * Tope de monto aplicable.
 *
 * Sobre las líneas de consumo pesan tres topes a la vez y manda el más
 * pequeño: el tope documentado de la línea, los 150 SMMLV del reglamento y las
 * 15 veces el ingreso del solicitante. Este último es el que de verdad recorta
 * las peticiones desproporcionadas.
 */
function productCap(productId: ProductId, income: number): { value: number; label: string } | null {
  if (productId === "cupo-credito" || productId === "seguros-impuestos") {
    return { value: 5_000_000, label: "el tope documentado de la línea" };
  }
  if (productId === "hipotecario") return null;

  const porSalarios = SMMLV * 150;
  const porIngreso = income * 15;
  return porIngreso < porSalarios
    ? { value: porIngreso, label: "el límite de 15 veces tu ingreso declarado" }
    : { value: porSalarios, label: "el tope de 150 SMMLV del reglamento" };
}

/** Plazo máximo según línea y modalidad de pago. */
function productMaxTerm(productId: ProductId, payroll: boolean): number {
  if (productId === "seguros-impuestos") return 11;
  if (productId === "hipotecario") return 240;
  return payroll ? PLAZO_MAXIMO : 60;
}

function requiredTenure(employmentStatus?: string): number {
  const value = (employmentStatus ?? "").toLowerCase();
  return value.includes("indefinido") ? MESES_INDEFINIDO : MESES_OTRO_CONTRATO;
}

const cop = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`;

/**
 * Construye el escenario que sí se sostiene.
 *
 * Primero intenta conservar el monto alargando el plazo, porque es lo que la
 * persona pidió; si ni al plazo máximo cabe, reduce el monto. Devolver "no" sin
 * una alternativa es el motivo por el que la gente abandona un formulario.
 */
function buildCounterOffer(
  amount: number,
  termMonths: number,
  budget: number,
  productId: ProductId,
  income: number,
  payroll: boolean,
  ea: number
): CounterOffer | undefined {
  if (budget <= 0) return undefined;
  const maxTerm = productMaxTerm(productId, payroll);
  const cap = productCap(productId, income);

  if (termMonths < maxTerm) {
    const payment = estimateMonthlyPayment(amount, maxTerm, ea);
    if (payment <= budget && (cap === null || amount <= cap.value)) {
      return {
        amount,
        termMonths: maxTerm,
        monthlyPayment: payment,
        explanation: `Con el mismo monto a ${maxTerm} meses la cuota baja a ${cop(payment)} y sí cabe en tu presupuesto estimado.`,
      };
    }
  }

  const viableTerm = maxTerm;
  let viableAmount = maxAmountForPayment(budget, viableTerm, ea);
  if (cap !== null) viableAmount = Math.min(viableAmount, cap.value);
  viableAmount = Math.floor(viableAmount / 100_000) * 100_000;
  if (viableAmount < SMMLV) return undefined;

  return {
    amount: viableAmount,
    termMonths: viableTerm,
    monthlyPayment: estimateMonthlyPayment(viableAmount, viableTerm, ea),
    explanation: `Un monto cercano a ${cop(viableAmount)} a ${viableTerm} meses sí encaja con lo que declaraste hoy.`,
  };
}

export function evaluateDecision(input: DecisionInput): DecisionResult {
  const product = getProduct(input.productId);
  const amount = Math.max(0, input.amount);
  const termMonths = Math.max(1, input.termMonths);
  const estimatedIncome = estimateIncome(input.incomeRange, input.category);
  const payroll = hasPayrollOption(input.employmentStatus);
  const annualRate = rateFor(input.productId, input.category, payroll);
  const monthlyPayment = estimateMonthlyPayment(amount, termMonths, annualRate);
  const disposableIncome = disposable(
    estimatedIncome,
    input.dependents ?? 0,
    Boolean(input.declaredObligations)
  );
  const paymentToIncome = estimatedIncome > 0 ? monthlyPayment / estimatedIncome : 1;

  const reasons: DecisionReason[] = [];
  const missing: string[] = [];
  let blocking = false;
  let attention = false;

  /* ── Antigüedad laboral: el único requisito duro del brief ─────────── */
  const tenureNeeded = requiredTenure(input.employmentStatus);
  if (typeof input.tenureMonths !== "number") {
    missing.push("Antigüedad laboral declarada");
    attention = true;
    reasons.push({
      label: "Antigüedad laboral",
      detail: `No nos dijiste cuánto llevas en tu trabajo actual. La referencia oficial es de ${tenureNeeded} meses.`,
      impact: "ATENCION",
    });
  } else if (input.tenureMonths < tenureNeeded) {
    blocking = true;
    const falta = tenureNeeded - input.tenureMonths;
    reasons.push({
      label: "Antigüedad laboral",
      detail: `Llevas ${input.tenureMonths} ${input.tenureMonths === 1 ? "mes" : "meses"} y para tu tipo de vinculación se piden ${tenureNeeded}. En ${falta} ${falta === 1 ? "mes" : "meses"} cumples este requisito.`,
      impact: "BLOQUEANTE",
    });
  } else {
    reasons.push({
      label: "Antigüedad laboral",
      detail: `Declaraste ${input.tenureMonths} meses y la referencia para tu vinculación es de ${tenureNeeded}.`,
      impact: "POSITIVO",
    });
  }

  /* ── Capacidad de pago sobre lo declarado ──────────────────────────── */
  if (!input.incomeRange) {
    missing.push("Rango de ingresos declarado");
    attention = true;
    reasons.push({
      label: "Ingresos",
      detail: `No declaraste un rango de ingresos, así que estimamos ${cop(estimatedIncome)} a partir de tu categoría. Declararlo cambia este resultado.`,
      impact: "ATENCION",
    });
  }

  const budgetRatio = disposableIncome > 0 ? monthlyPayment / disposableIncome : Number.POSITIVE_INFINITY;
  if (budgetRatio > 1 || paymentToIncome > DTI_LIMITE) {
    blocking = true;
    reasons.push({
      label: "Capacidad de pago",
      detail: `La cuota de ${cop(monthlyPayment)} al mes representa el ${Math.round(paymentToIncome * 100)} % del ingreso que declaraste (${cop(estimatedIncome)}). Es un compromiso que no se sostiene.`,
      impact: "BLOQUEANTE",
    });
  } else if (paymentToIncome > DTI_COMODO || budgetRatio > 0.8) {
    attention = true;
    reasons.push({
      label: "Capacidad de pago",
      detail: `La cuota de ${cop(monthlyPayment)} es el ${Math.round(paymentToIncome * 100)} % de tu ingreso declarado. Es viable, pero queda ajustada y una asesora debe revisarla contigo.`,
      impact: "ATENCION",
    });
  } else {
    reasons.push({
      label: "Capacidad de pago",
      detail: `La cuota estimada de ${cop(monthlyPayment)} equivale al ${Math.round(paymentToIncome * 100)} % de tu ingreso declarado y cabe en tu presupuesto.`,
      impact: "POSITIVO",
    });
  }

  /* ── Topes de monto: manda el más restrictivo ──────────────────────── */
  const cap = productCap(input.productId, estimatedIncome);
  if (cap !== null && amount > cap.value) {
    blocking = true;
    reasons.push({
      label: "Monto solicitado",
      detail: `Pediste ${cop(amount)} y el máximo para tu caso es ${cop(cap.value)}, por ${cap.label}.`,
      impact: "BLOQUEANTE",
    });
  }

  if (amount > 0 && amount < SMMLV && input.productId !== "cupo-credito") {
    attention = true;
    reasons.push({
      label: "Monto solicitado",
      detail: `El monto mínimo de las líneas de crédito es 1 SMMLV (${cop(SMMLV)}). Para importes menores conviene el cupo rotativo.`,
      impact: "ATENCION",
    });
  }

  const maxTerm = productMaxTerm(input.productId, payroll);
  if (termMonths > maxTerm) {
    attention = true;
    reasons.push({
      label: "Plazo",
      detail: payroll
        ? `${product.name} maneja plazos de hasta ${maxTerm} meses y elegiste ${termMonths}.`
        : `Sin descuento por nómina el plazo máximo es de ${maxTerm} meses y elegiste ${termMonths}.`,
      impact: "ATENCION",
    });
  }

  /* ── Correspondencia declarada ─────────────────────────────────────── */
  if (input.productId === "mujeres" && input.gender !== "WOMAN") {
    blocking = true;
    reasons.push({
      label: "Correspondencia del producto",
      detail: "Crédito Mujer se orienta a quienes declaran género mujer. Hay otras líneas del portafolio para tu proyecto.",
      impact: "BLOQUEANTE",
    });
  }

  if (!input.consent) {
    blocking = true;
    reasons.push({
      label: "Autorización",
      detail: "Sin la autorización de tratamiento de datos no podemos evaluar tu solicitud.",
      impact: "BLOQUEANTE",
    });
  }

  missing.push("Verificación oficial de ingresos y documentos");

  /* ── Estado final ──────────────────────────────────────────────────── */
  const status: DecisionStatus = blocking
    ? "NO_VIABLE_HOY"
    : attention
      ? "REQUIERE_REVISION"
      : "PREAPROBADO";

  const counterOffer =
    status === "NO_VIABLE_HOY"
      ? buildCounterOffer(
          amount,
          termMonths,
          Math.min(disposableIncome, estimatedIncome * DTI_COMODO),
          input.productId,
          estimatedIncome,
          payroll,
          annualRate
        )
      : undefined;

  const headline =
    status === "PREAPROBADO"
      ? "Preaprobado para continuar"
      : status === "REQUIERE_REVISION"
        ? "Vas bien, falta confirmar un par de cosas"
        : "Hoy no es viable, pero hay un camino";

  const summary =
    status === "PREAPROBADO"
      ? `Con lo que declaraste, ${product.name} por ${cop(amount)} a ${termMonths} meses se sostiene. Falta la verificación formal de documentos e ingresos.`
      : status === "REQUIERE_REVISION"
        ? `${product.name} por ${cop(amount)} a ${termMonths} meses es posible, pero hay datos por confirmar antes de avanzar.`
        : `${product.name} por ${cop(amount)} a ${termMonths} meses no se sostiene con lo que declaraste hoy.`;

  return {
    status,
    headline,
    summary,
    monthlyPayment,
    estimatedIncome,
    disposableIncome,
    paymentToIncome,
    annualRate,
    rateValidity: RATES.vigencia,
    payrollDeduction: payroll,
    reasons,
    missing: [...new Set(missing)],
    counterOffer,
    requirements: [
      {
        label: "Autorización de tratamiento de datos",
        status: input.consent ? "CUMPLE" : "NO_CUMPLE",
      },
      {
        label: `Antigüedad laboral mínima (${tenureNeeded} meses)`,
        status:
          typeof input.tenureMonths !== "number"
            ? "POR_VERIFICAR"
            : input.tenureMonths >= tenureNeeded
              ? "CUMPLE"
              : "NO_CUMPLE",
      },
      {
        label: "Relación cuota / ingreso declarado",
        status:
          paymentToIncome > DTI_LIMITE ? "NO_CUMPLE" : paymentToIncome > DTI_COMODO ? "POR_VERIFICAR" : "CUMPLE",
      },
      { label: "Documentos y verificación oficial", status: "POR_VERIFICAR" },
      { label: "Estudio de crédito y centrales de riesgo", status: "POR_VERIFICAR" },
    ],
    ruleVersion: DECISION_RULE_VERSION,
    disclaimer:
      `Viabilidad preliminar calculada con datos declarados y la tasa vigente de ${RATES.vigencia} (${(annualRate * 100).toFixed(2)} % E.A.${payroll ? " con libranza" : " sin libranza"}). No consulta centrales de riesgo, no verifica ingresos y no constituye una aprobación de crédito: la decisión final corresponde al estudio de crédito de Colsubsidio.`,
  };
}
