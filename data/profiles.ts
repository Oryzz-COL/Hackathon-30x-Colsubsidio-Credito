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
  ["estudios de hijo","matrícula escolar","educación"],
  ["consolidar obligaciones","simplificar pagos","compra de cartera"],
  ["comprar vivienda","proyecto de vivienda","cuota inicial"],
  ["remodelación","acabados","mejoras del hogar"],
  ["impuestos","seguros","gasto estacional"],
  ["proyecto personal","libre inversión","gastos familiares"],
  ["disponibilidad reutilizable","tecnología","compras cotidianas"],
  ["emprendimiento","capital de trabajo","proyecto personal"],
];

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
  return {
    id: `perfil-${String(index + 1).padStart(3, "0")}`,
    fullName,
    documentType: "CC",
    documentNumber: `9900${String(1000 + index).padStart(4, "0")}`,
    city: cities[index % cities.length]!,
    email: `${fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", ".")}@ejemplo.test`,
    phone: `300555${String(1000 + index).padStart(4, "0")}`,
    affiliation: index === 22 ? "Pendiente" : "Activo",
    category: ["A","B","C"][index % 3],
    contractType: index % 4 === 0 ? "Término fijo" : "Indefinido",
    tenureMonths: fewData ? undefined : 3 + (index % 48),
    incomeRange: fewData ? undefined : ["1–2 SMMLV","2–4 SMMLV","4–6 SMMLV"][index % 3],
    occupation: fewData ? undefined : ["Servicios","Tecnología","Educación","Comercio"][index % 4],
    needs: fewData ? [needs[0]!] : needs,
    declaredObligations: index % scenarios.length === 2,
    consent: !noConsent,
    consentPurpose: noConsent ? "No autorizada" : "Perfilamiento de afinidad y contacto asesorado",
    consentDate: noConsent ? undefined : "2026-07-20T10:00:00.000Z",
    synthetic: true,
    staleSource: index === 10,
    contradiction: index === 12 ? "La fecha objetivo declarada precede la fecha de captura" : undefined,
    sensitiveBlocked: index === 18,
    evidence: fewData ? evidenceFor(index, needs).slice(0, 1) : evidenceFor(index, needs),
  };
});

export const SAMPLE_CSV = [
  "tipo_documento,documento,nombre,ciudad,necesidades,consentimiento",
  ...PROFILES.slice(0, 30).map((p) => [p.documentType,p.documentNumber,p.fullName,p.city,p.needs.join("|"),p.consent ? "SI" : "NO"].join(",")),
].join("\n");
