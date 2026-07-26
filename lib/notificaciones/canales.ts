/**
 * El mismo mensaje, escrito para el canal que la persona eligió.
 *
 * El motor ya decidía el canal correcto y después entregaba siempre un correo.
 * Elegir bien y entregar igual es la mitad del problema resuelto: un SMS no
 * admite 400 caracteres, una llamada no se lee, y un mensaje de WhatsApp que
 * empieza como una carta formal se ignora.
 *
 * Aquí la pieza se adapta al medio. El SMS se recorta a 160 caracteres —el
 * límite real de un segmento GSM— y el recorte se hace por palabra, no a media
 * sílaba. La llamada no produce un texto para enviar sino un guion de apertura
 * para la persona asesora, que es lo que ese canal necesita de verdad.
 */

import type { ContactChannel, ContactTimeBand } from "@/lib/types";

/** Un segmento SMS son 160 caracteres; pasarse duplica el costo del envío. */
export const SMS_LIMIT = 160;

export interface ChannelPieceInput {
  channel: ContactChannel;
  firstName: string;
  productName: string;
  /** El mensaje completo que produjo el motor. */
  message: string;
  timeBand?: ContactTimeBand;
}

export interface ChannelPiece {
  channel: ContactChannel;
  /** Cómo se llama esta pieza en el canal: asunto, remitente, encabezado. */
  header: string;
  body: string;
  /** Acción visible dentro de la pieza, cuando el canal la admite. */
  cta?: string;
  /** Nota operativa para quien la revisa. */
  note: string;
}

const TIME_BAND_TEXT: Record<ContactTimeBand, string> = {
  WEEKDAY_MORNING: "entre semana en la mañana",
  WEEKDAY_AFTERNOON: "entre semana en la tarde",
  SATURDAY: "el sábado entre 8:00 a. m. y 3:00 p. m.",
};

/** Recorta sin partir palabras y sin dejar un puntito huérfano. */
export function trimToLimit(text: string, limit = SMS_LIMIT): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > limit * 0.6 ? lastSpace : cut.length).replace(/[.,;:]$/, "")}…`;
}

export function composeForChannel(input: ChannelPieceInput): ChannelPiece {
  const { channel, firstName, productName, message } = input;
  const band = TIME_BAND_TEXT[input.timeBand ?? "WEEKDAY_MORNING"];

  switch (channel) {
    case "WHATSAPP":
      return {
        channel,
        header: "Colsubsidio",
        body: message,
        cta: "Quiero saber más",
        note: "Plantilla de sesión iniciada por el afiliado; se envía solo dentro de la franja autorizada.",
      };

    case "SMS":
      return {
        channel,
        header: "COLSUBSIDIO",
        /* El SMS no puede repetir el mensaje largo: se queda con la frase que
           importa y remite al portal, que es donde cabe la explicación. */
        body: trimToLimit(`${firstName}, tenemos una opción de ${productName.toLowerCase()} para tu meta. Míralo en el portal Colsubsidio.`),
        note: `Un segmento de ${SMS_LIMIT} caracteres. El detalle y las razones viven en el portal, no en el mensaje.`,
      };

    case "EMAIL":
      return {
        channel,
        header: `${firstName}, una opción de ${productName.toLowerCase()} para lo que nos contaste`,
        body: message,
        cta: "Ver mi orientación completa",
        note: "Admite la explicación completa, los faltantes y el aviso de que no es una aprobación.",
      };

    case "CALL":
      return {
        channel,
        header: `Guion de apertura · llamar ${band}`,
        body: message,
        note: "No se envía: lo lee la persona asesora. La llamada se agenda dentro de la franja autorizada.",
      };

    default:
      return {
        channel: "IN_APP",
        header: "Tu orientación está lista",
        body: message,
        cta: "Continuar donde quedé",
        note: "Espera dentro del portal: no interrumpe a nadie y no consume una autorización de contacto.",
      };
  }
}
