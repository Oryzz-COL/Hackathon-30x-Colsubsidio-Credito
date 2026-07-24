import type { Evidence, Profile } from "@/lib/types";

const names = [
  "Valentina Ríos","Samuel Mendoza","Laura Cárdenas","Mateo Pardo","Sofía Bernal","Nicolás Suárez",
  "Camila Restrepo","Daniel Cifuentes","Mariana Cuéllar","Santiago Duque","Isabella Montoya","Tomás Lozano",
  "Gabriela Fajardo","Martín Correa","Sara Villalba","Emilio Méndez","Juliana Neira","Julián Becerra",
  "Paula Barreto","Felipe Trujillo","Luciana Salcedo","Simón Pedraza","Catalina Niño","Jerónimo Arias",
  "Natalia Galindo","Andrés Lemus","Manuela Vivas","David Rincón","Alejandra Rojas","Sebastián Tovar",
  "María José Vélez","Juan Esteban Ocampo","Renata Lagos","Miguel Ángel Mora","Ana Lucía Lara","Esteban Prieto",
];
const cities = ["Bogotá","Soacha","Chía","Zipaquirá","Facatativá","Mosquera"];
const scenarios = [
  ["posgrado","matrícula en especialización","educación"],
  ["comprar vivienda","proyecto de vivienda","cuota inicial"],
  ["emprendimiento","capital de trabajo","proyecto productivo"],
  ["estudios de hijo","matrícula escolar","educación"],
  ["consolidar obligaciones","simplificar pagos","compra de cartera"],
  ["remodelación","acabados","mejoras del hogar"],
  ["impuestos","seguros","gasto estacional"],
  ["proyecto personal","libre inversión","gastos familiares"],
  ["disponibilidad reutilizable","tecnología","compras cotidianas"],
];

export const JURY_PROFILE_IDS = ["perfil-001", "perfil-002", "perfil-003"] as const;

const showcase = [
  {
    category: "A" as const,
    declaredGoal: "Iniciar una especialización",
    lifeEvent: "Inicio de estudios en los próximos tres meses",
    goalHorizon: "ONE_TO_THREE_MONTHS" as const,
    estimatedNeedRange: "$3 a $6 millones declarados",
    urgency: "MEDIUM" as const,
    dependentsCount: 1,
    childrenAgeRanges: ["12–17"],
    housingStatus: "Arriendo",
    serviceUsage: ["Educación"],
    digitalInteractions: ["Consultó contenido de formación", "Inició comparación de crédito educativo"],
    declaredInterests: ["Formación profesional", "Educación familiar"],
    channel: "WHATSAPP" as const,
    timeBand: "WEEKDAY_AFTERNOON" as const,
    horizon: "NEXT_THREE_MONTHS" as const,
  },
  {
    category: "B" as const,
    declaredGoal: "Comprar vivienda para su hogar",
    lifeEvent: "Planeación de compra de vivienda",
    goalHorizon: "THREE_TO_TWELVE_MONTHS" as const,
    estimatedNeedRange: "Valor por definir con asesoría",
    urgency: "LOW" as const,
    dependentsCount: 2,
    childrenAgeRanges: ["0–5", "6–11"],
    housingStatus: "Arriendo",
    serviceUsage: ["Vivienda", "Subsidios"],
    digitalInteractions: ["Visitó contenido de vivienda", "Guardó una guía de compra"],
    declaredInterests: ["Vivienda propia", "Ahorro familiar"],
    channel: "IN_APP" as const,
    timeBand: "SATURDAY" as const,
    horizon: "EXPLORING" as const,
  },
  {
    category: "C" as const,
    declaredGoal: "Comprar insumos para hacer crecer su emprendimiento",
    lifeEvent: "Expansión de un proyecto productivo",
    goalHorizon: "NOW" as const,
    estimatedNeedRange: "$2 a $5 millones declarados",
    urgency: "HIGH" as const,
    dependentsCount: 0,
    childrenAgeRanges: [],
    housingStatus: "Familiar",
    serviceUsage: ["Emprendimiento", "Capacitación"],
    digitalInteractions: ["Consultó soluciones para capital de trabajo", "Completó orientación de Crédito Mujer"],
    declaredInterests: ["Emprendimiento", "Capital de trabajo"],
    channel: "CALL" as const,
    timeBand: "WEEKDAY_MORNING" as const,
    horizon: "NOW" as const,
  },
] as const;

function evidenceFor(index: number, needs: string[]): Evidence[] {
  const capturedAt = index === 10 ? "2024-01-10T10:00:00.000Z" : "2026-07-20T10:00:00.000Z";
  return [
    { id: `ev-${index}-1`, label: "Necesidad declarada", value: needs[0]!, normalizedValue: needs[0]!, sourceType: "USER_DECLARED", sourceName: "Formulario del afiliado", sourceReference: `FORM-${String(index + 1).padStart(3, "0")}`, capturedAt, lastVerifiedAt: capturedAt, confidence: 0.92, consentScope: "PERFILAMIENTO_COMERCIAL", dataNature: "DECLARED", evidenceStatus: index === 10 ? "VENCIDA" : "VIGENTE" },
    { id: `ev-${index}-2`, label: "Estado de afiliación", value: "Activo", normalizedValue: "ACTIVO", sourceType: "COLSUBSIDIO_INTERNAL", sourceName: "Base interna simulada", sourceReference: `INT-${String(index + 1).padStart(3, "0")}`, capturedAt: "2026-07-21T09:00:00.000Z", lastVerifiedAt: "2026-07-21T09:00:00.000Z", confidence: 0.98, consentScope: "OPERACION_AFILIACION", dataNature: "VERIFIED", evidenceStatus: "VIGENTE" },
    { id: `ev-${index}-3`, label: "Ciudad", value: cities[index % cities.length]!, normalizedValue: cities[index % cities.length]!.toUpperCase(), sourceType: "SYNTHETIC_DEMO", sourceName: "Base sintética", sourceReference: `SYN-${index + 1}`, capturedAt: "2026-07-01T12:00:00.000Z", lastVerifiedAt: "2026-07-01T12:00:00.000Z", confidence: 0.8, consentScope: "DEMO", dataNature: "OBSERVED", evidenceStatus: "VIGENTE" },
  ];
}

export const PROFILES: Profile[] = names.map((fullName, index) => {
  const needs = scenarios[index % scenarios.length]!;
  const noConsent = index === 11 || index === 29;
  const fewData = index === 7 || index === 25;
  const featured = showcase[index];
  const now = "2026-07-24T10:00:00.000Z";
  const channel = featured?.channel ?? (["IN_APP", "EMAIL", "SMS"] as const)[index % 3]!;
  return {
    id: `perfil-${String(index + 1).padStart(3, "0")}`,
    fullName,
    documentType: "CC",
    documentNumber: `9900${String(1000 + index).padStart(4, "0")}`,
    city: cities[index % cities.length]!,
    email: `${fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", ".")}@ejemplo.test`,
    phone: `300555${String(1000 + index).padStart(4, "0")}`,
    affiliation: index === 22 ? "Pendiente" : "Activo",
    category: featured?.category ?? (["A","B","C"] as const)[index % 3],
    addressOrZone: `${cities[index % cities.length]} · zona ${index % 2 === 0 ? "urbana" : "metropolitana"}`,
    employerOrSector: ["Servicios","Tecnología","Educación","Comercio"][index % 4],
    ageRange: ["18–28","29–44","45–60"][index % 3],
    dependentsCount: featured?.dependentsCount ?? index % 3,
    childrenAgeRanges: featured?.childrenAgeRanges ? [...featured.childrenAgeRanges] : [],
    householdStatus: index % 2 === 0 ? "Hogar con responsabilidades compartidas" : "Hogar unipersonal",
    housingStatus: featured?.housingStatus ?? (index % 2 === 0 ? "Arriendo" : "Familiar"),
    contractType: index % 4 === 0 ? "Término fijo" : "Indefinido",
    tenureMonths: fewData ? undefined : 3 + (index % 48),
    incomeRange: fewData ? undefined : ["1–2 SMMLV","2–4 SMMLV","4–6 SMMLV"][index % 3],
    occupation: fewData ? undefined : ["Servicios","Tecnología","Educación","Comercio"][index % 4],
    declaredGoal: featured?.declaredGoal ?? needs[0],
    lifeEvent: featured?.lifeEvent ?? `Necesidad declarada: ${needs[0]}`,
    goalHorizon: featured?.goalHorizon ?? "EXPLORING",
    estimatedNeedRange: featured?.estimatedNeedRange,
    urgency: featured?.urgency ?? "LOW",
    serviceUsage: featured?.serviceUsage ? [...featured.serviceUsage] : [needs[2] ?? needs[0]!],
    digitalInteractions: featured?.digitalInteractions ? [...featured.digitalInteractions] : [`Consultó contenido relacionado con ${needs[0]}`],
    declaredInterests: featured?.declaredInterests ? [...featured.declaredInterests] : [needs[0]!],
    needs: fewData ? [needs[0]!] : needs,
    declaredObligations: index % scenarios.length === 4,
    consent: !noConsent,
    consentPurpose: noConsent ? "No autorizada" : "Perfilamiento de afinidad y contacto asesorado",
    consentDate: noConsent ? undefined : "2026-07-20T10:00:00.000Z",
    synthetic: true,
    staleSource: index === 10,
    contradiction: index === 12 ? "La fecha objetivo declarada precede la fecha de captura" : undefined,
    sensitiveBlocked: index === 18,
    origin: "SYNTHETIC_SEED",
    preferences: {
      interestedProductIds: [],
      horizon: featured?.horizon ?? "EXPLORING",
      preferredChannel: channel,
      preferredTimeBand: featured?.timeBand ?? "WEEKDAY_MORNING",
      maxContactFrequency: "ONCE_MONTH",
      wantsAdvisor: Boolean(featured),
    },
    consents: noConsent ? [] : [
      { id: `consent-${index}-guidance`, purpose: "GUIDANCE", scope: "Orientación explicable con datos sintéticos", noticeVersion: "creasy-privacy-2026.07", grantedAt: now, source: "ADVISOR_FORM", status: "GRANTED", channels: [], synthetic: true },
      { id: `consent-${index}-behavior`, purpose: "BEHAVIOR_PERSONALIZATION", scope: "Interacciones propias simuladas", noticeVersion: "creasy-privacy-2026.07", grantedAt: now, source: "ADVISOR_FORM", status: "GRANTED", channels: [], synthetic: true },
      { id: `consent-${index}-contact`, purpose: "COMMERCIAL_CONTACT", scope: "Canal y frecuencia elegidos", noticeVersion: "creasy-privacy-2026.07", grantedAt: now, source: "ADVISOR_FORM", status: "GRANTED", channels: [channel], synthetic: true },
    ],
    behaviorEvents: [
      { id: `behavior-${index}-view`, type: "credito_consultado", occurredAt: now, source: "FIRST_PARTY_DEMO", authorizedPurpose: "BEHAVIOR_PERSONALIZATION", consentVersion: "creasy-privacy-2026.07", retentionClass: "MVP_30_DAYS", synthetic: true },
      ...(featured ? [{ id: `behavior-${index}-compare`, type: "credito_comparado" as const, occurredAt: now, source: "FIRST_PARTY_DEMO" as const, authorizedPurpose: "BEHAVIOR_PERSONALIZATION" as const, consentVersion: "creasy-privacy-2026.07", retentionClass: "MVP_30_DAYS" as const, synthetic: true as const }] : []),
    ],
    evidence: fewData ? evidenceFor(index, needs).slice(0, 1) : [
      ...evidenceFor(index, needs),
      ...(featured ? [
        { id: `ev-${index}-4`, label: "Momento de vida declarado", value: featured.lifeEvent, normalizedValue: featured.lifeEvent.toUpperCase(), sourceType: "USER_DECLARED" as const, sourceName: "Funnel de autogestión", sourceReference: `GOAL-${index + 1}`, capturedAt: now, lastVerifiedAt: now, confidence: 0.95, consentScope: "ORIENTACION", dataNature: "DECLARED" as const, evidenceStatus: "VIGENTE" as const },
        { id: `ev-${index}-5`, label: "Interacción digital autorizada", value: featured.digitalInteractions[0], normalizedValue: featured.digitalInteractions[0].toUpperCase(), sourceType: "SYNTHETIC_DEMO" as const, sourceName: "Eventos propios simulados", sourceReference: `EVT-${index + 1}`, capturedAt: now, lastVerifiedAt: now, confidence: 0.9, consentScope: "PERSONALIZACION_COMPORTAMIENTO", dataNature: "OBSERVED" as const, evidenceStatus: "VIGENTE" as const },
      ] : []),
    ],
  };
});

export const SAMPLE_CSV = [
  "tipo_documento,documento,nombre,ciudad,categoria,necesidades,consentimiento",
  ...PROFILES.slice(0, 30).map((p) => [p.documentType,p.documentNumber,p.fullName,p.city,p.category ?? "A",p.needs.join("|"),p.consent ? "SI" : "NO"].join(",")),
].join("\n");
