import type {
  AffiliationCategory,
  ConsentPurpose,
  ContactChannel,
  ContactTimeBand,
  DataNature,
  ProductId,
  SourceType,
} from "@/lib/types";

export type SignalFamily =
  | "DECLARED_GOAL"
  | "INTERNAL_BEHAVIOR"
  | "SERVICE_USAGE"
  | "EXTERNAL_INTEREST"
  | "LIFE_EVENT"
  | "PUBLIC_CONTEXT"
  | "AUTHORIZED_FINANCIAL"
  | "DECLARED_PREFERENCE";

export type SignalProvenance =
  | "COLSUBSIDIO_INTERNAL"
  | "EXTERNAL_PERSON"
  | "EXTERNAL_CONTEXT"
  | "USER_DECLARED";

export type SignalSensitivity =
  | "STANDARD"
  | "FINANCIAL"
  | "SENSITIVE_PROHIBITED";

export type EnrichmentSignalStatus =
  | "ELIGIBLE"
  | "EXCLUDED_NO_CONSENT"
  | "EXCLUDED_SENSITIVE"
  | "EXPIRED";

export interface ExternalSignal {
  id: string;
  family: SignalFamily;
  label: string;
  value: string;
  productIds: ProductId[];
  connectorId: string;
  sourceName: string;
  sourceReference: string;
  sourceType: SourceType;
  dataNature: DataNature;
  provenance: SignalProvenance;
  sensitivity: SignalSensitivity;
  confidence: number;
  observedAt: string;
  expiresAt?: string;
  consentPurpose?: ConsentPurpose;
  status: EnrichmentSignalStatus;
  statusReason: string;
  synthetic: true;
}

export interface StaticAffiliateSnapshot {
  fullName: string;
  city: string;
  category: AffiliationCategory;
  affiliation: "Activo" | "Pendiente" | "Inactivo";
  incomeRange: string;
  employerOrSector: string;
  contractType: string;
  tenureMonths: number;
}

export interface EnrichmentRawData {
  declaredGoal?: {
    label: string;
    productIds: ProductId[];
  };
  internalBehavior?: Array<{
    label: string;
    productIds: ProductId[];
    occurredAt: string;
  }>;
  serviceUsage?: Array<{
    label: string;
    productIds: ProductId[];
    occurredAt: string;
  }>;
  socialInterests?: Array<{
    label: string;
    productIds: ProductId[];
    observedAt: string;
    topicClass?: "STANDARD" | "SENSITIVE";
  }>;
  lifeEvents?: Array<{
    label: string;
    productIds: ProductId[];
    declaredAt: string;
  }>;
  financial?: Array<{
    label: string;
    productIds: ProductId[];
    verifiedAt: string;
  }>;
  preference?: {
    channel: ContactChannel;
    timeBand: ContactTimeBand;
    updatedAt: string;
  };
}

export interface SyntheticExternalProfile {
  documentNumber: string;
  snapshot: StaticAffiliateSnapshot;
  email: string;
  phone: string;
  raw: EnrichmentRawData;
}

export interface EnrichmentConsent {
  socialDemo: boolean;
  lifeEvents: boolean;
  authorizedFinancial: boolean;
  commercialContact: boolean;
}

export interface EnrichmentRequest {
  documentNumber: string;
  consent: EnrichmentConsent;
  now?: string;
}

export interface SignalContributionReceipt {
  family: SignalFamily;
  familyLabel: string;
  points: number;
  signalId: string;
  signalLabel: string;
  confidence: number;
  connectorId: string;
}

export interface EnrichmentRecommendation {
  productId: ProductId;
  productName: string;
  score: number;
  signalFamilies: number;
  contributions: SignalContributionReceipt[];
  reason: string;
  whyNow: string;
  channel: ContactChannel;
  channelLabel: string;
  timeBand: ContactTimeBand;
  timeBandLabel: string;
  conditionLabel: string;
  nextStep: string;
  requiresHumanReview: true;
  ruleVersion: string;
}

export interface EnrichedProfileView extends StaticAffiliateSnapshot {
  externalInterest?: string;
  lifeEvent?: string;
  authorizedObligation?: string;
  preferredChannel?: string;
  activeSignalFamilies: number;
}

export interface EnrichmentResult {
  status: "ENRICHED" | "NOT_FOUND";
  documentMasked: string;
  lookupId: string;
  before?: StaticAffiliateSnapshot;
  after?: EnrichedProfileView;
  eligibleSignals: ExternalSignal[];
  excludedSignals: ExternalSignal[];
  recommendation?: EnrichmentRecommendation;
  alternatives: EnrichmentRecommendation[];
  generatedAt: string;
  connectorVersion: string;
  disclaimer: string;
}

export interface EnrichmentConnectorContext {
  profile: SyntheticExternalProfile;
  consent: EnrichmentConsent;
  now: Date;
}

export interface EnrichmentConnector {
  id: string;
  name: string;
  description: string;
  provenance: SignalProvenance;
  consentRequired: boolean;
  health: "SIMULATED" | "OPERATIVE";
  collect(context: EnrichmentConnectorContext): ExternalSignal[];
}
