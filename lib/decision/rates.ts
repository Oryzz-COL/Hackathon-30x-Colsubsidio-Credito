import type {
  AffiliationCategory,
  MortgageMode,
  PaymentMode,
  ProductId,
} from "@/lib/types";

/**
 * Foto versionada del portafolio publicado en Colsubsidio.com.
 *
 * Las páginas no exponen una fecha de vigencia común. Por eso registramos la
 * fecha de consulta y mantenemos la URL exacta de cada producto. Antes de usar
 * Creasy fuera de la demo hay que volver a consultar las fuentes.
 */
export const RATE_SNAPSHOT_DATE = "2026-07-26";
export const RATE_VALIDITY = "tasas publicadas consultadas el 26 de julio de 2026";

export const RATE_SOURCES = {
  "libre-inversion": "https://www.colsubsidio.com/creditos/consumo/libre-inversion",
  "compra-cartera": "https://www.colsubsidio.com/creditos/consumo/compra-cartera",
  "cupo-credito": "https://www.colsubsidio.com/afiliaciones/tarjeta/cupo-credito",
  hipotecario: "https://www.colsubsidio.com/creditos/vivienda/hipotecario",
  educativo: "https://www.colsubsidio.com/creditos/educativo",
  mujeres: "https://www.colsubsidio.com/creditos/mujeres",
  complementario: "https://www.colsubsidio.com/creditos/vivienda/cuota-inicial-y-remodelacion",
  "seguros-impuestos": "https://www.colsubsidio.com/creditos/rotativo",
} as const satisfies Record<ProductId, string>;

export interface PublishedRate {
  /** Tasa efectiva anual como decimal: 19,19 % se almacena como 0,1919. */
  ea: number;
  /** Tasa nominal mes vencido como decimal: 1,47 % se almacena como 0,0147. */
  nmv: number;
}

type RateMatrix = Partial<Record<AffiliationCategory, PublishedRate>>;

const libreInversion = {
  PAYROLL: {
    A: { ea: 0.1919, nmv: 0.0147 },
    B: { ea: 0.2009, nmv: 0.0154 },
    C: { ea: 0.2099, nmv: 0.016 },
  },
  NON_PAYROLL: {
    A: { ea: 0.217, nmv: 0.0165 },
    B: { ea: 0.2282, nmv: 0.0173 },
    C: { ea: 0.2394, nmv: 0.018 },
    D: { ea: 0.2506, nmv: 0.0188 },
  },
} as const satisfies Record<PaymentMode, RateMatrix>;

const compraCartera = {
  PAYROLL: {
    A: { ea: 0.1529, nmv: 0.0119 },
    B: { ea: 0.1619, nmv: 0.0126 },
    C: { ea: 0.1709, nmv: 0.0132 },
  },
  NON_PAYROLL: {
    A: { ea: 0.1888, nmv: 0.0145 },
    B: { ea: 0.2, nmv: 0.0153 },
    C: { ea: 0.2112, nmv: 0.0161 },
    D: { ea: 0.2224, nmv: 0.0169 },
  },
} as const satisfies Record<PaymentMode, RateMatrix>;

const cupoCredito = {
  A: { ea: 0.2494, nmv: 0.0187 },
  B: { ea: 0.2535, nmv: 0.019 },
  C: { ea: 0.2576, nmv: 0.0193 },
} as const satisfies RateMatrix;

const hipotecario = {
  UVR: {
    /*
     * La organización de la hackathon confirmó 4,39 % E.A. como tasa "desde".
     * Es la cifra usada por el cálculo aunque la página puede cambiar durante
     * la competencia; la NMV publicada permanece en 0,36 %.
     */
    A: { ea: 0.0439, nmv: 0.0036 },
    B: { ea: 0.0545, nmv: 0.0044 },
  },
  PESOS: {
    A: { ea: 0.1199, nmv: 0.0095 },
    B: { ea: 0.1252, nmv: 0.0099 },
  },
} as const satisfies Record<MortgageMode, RateMatrix>;

const educativo = {
  A: { ea: 0.1595, nmv: 0.0124 },
  B: { ea: 0.1707, nmv: 0.0132 },
  C: { ea: 0.1819, nmv: 0.014 },
  D: { ea: 0.1931, nmv: 0.0148 },
} as const satisfies RateMatrix;

const mujeres = {
  PAYROLL: {
    A: { ea: 0.183, nmv: 0.0141 },
    B: { ea: 0.192, nmv: 0.0147 },
    C: { ea: 0.201, nmv: 0.0154 },
  },
  NON_PAYROLL: {
    A: { ea: 0.2079, nmv: 0.0159 },
    B: { ea: 0.2191, nmv: 0.0166 },
    C: { ea: 0.2303, nmv: 0.0174 },
    D: { ea: 0.2415, nmv: 0.0182 },
  },
} as const satisfies Record<PaymentMode, RateMatrix>;

const complementario = {
  A: { ea: 0.1239, nmv: 0.0098 },
  B: { ea: 0.1351, nmv: 0.0106 },
  C: { ea: 0.1463, nmv: 0.0114 },
  D: { ea: 0.1575, nmv: 0.0123 },
} as const satisfies RateMatrix;

/** Expuesto para pruebas, trazabilidad y la base de conocimiento. */
export const RATES = {
  vigencia: RATE_VALIDITY,
  libreInversion,
  compraCartera,
  cupoCredito,
  hipotecario,
  educativo,
  mujeres,
  complementario,
} as const;

export interface RateSelection {
  productId: ProductId;
  category?: AffiliationCategory;
  paymentMode?: PaymentMode;
  mortgageMode?: MortgageMode;
}

export interface RateQuote {
  annualRate: number;
  nominalMonthlyRate: number;
  category: AffiliationCategory;
  paymentMode: PaymentMode;
  mortgageMode?: MortgageMode;
  label: string;
  validity: string;
  sourceUrl: string;
  /** False cuando la combinación exacta no aparece publicada. */
  exact: boolean;
  note?: string;
}

const CATEGORY_LABEL: Record<AffiliationCategory, string> = {
  A: "categoría A",
  B: "categoría B",
  C: "categoría C",
  D: "persona no afiliada",
};

function published(
  selection: Required<Pick<RateSelection, "productId">> & Omit<RateSelection, "productId">,
  rate: PublishedRate,
  label: string,
  exact = true,
  note?: string
): RateQuote {
  const category = selection.category ?? "B";
  const paymentMode = selection.paymentMode ?? "NON_PAYROLL";
  return {
    annualRate: rate.ea,
    nominalMonthlyRate: rate.nmv,
    category,
    paymentMode,
    mortgageMode: selection.mortgageMode,
    label,
    validity: RATE_VALIDITY,
    sourceUrl: RATE_SOURCES[selection.productId],
    exact,
    note,
  };
}

function pick(
  matrix: RateMatrix,
  category: AffiliationCategory,
  fallback: AffiliationCategory
): { rate: PublishedRate; exact: boolean } {
  const exactRate = matrix[category];
  if (exactRate) return { rate: exactRate, exact: true };
  const fallbackRate = matrix[fallback];
  if (!fallbackRate) throw new Error(`No existe una tasa de respaldo para la categoría ${fallback}`);
  return { rate: fallbackRate, exact: false };
}

/**
 * Resuelve una única tasa trazable para todos los cálculos de Creasy.
 *
 * Ningún consumidor debe escoger matrices directamente: cuota, contraoferta,
 * correos y pantalla tienen que recibir exactamente la misma cotización.
 */
export function rateQuoteFor(selection: RateSelection): RateQuote {
  const category = selection.category ?? "B";
  const paymentMode = selection.paymentMode ?? "NON_PAYROLL";
  const mortgageMode = selection.mortgageMode ?? "PESOS";
  const categoryLabel = CATEGORY_LABEL[category];

  if (selection.productId === "libre-inversion" || selection.productId === "compra-cartera") {
    const catalog = selection.productId === "libre-inversion" ? libreInversion : compraCartera;
    const productLabel = selection.productId === "libre-inversion" ? "Libre inversión" : "Compra de cartera";
    const effectiveMode = category === "D" ? "NON_PAYROLL" : paymentMode;
    const { rate, exact } = pick(catalog[effectiveMode], category, effectiveMode === "PAYROLL" ? "C" : "D");
    return published(
      { ...selection, category, paymentMode: effectiveMode },
      rate,
      `${productLabel} · ${effectiveMode === "PAYROLL" ? "con libranza" : "sin libranza"} · ${categoryLabel}`,
      exact && effectiveMode === paymentMode,
      effectiveMode !== paymentMode ? "La libranza no está publicada para personas no afiliadas; se usó pago sin libranza." : undefined
    );
  }

  if (selection.productId === "cupo-credito") {
    const { rate, exact } = pick(cupoCredito, category, "C");
    return published(
      { ...selection, category, paymentMode: "NON_PAYROLL" },
      rate,
      `Cupo de crédito · compras generales · ${categoryLabel}`,
      exact,
      exact ? undefined : "La página no publica una tasa para personas no afiliadas; se usó la categoría C como referencia conservadora."
    );
  }

  if (selection.productId === "hipotecario") {
    const { rate, exact } = pick(hipotecario[mortgageMode], category, "B");
    return published(
      { ...selection, category, paymentMode: "NON_PAYROLL", mortgageMode },
      rate,
      `Crédito hipotecario · ${mortgageMode} · ${categoryLabel}`,
      exact,
      exact ? undefined : `La página solo publica ${mortgageMode} para categorías A y B; se usó B como referencia y la tasa requiere confirmación.`
    );
  }

  if (selection.productId === "educativo") {
    const { rate } = pick(educativo, category, "D");
    return published(
      { ...selection, category, paymentMode: "NON_PAYROLL" },
      rate,
      `Crédito educativo · ${categoryLabel}`
    );
  }

  if (selection.productId === "mujeres") {
    const effectiveMode = category === "D" ? "NON_PAYROLL" : paymentMode;
    const { rate, exact } = pick(mujeres[effectiveMode], category, effectiveMode === "PAYROLL" ? "C" : "D");
    return published(
      { ...selection, category, paymentMode: effectiveMode },
      rate,
      `Crédito Mujer · ${effectiveMode === "PAYROLL" ? "con libranza" : "sin libranza"} · ${categoryLabel}`,
      exact && effectiveMode === paymentMode,
      effectiveMode !== paymentMode ? "La libranza no está publicada para personas no afiliadas; se usó pago sin libranza." : undefined
    );
  }

  if (selection.productId === "complementario") {
    const { rate } = pick(complementario, category, "D");
    return published(
      { ...selection, category, paymentMode: "NON_PAYROLL" },
      rate,
      `Crédito complementario · cuota fija en pesos · ${categoryLabel}`
    );
  }

  /*
   * La página de Crédito para seguros e impuestos publica forma de pago no
   * libranza, plazo y montos, pero no una tabla propia. Usamos la matriz vigente
   * del otro producto rotativo (Cupo) y obligamos a confirmación humana.
   */
  const { rate } = pick(cupoCredito, category, "C");
  return published(
    { ...selection, category, paymentMode: "NON_PAYROLL" },
    rate,
    `Crédito rotativo para seguros e impuestos · referencia Cupo · ${categoryLabel}`,
    false,
    "Colsubsidio no publica una tasa específica para esta línea; el cálculo usa Cupo como referencia y debe confirmarse."
  );
}

export function rateFor(
  productId: ProductId,
  category?: AffiliationCategory,
  paymentMode: PaymentMode = "NON_PAYROLL",
  mortgageMode: MortgageMode = "PESOS"
): number {
  return rateQuoteFor({ productId, category, paymentMode, mortgageMode }).annualRate;
}
