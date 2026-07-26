import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { redactText } from "@/lib/privacy";
import type { Profile } from "@/lib/types";

export type AssistantAnswer = { answer: string; evidenceIds: string[]; scope: "HECHO" | "RESUMEN"; blocked?: boolean };

export function demoAssistant(query: string, profiles: Profile[]): AssistantAnswer {
  const clean = query.toLowerCase();
  if (/documento completo|correo completo|tel[eé]fono completo|clave|secreto/.test(clean)) {
    return { answer: "No puedo revelar datos personales completos ni secretos. Puedo ofrecer un resumen anonimizado.", evidenceIds: [], scope: "HECHO", blocked: true };
  }
  if (/ignora|instrucciones del sistema|prompt|ejecuta/.test(clean)) {
    return { answer: "La solicitud fue bloqueada por estar fuera del alcance seguro del copiloto.", evidenceIds: [], scope: "HECHO", blocked: true };
  }
  if (/cu[aá]ntos.*vivienda/.test(clean)) {
    const matches = profiles.filter((p) => p.needs.some((n) => n.includes("vivienda")));
    return { answer: `${matches.length} perfiles declararon interés o una necesidad relacionada con vivienda. El conteo no implica elegibilidad ni aprobación.`, evidenceIds: matches.flatMap((p) => p.evidence.slice(0,1).map((e) => e.id)), scope: "RESUMEN" };
  }
  if (/educativ/.test(clean)) {
    const matches = profiles.map((p) => ({ p, r: calculateAllAffinities(p).find((r) => r.productId === "educativo")! })).filter(({ r }) => r.affinityScore >= 60);
    return { answer: `Encontré ${matches.length} perfiles con afinidad educativa alta o muy alta. Todos requieren revisión humana antes de contacto.`, evidenceIds: matches.flatMap(({ p }) => p.evidence.slice(0,1).map((e) => e.id)), scope: "RESUMEN" };
  }
  if (/faltan|insuficiente/.test(clean)) {
    const count = profiles.filter((p) => calculateAllAffinities(p)[0]!.confidence < 60).length;
    return { answer: `${count} perfiles tienen confianza menor a 60 %. Faltan principalmente finalidad detallada, vigencia de fuente o evidencia aportada. La ausencia de datos no se interpreta como riesgo.`, evidenceIds: [], scope: "RESUMEN" };
  }
  return { answer: redactText(`Puedo analizar orientaciones, faltantes, evidencia y lotes autorizados. En este espacio de trabajo hay ${profiles.length} perfiles sintéticos. Pregunta por educación, vivienda o evidencia insuficiente.`), evidenceIds: [], scope: "RESUMEN" };
}
