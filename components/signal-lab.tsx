"use client";

import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Fingerprint,
  GitCompareArrows,
  LoaderCircle,
  Mail,
  MessageCircle,
  Phone,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SIGNAL_LAB_SAMPLE_DOCUMENTS } from "@/data/external-profiles";
import { affinityBand } from "@/lib/affinity-presentation";
import {
  parseDocumentBatch,
  summarizeEnrichmentBatch,
} from "@/lib/enrichment/batch";
import { buildEnrichmentCsv } from "@/lib/enrichment/export";
import { SIGNAL_FAMILY_LABELS } from "@/lib/enrichment/signal";
import { SIGNAL_GUARDRAILS } from "@/lib/enrichment/policy";
import type {
  EnrichmentConsent,
  EnrichmentResult,
  ExternalSignal,
} from "@/lib/enrichment/types";
import type {
  EnrichmentDeliveryReceipt,
} from "@/lib/enrichment/delivery";
import type { ContactChannel } from "@/lib/types";

type LabMode = "single" | "batch";

const DEFAULT_CONSENT: EnrichmentConsent = {
  socialDemo: true,
  lifeEvents: true,
  authorizedFinancial: true,
  commercialContact: true,
};

const CHANNEL_ICON: Record<ContactChannel, typeof Mail> = {
  IN_APP: UserRound,
  EMAIL: Mail,
  SMS: MessageCircle,
  WHATSAPP: MessageCircle,
  CALL: Phone,
};

function downloadCsv(content: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  link.download = "creasy-enriquecimiento.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function requestEnrichment(
  payload: { documentNumber: string; consent: EnrichmentConsent }
): Promise<EnrichmentResult> {
  const response = await fetch("/api/enrichment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as {
    data?: EnrichmentResult;
    error?: string;
  };
  if (!response.ok || !body.data) throw new Error(body.error ?? "No fue posible enriquecer el perfil.");
  return body.data;
}

export function SignalLab() {
  const [mode, setMode] = useState<LabMode>("single");
  const [documentNumber, setDocumentNumber] = useState("1010001001");
  const [consent, setConsent] = useState<EnrichmentConsent>(DEFAULT_CONSENT);
  const [result, setResult] = useState<EnrichmentResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<EnrichmentDeliveryReceipt>();
  const [delivering, setDelivering] = useState(false);
  const [comparison, setComparison] = useState<EnrichmentResult[]>();
  const [comparing, setComparing] = useState(false);
  const [batchText, setBatchText] = useState(
    SIGNAL_LAB_SAMPLE_DOCUMENTS.map((item) => item.documentNumber).join("\n")
  );
  const [batchResults, setBatchResults] = useState<EnrichmentResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const runSingle = async () => {
    setLoading(true);
    setError("");
    setReceipt(undefined);
    try {
      const data = await requestEnrichment({ documentNumber, consent });
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible enriquecer el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const deliver = async () => {
    if (!result?.recommendation) return;
    setDelivering(true);
    try {
      const response = await fetch("/api/enrichment/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentNumber, consent }),
      });
      const body = await response.json() as {
        data?: EnrichmentDeliveryReceipt;
        error?: string;
      };
      if (!response.ok || !body.data) throw new Error(body.error ?? "No fue posible preparar la entrega.");
      setReceipt(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible preparar la entrega.");
    } finally {
      setDelivering(false);
    }
  };

  const runComparison = async () => {
    setComparing(true);
    try {
      const rows = await Promise.all([
        requestEnrichment({ documentNumber: "1010001001", consent: DEFAULT_CONSENT }),
        requestEnrichment({ documentNumber: "1010001002", consent: DEFAULT_CONSENT }),
      ]);
      setComparison(rows);
    } finally {
      setComparing(false);
    }
  };

  const runBatch = async () => {
    const documents = parseDocumentBatch(batchText);
    if (!documents.length) {
      setError("Pega al menos una cédula sintética válida.");
      return;
    }
    setBatchLoading(true);
    setError("");
    try {
      const response = await fetch("/api/enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents, consent }),
      });
      const body = await response.json() as {
        data?: EnrichmentResult[];
        error?: string;
      };
      if (!response.ok || !body.data) throw new Error(body.error ?? "No fue posible procesar el lote.");
      setBatchResults(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible procesar el lote.");
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="signal-lab">
      <SignalLabHero />

      <div className="signal-lab-tabs" role="tablist" aria-label="Modo de enriquecimiento">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "single"}
          className={mode === "single" ? "active" : ""}
          onClick={() => setMode("single")}
        >
          <Fingerprint /> Una cédula
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "batch"}
          className={mode === "batch" ? "active" : ""}
          onClick={() => setMode("batch")}
        >
          <FileSpreadsheet /> Lote hasta 2.000
        </button>
      </div>

      {mode === "single" ? (
        <>
          <SingleLookup
            documentNumber={documentNumber}
            onDocumentChange={setDocumentNumber}
            consent={consent}
            onConsentChange={setConsent}
            loading={loading}
            onRun={() => void runSingle()}
          />
          {error && <div className="signal-lab-error"><CircleAlert />{error}</div>}
          {loading && <ConnectorProgress />}
          {!loading && result?.status === "NOT_FOUND" && <UnknownDocument result={result} />}
          {!loading && result?.status === "ENRICHED" && (
            <EnrichmentStory
              result={result}
              receipt={receipt}
              delivering={delivering}
              onDeliver={() => void deliver()}
            />
          )}
          <ComparisonProof
            results={comparison}
            loading={comparing}
            onRun={() => void runComparison()}
          />
        </>
      ) : (
        <BatchLab
          value={batchText}
          onChange={setBatchText}
          consent={consent}
          onConsentChange={setConsent}
          loading={batchLoading}
          results={batchResults}
          onRun={() => void runBatch()}
        />
      )}

      <GuardrailPanel />
    </div>
  );
}

function SignalLabHero() {
  return (
    <section className="signal-lab-hero">
      <div>
        <span className="eyebrow"><Sparkles /> SIGNAL LAB</span>
        <h1>De una cédula a una oferta que sí cambia con la persona</h1>
        <p>Creasy combina lo que Colsubsidio ya conoce con señales exógenas sintéticas y autorizadas. Cada dato conserva fuente, fecha, confianza y permiso.</p>
      </div>
      <div className="signal-lab-hero-proof">
        <article><strong>3+</strong><span>familias independientes</span></article>
        <article><strong>2.000</strong><span>cédulas por lote</span></article>
        <article><strong>0</strong><span>burós consultados</span></article>
      </div>
      <small><ShieldCheck /> Entorno de demostración: solo reconoce seis cédulas ficticias. Una cédula real no activa ninguna consulta externa.</small>
    </section>
  );
}

function SingleLookup({
  documentNumber,
  onDocumentChange,
  consent,
  onConsentChange,
  loading,
  onRun,
}: {
  documentNumber: string;
  onDocumentChange: (value: string) => void;
  consent: EnrichmentConsent;
  onConsentChange: (value: EnrichmentConsent) => void;
  loading: boolean;
  onRun: () => void;
}) {
  const updateConsent = (key: keyof EnrichmentConsent) =>
    onConsentChange({ ...consent, [key]: !consent[key] });

  return (
    <section className="signal-lookup">
      <div className="signal-lookup-main">
        <div>
          <span className="step-label">1 · Identifica el perfil sintético</span>
          <h2>Ingresa una cédula de demostración</h2>
          <p>El identificador resuelve el perfil dentro de un catálogo ficticio. Nunca se envía a buscadores, redes ni bases abiertas.</p>
        </div>
        <label className="signal-document-input">
          <span>Cédula sintética</span>
          <div><Search /><input
            aria-label="Cédula sintética"
            inputMode="numeric"
            value={documentNumber}
            onChange={(event) => onDocumentChange(event.target.value.replace(/\D/g, "").slice(0, 12))}
          /></div>
        </label>
        <div className="signal-samples">
          <span>Casos listos:</span>
          {SIGNAL_LAB_SAMPLE_DOCUMENTS.map((sample) => (
            <button
              type="button"
              key={sample.documentNumber}
              className={documentNumber === sample.documentNumber ? "active" : ""}
              onClick={() => onDocumentChange(sample.documentNumber)}
            >
              <strong>{sample.firstName}</strong>
              <small>{sample.goal}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="signal-consent-panel">
        <span className="step-label">2 · Finalidades de la demo</span>
        <h3>Autorizaciones sintéticas registradas</h3>
        <p>Activa o retira cada fuente para comprobar cómo cambia la recomendación.</p>
        <ConsentToggle
          checked={consent.socialDemo}
          label="Intereses sociales sintéticos"
          note="Simula una cuenta conectada voluntariamente."
          onChange={() => updateConsent("socialDemo")}
        />
        <ConsentToggle
          checked={consent.lifeEvents}
          label="Eventos de vida declarados"
          note="Hitos aportados por la persona en la demo."
          onChange={() => updateConsent("lifeEvents")}
        />
        <ConsentToggle
          checked={consent.authorizedFinancial}
          label="Open finance sintético"
          note="Solo obligaciones autorizadas; nunca buró."
          onChange={() => updateConsent("authorizedFinancial")}
        />
        <ConsentToggle
          checked={consent.commercialContact}
          label="Entrega por canal elegido"
          note="Sin este permiso la oferta queda en el portal."
          onChange={() => updateConsent("commercialContact")}
        />
        <button
          type="button"
          className="button button-primary signal-run"
          disabled={loading || documentNumber.length < 6}
          onClick={onRun}
        >
          {loading ? <><LoaderCircle className="spin" /> Enriqueciendo…</> : <><Play /> Enriquecer perfil</>}
        </button>
      </div>
    </section>
  );
}

function ConsentToggle({
  checked,
  label,
  note,
  onChange,
}: {
  checked: boolean;
  label: string;
  note: string;
  onChange: () => void;
}) {
  return (
    <button type="button" className={`signal-consent${checked ? " checked" : ""}`} onClick={onChange}>
      <span>{checked ? <Check /> : <X />}</span>
      <div><strong>{label}</strong><small>{note}</small></div>
      <i>{checked ? "Activa" : "Retirada"}</i>
    </button>
  );
}

function ConnectorProgress() {
  const steps = [
    ["Perfil interno", "Meta, servicios e interacciones propias"],
    ["Social demo", "Intereses conectados con autorización"],
    ["Eventos de vida", "Hitos declarados y vigencia"],
    ["Contexto público", "Ciudad, fecha y calendario verificable"],
    ["Motor explicable", "Una señal máxima por familia"],
  ];
  return (
    <section className="connector-progress" aria-live="polite">
      <LoaderCircle className="spin" />
      <div><span>ORQUESTANDO CONECTORES</span><h2>Enriqueciendo sin inventar</h2></div>
      <ol>{steps.map(([title, detail], index) => (
        <li key={title}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{title}</strong><small>{detail}</small></div><Check /></li>
      ))}</ol>
    </section>
  );
}

function UnknownDocument({ result }: { result: EnrichmentResult }) {
  return (
    <section className="signal-unknown">
      <Database />
      <span>Sin coincidencia · {result.documentMasked}</span>
      <h2>No inventamos un perfil cuando la cédula no existe en la demo</h2>
      <p>No se ejecutó scraping ni se consultó una fuente real. Elige uno de los seis casos sintéticos para recorrer la solución.</p>
    </section>
  );
}

function EnrichmentStory({
  result,
  receipt,
  delivering,
  onDeliver,
}: {
  result: EnrichmentResult;
  receipt?: EnrichmentDeliveryReceipt;
  delivering: boolean;
  onDeliver: () => void;
}) {
  return (
    <>
      <ProfileDelta result={result} />
      <SignalLedger
        eligible={result.eligibleSignals}
        excluded={result.excludedSignals}
      />
      {result.recommendation && (
        <OfferResult
          result={result}
          receipt={receipt}
          delivering={delivering}
          onDeliver={onDeliver}
        />
      )}
    </>
  );
}

function ProfileDelta({ result }: { result: EnrichmentResult }) {
  const before = result.before!;
  const after = result.after!;
  return (
    <section className="profile-delta">
      <div className="profile-delta-head">
        <div><span className="step-label">3 · Perfil antes y después</span><h2>El dato nuevo cambia lo que podemos entender</h2></div>
        <span className="profile-mask"><Fingerprint /> {result.documentMasked}</span>
      </div>
      <div className="profile-delta-grid">
        <article className="profile-before">
          <span>ANTES · SOLO PERFIL ESTÁTICO</span>
          <h3>{before.fullName}</h3>
          <dl>
            <div><dt>Categoría</dt><dd>{before.category}</dd></div>
            <div><dt>Ingreso</dt><dd>{before.incomeRange}</dd></div>
            <div><dt>Empresa</dt><dd>{before.employerOrSector}</dd></div>
            <div><dt>Antigüedad</dt><dd>{before.tenureMonths} meses</dd></div>
          </dl>
          <p><CircleAlert /> Con esto solo no hay una oferta hiperpersonalizada.</p>
        </article>
        <div className="profile-delta-arrow"><ArrowRight /></div>
        <article className="profile-after">
          <span>DESPUÉS · CONTEXTO ENRIQUECIDO</span>
          <h3>{after.activeSignalFamilies} familias de señales</h3>
          <dl>
            {after.externalInterest && <div><dt>Interés externo</dt><dd>{after.externalInterest}</dd></div>}
            {after.lifeEvent && <div><dt>Momento de vida</dt><dd>{after.lifeEvent}</dd></div>}
            {after.authorizedObligation && <div><dt>Dato autorizado</dt><dd>{after.authorizedObligation}</dd></div>}
            {after.preferredChannel && <div><dt>Canal preferido</dt><dd>{after.preferredChannel}</dd></div>}
          </dl>
          <p><BadgeCheck /> Ya existe evidencia diversa para orientar.</p>
        </article>
      </div>
    </section>
  );
}

function SignalLedger({
  eligible,
  excluded,
}: {
  eligible: ExternalSignal[];
  excluded: ExternalSignal[];
}) {
  return (
    <section className="signal-ledger">
      <div className="signal-ledger-head">
        <div><span className="step-label">4 · Libro de evidencia</span><h2>Cada señal trae su recibo</h2><p>No basta decir “usamos Instagram”: hay que demostrar qué llegó, con qué permiso y cuánto pesó.</p></div>
        <div><strong>{eligible.length}</strong><span>elegibles</span><strong>{excluded.length}</strong><span>excluidas</span></div>
      </div>
      <div className="signal-ledger-list">
        {[...eligible, ...excluded].map((signal) => (
          <article key={signal.id} className={signal.status === "ELIGIBLE" ? "" : "excluded"}>
            <span className="signal-source-icon">{signal.provenance === "EXTERNAL_PERSON" ? <ExternalLink /> : signal.provenance === "EXTERNAL_CONTEXT" ? <CalendarClock /> : <Database />}</span>
            <div className="signal-ledger-copy">
              <span>{SIGNAL_FAMILY_LABELS[signal.family]}</span>
              <h3>{signal.value}</h3>
              <p>{signal.sourceName} · {signal.sourceReference}</p>
            </div>
            <div className="signal-ledger-meta">
              <b>{Math.round(signal.confidence * 100)} %</b>
              <small>confianza</small>
              <i className={signal.status === "ELIGIBLE" ? "ok-tag" : "warning-tag"}>{signal.status.replaceAll("_", " ")}</i>
            </div>
            <small className="signal-ledger-reason">{signal.statusReason}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function OfferResult({
  result,
  receipt,
  delivering,
  onDeliver,
}: {
  result: EnrichmentResult;
  receipt?: EnrichmentDeliveryReceipt;
  delivering: boolean;
  onDeliver: () => void;
}) {
  const offer = result.recommendation!;
  const ChannelIcon = CHANNEL_ICON[offer.channel];
  return (
    <section className="enrichment-offer">
      <div className="enrichment-offer-head">
        <div><span className="step-label">5 · Producto, condición, canal y momento</span><h2>La orientación completa y su evidencia</h2></div>
        <div className="offer-score"><strong>{affinityBand(offer.score)}</strong><small>{offer.signalFamilies} familias de señales</small></div>
      </div>
      <div className="enrichment-offer-grid">
        <article className="offer-main">
          <span>PRODUCTO CON MAYOR AFINIDAD</span>
          <h3>{offer.productName}</h3>
          <p>{offer.reason}</p>
          <div><strong>Condición diseñada para este caso</strong><span>{offer.conditionLabel}</span></div>
          <small><ShieldCheck /> Afinidad, no aprobación · regla {offer.ruleVersion}</small>
        </article>
        <article className="offer-delivery">
          <span>ENTREGA RECOMENDADA</span>
          <ChannelIcon />
          <h3>{offer.channelLabel}</h3>
          <p>{offer.timeBandLabel}</p>
          <small>{offer.whyNow}</small>
          <button type="button" className="button button-primary" disabled={delivering} onClick={onDeliver}>
            {delivering ? <><LoaderCircle className="spin" /> Preparando…</> : <>Activar canal de demo <ChevronRight /></>}
          </button>
        </article>
      </div>
      <ContributionReceipt result={result} />
      {receipt && <DeliveryReceipt receipt={receipt} />}
      <p className="offer-disclaimer">{result.disclaimer}</p>
    </section>
  );
}

function ContributionReceipt({ result }: { result: EnrichmentResult }) {
  const contributions = result.recommendation!.contributions;
  return (
    <div className="contribution-receipt">
      <div><span>SEÑALES QUE SUSTENTAN LA ORIENTACIÓN</span><strong>La evidencia se puede revisar</strong></div>
      <ol>{contributions.map((contribution) => (
        <li key={contribution.signalId}>
          <span>{contribution.familyLabel}</span>
          <p>{contribution.signalLabel}</p>
          <b>Considerada</b>
        </li>
      ))}</ol>
    </div>
  );
}

function DeliveryReceipt({ receipt }: { receipt: EnrichmentDeliveryReceipt }) {
  return (
    <div className="delivery-receipt" role="status">
      <BadgeCheck />
      <div>
        <span>CANAL ACTIVADO</span>
        <h3>{receipt.channelLabel} · {receipt.destinationMasked}</h3>
        <p>{receipt.detail}</p>
        <small>{receipt.piece.header} · {receipt.piece.note}</small>
      </div>
      <i>{receipt.status.replaceAll("_", " ")}</i>
    </div>
  );
}

function ComparisonProof({
  results,
  loading,
  onRun,
}: {
  results?: EnrichmentResult[];
  loading: boolean;
  onRun: () => void;
}) {
  return (
    <section className="comparison-proof">
      <div className="comparison-proof-head">
        <div><span className="step-label">PRUEBA DEL RETO</span><h2>Mismo perfil estático. Dos ofertas claramente distintas.</h2><p>Laura y Nicolás comparten ciudad, categoría, ingreso, empleador, contrato y antigüedad. Solo cambian sus señales de contexto.</p></div>
        <button type="button" className="button button-secondary" onClick={onRun} disabled={loading}>
          {loading ? <><LoaderCircle className="spin" /> Comparando…</> : <><GitCompareArrows /> Ejecutar comparación</>}
        </button>
      </div>
      {results && <div className="comparison-grid">{results.map((item) => {
        const offer = item.recommendation!;
        const Icon = CHANNEL_ICON[offer.channel];
        return <article key={item.lookupId}>
          <div><span className="avatar">{item.before?.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{item.before?.fullName}</strong><small>Categoría {item.before?.category} · {item.before?.incomeRange} · {item.before?.tenureMonths} meses</small></div></div>
          <span>SEÑAL EXÓGENA PRINCIPAL</span>
          <p>{item.eligibleSignals.find((signal) => signal.provenance === "EXTERNAL_PERSON")?.value}</p>
          <h3>{offer.productName}</h3>
          <small>{offer.conditionLabel}</small>
          <footer><Icon /> {offer.channelLabel}<b>{affinityBand(offer.score)}</b></footer>
        </article>;
      })}</div>}
    </section>
  );
}

function BatchLab({
  value,
  onChange,
  consent,
  onConsentChange,
  loading,
  results,
  onRun,
}: {
  value: string;
  onChange: (value: string) => void;
  consent: EnrichmentConsent;
  onConsentChange: (value: EnrichmentConsent) => void;
  loading: boolean;
  results: EnrichmentResult[];
  onRun: () => void;
}) {
  const documents = useMemo(() => parseDocumentBatch(value), [value]);
  const summary = useMemo(() => summarizeEnrichmentBatch(results), [results]);
  return (
    <section className="batch-lab">
      <div className="batch-lab-input">
        <div><span className="step-label">LOTE SINTÉTICO</span><h2>Pega 10 o 2.000 cédulas</h2><p>Acepta CSV, comas, tabuladores o una cédula por línea. Duplica y limpia identificadores antes de ejecutar.</p></div>
        <label>
          <span>Cédulas sintéticas · {documents.length} válidas</span>
          <textarea aria-label="Lote de cédulas sintéticas" value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
        <div className="batch-consent-row">
          <button type="button" className={consent.socialDemo ? "active" : ""} onClick={() => onConsentChange({ ...consent, socialDemo: !consent.socialDemo })}>Social demo</button>
          <button type="button" className={consent.authorizedFinancial ? "active" : ""} onClick={() => onConsentChange({ ...consent, authorizedFinancial: !consent.authorizedFinancial })}>Open finance demo</button>
          <button type="button" className={consent.commercialContact ? "active" : ""} onClick={() => onConsentChange({ ...consent, commercialContact: !consent.commercialContact })}>Canal autorizado</button>
        </div>
        <button type="button" className="button button-primary" disabled={loading || documents.length === 0} onClick={onRun}>
          {loading ? <><LoaderCircle className="spin" /> Procesando…</> : <><Play /> Enriquecer {documents.length} perfiles</>}
        </button>
      </div>

      {results.length > 0 && <>
        <div className="batch-summary">
          <article><strong>{summary.total}</strong><span>procesados</span></article>
          <article><strong>{summary.enriched}</strong><span>enriquecidos</span></article>
          <article><strong>{summary.products}</strong><span>productos distintos</span></article>
          <article><strong>{summary.channels}</strong><span>canales distintos</span></article>
          <article><strong>{summary.averageFamilies.toFixed(1)}</strong><span>familias promedio</span></article>
          <button type="button" className="button button-secondary" onClick={() => downloadCsv(buildEnrichmentCsv(results))}><Download /> Descargar CSV</button>
        </div>
        <div className="batch-result-table">
          <table>
            <thead><tr><th>Documento</th><th>Estado</th><th>Producto</th><th>Canal</th><th>Señales</th><th>Explicación</th></tr></thead>
            <tbody>{results.map((item) => <tr key={item.lookupId}>
              <td>{item.documentMasked}</td>
              <td><span className={item.status === "ENRICHED" ? "ok-tag" : "warning-tag"}>{item.status}</span></td>
              <td><strong>{item.recommendation?.productName ?? "Sin coincidencia"}</strong></td>
              <td>{item.recommendation?.channelLabel ?? "—"}</td>
              <td>{item.recommendation?.signalFamilies ?? 0}</td>
              <td>{item.recommendation?.reason ?? "No se inventaron datos."}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
  );
}

function GuardrailPanel() {
  return (
    <section className="signal-guardrails">
      <div><ShieldCheck /><span>PRIVACIDAD DESDE EL DISEÑO</span><h2>Una cédula no es permiso para vigilar</h2><p>Instagram aparece porque el reto lo menciona. En Creasy solo existe como conector sintético y autorizado; en producción debe reemplazarse por una conexión voluntaria o un proveedor con base legal.</p></div>
      <ul>{SIGNAL_GUARDRAILS.map((guardrail) => <li key={guardrail}><Check />{guardrail}</li>)}</ul>
    </section>
  );
}
