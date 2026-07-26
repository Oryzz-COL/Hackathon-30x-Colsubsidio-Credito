import { authorizedFinancialConnector } from "@/lib/connectors/authorized-financial";
import { declaredPreferenceConnector } from "@/lib/connectors/declared-preference";
import { internalAffiliateConnector } from "@/lib/connectors/internal-affiliate";
import { publicContextConnector } from "@/lib/connectors/public-context";
import { syntheticLifeEventsConnector } from "@/lib/connectors/synthetic-life-events";
import { syntheticSocialConnector } from "@/lib/connectors/synthetic-social";
import type {
  EnrichmentConnector,
  EnrichmentConnectorContext,
  ExternalSignal,
} from "@/lib/enrichment/types";

export const ENRICHMENT_CONNECTORS: EnrichmentConnector[] = [
  internalAffiliateConnector,
  syntheticSocialConnector,
  syntheticLifeEventsConnector,
  authorizedFinancialConnector,
  declaredPreferenceConnector,
  publicContextConnector,
];

export function collectConnectorSignals(
  context: EnrichmentConnectorContext,
  connectors = ENRICHMENT_CONNECTORS
): ExternalSignal[] {
  return connectors.flatMap((connector) => connector.collect(context));
}

export const ENRICHMENT_CONNECTOR_VERSION = "signal-connectors-2026.07.1";
