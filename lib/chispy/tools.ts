/**
 * Las manos de Chispy.
 *
 * El modelo NO recibe el workspace entero en el prompt: recibe un resumen
 * agregado y estas herramientas. Si quiere datos de un caso, los pide. Esa es
 * la diferencia entre un agente y un prompt largo, y además es lo que mantiene
 * el coste por consulta en el suelo: el contexto crece solo cuando hace falta.
 *
 * Todas las herramientas devuelven texto plano ya enmascarado. Ninguna expone
 * documentos, correos ni teléfonos completos: el enmascarado ocurre aquí, en
 * código, y no depende de que el modelo obedezca una instrucción.
 */

import { getProduct } from "@/config/products";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { evaluateDecision } from "@/lib/decision/engine";
import { deriveMetrics } from "@/lib/metrics";
import { hasActiveConsent, evaluateContactPolicy, buildNextBestAction } from "@/lib/personalization";
import { maskDocument, maskEmail, maskPhone } from "@/lib/privacy";
import { formatContext, retrieve } from "@/lib/chispy/retrieval";
import type { AuditEvent, Profile } from "@/lib/types";

export interface ToolContext {
  profiles: Profile[];
  audit: AuditEvent[];
  /** Fuentes citadas durante la conversación, para mostrarlas bajo la respuesta. */
  citations: Set<string>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  /** Frase en primera persona que se proyecta mientras la herramienta corre. */
  narrate: (args: Record<string, unknown>) => string;
  run: (args: Record<string, unknown>, context: ToolContext) => string;
}

const shortName = (profile: Profile) =>
  `${profile.fullName.split(" ")[0]} ${profile.fullName.split(" ")[1]?.[0] ?? ""}.`;

/** Perfil por identificador parcial o por nombre, como lo escribiría una persona. */
function findProfile(profiles: Profile[], reference: string): Profile | undefined {
  const value = reference.trim().toLowerCase();
  return (
    profiles.find((profile) => profile.id.toLowerCase().startsWith(value)) ??
    profiles.find((profile) => profile.fullName.toLowerCase().includes(value))
  );
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "buscar_conocimiento",
    description:
      "Busca hechos oficiales sobre los créditos de Colsubsidio: requisitos, antigüedad, tasas vigentes, montos, plazos, documentos, tiempos de respuesta, categorías y normativa de datos. Úsala SIEMPRE que la pregunta sea sobre condiciones del producto, antes de responder.",
    parameters: {
      type: "object",
      properties: { consulta: { type: "string", description: "Los términos a buscar, en español." } },
      required: ["consulta"],
    },
    narrate: (args) => `Busco en la base de conocimiento lo que hay sobre ${String(args.consulta ?? "").slice(0, 60)}.`,
    run: (args, context) => {
      const results = retrieve(String(args.consulta ?? ""), 4);
      for (const { chunk } of results) context.citations.add(chunk.sourceLabel);
      return formatContext(results);
    },
  },
  {
    name: "consultar_perfiles",
    description:
      "Consulta los perfiles del workspace con un filtro. Devuelve un listado corto con alias, necesidad, producto de mayor afinidad y confianza. Úsala para preguntas del tipo 'cuántos', 'cuáles' o 'muéstrame'.",
    parameters: {
      type: "object",
      properties: {
        filtro: {
          type: "string",
          description: "Qué buscar: un producto (educativo, vivienda, cartera…), una necesidad, una ciudad, o las palabras 'sin consentimiento', 'requieren revisión', 'evidencia insuficiente', 'todos'.",
        },
      },
      required: ["filtro"],
    },
    narrate: (args) => `Reviso los perfiles que coinciden con "${String(args.filtro ?? "").slice(0, 40)}".`,
    run: (args, context) => {
      const filter = String(args.filtro ?? "").toLowerCase();
      const matches = context.profiles.filter((profile) => {
        const top = calculateAllAffinities(profile)[0]!;
        if (filter.includes("sin consentimiento")) return !profile.consent;
        if (filter.includes("revisi")) return top.requiresHumanReview && Boolean(profile.contactRequestedAt);
        if (filter.includes("insuficiente") || filter.includes("baja confianza")) return top.confidence < 60;
        if (filter.includes("todos")) return true;
        const corpus = `${profile.fullName} ${profile.city} ${profile.needs.join(" ")} ${getProduct(top.productId).name}`.toLowerCase();
        return filter.split(/\s+/).some((term) => term.length > 2 && corpus.includes(term));
      });

      if (matches.length === 0) return "Ningún perfil del workspace coincide con ese filtro.";

      const rows = matches.slice(0, 12).map((profile) => {
        const top = calculateAllAffinities(profile)[0]!;
        return `${profile.id.slice(0, 8)} | ${shortName(profile)} | ${profile.city} | ${profile.needs[0] ?? "sin necesidad declarada"} | ${getProduct(top.productId).name} ${top.affinityScore}/100 | confianza ${top.confidence}% | ${profile.consent ? "con consentimiento" : "SIN consentimiento"}`;
      });
      return [
        `Coinciden ${matches.length} perfiles de ${context.profiles.length}.`,
        "id | alias | ciudad | necesidad | mayor afinidad | confianza | consentimiento",
        ...rows,
        matches.length > 12 ? `… y ${matches.length - 12} más.` : "",
      ].filter(Boolean).join("\n");
    },
  },
  {
    name: "priorizar_casos",
    description:
      "Ordena los casos que requieren trabajo humano y propone por cuál empezar. Úsala cuando pregunten qué atender primero, cuál es la prioridad del día o cómo organizar la bandeja.",
    parameters: { type: "object", properties: {}, required: [] },
    narrate: () => "Ordeno los casos por solicitud activa, posibilidad de contacto y confianza de la evidencia.",
    run: (_args, context) => {
      const ranked = context.profiles
        .map((profile) => {
          const top = calculateAllAffinities(profile)[0]!;
          const policy = evaluateContactPolicy(profile);
          const score =
            (profile.contactRequestedAt ? 40 : 0)
            + (policy.approvable ? 25 : 0)
            + (top.requiresHumanReview ? 20 : 0)
            + Math.round(top.confidence / 10);
          return { profile, top, policy, score };
        })
        .filter(({ profile, top }) => Boolean(profile.contactRequestedAt) || top.requiresHumanReview)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (ranked.length === 0) return "No hay casos pendientes de trabajo humano en esta sesión.";
      return [
        `Prioridad sugerida para ${ranked.length} casos:`,
        ...ranked.map(({ profile, top, policy }, index) =>
          `${index + 1}. ${profile.id.slice(0, 8)} · ${shortName(profile)} · ${getProduct(top.productId).shortName} · ${top.confidence}% de confianza · ${policy.approvable ? "se puede revisar para contacto" : `bloqueado: ${policy.reasons[0] ?? policy.label}`}`
        ),
        "El orden organiza el trabajo; no representa aprobación ni riesgo crediticio.",
      ].join("\n");
    },
  },
  {
    name: "explicar_caso",
    description:
      "Devuelve el detalle completo de un caso: necesidad declarada, afinidad, evidencia, viabilidad preliminar con motivos, política de contacto y siguiente acción. Úsala cuando pregunten por una persona concreta.",
    parameters: {
      type: "object",
      properties: {
        referencia: { type: "string", description: "El id (o sus primeros caracteres) o el nombre del perfil." },
      },
      required: ["referencia"],
    },
    narrate: (args) => `Abro la trazabilidad del caso ${String(args.referencia ?? "").slice(0, 40)}.`,
    run: (args, context) => {
      const profile = findProfile(context.profiles, String(args.referencia ?? ""));
      if (!profile) return "No existe ningún perfil con esa referencia en el workspace.";

      const top = calculateAllAffinities(profile)[0]!;
      const policy = evaluateContactPolicy(profile);
      const next = buildNextBestAction(profile, top);
      const decision = evaluateDecision({
        productId: top.productId,
        amount: profile.preferences?.monthlyPayment ? profile.preferences.monthlyPayment * 24 : 5_000_000,
        termMonths: 24,
        incomeRange: profile.incomeRange,
        category: profile.category,
        employmentStatus: profile.contractType,
        tenureMonths: profile.tenureMonths,
        dependents: profile.dependentsCount,
        declaredObligations: profile.declaredObligations,
        gender: profile.gender,
        consent: profile.consent,
      });

      return [
        `Caso ${profile.id.slice(0, 8)} · ${shortName(profile)} · ${profile.city} · categoría ${profile.category ?? "no declarada"}`,
        `Documento ${maskDocument(profile.documentNumber)}${profile.email ? ` · correo ${maskEmail(profile.email)}` : ""}${profile.phone ? ` · teléfono ${maskPhone(profile.phone)}` : ""}`,
        `Meta declarada: ${profile.declaredGoal ?? profile.needs[0] ?? "sin declarar"}`,
        `Mayor afinidad: ${getProduct(top.productId).name} con ${top.affinityScore}/100 y confianza ${top.confidence}%`,
        `Señales a favor: ${top.positiveSignals.join("; ") || "ninguna suficiente"}`,
        `Faltantes: ${top.missingSignals.join("; ")}`,
        `Viabilidad preliminar: ${decision.status} — ${decision.summary}`,
        `Motivos: ${decision.reasons.map((reason) => `${reason.label}: ${reason.detail}`).join(" | ")}`,
        `Contacto: ${policy.label}${policy.allowed ? "" : ` (${policy.reasons.join("; ")})`}`,
        `Siguiente acción: ${next.action.replaceAll("_", " ")} por ${next.channel}, ${next.moment}`,
        `Evidencias registradas: ${profile.evidence.length}`,
      ].join("\n");
    },
  },
  {
    name: "calcular_impacto",
    description:
      "Calcula los indicadores del workspace: perfiles analizados, con señales suficientes, con orientación explicable, con permiso de contacto, pendientes de revisión y acciones bloqueadas por control. Úsala para preguntas sobre resultados, impacto o cifras globales.",
    parameters: { type: "object", properties: {}, required: [] },
    narrate: () => "Calculo los indicadores del workspace sobre los perfiles actuales.",
    run: (_args, context) => {
      const metrics = deriveMetrics(context.profiles);
      const explainable = context.profiles.filter((profile) => calculateAllAffinities(profile)[0]!.positiveSignals.length >= 3).length;
      const sufficient = context.profiles.filter((profile) => calculateAllAffinities(profile)[0]!.confidence >= 60).length;
      const consented = context.profiles.filter((profile) => hasActiveConsent(profile, "COMMERCIAL_CONTACT")).length;
      const blocked = context.profiles.filter((profile) =>
        !hasActiveConsent(profile, "COMMERCIAL_CONTACT")
        || profile.commercialContactBlocked
        || profile.rneExcluded
        || profile.preferences?.maxContactFrequency === "NO_CONTACT"
      ).length;

      return [
        `Perfiles analizados: ${metrics.profiles}`,
        `Con señales suficientes (confianza ≥ 60 %): ${sufficient}`,
        `Con orientación explicable (3+ señales): ${explainable}`,
        `Con permiso de contacto comercial vigente: ${consented}`,
        `Pendientes de revisión humana: ${metrics.reviews}`,
        `Acciones bloqueadas por control: ${blocked}`,
        `Evidencias con fuente trazable: ${metrics.sourced} %`,
        `Decisiones automáticas de aprobación o rechazo: 0`,
        "Son conteos sobre datos de ejemplo de esta sesión; no representan resultados comerciales reales.",
      ].join("\n");
    },
  },
  {
    name: "redactar_mensaje",
    description:
      "Prepara el mensaje de contacto para un caso concreto, por el canal que la persona autorizó. Devuelve el texto listo para copiar y el destinatario enmascarado. Úsala cuando pidan 'qué le escribo' o 'redacta el mensaje'.",
    parameters: {
      type: "object",
      properties: {
        referencia: { type: "string", description: "El id o el nombre del perfil." },
        canal: { type: "string", description: "Canal deseado.", enum: ["WHATSAPP", "EMAIL", "SMS", "CALL", "IN_APP"] },
      },
      required: ["referencia"],
    },
    narrate: (args) => `Preparo el mensaje para ${String(args.referencia ?? "").slice(0, 40)} por su canal autorizado.`,
    run: (args, context) => {
      const profile = findProfile(context.profiles, String(args.referencia ?? ""));
      if (!profile) return "No existe ningún perfil con esa referencia en el workspace.";

      const policy = evaluateContactPolicy(profile);
      if (!policy.allowed) {
        return `No se puede preparar un contacto para ${shortName(profile)}: ${policy.reasons.join("; ")}. Redactar el mensaje igualmente sería saltarse el control.`;
      }

      const top = calculateAllAffinities(profile)[0]!;
      const preferred = profile.preferences?.preferredChannel ?? "IN_APP";
      const requested = String(args.canal ?? preferred).toUpperCase();
      const channel = requested === preferred ? preferred : preferred;
      const firstName = profile.fullName.split(" ")[0];

      const destination =
        channel === "EMAIL" ? maskEmail(profile.email) || "sin correo declarado"
        : channel === "WHATSAPP" || channel === "SMS" || channel === "CALL"
          ? maskPhone(profile.phone) || "sin teléfono declarado"
          : "notificación dentro del portal";

      return [
        `Canal autorizado: ${channel}${requested !== preferred ? ` (pediste ${requested}, pero la persona autorizó ${preferred}; se respeta lo autorizado)` : ""}`,
        `Destinatario: ${destination}`,
        `Horario permitido: ${profile.preferences?.preferredTimeBand ?? "sin preferencia declarada"}`,
        "MENSAJE:",
        `Hola ${firstName}, soy de Colsubsidio. Vi que registraste interés en ${profile.declaredGoal ?? profile.needs[0] ?? "una opción de crédito"} y quiero contarte cómo funciona ${getProduct(top.productId).name}. ¿Te queda bien que hablemos ${profile.preferences?.preferredTimeBand === "SATURDAY" ? "el sábado" : "entre semana"}? Sin compromiso: primero revisamos si te conviene.`,
        "Recuerda: el mensaje no promete aprobación, monto ni tasa.",
      ].join("\n");
    },
  },
  {
    name: "generar_informe_auditoria",
    description:
      "Resume el registro de auditoría en un informe legible: qué se hizo, quién lo hizo y qué controles se activaron. Úsala cuando pidan un informe, un resumen de actividad o una exportación de auditoría.",
    parameters: { type: "object", properties: {}, required: [] },
    narrate: () => "Reviso el registro de auditoría para armar el informe.",
    run: (_args, context) => {
      const events = context.audit.slice(0, 40);
      if (events.length === 0) return "El registro de auditoría está vacío en esta sesión.";
      const byAction = events.reduce<Record<string, number>>((counts, event) => {
        counts[event.action] = (counts[event.action] ?? 0) + 1;
        return counts;
      }, {});
      const actors = [...new Set(events.map((event) => event.actor))];
      return [
        `Eventos registrados: ${context.audit.length} (se analizan los ${events.length} más recientes).`,
        `Actores involucrados: ${actors.join(", ")}.`,
        `Distribución por acción: ${Object.entries(byAction).map(([action, count]) => `${action} ×${count}`).join(", ")}.`,
        "Últimos eventos:",
        ...events.slice(0, 10).map((event) => `- ${new Date(event.createdAt).toLocaleString("es-CO")} · ${event.action} · ${event.actor} · ${event.detail}`),
        "El registro no almacena documentos, correos, teléfonos ni el texto de las consultas.",
      ].join("\n");
    },
  },
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

/**
 * El resumen agregado con el que arranca la conversación.
 *
 * Deliberadamente corto: son los números que Chispy necesita para decidir qué
 * herramienta usar, no los datos con los que responde.
 */
export function workspaceSummary(profiles: Profile[]): string {
  const metrics = deriveMetrics(profiles);
  const topProducts = metrics.distribution
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
    .map((item) => `${item.name} (${item.value})`)
    .join(", ");
  return [
    `Perfiles en el workspace: ${metrics.profiles}.`,
    `Con consentimiento vigente: ${metrics.consented}.`,
    `Pendientes de revisión humana: ${metrics.reviews}.`,
    `Productos con mayor afinidad más frecuentes: ${topProducts || "sin datos"}.`,
    "Todos los perfiles son datos de ejemplo.",
  ].join(" ");
}
