/**
 * Los correos que salen cuando alguien pide hablar con una asesora.
 *
 * Dos destinatarios y dos tonos: al afiliado se le explica su resultado en
 * lenguaje humano; a la persona asesora se le entrega el caso resuelto —el
 * veredicto, los motivos, el mensaje sugerido— para que no tenga que
 * reconstruirlo. Ese segundo correo es el que ahorra trabajo de verdad.
 *
 * ENTREGA: por defecto los correos quedan en una bandeja en memoria que se ve
 * dentro de la aplicación. Es una decisión de demo: nada sale a internet, no
 * hay dominio que verificar ni claves que rotar, y el jurado ve el correo
 * exacto que se habría enviado. Si algún día se define `RESEND_API_KEY`, la
 * misma función los envía de verdad sin tocar nada más: el punto de entrega
 * está aislado en `deliver()` a propósito.
 */

import { getProduct } from "@/config/products";
import { documentLabel } from "@/lib/privacy";
import type { DecisionResult } from "@/lib/decision/engine";
import type { Profile } from "@/lib/types";

export interface OutboxMessage {
  id: string;
  to: string;
  toLabel: string;
  audience: "AFILIADO" | "ASESOR";
  subject: string;
  html: string;
  text: string;
  profileId: string;
  createdAt: string;
  /** Cómo salió: por proveedor real o retenido en la bandeja de la demo. */
  delivery: "SIMULADO" | "ENVIADO" | "ERROR";
  deliveryDetail?: string;
}

const cop = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`;

const STATUS_COPY: Record<DecisionResult["status"], { label: string; color: string; intro: string }> = {
  PREAPROBADO: {
    label: "Preaprobado para continuar",
    color: "#0f7a5f",
    intro: "Tenemos buenas noticias: con lo que nos contaste, tu solicitud se sostiene y puede avanzar al estudio de crédito.",
  },
  REQUIERE_REVISION: {
    label: "Requiere revisión",
    color: "#b3711a",
    intro: "Tu solicitud es viable, pero hay un par de datos por confirmar antes de avanzar. Una persona asesora te acompaña en eso.",
  },
  NO_VIABLE_HOY: {
    label: "Hoy no es viable",
    color: "#b03a55",
    intro: "Con las condiciones que planteaste hoy, la solicitud no se sostiene. No es un no definitivo: abajo te contamos qué escenario sí funcionaría.",
  },
};

const shell = (title: string, accent: string, body: string) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#f5f7fb;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#17233c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e8f0">
    <tr><td style="background:${accent};padding:22px 26px;color:#fff">
      <div style="font-size:12px;letter-spacing:.1em;opacity:.85">CREASY PARA COLSUBSIDIO</div>
      <div style="font-size:21px;font-weight:700;margin-top:5px">${title}</div>
    </td></tr>
    <tr><td style="padding:26px">${body}</td></tr>
    <tr><td style="padding:18px 26px;background:#f7f9fc;border-top:1px solid #e4e8f0;font-size:11px;line-height:1.6;color:#667085">
      Este mensaje se generó en un entorno de demostración con datos de ejemplo. La orientación no constituye una oferta ni una aprobación de crédito: el monto, la tasa y las condiciones dependen del estudio de crédito de Colsubsidio.
    </td></tr>
  </table>
</body></html>`;

const block = (label: string, value: string) =>
  `<tr><td style="padding:9px 0;border-bottom:1px solid #eef1f6"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#8a94a6">${label}</div><div style="font-size:13px;font-weight:600;margin-top:3px">${value}</div></td></tr>`;

/** Correo al afiliado: su resultado, en su idioma. */
export function buildAffiliateEmail(profile: Profile, decision: DecisionResult, productName: string): Omit<OutboxMessage, "id" | "createdAt" | "delivery"> {
  const copy = STATUS_COPY[decision.status];
  const firstName = profile.fullName.split(" ")[0];

  const reasons = decision.reasons
    .map((reason) => `<li style="margin-bottom:7px"><strong>${reason.label}.</strong> ${reason.detail}</li>`)
    .join("");

  const counter = decision.counterOffer
    ? `<div style="background:#1f3988;color:#fff;border-radius:12px;padding:16px 18px;margin:18px 0">
         <div style="font-size:10px;letter-spacing:.09em;color:#aebfe9">LO QUE SÍ PODEMOS HACER HOY</div>
         <div style="font-size:17px;font-weight:700;margin:6px 0 4px">${cop(decision.counterOffer.amount)} a ${decision.counterOffer.termMonths} meses</div>
         <div style="font-size:13px;color:#d2dcf6">Cuota estimada de ${cop(decision.counterOffer.monthlyPayment)}. ${decision.counterOffer.explanation}</div>
       </div>`
    : "";

  const body = `
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px">Hola ${firstName},</p>
    <p style="font-size:14px;line-height:1.65;margin:0 0 18px">${copy.intro}</p>
    <div style="display:inline-block;background:${copy.color};color:#fff;border-radius:999px;padding:7px 15px;font-size:12px;font-weight:700;margin-bottom:16px">${copy.label}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">
      ${block("Producto orientado", productName)}
      ${block("Cuota mensual estimada", `${cop(decision.monthlyPayment)} · tasa ${(decision.annualRate * 100).toFixed(2)} % E.A. vigente en ${decision.rateValidity}`)}
      ${block("Solicitud registrada a nombre de", `${profile.fullName} · ${documentLabel(profile.documentNumber)}`)}
    </table>
    <div style="font-size:13px;font-weight:700;margin-bottom:8px">Por qué llegamos a este resultado</div>
    <ul style="font-size:13px;line-height:1.6;color:#44506a;padding-left:18px;margin:0 0 4px">${reasons}</ul>
    ${counter}
    <div style="font-size:13px;font-weight:700;margin:18px 0 8px">Qué falta</div>
    <ul style="font-size:13px;line-height:1.6;color:#44506a;padding-left:18px;margin:0">
      ${decision.missing.map((item) => `<li style="margin-bottom:6px">${item}</li>`).join("")}
    </ul>
    <p style="font-size:13px;line-height:1.65;color:#44506a;margin:20px 0 0">Una persona asesora revisará tu caso y te contactará por ${profile.preferences?.preferredChannel ?? "el canal que elegiste"}. Puedes revocar tus autorizaciones cuando quieras.</p>`;

  const subject =
    decision.status === "PREAPROBADO"
      ? `${firstName}, tu solicitud quedó preaprobada para continuar`
      : decision.status === "REQUIERE_REVISION"
        ? `${firstName}, tu solicitud avanza: falta confirmar un par de datos`
        : `${firstName}, esto es lo que sí podemos hacer hoy`;

  return {
    to: profile.email,
    toLabel: profile.fullName,
    audience: "AFILIADO",
    subject,
    html: shell(copy.label, copy.color, body),
    text: `${copy.intro}\n\nProducto: ${productName}\nCuota estimada: ${cop(decision.monthlyPayment)}\n\n${decision.reasons.map((reason) => `${reason.label}: ${reason.detail}`).join("\n")}`,
    profileId: profile.id,
  };
}

/** Correo a la asesora: el caso ya resuelto, con el mensaje listo. */
export function buildAdvisorEmail(
  profile: Profile,
  decision: DecisionResult,
  productName: string,
  advisorEmail: string,
  suggestedMessage: string
): Omit<OutboxMessage, "id" | "createdAt" | "delivery"> {
  const copy = STATUS_COPY[decision.status];
  const blocking = decision.reasons.filter((reason) => reason.impact === "BLOQUEANTE");
  const attention = decision.reasons.filter((reason) => reason.impact === "ATENCION");

  const body = `
    <p style="font-size:14px;line-height:1.65;margin:0 0 16px">Entró una solicitud desde la autogestión del afiliado. Está lista para tu revisión.</p>
    <div style="display:inline-block;background:${copy.color};color:#fff;border-radius:999px;padding:7px 15px;font-size:12px;font-weight:700;margin-bottom:16px">${copy.label}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">
      ${block("Persona", `${profile.fullName} · ${profile.city} · categoría ${profile.category ?? "no declarada"}`)}
      ${block("Documento", documentLabel(profile.documentNumber))}
      ${block("Meta declarada", profile.declaredGoal ?? profile.needs[0] ?? "sin declarar")}
      ${block("Producto orientado", productName)}
      ${block("Cuota estimada", `${cop(decision.monthlyPayment)} · ${Math.round(decision.paymentToIncome * 100)} % del ingreso declarado`)}
      ${block("Canal y horario autorizados", `${profile.preferences?.preferredChannel ?? "IN_APP"} · ${profile.preferences?.preferredTimeBand ?? "sin preferencia"}`)}
    </table>
    ${blocking.length ? `<div style="background:#fff4f6;border:1px solid #f2bec9;border-radius:12px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#b03a55;margin-bottom:6px">Bloqueantes</div>
      <ul style="font-size:12.5px;line-height:1.6;color:#7a3346;padding-left:18px;margin:0">${blocking.map((reason) => `<li>${reason.detail}</li>`).join("")}</ul>
    </div>` : ""}
    ${attention.length ? `<div style="background:#fff8ed;border:1px solid #f0d5a8;border-radius:12px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#b3711a;margin-bottom:6px">Por confirmar</div>
      <ul style="font-size:12.5px;line-height:1.6;color:#7a5a24;padding-left:18px;margin:0">${attention.map((reason) => `<li>${reason.detail}</li>`).join("")}</ul>
    </div>` : ""}
    <div style="background:#f4f6fb;border:1px solid #e4e8f0;border-radius:12px;padding:14px 16px">
      <div style="font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#8a94a6;margin-bottom:6px">Mensaje sugerido por Chispy</div>
      <div style="font-size:13px;line-height:1.65;color:#2c3a55">${suggestedMessage}</div>
    </div>
    <p style="font-size:12px;line-height:1.6;color:#667085;margin:18px 0 0">El contacto solo puede realizarse si el consentimiento, el canal, el horario y la frecuencia lo permiten. Abre el caso en el portal para aprobarlo o devolverlo.</p>`;

  return {
    to: advisorEmail,
    toLabel: "Equipo asesor",
    audience: "ASESOR",
    subject: `[${copy.label}] Nuevo caso: ${profile.fullName} · ${productName}`,
    html: shell(`Nuevo caso para revisión`, "#1f3988", body),
    text: `${profile.fullName} · ${productName} · ${copy.label}\n\n${suggestedMessage}`,
    profileId: profile.id,
  };
}

/**
 * El mensaje de contacto, redactado con los datos del caso.
 *
 * Vive en código y no en el modelo porque tiene que existir siempre, incluso
 * sin proveedor de IA. Chispy puede reescribirlo y afinarlo cuando la asesora
 * se lo pida; esto es el punto de partida garantizado.
 */
export function suggestContactMessage(profile: Profile, decision: DecisionResult, productName: string): string {
  const firstName = profile.fullName.split(" ")[0];
  const timing =
    profile.preferences?.preferredTimeBand === "SATURDAY" ? "el sábado en la mañana"
    : profile.preferences?.preferredTimeBand === "WEEKDAY_AFTERNOON" ? "esta semana en la tarde"
    : "esta semana en la mañana";

  if (decision.status === "NO_VIABLE_HOY") {
    /*
     * El motivo manda sobre la plantilla: decirle "la cuota queda alta" a quien
     * lo que le falta es antigüedad laboral es la clase de mensaje genérico que
     * hace que la gente deje de contestar.
     */
    const blocker = decision.reasons.find((reason) => reason.impact === "BLOQUEANTE");
    if (blocker?.label === "Antigüedad laboral") {
      return `Hola ${firstName}, soy de Colsubsidio. Revisé tu solicitud de ${productName} y te falta un poco de antigüedad laboral para cumplir el requisito. Te cuento exactamente cuándo puedes aplicar y qué dejar listo. ¿Hablamos ${timing}?`;
    }
    if (decision.counterOffer) {
      return `Hola ${firstName}, soy de Colsubsidio. Revisé lo que solicitaste y con esas condiciones la cuota no se sostiene, pero encontré una alternativa: ${cop(decision.counterOffer.amount)} a ${decision.counterOffer.termMonths} meses, con cuota de ${cop(decision.counterOffer.monthlyPayment)}. ¿Te sirve que lo veamos ${timing}?`;
    }
    return `Hola ${firstName}, soy de Colsubsidio. Revisé tu solicitud de ${productName} y hoy no se sostiene con las condiciones planteadas. Quiero contarte qué haría falta para que sí. ¿Hablamos ${timing}?`;
  }
  if (decision.status === "REQUIERE_REVISION") {
    return `Hola ${firstName}, soy de Colsubsidio. Tu solicitud de ${productName} va bien encaminada; solo necesito confirmar un par de datos contigo para avanzar. ¿Hablamos ${timing}?`;
  }
  return `Hola ${firstName}, soy de Colsubsidio. Tu solicitud de ${productName} quedó preaprobada para continuar con el estudio de crédito. Te cuento los siguientes pasos y qué documentos necesitas. ¿Te queda bien ${timing}?`;
}

/**
 * Punto único de entrega.
 *
 * Aislado a propósito: cambiar de bandeja simulada a envío real es cambiar solo
 * esta función, sin tocar plantillas, rutas ni interfaz.
 */
export async function deliver(message: Omit<OutboxMessage, "id" | "createdAt" | "delivery">): Promise<OutboxMessage> {
  const base: OutboxMessage = {
    ...message,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    delivery: "SIMULADO",
    deliveryDetail: "Retenido en la bandeja de la demostración; no salió a internet.",
  };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICACIONES_FROM;
  if (!apiKey || !from || !message.to) return base;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html }),
    });
    if (!response.ok) {
      return { ...base, delivery: "ERROR", deliveryDetail: `El proveedor respondió ${response.status}. El correo quedó en la bandeja.` };
    }
    return { ...base, delivery: "ENVIADO", deliveryDetail: `Entregado a ${message.to}.` };
  } catch {
    return { ...base, delivery: "ERROR", deliveryDetail: "No hubo conexión con el proveedor. El correo quedó en la bandeja." };
  }
}

/** Los dos correos de una solicitud de contacto, ya entregados. */
export async function notifyContactRequest(
  profile: Profile,
  decision: DecisionResult,
  productId: Parameters<typeof getProduct>[0]
): Promise<OutboxMessage[]> {
  const productName = getProduct(productId).name;
  const suggested = suggestContactMessage(profile, decision, productName);
  const advisorEmail = process.env.ASESOR_DEMO_EMAIL || "asesor@creasy.demo";

  return Promise.all([
    deliver(buildAffiliateEmail(profile, decision, productName)),
    deliver(buildAdvisorEmail(profile, decision, productName, advisorEmail, suggested)),
  ]);
}
