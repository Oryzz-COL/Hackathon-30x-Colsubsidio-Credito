export type ProductId =
  | "cupo-credito" | "educativo" | "hipotecario" | "compra-cartera"
  | "mujeres" | "libre-inversion" | "complementario" | "seguros-impuestos";

export type SourceType =
  | "USER_DECLARED" | "COLSUBSIDIO_INTERNAL" | "AUTHORIZED_PROVIDER"
  | "PUBLIC_OFFICIAL" | "SYNTHETIC_DEMO" | "DERIVED" | "LLM_SUMMARY";

export type DataNature = "OBSERVED" | "DECLARED" | "VERIFIED" | "DERIVED" | "INFERRED" | "UNKNOWN";

export type ContactChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP" | "CALL";
export type ContactHorizon = "NOW" | "THIS_MONTH" | "NEXT_THREE_MONTHS" | "EXPLORING";
export type ContactTimeBand = "WEEKDAY_MORNING" | "WEEKDAY_AFTERNOON" | "SATURDAY";
export type ContactFrequency = "ONCE_WEEK" | "TWICE_MONTH" | "ONCE_MONTH" | "NO_CONTACT";
export type AffiliationCategory = "A" | "B" | "C" | "D";
export type DeclaredGender = "WOMAN" | "MAN" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
export type GoalHorizon = "NOW" | "ONE_TO_THREE_MONTHS" | "THREE_TO_TWELVE_MONTHS" | "EXPLORING";
export type Urgency = "LOW" | "MEDIUM" | "HIGH";
export type ConsentPurpose =
  | "GUIDANCE"
  | "BEHAVIOR_PERSONALIZATION"
  | "COMMERCIAL_CONTACT"
  | "AUTHORIZED_FINANCIAL_SIMULATION";

export interface AffiliatePreferences {
  interestedProductIds: ProductId[];
  monthlyPayment?: number;
  horizon: ContactHorizon;
  preferredChannel: ContactChannel;
  preferredTimeBand: ContactTimeBand;
  maxContactFrequency: ContactFrequency;
  wantsAdvisor: boolean;
}

export interface ConsentRecord {
  id: string;
  purpose: ConsentPurpose;
  scope: string;
  noticeVersion: string;
  grantedAt: string;
  source: "AFFILIATE_SELF_SERVICE" | "ADVISOR_FORM";
  status: "GRANTED" | "REVOKED";
  channels: ContactChannel[];
  revokedAt?: string;
  synthetic: true;
}

export type BehaviorEventType =
  | "contenido_consultado"
  | "beneficio_consultado"
  | "guia_guardada"
  | "credito_consultado"
  | "credito_comparado"
  | "simulacion_iniciada"
  | "simulacion_completada"
  | "solicitud_iniciada"
  | "solicitud_abandonada"
  | "oferta_visualizada"
  | "oferta_aceptada"
  | "canal_seleccionado"
  | "contacto_solicitado"
  | "preferencias_actualizadas"
  | "consentimiento_otorgado"
  | "consentimiento_revocado";

export interface BehaviorEvent {
  id: string;
  type: BehaviorEventType;
  occurredAt: string;
  source: "FIRST_PARTY_DEMO";
  productId?: ProductId;
  channel?: ContactChannel;
  label?: string;
  confidence?: number;
  expiresAt?: string;
  authorizedPurpose: ConsentPurpose;
  consentVersion: string;
  retentionClass: "MVP_30_DAYS";
  synthetic: true;
}

export interface Evidence {
  id: string;
  label: string;
  value: string;
  normalizedValue: string;
  sourceType: SourceType;
  sourceName: string;
  sourceReference: string;
  capturedAt: string;
  lastVerifiedAt: string;
  confidence: number;
  consentScope: string;
  dataNature: DataNature;
  evidenceStatus: "VIGENTE" | "VENCIDA" | "EXCLUIDA";
  notes?: string;
}

export interface Profile {
  id: string;
  fullName: string;
  documentType: "CC" | "CE" | "PPT";
  documentNumber: string;
  city: string;
  email: string;
  phone: string;
  affiliation: "Activo" | "Pendiente" | "Inactivo";
  category?: AffiliationCategory;
  gender?: DeclaredGender;
  addressOrZone?: string;
  employerOrSector?: string;
  ageRange?: string;
  dependentsCount?: number;
  childrenAgeRanges?: string[];
  householdStatus?: string;
  housingStatus?: string;
  contractType?: string;
  tenureMonths?: number;
  incomeRange?: string;
  occupation?: string;
  declaredGoal?: string;
  lifeEvent?: string;
  goalHorizon?: GoalHorizon;
  estimatedNeedRange?: string;
  /* Lo que la persona pidió de verdad. Sin esto, cualquier veredicto sobre su
     caso estaría calculado sobre un monto inventado por nosotros. */
  requestedAmount?: number;
  requestedTermMonths?: number;
  urgency?: Urgency;
  serviceUsage?: string[];
  digitalInteractions?: string[];
  declaredInterests?: string[];
  needs: string[];
  declaredObligations: boolean;
  consent: boolean;
  consentPurpose: string;
  consentDate?: string;
  synthetic: true;
  origin?: "SYNTHETIC_SEED" | "ADVISOR_FORM" | "BATCH_IMPORT" | "AFFILIATE_SELF_SERVICE";
  contactRequestedAt?: string;
  guidanceProductIds?: ProductId[];
  externalDataStatus?: "NOT_AVAILABLE_DEMO" | "SIMULATED";
  preferences?: AffiliatePreferences;
  consents?: ConsentRecord[];
  behaviorEvents?: BehaviorEvent[];
  rneExcluded?: boolean;
  commercialContactBlocked?: boolean;
  lastCommercialContactAt?: string;
  staleSource?: boolean;
  contradiction?: string;
  sensitiveBlocked?: boolean;
  evidence: Evidence[];
}

export type PublicProfile = Omit<Profile, "documentNumber" | "email" | "phone"> & {
  documentMasked: string;
  emailMasked?: string;
  phoneMasked?: string;
};

export interface Product {
  id: ProductId;
  name: string;
  shortName: string;
  objective: string;
  needs: string[];
  categoryCaps: Record<string, number>;
  requirements: string[];
  status: "DOCUMENTADO_BRIEF" | "PENDIENTE_VALIDACION_OFICIAL";
  briefSource: "RECURSOS_RETO_CREDITO_PDF" | "MVP_ADDITIONAL";
  catalogClass: "NUCLEO_RETO" | "COMPLEMENTARIO_DOCUMENTADO" | "PENDIENTE_VALIDACION";
  facts: string[];
  notice?: string;
  version: string;
}

export interface SignalRule {
  id: string;
  productId: ProductId;
  label: string;
  category: "need" | "intent" | "evidence" | "context";
  weight: number;
  matches: string[];
}

export interface AffinityResult {
  productId: ProductId;
  affinityScore: number;
  affinityLevel: string;
  positiveSignals: string[];
  missingSignals: string[];
  contradictorySignals: string[];
  excludedSignals: string[];
  confidence: number;
  ruleVersion: string;
  calculatedAt: string;
  requiresHumanReview: boolean;
  disclaimer: string;
  eligibility: { label: string; status: "CUMPLIDA" | "DECLARADA" | "PENDIENTE" | "NO_COMPROBADA" | "NO_APLICA" }[];
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  detail: string;
  createdAt: string;
}
