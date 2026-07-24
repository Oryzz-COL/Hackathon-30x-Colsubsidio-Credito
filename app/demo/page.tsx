import { DemoApp, type View } from "@/components/demo-app";
import { CONNECTORS } from "@/lib/connectors";
import { deriveMetrics } from "@/lib/metrics";
import { store } from "@/lib/store";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const profiles = structuredClone(store.list());
  const allowedViews: View[] = ["dashboard", "profiles", "batch", "assistant", "reviews", "sources", "audit", "impact"];
  const requestedView = typeof sp.view === "string" && allowedViews.includes(sp.view as View) ? sp.view as View : "dashboard";
  return (
    <DemoApp
      initialProfiles={profiles}
      initialAudit={store.audit()}
      metrics={deriveMetrics(profiles)}
      connectors={CONNECTORS.map((c) => ({ ...c, fieldsProvided: [...c.fieldsProvided] }))}
      initialTour={sp.tour === "1"}
      initialView={requestedView}
    />
  );
}
