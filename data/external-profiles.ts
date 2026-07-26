import type { SyntheticExternalProfile } from "@/lib/enrichment/types";

/**
 * Personas completamente ficticias para demostrar el recorrido por cédula.
 *
 * Las cédulas pertenecen al rango reservado de la demo y no se consultan fuera
 * de este archivo. Laura y Nicolás comparten exactamente el mismo perfil
 * estático: son la prueba de que las señales exógenas, no la categoría, cambian
 * la recomendación.
 */
export const EXTERNAL_PROFILES: SyntheticExternalProfile[] = [
  {
    documentNumber: "1010001001",
    snapshot: {
      fullName: "Laura Torres",
      city: "Bogotá D.C.",
      category: "B",
      affiliation: "Activo",
      incomeRange: "2–4 SMMLV",
      employerOrSector: "Servicios empresariales",
      contractType: "Indefinido",
      tenureMonths: 24,
    },
    email: "laura.torres@ejemplo.test",
    phone: "3005551001",
    raw: {
      declaredGoal: { label: "Especialización en analítica", productIds: ["educativo"] },
      internalBehavior: [
        { label: "Comparó opciones de crédito educativo", productIds: ["educativo"], occurredAt: "2026-07-22T14:20:00.000Z" },
      ],
      serviceUsage: [
        { label: "Asistió a una feria educativa Colsubsidio", productIds: ["educativo"], occurredAt: "2026-07-18T16:00:00.000Z" },
      ],
      socialInterests: [
        { label: "Interés conectado voluntariamente: formación y analítica", productIds: ["educativo"], observedAt: "2026-07-21T12:00:00.000Z" },
      ],
      lifeEvents: [
        { label: "Declaró inicio de posgrado para el próximo semestre", productIds: ["educativo"], declaredAt: "2026-07-20T09:00:00.000Z" },
      ],
      preference: { channel: "WHATSAPP", timeBand: "WEEKDAY_AFTERNOON", updatedAt: "2026-07-22T14:22:00.000Z" },
    },
  },
  {
    documentNumber: "1010001002",
    snapshot: {
      fullName: "Nicolás Vega",
      city: "Bogotá D.C.",
      category: "B",
      affiliation: "Activo",
      incomeRange: "2–4 SMMLV",
      employerOrSector: "Servicios empresariales",
      contractType: "Indefinido",
      tenureMonths: 24,
    },
    email: "nicolas.vega@ejemplo.test",
    phone: "3005551002",
    raw: {
      declaredGoal: { label: "Unificar pagos mensuales", productIds: ["compra-cartera"] },
      internalBehavior: [
        { label: "Consultó una guía para organizar obligaciones", productIds: ["compra-cartera"], occurredAt: "2026-07-23T10:10:00.000Z" },
      ],
      serviceUsage: [
        { label: "Usó el simulador de presupuesto familiar", productIds: ["compra-cartera"], occurredAt: "2026-07-19T11:00:00.000Z" },
      ],
      socialInterests: [
        { label: "Interés conectado voluntariamente: finanzas personales", productIds: ["compra-cartera"], observedAt: "2026-07-21T08:30:00.000Z" },
      ],
      financial: [
        { label: "Declaró dos obligaciones externas para consolidar", productIds: ["compra-cartera"], verifiedAt: "2026-07-24T13:00:00.000Z" },
      ],
      preference: { channel: "EMAIL", timeBand: "WEEKDAY_MORNING", updatedAt: "2026-07-23T10:15:00.000Z" },
    },
  },
  {
    documentNumber: "1010001003",
    snapshot: {
      fullName: "Sara Méndez",
      city: "Soacha",
      category: "A",
      affiliation: "Activo",
      incomeRange: "1–2 SMMLV",
      employerOrSector: "Comercio",
      contractType: "Término fijo",
      tenureMonths: 14,
    },
    email: "sara.mendez@ejemplo.test",
    phone: "3005551003",
    raw: {
      declaredGoal: { label: "Comprar insumos para su emprendimiento", productIds: ["mujeres"] },
      internalBehavior: [
        { label: "Completó una ruta de emprendimiento", productIds: ["mujeres"], occurredAt: "2026-07-24T16:30:00.000Z" },
      ],
      serviceUsage: [
        { label: "Participó en capacitación para negocios", productIds: ["mujeres"], occurredAt: "2026-07-17T15:00:00.000Z" },
      ],
      socialInterests: [
        { label: "Interés conectado voluntariamente: repostería y negocio local", productIds: ["mujeres"], observedAt: "2026-07-23T19:00:00.000Z" },
      ],
      lifeEvents: [
        { label: "Declaró expansión de su proyecto productivo", productIds: ["mujeres"], declaredAt: "2026-07-24T08:00:00.000Z" },
      ],
      preference: { channel: "CALL", timeBand: "SATURDAY", updatedAt: "2026-07-24T16:32:00.000Z" },
    },
  },
  {
    documentNumber: "1010001004",
    snapshot: {
      fullName: "Mateo Ruiz",
      city: "Chía",
      category: "C",
      affiliation: "Activo",
      incomeRange: "Más de 4 SMMLV",
      employerOrSector: "Tecnología",
      contractType: "Indefinido",
      tenureMonths: 42,
    },
    email: "mateo.ruiz@ejemplo.test",
    phone: "3005551004",
    raw: {
      declaredGoal: { label: "Comprar vivienda familiar", productIds: ["hipotecario"] },
      internalBehavior: [
        { label: "Guardó una guía de compra de vivienda", productIds: ["hipotecario"], occurredAt: "2026-07-20T18:10:00.000Z" },
      ],
      serviceUsage: [
        { label: "Consultó subsidios de vivienda", productIds: ["hipotecario"], occurredAt: "2026-07-18T10:00:00.000Z" },
      ],
      socialInterests: [
        { label: "Interés conectado voluntariamente: vivienda y diseño interior", productIds: ["hipotecario", "complementario"], observedAt: "2026-07-22T20:00:00.000Z" },
      ],
      lifeEvents: [
        { label: "Declaró mudanza planificada en nueve meses", productIds: ["hipotecario"], declaredAt: "2026-07-20T18:15:00.000Z" },
      ],
      preference: { channel: "IN_APP", timeBand: "SATURDAY", updatedAt: "2026-07-20T18:20:00.000Z" },
    },
  },
  {
    documentNumber: "1010001005",
    snapshot: {
      fullName: "Camila Pardo",
      city: "Bogotá D.C.",
      category: "A",
      affiliation: "Activo",
      incomeRange: "1–2 SMMLV",
      employerOrSector: "Educación",
      contractType: "Indefinido",
      tenureMonths: 31,
    },
    email: "camila.pardo@ejemplo.test",
    phone: "3005551005",
    raw: {
      declaredGoal: { label: "Cubrir gastos escolares y tecnología", productIds: ["cupo-credito"] },
      internalBehavior: [
        { label: "Consultó beneficios de tecnología", productIds: ["cupo-credito"], occurredAt: "2026-07-23T17:20:00.000Z" },
      ],
      serviceUsage: [
        { label: "Compra recurrente en droguerías Colsubsidio", productIds: ["cupo-credito"], occurredAt: "2026-07-21T17:00:00.000Z" },
      ],
      socialInterests: [
        { label: "Interés conectado voluntariamente: tecnología para estudiar", productIds: ["cupo-credito", "educativo"], observedAt: "2026-07-22T12:00:00.000Z" },
      ],
      lifeEvents: [
        { label: "Declaró regreso a clases de una persona a cargo", productIds: ["cupo-credito", "educativo"], declaredAt: "2026-07-22T08:00:00.000Z" },
      ],
      preference: { channel: "SMS", timeBand: "WEEKDAY_AFTERNOON", updatedAt: "2026-07-23T17:25:00.000Z" },
    },
  },
  {
    documentNumber: "1010001006",
    snapshot: {
      fullName: "Daniel Castro",
      city: "Zipaquirá",
      category: "C",
      affiliation: "Activo",
      incomeRange: "Más de 4 SMMLV",
      employerOrSector: "Industria",
      contractType: "Indefinido",
      tenureMonths: 58,
    },
    email: "daniel.castro@ejemplo.test",
    phone: "3005551006",
    raw: {
      declaredGoal: { label: "Pagar impuesto predial sin descapitalizarse", productIds: ["seguros-impuestos"] },
      internalBehavior: [
        { label: "Consultó financiación de impuestos", productIds: ["seguros-impuestos"], occurredAt: "2026-07-24T07:40:00.000Z" },
      ],
      serviceUsage: [
        { label: "Tiene póliza adquirida con un aliado", productIds: ["seguros-impuestos"], occurredAt: "2026-07-10T09:00:00.000Z" },
      ],
      socialInterests: [
        { label: "Tema sensible excluido por política", productIds: ["libre-inversion"], observedAt: "2026-07-20T12:00:00.000Z", topicClass: "SENSITIVE" },
      ],
      lifeEvents: [
        { label: "Declaró vencimiento de impuesto municipal", productIds: ["seguros-impuestos"], declaredAt: "2026-07-24T07:42:00.000Z" },
      ],
      preference: { channel: "EMAIL", timeBand: "WEEKDAY_MORNING", updatedAt: "2026-07-24T07:45:00.000Z" },
    },
  },
];

export const EXTERNAL_PROFILE_BY_DOCUMENT = new Map(
  EXTERNAL_PROFILES.map((profile) => [profile.documentNumber, profile])
);

export const SIGNAL_LAB_SAMPLE_DOCUMENTS = EXTERNAL_PROFILES.map((profile) => ({
  documentNumber: profile.documentNumber,
  firstName: profile.snapshot.fullName.split(" ")[0]!,
  goal: profile.raw.declaredGoal?.label ?? "Explorar opciones",
}));
