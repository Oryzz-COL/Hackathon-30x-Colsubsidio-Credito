export type ProductId =
  | "cupo-credito" | "educativo" | "hipotecario" | "compra-cartera"
  | "mujeres" | "libre-inversion" | "complementario" | "seguros-impuestos";

export type SourceType =
  | "USER_DECLARED" | "COLSUBSIDIO_INTERNAL" | "AUTHORIZED_PROVIDER"
  | "PUBLIC_OFFICIAL" | "SYNTHETIC_DEMO" | "DERIVED" | "LLM_SUMMARY";

export type DataNature = "OBSERVED" | "DECLARED" | "VERIFIED" | "DERIVED" | "INFERRED" | "UNKNOWN";

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
  category?: string;
  contractType?: string;
  tenureMonths?: number;
  incomeRange?: string;
  occupation?: string;
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
  status: "VIGENTE_DEMO" | "PENDIENTE_VALIDACION";
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
  eligibility: { label: string; status: "CUMPLIDA" | "DECLARADA" | "PENDIENTE" | "NO_COMPROBADA" }[];
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  detail: string;
  createdAt: string;
}
