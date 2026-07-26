import type { SignalFamily } from "@/lib/enrichment/types";

export const SIGNAL_FAMILY_WEIGHTS: Record<SignalFamily, number> = {
  DECLARED_GOAL: 30,
  INTERNAL_BEHAVIOR: 20,
  SERVICE_USAGE: 10,
  EXTERNAL_INTEREST: 20,
  LIFE_EVENT: 15,
  PUBLIC_CONTEXT: 5,
  AUTHORIZED_FINANCIAL: 15,
  DECLARED_PREFERENCE: 0,
};

export const MINIMUM_SIGNAL_FAMILIES = 3;
export const ENRICHMENT_RULE_VERSION = "signal-affinity-2026.07.1";
