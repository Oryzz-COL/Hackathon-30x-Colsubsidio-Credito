import { DemoApp } from "@/components/demo-app";
import { PROFILES } from "@/data/profiles";
import { CONNECTORS } from "@/lib/connectors";
import { deriveMetrics } from "@/lib/metrics";
import { store } from "@/lib/store";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <DemoApp
      initialProfiles={PROFILES}
      initialAudit={store.audit()}
      metrics={deriveMetrics(PROFILES)}
      connectors={CONNECTORS.map((c) => ({ ...c, fieldsProvided: [...c.fieldsProvided] }))}
      initialTour={sp.tour === "1"}
    />
  );
}
