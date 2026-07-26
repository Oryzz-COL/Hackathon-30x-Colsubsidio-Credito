/**
 * El caso de negocio, sin prometer una venta.
 *
 * Sin línea base ni experimento no existe una estimación responsable de
 * conversión. Este módulo se limita a aritmética reproducible sobre ventanas
 * del calendario público.
 *
 * Lo que sí se puede afirmar es aritmética verificable sobre el calendario que
 * ya vive en `lib/exogenous/calendar.ts`. Una matrícula se decide entre
 * noviembre y febrero, o entre mayo y julio. Son siete meses de doce. Si la
 * oferta educativa sale sin mirar el almanaque, cinco de cada doce
 * comunicaciones llegan cuando la decisión ya se tomó o todavía no existe.
 *
 * Los meses están publicados, la división es verificable y el resultado no
 * depende de supuestos sobre intención de compra. La afirmación se limita a la
 * proporción del esfuerzo que cae fuera de una ventana declarada.
 */

import { getProduct } from "@/config/products";
import { CALENDAR, CALENDAR_VERSION } from "@/lib/exogenous/calendar";
import type { ProductId } from "@/lib/types";

const MONTHS_IN_YEAR = 12;

export interface ProductTiming {
  productId: ProductId;
  productName: string;
  /** Meses del año con alguna ventana abierta para esta línea. */
  monthsInWindow: number;
  /** Nombre de las ventanas que la cubren, para poder citarlas. */
  windows: string[];
  /** Parte del año en que la decisión de esta línea se toma de verdad. */
  shareInWindow: number;
  /** Su complemento: cuánto del esfuerzo llega fuera de tiempo si se reparte plano. */
  shareOutOfWindow: number;
}

/**
 * Qué parte del año está "en temporada" para cada línea de crédito.
 *
 * Solo aparecen los productos que el calendario cubre. Una línea sin ventana
 * declarada no se estima por analogía: se queda fuera, porque inventar una
 * temporada para completar la tabla sería exactamente el tipo de cifra que este
 * producto no fabrica.
 */
export function productTimings(): ProductTiming[] {
  const byProduct = new Map<ProductId, { months: Set<number>; windows: Set<string> }>();

  for (const trigger of CALENDAR) {
    for (const productId of trigger.productIds) {
      const entry = byProduct.get(productId) ?? { months: new Set<number>(), windows: new Set<string>() };
      for (const month of trigger.months) entry.months.add(month);
      entry.windows.add(trigger.label);
      byProduct.set(productId, entry);
    }
  }

  return [...byProduct.entries()]
    .map(([productId, entry]) => {
      const monthsInWindow = entry.months.size;
      const shareInWindow = monthsInWindow / MONTHS_IN_YEAR;
      return {
        productId,
        productName: getProduct(productId).name,
        monthsInWindow,
        windows: [...entry.windows],
        shareInWindow,
        shareOutOfWindow: 1 - shareInWindow,
      };
    })
    .sort((a, b) => a.shareInWindow - b.shareInWindow);
}

export interface CampaignArithmetic {
  productName: string;
  volume: number;
  /** Comunicaciones que caen dentro de la ventana repartiendo el año plano. */
  inWindow: number;
  /** Las que llegan cuando la decisión ya pasó o todavía no existe. */
  outOfWindow: number;
  monthsInWindow: number;
  windows: string[];
  /** La frase que se puede leer en voz alta sin exagerar nada. */
  headline: string;
}

/**
 * La misma división, contada sobre un volumen concreto.
 *
 * El volumen lo pone quien pregunta —son sus envíos, no una estimación
 * nuestra— y el reparto uniforme es el supuesto explícito: describe una
 * comunicación que no mira el calendario, que es justamente el punto de
 * partida que se quiere cambiar.
 */
export function campaignArithmetic(productId: ProductId, volume: number): CampaignArithmetic | undefined {
  const timing = productTimings().find((item) => item.productId === productId);
  if (!timing || volume <= 0) return undefined;

  const inWindow = Math.round(volume * timing.shareInWindow);
  const outOfWindow = volume - inWindow;

  return {
    productName: timing.productName,
    volume,
    inWindow,
    outOfWindow,
    monthsInWindow: timing.monthsInWindow,
    windows: timing.windows,
    headline: `De cada ${volume.toLocaleString("es-CO")} comunicaciones de ${timing.productName.toLowerCase()} repartidas por igual durante el año, ${outOfWindow.toLocaleString("es-CO")} llegan fuera de la ventana en que esa decisión se toma.`,
  };
}

/** Los supuestos, en la pantalla y no en una nota al pie. */
export const BUSINESS_CASE_ASSUMPTIONS = [
  {
    label: "Las ventanas salen del calendario público",
    detail: "Matrículas, temporada escolar, predial y prima legal. Cada una viaja con su fuente y con su precisión; ninguna se dedujo de datos de personas.",
  },
  {
    label: "El reparto uniforme describe el punto de partida",
    detail: "Suponer que hoy la comunicación se distribuye por igual durante el año es lo que significa no mirar el calendario. Con la distribución real de Colsubsidio, la cifra se recalcula con el mismo método.",
  },
  {
    label: "Aquí no hay una promesa de conversión",
    detail: "Esto mide cuánto esfuerzo llega fuera de tiempo, no cuánta gente compraría. Medir lo segundo exige una línea base y un experimento con datos reales.",
  },
] as const;

export const BUSINESS_CASE_VERSION = CALENDAR_VERSION;
