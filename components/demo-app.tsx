"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bot, CalendarClock, Check, ChevronRight,
  CircleHelp, ClipboardCheck, Database, Download, Eye, FileSpreadsheet, Fingerprint, Gauge,
  History, Home, Info, Layers3, LogOut, Mail, Menu, Plus, RefreshCw,
  Search, ShieldCheck, Sparkles, Upload, UserRound, UsersRound, Volume2, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { BRAND } from "@/config/brand";
import { BrandLockup } from "@/components/brand-lockup";
import { ChannelPreview } from "@/components/channel-preview";
import { SignalLab } from "@/components/signal-lab";
import { getProduct } from "@/config/products";
import { JURY_PROFILE_IDS, SAMPLE_CSV } from "@/data/profiles";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import {
  applyHousingContextScenario,
  createLiveContextDemoProfile,
  summarizeLiveContext,
} from "@/lib/context-engine";
import { buildNextBestAction, buildPersonalizedOffer, evaluateContactPolicy, hasActiveConsent, timeBandLabels as TIME_BAND_LABELS } from "@/lib/personalization";
import { evaluateDecision } from "@/lib/decision/engine";
import { suggestContactMessage, type OutboxMessage } from "@/lib/notificaciones";
import { clearCases, localMessages, localProfiles, type LocalCase } from "@/lib/demo-case";
import { useLocalCases } from "@/lib/use-local-cases";
import { deriveMetrics } from "@/lib/metrics";
import { buildBatchOutputCsv, summarizeBatchDiversity } from "@/lib/batch/export";
import { activeTriggers, CALENDAR_VERSION } from "@/lib/exogenous/calendar";
import { BUSINESS_CASE_ASSUMPTIONS, BUSINESS_CASE_VERSION, campaignArithmetic, productTimings } from "@/lib/business-case";
import { advisorFirstName, advisorInitials, type AdvisorIdentity } from "@/lib/advisor-auth";
import { documentLabel, maskEmail, maskPhone, safeCsvCell } from "@/lib/privacy";
import { declaredEvidence, rowToProfile, validateRows, type RowValidation } from "@/lib/validation/batch-row";
import type { AffinityResult, AuditEvent, Profile } from "@/lib/types";

export type View = "dashboard" | "enrichment" | "scenarios" | "profiles" | "batch" | "assistant" | "reviews" | "sources" | "audit";
type Metrics = ReturnType<typeof deriveMetrics>;
type ChispyTrace = { name: string; detail: string; done?: boolean; result?: string };
type ChispyMessage = {
  role: "user" | "assistant";
  text: string;
  thinking?: string[];
  traces?: ChispyTrace[];
  fuentes?: string[];
  proveedor?: string;
  nota?: string;
  live?: boolean;
};
type ChispyStreamEvent =
  | { tipo: "pensando"; texto: string }
  | { tipo: "herramienta"; nombre: string; detalle: string }
  | { tipo: "herramienta_ok"; nombre: string; detalle: string }
  | { tipo: "respuesta"; texto: string; fuentes: string[]; proveedor: string; nota?: string }
  | { tipo: "error"; mensaje: string };
type Connector = { id: string; name: string; description: string; enabled: boolean; legalBasis: string; consentRequired: boolean; fieldsProvided: readonly string[]; rateLimit: string; healthStatus: string };

const NAV: { id: View; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Resumen", icon: Home },
  { id: "enrichment", label: "Signal Lab", icon: Fingerprint },
  { id: "scenarios", label: "3 perfiles clave", icon: Sparkles },
  { id: "profiles", label: "Perfiles", icon: UsersRound },
  { id: "batch", label: "Carga masiva", icon: FileSpreadsheet },
  { id: "reviews", label: "Bandeja de casos", icon: ClipboardCheck },
  { id: "assistant", label: "Chispy", icon: Bot },
  { id: "sources", label: "Fuentes", icon: Database },
  { id: "audit", label: "Auditoría", icon: History },
];

const COLORS = ["#3367d6", "#7f5af0", "#19a37c", "#e79b32", "#e36d7a", "#4f83cc", "#83a947", "#a96aac"];

function download(name: string, content: string, type = "text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function DemoApp({ initialProfiles, initialAudit, metrics: initialMetrics, connectors, initialTour = false, initialView = "dashboard", juryMode = false, advisor, onLogout }: { initialProfiles: Profile[]; initialAudit: AuditEvent[]; metrics: Metrics; connectors: Connector[]; initialTour?: boolean; initialView?: View; juryMode?: boolean; advisor?: AdvisorIdentity; onLogout?: () => void }) {
  const activeAdvisor = advisor ?? { id: "demo-advisor", fullName: "Equipo asesor demo", email: "demo@creasy.local", role: "Asesoría de crédito" as const };
  const firstName = advisorFirstName(activeAdvisor.fullName);
  const initials = advisorInitials(activeAdvisor.fullName);
  const [view, setView] = useState<View>(initialView);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [audit, setAudit] = useState(initialAudit);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [tour, setTour] = useState(initialTour);
  const [tourStep, setTourStep] = useState(0);
  const [toast, setToast] = useState("");
  const [assistantInitialTab, setAssistantInitialTab] = useState<"chat" | "impacto">("chat");
  const startTour = () => { setTour(true); setTourStep(0); setView("dashboard"); };
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const resetJuryDemo = () => {
    setProfiles(structuredClone(initialProfiles));
    setSelected(null);
    setTour(false);
    setView("scenarios");
    window.history.replaceState(null, "", "/demo?view=scenarios&jury=1");
    window.scrollTo({ top: 0, behavior: "smooth" });
    flash("Demostración reiniciada con los datos de ejemplo originales");
  };
  const log = (action: string, detail: string, actor = activeAdvisor.fullName) =>
    setAudit((events) => [{ id: crypto.randomUUID(), action, actor, detail, createdAt: new Date().toISOString() }, ...events]);

  useEffect(() => {
    void fetch("/api/profiles", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ data: Profile[] }> : null)
      .then((payload) => {
        if (payload?.data) setProfiles(payload.data);
      })
      .catch(() => undefined);
  }, []);

  /*
   * El workspace se arma con dos fuentes: el catálogo sintético que sirve el
   * servidor y los casos que esta persona creó en el recorrido del afiliado,
   * que viven en su navegador. Los suyos van primero porque son los que vino a
   * buscar: quien acaba de pedir una asesora espera encontrarse arriba.
   */
  const ownCases = useLocalCases();
  const workspace = useMemo(() => {
    const mine = localProfiles(ownCases);
    if (!mine.length) return profiles;
    const ids = new Set(mine.map((item) => item.id));
    return [...mine, ...profiles.filter((item) => !ids.has(item.id))];
  }, [ownCases, profiles]);

  const metrics = useMemo(
    () => (workspace === initialProfiles ? initialMetrics : deriveMetrics(workspace)),
    [workspace, initialProfiles, initialMetrics]
  );
  const alerts = useMemo(() => ({
    noConsent: workspace.filter((p) => !p.consent).length,
    stale: workspace.filter((p) => p.staleSource).length,
    sensitive: workspace.filter((p) => p.sensitiveBlocked).length,
    reviews: metrics.reviews,
  }), [workspace, metrics]);

  const createProfile = (profile: Profile) => {
    setProfiles((items) => [profile, ...items]);
    setCreating(false);
    log("PROFILE_CREATED", `Perfil ${profile.id.slice(0, 8)} creado desde el formulario (PII omitida)`);
    flash("Perfil creado y analizado. La afinidad no implica aprobación.");
    setSelected(profile);
  };

  const importProfiles = (imported: Profile[], fileName: string, invalid: number) => {
    setProfiles((items) => [...imported, ...items]);
    log("BATCH_IMPORT", `Lote ${fileName}: ${imported.length} perfiles importados, ${invalid} filas con error`);
    flash(`${imported.length} perfiles importados al workspace`);
  };

  const screens = {
    dashboard: <Dashboard metrics={metrics} profiles={workspace} alerts={alerts} onOpen={setSelected} onNavigate={setView} firstName={firstName} />,
    enrichment: <SignalLab />,
    scenarios: <ScenarioShowcase
      profiles={workspace}
      onOpen={setSelected}
      juryMode={juryMode}
      onShowImpact={() => {
        setAssistantInitialTab("impacto");
        setView("assistant");
      }}
      onReset={resetJuryDemo}
    />,
    profiles: <Profiles profiles={workspace} onOpen={setSelected} onNew={() => setCreating(true)} />,
    batch: <Batch flash={flash} onImport={importProfiles} onNavigate={setView} />,
    assistant: <Chispy profiles={workspace} metrics={metrics} log={log} firstName={firstName} initials={initials} initialTab={assistantInitialTab} />,
    reviews: <Reviews profiles={workspace} ownCases={ownCases} onOpen={setSelected} flash={flash} log={log} />,
    sources: <Sources connectors={connectors} />,
    audit: <Audit events={audit} log={log} onNavigate={setView} />,
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <BrandLockup compact/>
          <button className="icon-button mobile-only" onClick={() => setSidebar(false)} aria-label="Cerrar navegación"><X/></button>
        </div>
        <div className="workspace-card"><span>Espacio de trabajo</span><strong>Entorno de demostración</strong><small><span className="live-dot"/> {workspace.length} perfiles de ejemplo</small></div>
        <nav aria-label="Navegación principal">
          {NAV.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "nav-active" : ""} onClick={() => {
            if (id === "assistant") setAssistantInitialTab("chat");
            setView(id);
            setSidebar(false);
          }}><Icon size={18}/><span>{label}</span>{id === "reviews" && alerts.reviews > 0 && <b>{alerts.reviews}</b>}</button>)}
        </nav>
        <div className="sidebar-footer">
          <button onClick={startTour}><Sparkles size={17}/><span>Iniciar demo guiada</span></button>
          <div className="user-card"><span className="avatar small">{initials}</span><div><strong>{activeAdvisor.fullName}</strong><small>{activeAdvisor.role}</small></div></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div><button className="icon-button menu-button" onClick={() => setSidebar(true)} aria-label="Abrir navegación"><Menu/></button><span className="breadcrumb">Creasy / <strong>{NAV.find((n) => n.id === view)?.label}</strong></span></div>
          <div className="top-actions"><Link className="affiliate-switch-link" href="/orientacion"><UserRound/> Orientación afiliado</Link><span className="synthetic-label"><ShieldCheck size={15}/> Datos de ejemplo</span><div className="top-session"><span className="avatar small">{initials}</span><div><strong>{activeAdvisor.fullName}</strong><small>{activeAdvisor.role}</small></div>{onLogout && <button type="button" onClick={onLogout}><LogOut size={15}/> Cerrar sesión</button>}</div><button className="icon-button" aria-label="Ayuda: iniciar demo guiada" title="Ayuda: iniciar demo guiada" onClick={startTour}><CircleHelp/></button></div>
        </header>
        {juryMode && <div className="jury-mode-bar"><span><ShieldCheck/> Demostración interactiva · sesión temporal</span><strong>Explora los casos y conoce por qué cambia cada orientación</strong><button type="button" onClick={resetJuryDemo}><RefreshCw/> Reiniciar</button></div>}
        <div className="content">{screens[view]}</div>
      </main>
      {creating && <ProfileForm onClose={() => setCreating(false)} onCreate={createProfile} />}
      {selected && <ProfileDetail profile={selected} onClose={() => setSelected(null)} onUpdate={(next) => { setProfiles((items) => items.map((p) => p.id === next.id ? next : p)); setSelected(next); }} flash={flash} log={log} />}
      {tour && <Tour step={tourStep} onNext={() => {
        if (tourStep === 0) setView("batch");
        if (tourStep === 1) setView("profiles");
        if (tourStep === 2) setSelected(profiles[0]!);
        if (tourStep === 3) { setSelected(null); setView("assistant"); }
        if (tourStep === 4) setView("assistant");
        if (tourStep >= 5) { setTour(false); flash("Demo guiada completada"); return; }
        setTourStep((s) => s + 1);
      }} onClose={() => setTour(false)} />}
      {toast && <div className="toast"><Check size={17}/>{toast}</div>}
    </div>
  );
}

function SectionHeader({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="section-header"><div><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

function Dashboard({ metrics, profiles, alerts, onOpen, onNavigate, firstName }: { metrics: Metrics; profiles: Profile[]; alerts: { noConsent: number; stale: number; sensitive: number; reviews: number }; onOpen: (p: Profile) => void; onNavigate: (v: View) => void; firstName: string }) {
  const opportunities = profiles.map((p) => ({ profile: p, result: calculateAllAffinities(p)[0]! })).sort((a, b) => b.result.affinityScore - a.result.affinityScore).slice(0, 5);
  return <>
    <section className="welcome-band">
      <div><span className="eyebrow light"><Sparkles size={15}/> Inteligencia con propósito</span><h1>Buenos días, {firstName}.</h1><p>Hay <strong>{alerts.reviews} casos</strong> que necesitan revisión antes de una conversación comercial.</p></div>
      <div className="welcome-actions"><button className="button button-white" onClick={() => onNavigate("batch")}><Upload size={17}/> Cargar lote</button><button className="button button-glass" onClick={() => onNavigate("profiles")}><Plus size={17}/> Analizar perfil</button></div>
    </section>
    <div className="kpi-grid">
      <Kpi label="Perfiles procesados" value={metrics.profiles} note="En este workspace" icon={UsersRound}/>
      <Kpi label="Con consentimiento" value={`${Math.round(metrics.consented / Math.max(metrics.profiles, 1) * 100)} %`} note={`${metrics.consented} perfiles autorizados`} icon={ShieldCheck}/>
      <Kpi label="Datos trazables" value={`${metrics.sourced} %`} note="Con fuente y referencia" icon={Database}/>
      <Kpi label="Cobertura promedio" value={`${metrics.coverage} %`} note="De variables relevantes" icon={Layers3}/>
    </div>
    <div className="dashboard-grid">
      <section className="panel chart-panel">
        <div className="panel-title"><div><h2>Afinidad principal por producto</h2><p>Producto con mayor correspondencia por perfil</p></div><span className="source-pill">Calculado</span></div>
        <ResponsiveContainer width="100%" height={260}><BarChart data={metrics.distribution} margin={{ top: 15, right: 10, left: -20, bottom: 15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eaf0"/><XAxis dataKey="name" tick={{ fontSize: 11, fill: "#667085" }} angle={-12} textAnchor="end" interval={0}/><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }}/><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e6ee" }}/><Bar dataKey="value" radius={[7,7,0,0]}>{metrics.distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer>
        {/*
          * El motor calcula ocho líneas y el recorrido público muestra siete.
          * No es un descuadre: libre inversión todavía no tiene información
          * validada contra el catálogo oficial, así que se calcula para la
          * asesora y no se le ofrece a nadie. Decirlo aquí evita que el número
          * parezca un error de cuentas.
          */}
        <p className="chart-note"><AlertTriangle size={13}/> Libre inversión se calcula pero no se ofrece en el recorrido público: su información sigue pendiente de validación con el catálogo oficial vigente.</p>
      </section>
      <section className="panel confidence-panel">
        <div className="panel-title"><div><h2>Confianza de la evidencia</h2><p>Calidad, cobertura y frescura</p></div></div>
        <div className="donut-wrap"><ResponsiveContainer width="55%" height={220}><PieChart><Pie data={metrics.confidence} innerRadius={62} outerRadius={88} dataKey="value" stroke="white" strokeWidth={4}>{metrics.confidence.map((_, i) => <Cell key={i} fill={["#3367d6","#9b7de3","#d6dbe6"][i]}/>)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><strong>{metrics.sufficient}%</strong><span>evidencia suficiente</span></div><div className="legend">{metrics.confidence.map((item, i) => <span key={item.name}><i style={{ background: ["#3367d6","#9b7de3","#d6dbe6"][i] }}/>{item.name}<b>{item.value}</b></span>)}</div></div>
      </section>
      <section className="panel opportunities">
        <div className="panel-title"><div><h2>Oportunidades explicables</h2><p>Priorizadas por correspondencia de necesidad, no por riesgo</p></div><button className="text-button" onClick={() => onNavigate("profiles")}>Ver todos <ArrowRight size={15}/></button></div>
        <div className="table-wrap"><table><thead><tr><th>Perfil</th><th>Necesidad</th><th>Mayor afinidad</th><th>Confianza</th><th></th></tr></thead><tbody>{opportunities.map(({ profile, result }) => <tr key={profile.id} onClick={() => onOpen(profile)}><td><div className="person-cell"><span className="avatar small">{profile.fullName.split(" ").map((n) => n[0]).slice(0,2).join("")}</span><div><strong>{profile.fullName}</strong><small>{documentLabel(profile.documentNumber)}</small></div></div></td><td><span className="need-tag">{profile.needs[0]}</span></td><td><strong>{getProduct(result.productId).shortName}</strong><div className="mini-bar"><i style={{ width: `${result.affinityScore}%` }}/></div></td><td><span className="confidence-tag">{result.confidence}%</span></td><td><ChevronRight size={17}/></td></tr>)}</tbody></table></div>
      </section>
      <section className="panel alerts">
        <div className="panel-title"><div><h2>Atención prioritaria</h2><p>Alertas accionables</p></div></div>
        <button onClick={() => onNavigate("reviews")}><span className="alert-icon violet"><AlertTriangle/></span><div><strong>{alerts.noConsent} {alerts.noConsent === 1 ? "perfil" : "perfiles"} sin consentimiento</strong><small>Bloqueados para uso comercial</small></div><ChevronRight/></button>
        <button onClick={() => onNavigate("reviews")}><span className="alert-icon amber"><RefreshCw/></span><div><strong>{alerts.stale} {alerts.stale === 1 ? "fuente desactualizada" : "fuentes desactualizadas"}</strong><small>Requieren nueva verificación</small></div><ChevronRight/></button>
        <button onClick={() => onNavigate("reviews")}><span className="alert-icon rose"><ShieldCheck/></span><div><strong>{alerts.sensitive} {alerts.sensitive === 1 ? "dato sensible bloqueado" : "datos sensibles bloqueados"}</strong><small>Excluidos automáticamente</small></div><ChevronRight/></button>
      </section>
    </div>
  </>;
}

function Kpi({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: typeof UsersRound }) {
  return <article className="kpi"><span className="kpi-icon"><Icon/></span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}

function ScenarioShowcase({ profiles, onOpen, juryMode = false, onShowImpact, onReset }: { profiles: Profile[]; onOpen: (profile: Profile) => void; juryMode?: boolean; onShowImpact: () => void; onReset: () => void }) {
  const featured = JURY_PROFILE_IDS.map((id) => profiles.find((profile) => profile.id === id)).filter((profile): profile is Profile => Boolean(profile));
  const outputs = featured.map((profile) => {
    const result = calculateAllAffinities(profile)[0]!;
    return { profile, result, offer: buildPersonalizedOffer(profile, result) };
  });
  return <>
    {juryMode && <section className="jury-story">
      <div><small>ORIENTACIÓN PERSONALIZADA</small><h2>Un dato demográfico no explica qué necesita una persona hoy.</h2><p>Creasy conecta su objetivo declarado con señales propias autorizadas para orientar una conversación relevante.</p></div>
      <ol><li><span>Meta</span> Qué quiere lograr</li><li><span>Evidencia</span> Qué señales lo sustentan</li><li><span>Preferencias</span> Cuándo y cómo continuar</li></ol>
    </section>}
    <SectionHeader eyebrow="ORIENTACIONES PERSONALIZADAS" title="Tres personas, tres orientaciones realmente diferentes" text="Primero aparece la meta humana; después, producto, momento y canal. El índice expresa afinidad, nunca aprobación, riesgo o capacidad de pago." action={<div className="scenario-actions"><button className="button button-secondary" onClick={onReset}><RefreshCw/> Reiniciar casos</button><button className="button button-primary" onClick={onShowImpact}>Ver indicadores <ArrowRight/></button></div>}/>
    <section className="scenario-proof">
      <div><strong>{outputs.length}</strong><span>casos comparables</span></div>
      <div><strong>{new Set(outputs.map((item) => item.result.productId)).size}</strong><span>productos con mayor afinidad</span></div>
      <div><strong>{new Set(outputs.map((item) => item.offer.channel)).size}</strong><span>canales elegidos</span></div>
      <div><strong>3+</strong><span>señales por recomendación</span></div>
    </section>
    <div className="scenario-grid">{outputs.map(({ profile, result, offer }, index) => <article key={profile.id} className="scenario-card">
      <header><span className="scenario-number">0{index + 1}</span><div><small>Categoría {profile.category} · {profile.city}</small><h2>{profile.fullName}</h2><p>{profile.ageRange} · {profile.occupation}</p></div><button className="icon-button" aria-label={`Abrir detalle de ${profile.fullName}`} onClick={() => onOpen(profile)}><ChevronRight/></button></header>
      <div className="scenario-goal"><small>Su objetivo</small><strong>{offer.detectedNeed}</strong><p>{profile.lifeEvent}</p></div>
      <div className="scenario-product"><span aria-label={`Afinidad ${result.affinityScore} de 100`}>{result.affinityScore}/100 <i>afinidad</i></span><small>Producto con mayor correspondencia</small><h3>{getProduct(result.productId).name}</h3><p>{getProduct(result.productId).objective}</p></div>
      <div className="scenario-delivery">
        <div><small>Por qué ahora</small><strong>{offer.timing}</strong></div>
        <div><small>Por qué este canal</small><strong>{offer.channelLabel}</strong><span>Preferencia declarada · {offer.timeBandLabel}</span></div>
      </div>
      <div className="scenario-signals"><h4>Señales trazables que sustentan la orientación</h4>{profile.evidence.filter((evidence) => evidence.evidenceStatus === "VIGENTE").slice(0, 3).map((evidence) => <article key={evidence.id}>
        <Check/><div><strong>{evidence.label}: {evidence.value}</strong><span>{evidence.sourceName} · verificada {new Date(evidence.lastVerifiedAt).toLocaleDateString("es-CO")} · confianza {Math.round(evidence.confidence * 100)} %</span></div>
      </article>)}</div>
      <div className="scenario-controls">
        <p><CircleHelp/><span><strong>Falta confirmar</strong>{result.missingSignals[0]}</span></p>
        <p><ShieldCheck/><span><strong>Se excluyó</strong>{result.excludedSignals[index % result.excludedSignals.length]}</span></p>
        <small>Regla {result.ruleVersion} · cálculo determinista · revisión humana obligatoria</small>
      </div>
      <ChannelPreview
        compact
        channel={offer.channel}
        firstName={profile.fullName.split(" ")[0] ?? "Hola"}
        productName={getProduct(result.productId).name}
        message={offer.message}
        timeBand={profile.preferences?.preferredTimeBand}
      />
      <footer><span><ClipboardCheck/> Siguiente acción: {offer.nextStep}</span><button onClick={() => onOpen(profile)}>Abrir revisión humana <ArrowRight/></button></footer>
    </article>)}</div>
    <section className="scenario-safety"><ShieldCheck/><div><strong>Lo que Creasy no usa</strong><p>DataCrédito, burós externos, género o edad como decisión adversa, tasas inventadas ni datos reales de terceros.</p></div></section>
  </>;
}

export function LiveContextDemo({
  onOpen,
  flash,
  log,
}: {
  onOpen: (profile: Profile) => void;
  flash: (message: string) => void;
  log: (action: string, detail: string, actor?: string) => void;
}) {
  const [profile, setProfile] = useState(() => createLiveContextDemoProfile());
  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const summary = useMemo(() => summarizeLiveContext(profile), [profile]);
  const top = useMemo(() => calculateAllAffinities(profile)[0]!, [profile]);
  const detected = summary.status === "CONTEXTO_DETECTADO";

  const simulate = () => {
    if (simulating || detected) return;
    setSimulating(true);
    window.setTimeout(() => {
      const next = applyHousingContextScenario(profile);
      setProfile(next);
      setSimulating(false);
      log(
        "LIVE_CONTEXT_UPDATED",
        "Tres señales propias autorizadas actualizaron el contexto sin solicitar un formulario",
        "Motor de contexto demo"
      );
      flash("Nuevo contexto detectado: interés activo en vivienda");
    }, 700);
  };

  const reset = () => {
    setProfile(createLiveContextDemoProfile());
    setFeedback("");
    log(
      "LIVE_CONTEXT_RESET",
      "Escenario de perfil vivo restablecido",
      "Motor de contexto demo"
    );
    flash("Escenario listo para volver a demostrar");
  };

  const registerFeedback = (value: string) => {
    setFeedback(value);
    log(
      "CONTEXT_FEEDBACK",
      `Confirmación opcional registrada: ${value}`,
      "Titular demo"
    );
    flash("La confirmación quedó registrada sin abrir un formulario");
  };

  return <>
    <SectionHeader
      eyebrow="HIPERPERSONALIZACIÓN SIN FRICCIÓN"
      title="Creasy entiende el cambio sin poner al cliente a diligenciar formularios"
      text="Esta prueba convierte actividad propia, reciente y autorizada en contexto accionable. No usa navegación externa, redes sociales ni datos de terceros."
      action={detected ? <button className="button button-secondary" onClick={reset}><RefreshCw size={16}/> Reiniciar prueba</button> : undefined}
    />
    <section className="pulse-consent">
      <ShieldCheck/>
      <div>
        <strong>Personalización comportamental autorizada</strong>
        <p>Alcance: actividad dentro de canales propios de Colsubsidio · retención demo de 30 días · revocable.</p>
      </div>
      <span>Vigente</span>
    </section>

    <div className="pulse-journey">
      <section className="pulse-person">
        <header>
          <span className="avatar large">CR</span>
          <div><small>CATEGORÍA {profile.category} · {profile.city}</small><h2>{profile.fullName}</h2><p>{profile.housingStatus} · canal habitual: portal</p></div>
        </header>
        <div className="pulse-before">
          <small>CONTEXTO INICIAL</small>
          <strong>Solo datos básicos</strong>
          <p>Creasy no adivina una necesidad cuando no existe evidencia suficiente.</p>
          <span><Info/> Sin recomendación comercial activa</span>
        </div>
        <div className="pulse-transition">
          <i className={detected ? "complete" : ""}/>
          <div>
            <strong>Motor de contexto de primera parte</strong>
            <small>Recencia + consistencia + intensidad + consentimiento</small>
          </div>
        </div>
        <button className="button button-primary pulse-trigger" onClick={simulate} disabled={simulating || detected}>
          {simulating ? <><RefreshCw className="spin" size={17}/> Analizando actividad reciente…</> : detected ? <><Check size={17}/> Contexto actualizado automáticamente</> : <><Activity size={17}/> Simular actividad propia autorizada</>}
        </button>
      </section>

      <section className={`pulse-result ${detected ? "is-detected" : ""}`}>
        {!detected ? <div className="pulse-empty">
          <Activity/>
          <h2>Esperando señales consistentes</h2>
          <p>Una visita aislada no cambia el perfil. Creasy necesita varias señales recientes y relacionadas.</p>
          <div><span>Producto</span><strong>Por determinar</strong></div>
          <div><span>Confianza</span><strong>0 %</strong></div>
          <div><span>Acción</span><strong>No contactar</strong></div>
        </div> : <>
          <div className="pulse-detected-head"><span><Sparkles/> CAMBIO DE CONTEXTO DETECTADO</span><strong>{summary.confidence}% confianza</strong></div>
          <div className="pulse-product">
            <small>NUEVA RECOMENDACIÓN CONTEXTUAL</small>
            <h2>{summary.productName}</h2>
            <p>{summary.explanation}</p>
            <div className="pulse-score"><span>Afinidad</span><i><b style={{ width: `${top.affinityScore}%` }}/></i><strong>{top.affinityScore}/100</strong></div>
          </div>
          <div className="pulse-delivery-grid">
            <div><small>MOMENTO</small><strong>{summary.timing}</strong></div>
            <div><small>CANAL</small><strong>{summary.channelLabel}</strong></div>
            <div><small>SIGUIENTE ACCIÓN</small><strong>{summary.nextAction}</strong></div>
          </div>
          <div className="pulse-message"><small>MENSAJE ADAPTADO</small><p>“Vimos que estás explorando opciones de vivienda. Cuando regreses al portal podrás continuar tu simulación, sin empezar de nuevo.”</p></div>
          <button className="text-button" onClick={() => onOpen(profile)}>Abrir perfil y revisar toda la trazabilidad <ArrowRight/></button>
        </>}
      </section>
    </div>

    <section className="pulse-signals-panel">
      <div className="pulse-signals-head"><div><span>SEÑALES AUTOMÁTICAS</span><h2>Lo que cambió la recomendación</h2></div><small>{detected ? `${summary.signals.filter((signal) => signal.status === "VIGENTE").length} señales vigentes` : "Ninguna señal registrada"}</small></div>
      {detected ? <div className="pulse-signal-list">{summary.signals.map((signal, index) => <article key={signal.id}>
        <span className="pulse-signal-number">0{index + 1}</span>
        <div><strong>{signal.label}</strong><p>Canal propio · finalidad de personalización autorizada</p></div>
        <span>{signal.freshnessLabel}</span>
        <b>{Math.round(signal.confidence * 100)} %</b>
        <i className="ok-tag">{signal.status}</i>
      </article>)}</div> : <div className="pulse-no-signals"><Database/><p>Pulsa “Simular actividad propia autorizada” para generar el recorrido.</p></div>}
    </section>

    {detected && <section className="pulse-feedback">
      <div><small>CONFIRMACIÓN OPCIONAL · UN SOLO TOQUE</small><h3>¿Esta recomendación corresponde a tu momento actual?</h3><p>La personalización ya ocurrió automáticamente. Esta respuesta solo ayuda a corregirla.</p></div>
      <div>{["Sí, me interesa", "Más adelante", "No corresponde"].map((item) => <button key={item} className={feedback === item ? "selected" : ""} onClick={() => registerFeedback(item)}>{feedback === item && <Check/>}{item}</button>)}</div>
    </section>}

    <section className="scenario-safety"><ShieldCheck/><div><strong>Control explícito</strong><p>Sin consentimiento, con señales vencidas o con evidencia insuficiente, Creasy excluye la actividad y no activa una recomendación comercial.</p></div></section>
  </>;
}

function Profiles({ profiles, onOpen, onNew }: { profiles: Profile[]; onOpen: (p: Profile) => void; onNew: () => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const visible = profiles.filter((p) => {
    if (!`${p.fullName} ${p.city} ${p.needs.join(" ")}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "consentimiento") return p.consent;
    if (filter === "sin-consentimiento") return !p.consent;
    if (filter === "revision") return calculateAllAffinities(p)[0]!.requiresHumanReview;
    return true;
  });
  return <>
    <SectionHeader eyebrow="PERFILES" title="Necesidades en contexto" text="Explora datos consentidos, evidencia y afinidades sin convertirlas en decisiones de crédito." action={<button className="button button-primary" onClick={onNew}><Plus size={17}/> Nuevo perfil</button>}/>
    <div className="toolbar">
      <label className="search-box"><Search/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, ciudad o necesidad…"/></label>
      <select className="filter-select" aria-label="Filtrar perfiles" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="todos">Todos</option>
        <option value="consentimiento">Con consentimiento</option>
        <option value="sin-consentimiento">Sin consentimiento</option>
        <option value="revision">Requieren revisión</option>
      </select>
      <span>{visible.length} perfiles</span>
    </div>
    <div className="profile-grid">{visible.map((profile) => {
      const top = calculateAllAffinities(profile)[0]!;
      return <article className="profile-card" key={profile.id} onClick={() => onOpen(profile)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(profile)}>
        <div className="profile-card-head"><span className="avatar">{profile.fullName.split(" ").map((n) => n[0]).slice(0,2).join("")}</span><div><h3>{profile.fullName}</h3><p>{profile.city} · Categoría {profile.category ?? "sin declarar"} · {documentLabel(profile.documentNumber)}</p></div><ChevronRight/></div>
        <div className="profile-flags"><span className={profile.consent ? "ok-tag" : "warning-tag"}>{profile.consent ? <Check/> : <AlertTriangle/>}{profile.consent ? "Consentimiento vigente" : "Sin consentimiento"}</span><span className="synthetic-tag">synthetic: true</span></div>
        <div className="profile-need"><small>Necesidad principal</small><strong>{profile.needs[0] ?? "Sin necesidades declaradas"}</strong></div>
        <div className="affinity-line"><div><small>Mayor afinidad</small><strong>{getProduct(top.productId).name}</strong></div><span>{top.affinityScore}</span></div>
        <div className="affinity-track"><i style={{ width: `${top.affinityScore}%` }}/></div>
        <footer><span><Database/> {profile.evidence.length} evidencias</span><span>Confianza {top.confidence}%</span></footer>
      </article>;
    })}</div>
    {visible.length === 0 && <div className="empty-state"><Search/><h3>Sin resultados</h3><p>Ajusta la búsqueda o el filtro, o crea un nuevo perfil con datos declarados.</p></div>}
  </>;
}

const NEED_OPTIONS = ["educación", "posgrado", "estudios de hijo", "comprar vivienda", "cuota inicial", "remodelación", "consolidar obligaciones", "simplificar pagos", "impuestos", "seguros", "proyecto personal", "emprendimiento", "tecnología", "disponibilidad reutilizable", "gastos familiares"];

const profileFormSchema = z.object({
  fullName: z.string().min(3, "Mínimo 3 caracteres").max(120),
  documentType: z.enum(["CC", "CE", "PPT"]),
  documentNumber: z.string().regex(/^[A-Za-z0-9]{5,20}$/, "Entre 5 y 20 caracteres alfanuméricos"),
  city: z.string().min(2, "Ciudad requerida").max(80),
  category: z.enum(["A", "B", "C", "D"]),
  gender: z.enum(["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY"], {
    errorMap: () => ({ message: "Selecciona una opción de género declarado" }),
  }),
  email: z.string().email("Correo inválido").max(120).optional().or(z.literal("")),
  phone: z.string().regex(/^\d{7,12}$/, "Solo dígitos (7–12)").optional().or(z.literal("")),
  contractType: z.string().max(40),
  tenureMonths: z.preprocess((v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? undefined : Number(v)), z.number().int().min(0).max(600).optional()),
  incomeRange: z.string().max(20),
  occupation: z.string().max(60).optional(),
  needs: z.array(z.string()).min(1, "Selecciona al menos una necesidad"),
  otherNeed: z.string().max(120).optional(),
  declaredObligations: z.boolean(),
  consent: z.boolean(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfileForm({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Profile) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { documentType: "CC", category: "A", contractType: "Indefinido", incomeRange: "", needs: [], declaredObligations: false, consent: true },
  });
  const submit = handleSubmit(async (values) => {
    const needs = [...values.needs, ...(values.otherNeed?.trim() ? [values.otherNeed.trim().toLowerCase()] : [])].slice(0, 12);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const profile: Profile = {
      id,
      fullName: values.fullName,
      documentType: values.documentType,
      documentNumber: values.documentNumber,
      city: values.city,
      email: values.email ?? "",
      phone: values.phone ?? "",
      affiliation: "Pendiente",
      category: values.category,
      gender: values.gender,
      contractType: values.contractType,
      tenureMonths: values.tenureMonths,
      incomeRange: values.incomeRange || undefined,
      occupation: values.occupation || undefined,
      declaredGoal: needs[0],
      lifeEvent: `Necesidad declarada: ${needs[0]}`,
      goalHorizon: "EXPLORING",
      urgency: "LOW",
      serviceUsage: [needs[0]!],
      digitalInteractions: [],
      declaredInterests: needs.slice(0, 3),
      needs,
      declaredObligations: values.declaredObligations,
      consent: values.consent,
      consentPurpose: values.consent ? "Perfilamiento de afinidad y contacto asesorado" : "No autorizada",
      consentDate: values.consent ? now : undefined,
      synthetic: true,
      origin: "ADVISOR_FORM",
      preferences: { interestedProductIds: [], horizon: "EXPLORING", preferredChannel: "IN_APP", preferredTimeBand: "WEEKDAY_MORNING", maxContactFrequency: "ONCE_MONTH", wantsAdvisor: true },
      consents: values.consent ? [
        { id: `consent-${id}-guidance`, purpose: "GUIDANCE", scope: "Orientación de afinidad", noticeVersion: "creasy-privacy-2026.07", grantedAt: now, source: "ADVISOR_FORM", status: "GRANTED", channels: [], synthetic: true },
        { id: `consent-${id}-contact`, purpose: "COMMERCIAL_CONTACT", scope: "Contacto dentro del portal", noticeVersion: "creasy-privacy-2026.07", grantedAt: now, source: "ADVISOR_FORM", status: "GRANTED", channels: ["IN_APP"], synthetic: true },
      ] : [],
      evidence: declaredEvidence(needs, "Formulario del afiliado", `FORM-${id.slice(0, 8)}`, values.consent),
    };
    // Registro paralelo en la API demo (auditoría de servidor); la UI no depende de la respuesta.
    void fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: values.fullName, documentType: values.documentType, documentNumber: values.documentNumber, city: values.city, category: values.category, gender: values.gender, email: values.email || undefined, phone: values.phone || undefined, needs, declaredObligations: values.declaredObligations, tenureMonths: values.tenureMonths, contractType: values.contractType, incomeRange: values.incomeRange || undefined, occupation: values.occupation || undefined, consent: values.consent }),
    }).catch(() => {});
    onCreate(profile);
  });
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Nuevo perfil">
    <form className="form-modal" onSubmit={submit} noValidate>
      <div className="form-head"><div><span className="eyebrow">ANÁLISIS INDIVIDUAL</span><h2>Nuevo perfil declarado</h2><p>Los campos financieros son opcionales y siempre se tratan como declarados por la persona.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar formulario"><X/></button></div>
      <div className="form-grid">
        <label className="field"><span>Nombre completo *</span><input {...register("fullName")} placeholder="Nombre ficticio"/>{errors.fullName && <em>{errors.fullName.message}</em>}</label>
        <label className="field"><span>Tipo de documento *</span><select {...register("documentType")}><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="PPT">PPT</option></select></label>
        <label className="field"><span>Número de documento *</span><input {...register("documentNumber")} placeholder="Usa datos de ejemplo"/>{errors.documentNumber && <em>{errors.documentNumber.message}</em>}</label>
        <label className="field"><span>Ciudad *</span><input {...register("city")} placeholder="Bogotá"/>{errors.city && <em>{errors.city.message}</em>}</label>
        <label className="field"><span>Categoría individual *</span><select {...register("category")}><option value="A">A · Hasta 2 SMMLV</option><option value="B">B · Más de 2 y hasta 4 SMMLV</option><option value="C">C · Más de 4 SMMLV</option><option value="D">D · Persona no afiliada</option></select></label>
        <label className="field"><span>Género declarado *</span><select {...register("gender")} defaultValue=""><option value="" disabled>Selecciona una opción</option><option value="WOMAN">Mujer</option><option value="MAN">Hombre</option><option value="NON_BINARY">No binario</option><option value="PREFER_NOT_TO_SAY">Prefiero no responder</option></select>{errors.gender && <em>{errors.gender.message}</em>}<small>No se infiere por el nombre; solo valida Crédito Mujer.</small></label>
        <label className="field"><span>Correo (opcional)</span><input {...register("email")} placeholder="persona@ejemplo.test"/>{errors.email && <em>{errors.email.message}</em>}</label>
        <label className="field"><span>Teléfono (opcional)</span><input {...register("phone")} placeholder="3005550000"/>{errors.phone && <em>{errors.phone.message}</em>}</label>
        <label className="field"><span>Tipo de contrato</span><select {...register("contractType")}><option>Indefinido</option><option>Término fijo</option><option>Prestación de servicios</option><option>Independiente</option></select></label>
        <label className="field"><span>Antigüedad laboral (meses, declarada)</span><input type="number" min={0} {...register("tenureMonths")} placeholder="Ej. 14"/>{errors.tenureMonths && <em>{String(errors.tenureMonths.message)}</em>}</label>
        <label className="field"><span>Rango de ingresos (declarado, opcional)</span><select {...register("incomeRange")}><option value="">Prefiero no declararlo</option><option>1–2 SMMLV</option><option>2–4 SMMLV</option><option>4–6 SMMLV</option><option>Más de 6 SMMLV</option></select></label>
        <label className="field"><span>Ocupación o sector (opcional)</span><input {...register("occupation")} placeholder="Servicios, tecnología…"/></label>
      </div>
      <fieldset className="needs-field"><legend>Necesidades e intereses declarados *</legend>
        <div className="needs-grid">{NEED_OPTIONS.map((need) => <label key={need} className="need-chip"><input type="checkbox" value={need} {...register("needs")}/><span>{need}</span></label>)}</div>
        <label className="field"><span>Otra necesidad o proyecto</span><input {...register("otherNeed")} placeholder="Descríbelo en pocas palabras"/></label>
        {errors.needs && <em className="field-error">{errors.needs.message}</em>}
      </fieldset>
      <div className="consent-rows">
        <label className="check-row"><input type="checkbox" {...register("declaredObligations")}/><span><strong>Declara obligaciones vigentes con otras entidades.</strong> Solo se usa si la persona lo informa; nunca se obtiene por scraping.</span></label>
        <label className="check-row"><input type="checkbox" {...register("consent")}/><span><strong>Autoriza el tratamiento para perfilamiento de afinidad y contacto asesorado.</strong> Sin consentimiento, el perfil queda bloqueado para uso comercial.</span></label>
      </div>
      <div className="form-actions"><small><ShieldCheck size={14}/> Entorno demostrativo: usa únicamente datos de ejemplo.</small><div><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" disabled={isSubmitting}><Plus size={16}/> Crear y analizar</button></div></div>
    </form>
  </div>;
}

function ProfileDetail({ profile, onClose, onUpdate, flash, log }: { profile: Profile; onClose: () => void; onUpdate: (p: Profile) => void; flash: (s: string) => void; log: (a: string, d: string, actor?: string) => void }) {
  const [tab, setTab] = useState<"affinity" | "evidence" | "behavior" | "privacy">("affinity");
  const [compare, setCompare] = useState(false);
  const results = calculateAllAffinities(profile);
  const top = results[0]!;
  const nextBestAction = buildNextBestAction(profile, top);
  const contactPolicy = evaluateContactPolicy(profile);
  const exportReport = () => {
    const html = `<html><head><title>Reporte ${profile.id}</title><style>body{font-family:Arial;padding:48px;color:#30302f}h1,h2{color:#0067b1}.box{padding:16px;border:1px solid #ddd;margin:16px 0}.nba{border-left:8px solid #ffd000}</style></head><body><h1>Creasy para Colsubsidio</h1><p>Reporte anonimizado · ${new Date().toLocaleDateString("es-CO")} · regla ${top.ruleVersion}</p><div class="box"><b>${profile.fullName.split(" ")[0]} ${profile.fullName.split(" ")[1]?.[0] ?? ""}.</b><p>Documento ${documentLabel(profile.documentNumber)} · Consentimiento: ${profile.consent ? "vigente" : "no vigente"}</p></div><h2>${getProduct(top.productId).name}: ${top.affinityScore}/100</h2><p>${top.positiveSignals.join(". ") || "Sin señales suficientes."}</p><p><b>Faltantes:</b> ${top.missingSignals.join("; ")}</p><div class="box nba"><b>Siguiente mejor acción: ${nextBestAction.advisorActionLabel}</b><p>${nextBestAction.moment}</p><p>Canal: ${nextBestAction.channelLabel}. Revisión humana obligatoria.</p></div><p>${BRAND.disclaimer}</p><p>Entorno de demostración diseñado con privacidad desde el diseño y sujeto a validación jurídica, operativa y de riesgo antes de utilizar datos reales o tomar decisiones financieras.</p><small>Datos de ejemplo · confianza ${top.confidence}%</small></body></html>`;
    const win = window.open("", "_blank"); if (win) { win.document.write(html); win.document.close(); win.print(); }
    log("EXPORT", `Reporte individual del perfil ${profile.id.slice(0, 8)} exportado (anonimizado)`);
  };
  const exportOwnData = () => {
    const payload = {
      titular: profile.fullName,
      documento: documentLabel(profile.documentNumber),
      ciudad: profile.city,
      necesidadesDeclaradas: profile.needs,
      consentimiento: { estado: profile.consent ? "VIGENTE" : "NO VIGENTE", finalidad: profile.consentPurpose, fecha: profile.consentDate ?? null },
      evidencia: profile.evidence.map((e) => ({ dato: e.label, valor: e.value, fuente: e.sourceName, naturaleza: e.dataNature, capturado: e.capturedAt })),
      synthetic: true,
      nota: "Exportación demo de los datos del titular. No incluye identificadores completos.",
    };
    download(`mis-datos-${profile.id.slice(0, 8)}.json`, JSON.stringify(payload, null, 2), "application/json");
    log("EXPORT", `El titular exportó sus datos (perfil ${profile.id.slice(0, 8)})`, "Titular demo");
    flash("Datos del titular exportados en modo demo");
  };
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Detalle del perfil"><div className="detail-drawer">
    <div className="drawer-head"><button className="icon-button" onClick={onClose} aria-label="Cerrar detalle"><X/></button><span className="synthetic-label"><ShieldCheck/> Datos de ejemplo</span><button className="button button-secondary" onClick={exportReport}><Download size={16}/> Exportar reporte</button></div>
    <div className="profile-hero"><span className="avatar large">{profile.fullName.split(" ").map((n) => n[0]).slice(0,2).join("")}</span><div><h2>{profile.fullName}</h2><p>{profile.city}{profile.email ? ` · ${maskEmail(profile.email)}` : ""}{profile.phone ? ` · ${maskPhone(profile.phone)}` : ""}</p><span className={profile.consent ? "ok-tag" : "warning-tag"}>{profile.consent ? <Check/> : <AlertTriangle/>}{profile.consent ? "Consentimiento vigente" : "Uso comercial bloqueado"}</span></div></div>
    <div className="drawer-tabs"><button className={tab === "affinity" ? "active" : ""} onClick={() => setTab("affinity")}>Afinidad</button><button className={tab === "evidence" ? "active" : ""} onClick={() => setTab("evidence")}>Evidencia</button><button className={tab === "behavior" ? "active" : ""} onClick={() => setTab("behavior")}>Comportamiento</button><button className={tab === "privacy" ? "active" : ""} onClick={() => setTab("privacy")}>Privacidad</button></div>
    <div className="drawer-body">
      {tab === "affinity" && <>
        <section className="top-recommendation"><div className="score-orb"><strong>{top.affinityScore}</strong><small>/100</small></div><div><span>Mayor correspondencia</span><h2>{getProduct(top.productId).name}</h2><p>{top.affinityLevel} · confianza {top.confidence}%</p></div><span className="review-badge"><Eye/> Revisión humana</span></section>
        <section className="next-best-action"><div><small>Siguiente mejor acción explicable</small><h3>{nextBestAction.advisorActionLabel}</h3><p>{nextBestAction.moment}</p></div><div><span>Canal: <strong>{nextBestAction.channelLabel}</strong></span><span className={contactPolicy.allowed ? "ok-tag" : "warning-tag"}>{contactPolicy.label}</span></div>{!contactPolicy.allowed && <ul>{contactPolicy.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}</section>
        <section className="profile-context"><div><small>Categoría individual</small><strong>{profile.category ?? "No declarada"}</strong></div><div><small>Género declarado</small><strong>{{ WOMAN: "Mujer", MAN: "Hombre", NON_BINARY: "No binario", PREFER_NOT_TO_SAY: "Prefiere no responder" }[profile.gender ?? "PREFER_NOT_TO_SAY"]}</strong></div><div><small>Meta</small><strong>{profile.declaredGoal ?? "Por confirmar"}</strong></div><div><small>Momento de vida</small><strong>{profile.lifeEvent ?? "Por confirmar"}</strong></div></section>
        <div className="explain-grid"><section><h3><Check/> ¿Por qué aparece?</h3>{top.positiveSignals.length ? top.positiveSignals.map((s) => <p key={s}>{s}</p>) : <p>No existe evidencia suficiente.</p>}</section><section><h3><CircleHelp/> ¿Qué falta?</h3>{top.missingSignals.map((s) => <p key={s}>{s}</p>)}</section></div>
        <ScoreBreakdown result={top}/>
        {top.contradictorySignals.length > 0 && <section className="contradiction-box"><h3><AlertTriangle/> Contradicciones detectadas</h3>{top.contradictorySignals.map((s) => <p key={s}>{s}</p>)}</section>}
        <section className="excluded-box"><h3><ShieldCheck/> Señales excluidas</h3>{top.excludedSignals.map((s) => <span key={s}>{s}</span>)}</section>
        <section className="eligibility-box"><h3>Elegibilidad preliminar (separada de la afinidad)</h3>{top.eligibility.map((e) => <div key={e.label}><span>{e.label}</span><b className={`elig elig-${e.status.toLowerCase()}`}>{e.status.replaceAll("_", " ")}</b></div>)}<small>Nunca se muestra “rechazado”: todo requisito no comprobado queda sujeto a validación oficial.</small></section>
        <div className="alternatives-head"><h3>Alternativas</h3><button className="text-button" onClick={() => setCompare(!compare)}><Layers3/> {compare ? "Cerrar comparación" : "Comparar 3 productos"}</button></div>
        {compare ? <div className="compare-grid">{results.slice(0,3).map((r) => <article key={r.productId}><small>{getProduct(r.productId).objective}</small><h3>{getProduct(r.productId).name}</h3><strong>{r.affinityScore}</strong><p>{r.positiveSignals[0] ?? "No existe evidencia suficiente"}</p><p className="compare-missing">Falta: {r.missingSignals[0]}</p><span>Sujeto a revisión humana</span></article>)}</div> : <div className="ranking">{results.slice(1,4).map((r) => <div key={r.productId}><span>{getProduct(r.productId).name}{r.dismissal && <em>{r.dismissal}</em>}</span><i><b style={{ width: `${r.affinityScore}%` }}/></i><strong>{r.affinityScore}</strong></div>)}</div>}
        <section className="questions-box"><h3><Bot/> Preguntas sugeridas para el asesor</h3><ul>{buildAdvisorQuestions(profile).map((q) => <li key={q}>{q}</li>)}</ul></section>
        <section className="disclaimer"><Info/><p>{BRAND.disclaimer}</p></section>
      </>}
      {tab === "evidence" && <div className="timeline">{profile.evidence.length ? profile.evidence.map((ev) => <article key={ev.id}><span className="timeline-dot"/><div><div><h3>{ev.label}</h3><span className={ev.evidenceStatus === "VIGENTE" ? "ok-tag" : "warning-tag"}>{ev.evidenceStatus}</span></div><strong>{ev.value}</strong><p>{ev.sourceName} · {ev.sourceReference}</p><small>{ev.dataNature} · confianza {Math.round(ev.confidence * 100)}% · verificado {new Date(ev.lastVerifiedAt).toLocaleDateString("es-CO")}</small></div></article>) : <div className="empty-state"><Database/><h3>Sin evidencia registrada</h3><p>La ausencia de información no se interpreta como riesgo: solo reduce la confianza.</p></div>}</div>}
      {tab === "behavior" && <div className="timeline">{profile.behaviorEvents?.length ? profile.behaviorEvents.map((event) => <article key={event.id}><span className="timeline-dot"/><div><div><h3>{event.type.replaceAll("_", " ")}</h3><span className="synthetic-tag">Primera parte · demo</span></div><p>Finalidad autorizada: {event.authorizedPurpose}</p><small>{new Date(event.occurredAt).toLocaleString("es-CO")} · retención {event.retentionClass}</small></div></article>) : <div className="empty-state"><Activity/><h3>Sin eventos autorizados</h3><p>No se registra navegación externa ni actividad sin una finalidad autorizada.</p></div>}</div>}
      {tab === "privacy" && <div className="privacy-panel"><ShieldCheck/><h2>Centro de privacidad</h2><p>Autorizaciones vigentes: {profile.consents?.filter((c) => c.status === "GRANTED").length ?? (profile.consent ? 1 : 0)} · Exclusión de contacto: {profile.rneExcluded ? "activa" : "no registrada"}</p><div className="consent-records">{profile.consents?.map((record) => <div key={record.id}><strong>{record.purpose.replaceAll("_", " ")}</strong><span className={record.status === "GRANTED" ? "ok-tag" : "warning-tag"}>{record.status}</span><small>{record.scope} · aviso {record.noticeVersion}</small></div>)}</div><div className="privacy-actions"><button className="button button-secondary" onClick={exportOwnData}><Download/> Exportar mis datos</button><button className="button button-secondary" onClick={() => { log("RECTIFICATION_REQUESTED", `Solicitud de rectificación registrada (perfil ${profile.id.slice(0, 8)})`, "Titular"); flash("Solicitud de rectificación registrada"); }}><RefreshCw/> Actualizar preferencias</button><button className="button button-danger" disabled={!profile.consent} onClick={() => { const now = new Date().toISOString(); const next = { ...profile, consent: false, consentPurpose: "Revocada por el titular", commercialContactBlocked: true, consents: profile.consents?.map((c) => ({ ...c, status: "REVOKED" as const, revokedAt: now })) }; onUpdate(next); log("CONSENT_REVOKED", `Consentimientos revocados por el titular (perfil ${profile.id.slice(0, 8)})`, "Titular"); flash("Autorizaciones revocadas. Uso comercial bloqueado."); }}><X/> Revocar autorizaciones</button></div><small>Entorno de demostración diseñado con privacidad desde el diseño y sujeto a validación jurídica, operativa y de riesgo antes de utilizar datos reales o tomar decisiones financieras.</small></div>}
    </div>
    <div className="drawer-footer"><button className="button button-secondary" onClick={() => { log("HUMAN_REVIEW", `Caso ${profile.id.slice(0, 8)} devuelto para completar información`); flash("Caso devuelto para completar información"); }}>Solicitar información</button><button className="button button-primary" onClick={() => { log("HUMAN_REVIEW", `Caso ${profile.id.slice(0, 8)} enviado a revisión humana`); flash("Caso enviado a revisión humana. No implica aprobación de crédito."); }}><ClipboardCheck/> Enviar a revisión</button></div>
  </div></div>;
}

const CONTRIBUTION_LABELS: Record<string, string> = {
  goal: "Meta declarada",
  behavior: "Interacción propia autorizada",
  services: "Uso de servicios",
  interests: "Intereses declarados",
  moment: "Momento de vida",
};

/**
 * El recibo del puntaje.
 *
 * El reto pide que la explicación corresponda con la lógica real, y la única
 * forma de probarlo es enseñar las cuentas: cuánto puso cada familia de
 * señales, qué término del catálogo la hizo coincidir y qué se descontó. Si la
 * suma no da, se ve.
 */
function ScoreBreakdown({ result }: { result: AffinityResult }) {
  const total = result.contributions.reduce((sum, item) => sum + item.points, 0);
  const max = Math.max(...result.contributions.map((item) => item.points), 1);
  if (!result.contributions.length && !result.adjustments.length) return null;

  return <section className="score-breakdown">
    <div className="score-breakdown-head">
      <h3><Gauge size={15}/> Cómo se calculó este {result.affinityScore}</h3>
      <small>Regla {result.ruleVersion} · {new Date(result.calculatedAt).toLocaleString("es-CO")}</small>
    </div>
    <ul>
      {result.contributions.map((item) => <li key={item.key}>
        <span>{CONTRIBUTION_LABELS[item.key] ?? item.key}</span>
        <i><b style={{ width: `${(item.points / max) * 100}%` }}/></i>
        <strong>+{item.points}</strong>
        <small>Coincidió con: {item.matched.join(", ")}</small>
      </li>)}
      {result.adjustments.map((item) => <li key={item.label} className="negative">
        <span>{item.label}</span>
        <i><b style={{ width: `${Math.min(100, (Math.abs(item.points) / max) * 100)}%` }}/></i>
        <strong>{item.points}</strong>
        <small>{item.detail}</small>
      </li>)}
    </ul>
    <footer>
      <span>Suma de señales <b>{total}</b></span>
      <span>Ajustes <b>{result.adjustments.reduce((sum, item) => sum + item.points, 0)}</b></span>
      <span className="score-breakdown-total">Índice <b>{result.affinityScore}</b></span>
    </footer>
    <p>El índice mide correspondencia con la necesidad declarada. No mide riesgo, capacidad de pago ni probabilidad de aceptación.</p>
  </section>;
}

function buildAdvisorQuestions(profile: Profile): string[] {
  const questions: string[] = [];
  const needs = profile.needs.join(" ");
  if (/educaci|posgrado|estudio|matr/.test(needs)) questions.push("¿En qué institución y programa está interesado, y para qué fecha de inicio?");
  if (/vivienda|cuota/.test(needs)) questions.push("¿El proyecto de vivienda tiene rango de valor y fecha estimada definidos?");
  if (/consolidar|cartera|obligaci/.test(needs)) questions.push("¿Qué obligaciones desea consolidar y con qué entidades (declaración voluntaria)?");
  if (/remodelaci|acabados/.test(needs)) questions.push("¿La remodelación está asociada a una vivienda propia con crédito vigente?");
  if (/impuesto|seguro/.test(needs)) questions.push("¿Qué obligaciones estacionales quiere cubrir y en qué mes vencen?");
  if (!profile.incomeRange) questions.push("¿Desea declarar un rango de ingresos para mejorar la confianza del análisis?");
  if (typeof profile.tenureMonths !== "number") questions.push("¿Cuál es su antigüedad en el empleo actual y su tipo de contrato?");
  if (!profile.consent) questions.push("¿Autoriza el tratamiento de sus datos para recibir orientación comercial?");
  if (questions.length === 0) questions.push("¿Qué proyecto o gasto le gustaría financiar y en qué plazo?");
  return questions.slice(0, 4);
}

/*
 * Las siete primeras son las columnas del reto; las demás son opcionales y solo
 * evitan que el motor tenga que deducir lo que el archivo ya sabía.
 */
const BATCH_FIELDS = [
  "tipo_documento", "documento", "nombre", "ciudad", "categoria", "necesidades", "consentimiento",
  "genero", "canal", "correo", "telefono", "ocupacion", "ingreso", "contrato", "antiguedad",
] as const;

function guessTarget(header: string): string {
  const h = header.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
  if (/tipo.*doc/.test(h)) return "tipo_documento";
  if (/documento|cedula|identificacion/.test(h)) return "documento";
  if (/nombre/.test(h)) return "nombre";
  if (/ciudad|municipio/.test(h)) return "ciudad";
  if (/categoria|afiliacion/.test(h)) return "categoria";
  if (/necesidad|interes/.test(h)) return "necesidades";
  if (/consent|autoriza/.test(h)) return "consentimiento";
  if (/genero|sexo/.test(h)) return "genero";
  if (/canal|medio/.test(h)) return "canal";
  if (/correo|email|mail/.test(h)) return "correo";
  if (/telefono|celular|movil|whatsapp/.test(h)) return "telefono";
  if (/ocupacion|cargo|sector|empresa/.test(h)) return "ocupacion";
  if (/ingreso|salario|smmlv/.test(h)) return "ingreso";
  if (/contrato|vinculacion/.test(h)) return "contrato";
  if (/antiguedad|meses/.test(h)) return "antiguedad";
  return "ignorar";
}

function Batch({ flash, onImport, onNavigate }: { flash: (s: string) => void; onImport: (profiles: Profile[], fileName: string, invalid: number) => void; onNavigate: (v: View) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "map" | "run" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [validation, setValidation] = useState<RowValidation[]>([]);
  const [imported, setImported] = useState<Profile[]>([]);

  const reset = () => { setFileName(""); setRawRows([]); setHeaders([]); setMapping({}); setPhase("idle"); setProgress(0); setValidation([]); setImported([]); };

  const parse = async (selected: File) => {
    if (selected.size > 5_000_000) { flash("El archivo supera el límite de 5 MB"); return; }
    if (!/\.(csv|xlsx)$/i.test(selected.name)) { flash("Solo se permiten archivos CSV o XLSX"); return; }
    let data: Record<string, unknown>[] = [];
    if (/\.csv$/i.test(selected.name)) data = Papa.parse<Record<string, unknown>>(await selected.text(), { header: true, skipEmptyLines: true }).data;
    else { const book = XLSX.read(await selected.arrayBuffer()); const sheet = book.Sheets[book.SheetNames[0]!]; data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet!); }
    data = data.slice(0, 2000);
    if (data.length === 0) { flash("El archivo no contiene filas legibles"); return; }
    const cols = Object.keys(data[0] ?? {});
    setFileName(selected.name); setRawRows(data); setHeaders(cols);
    setMapping(Object.fromEntries(cols.map((c) => [c, guessTarget(c)])));
    setPhase("map");
  };

  const mappedRows = () => rawRows.map((row) => {
    const out: Record<string, string> = {};
    for (const col of headers) {
      const target = mapping[col];
      if (target && target !== "ignorar") out[target] = String(row[col] ?? "").trim();
    }
    return out;
  });

  const start = () => {
    const rows = mappedRows();
    const results = validateRows(rows);
    setValidation(results);
    setPhase("run");
    setProgress(0);
    const total = rows.length;
    let processed = 0;
    const timer = window.setInterval(() => {
      processed += Math.max(1, Math.ceil(total / 12));
      setProgress(Math.min(100, Math.round((processed / total) * 100)));
      if (processed >= total) {
        window.clearInterval(timer);
        const valid = results.filter((r) => r.status === "VALID" && r.data);
        const profiles = valid.map((r) => rowToProfile(r.data!, fileName));
        setImported(profiles);
        onImport(profiles, fileName, results.length - valid.length);
        setPhase("done");
        void fetch("/api/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName, rows }) }).catch(() => {});
      }
    }, 170);
  };

  const retry = () => {
    const failed = validation.filter((r) => r.status === "INVALID").length;
    flash(failed === 0 ? "No hay filas fallidas por reintentar" : `${failed} filas revalidadas: siguen requiriendo corrección en el archivo`);
  };

  /*
   * La exportación es el entregable real del lote: producto, momento, canal,
   * tres señales y explicación por persona, más las filas rechazadas con su
   * motivo. Quien lo abre puede trabajar el lote sin volver a la aplicación.
   */
  const exportResult = () => {
    download(`recomendaciones-${fileName.replace(/\.(csv|xlsx)$/i, "")}.csv`, buildBatchOutputCsv(imported, validation));
    flash(`${imported.length} recomendaciones exportadas con explicación y trazabilidad`);
  };

  const invalid = validation.filter((r) => r.status === "INVALID");
  const diversity = phase === "done" ? summarizeBatchDiversity(imported) : null;

  return <>
    <SectionHeader eyebrow="PROCESAMIENTO MASIVO" title="Del archivo a la oportunidad explicable" text="Valida, normaliza y procesa hasta 2.000 perfiles sin perder la trazabilidad." action={<button className="button button-secondary" onClick={() => { download("plantilla-creasy.csv", SAMPLE_CSV); flash("Plantilla descargada"); }}><Download/> Descargar plantilla</button>}/>
    {phase === "idle" && <section className="upload-zone" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void parse(f); }}>
      <input ref={input} type="file" accept=".csv,.xlsx" hidden onChange={(e) => e.target.files?.[0] && void parse(e.target.files[0])}/><span><Upload/></span><h2>Arrastra tu CSV o XLSX aquí</h2><p>o haz clic para seleccionar · máximo 5 MB · 2.000 filas</p><div><ShieldCheck/> El archivo debe contener datos autorizados</div>
    </section>}
    {phase !== "idle" && <section className="batch-result">
      <div className="batch-head"><span className="file-icon"><FileSpreadsheet/></span><div><h2>{fileName}</h2><p>{rawRows.length} filas detectadas · {headers.length} columnas</p></div><button className="icon-button" onClick={reset} aria-label="Quitar archivo"><X/></button></div>
      {phase === "map" && <>
        <div className="mapping"><h3>Mapeo de columnas</h3><p className="mapping-hint">Revisa cómo se interpreta cada columna del archivo antes de procesar.</p><div className="mapping-grid">{headers.map((col) => <label key={col}><span>{col}</span><ArrowRight/><select value={mapping[col]} onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value }))}>{[...BATCH_FIELDS, "ignorar"].map((f) => <option key={f} value={f}>{f === "ignorar" ? "Ignorar columna" : f}</option>)}</select></label>)}</div></div>
        <div className="preview-wrap"><h3>Vista previa</h3><div className="table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rawRows.slice(0, 5).map((row, i) => <tr key={i}>{headers.map((h) => <td key={h}>{String(row[h] ?? "")}</td>)}</tr>)}</tbody></table></div></div>
        <div className="batch-actions"><button className="button button-secondary" onClick={reset}>Cancelar</button><button className="button button-primary" onClick={start}><Check/> Validar y procesar</button></div>
      </>}
      {phase === "run" && <div className="progress-row"><div><span>Validación, normalización y afinidad</span><strong>{progress}%</strong></div><i><b style={{ width: `${progress}%` }}/></i></div>}
      {phase === "done" && <>
        <div className="validation-cards"><article><span className="ok-icon"><Check/></span><div><strong>{imported.length}</strong><p>Perfiles importados</p></div></article><article><span className="warn-icon"><AlertTriangle/></span><div><strong>{invalid.length}</strong><p>Filas rechazadas</p></div></article><article><span className="info-icon"><Database/></span><div><strong>{Object.values(mapping).filter((m) => m !== "ignorar").length}</strong><p>Campos mapeados</p></div></article></div>
        {diversity && imported.length > 0 && <section className="batch-diversity">
          <div><span className="eyebrow">EL LOTE NO PRODUJO UNA SOLA OFERTA</span><h3>{diversity.products} productos · {diversity.channels} canales · {diversity.timings} momentos distintos</h3><p>Canal y momento se derivan de la necesidad declarada y de los datos de contacto que trajo el archivo. Cada derivación viaja con su razón en la evidencia del perfil, marcada como dato derivado.</p></div>
          <button className="button button-primary" onClick={exportResult}><Download size={16}/> Descargar recomendaciones</button>
        </section>}
        {invalid.length > 0 && <div className="errors-list"><h3>Errores por fila</h3>{invalid.slice(0, 10).map((r) => <p key={r.row}><b>Fila {r.row}:</b> {r.errors.join("; ")}</p>)}{invalid.length > 10 && <small>… y {invalid.length - 10} filas más (descarga el resultado completo).</small>}</div>}
        <div className="batch-actions"><button className="button button-secondary" onClick={retry}><RefreshCw size={16}/> Reintentar fallidas</button><button className="button button-secondary" onClick={exportResult}><Download/> Exportar resultados</button><button className="button button-primary" onClick={() => onNavigate("profiles")}><UsersRound size={16}/> Ver perfiles importados</button></div>
      </>}
    </section>}
  </>;
}

/**
 * Chispy: el copiloto con manos.
 *
 * Consume el stream NDJSON de /api/chispy y pinta cada evento según llega —el
 * razonamiento, la herramienta que abre, el resultado— para que se vea trabajar
 * en lugar de esperar un bloque final. Los indicadores de impacto viven en la
 * segunda pestaña: son la misma conversación, contada con números.
 */
function Chispy({ profiles, metrics, log, firstName, initials, initialTab = "chat" }: { profiles: Profile[]; metrics: Metrics; log: (a: string, d: string, actor?: string) => void; firstName: string; initials: string; initialTab?: "chat" | "impacto" }) {
  const [tab, setTab] = useState<"chat" | "impacto">(initialTab);
  const [messages, setMessages] = useState<ChispyMessage[]>([{
    role: "assistant",
    text: `Hola, ${firstName}. Soy Chispy. Puedo consultar el catálogo documentado y la foto de tasas de enero de 2026, revisar los casos del workspace y prepararte el mensaje de contacto. Antes de uso real, las tasas deben actualizarse.`,
  }]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, pending]);

  const speak = async (message: string) => {
    if (speaking) return;
    setSpeaking(true);
    try {
      const response = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message }) });
      if (!response.ok) throw new Error("browser-fallback");
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); };
      audio.onerror = () => { URL.revokeObjectURL(url); setSpeaking(false); };
      await audio.play();
      log("VOICE_OUTPUT", "Respuesta anonimizada reproducida con proveedor de voz");
      return;
    } catch {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = "es-CO";
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        log("VOICE_OUTPUT", "Respuesta reproducida localmente sin enviar datos");
        return;
      }
    }
    setSpeaking(false);
  };

  const send = async (query = text) => {
    const clean = query.trim();
    if (!clean || pending) return;
    setMessages((items) => [...items, { role: "user", text: clean }, { role: "assistant", text: "", traces: [], live: true }]);
    setText("");
    setPending(true);

    /* Todos los eventos del stream actualizan el último mensaje, el que está vivo. */
    const update = (patch: (message: ChispyMessage) => ChispyMessage) =>
      setMessages((items) => items.map((item, index) => index === items.length - 1 ? patch(item) : item));

    try {
      const response = await fetch("/api/chispy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: clean }),
      });
      if (!response.ok || !response.body) throw new Error(String(response.status));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: ChispyStreamEvent;
          try { event = JSON.parse(line) as ChispyStreamEvent; } catch { continue; }

          if (event.tipo === "pensando") {
            update((message) => ({ ...message, thinking: [...(message.thinking ?? []), event.texto] }));
          } else if (event.tipo === "herramienta") {
            update((message) => ({ ...message, traces: [...(message.traces ?? []), { name: event.nombre, detail: event.detalle }] }));
          } else if (event.tipo === "herramienta_ok") {
            update((message) => ({
              ...message,
              traces: (message.traces ?? []).map((trace, index, all) => index === all.length - 1 ? { ...trace, done: true, result: event.detalle } : trace),
            }));
          } else if (event.tipo === "respuesta") {
            update((message) => ({ ...message, text: event.texto, fuentes: event.fuentes, proveedor: event.proveedor, nota: event.nota, live: false }));
          } else if (event.tipo === "error") {
            update((message) => ({ ...message, text: event.mensaje, live: false }));
          }
        }
      }
      update((message) => message.text ? { ...message, live: false } : { ...message, text: "No obtuve respuesta. Vuelve a intentarlo.", live: false });
    } catch {
      update((message) => ({
        ...message,
        text: "No pude conectarme con el copiloto. Revisa la conexión y vuelve a intentarlo.",
        live: false,
      }));
    }
    setPending(false);
    log("ASSISTANT_QUERY", "Consulta a Chispy procesada; el texto y la PII no se registran");
  };

  const prompts = [
    "¿Qué antigüedad laboral piden para un crédito?",
    "¿Qué tasa aplica a un afiliado categoría A con libranza?",
    "¿Cuántos perfiles requieren revisión humana?",
    "Dame los indicadores de impacto del workspace",
  ];

  return <div className="assistant-page">
    <SectionHeader
      eyebrow="COPILOTO"
      title="Chispy"
      text="Consulta el catálogo oficial de crédito y los casos del workspace. Explica resultados ya calculados: nunca aprueba, nunca inventa una cifra y nunca revela datos personales."
      action={<div className="chispy-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "chat"} className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}><Bot size={16}/> Conversación</button>
        <button role="tab" aria-selected={tab === "impacto"} className={tab === "impacto" ? "active" : ""} onClick={() => setTab("impacto")}><Gauge size={16}/> Impacto</button>
      </div>}
    />

    {tab === "impacto" ? <Impact metrics={metrics} profiles={profiles} onAsk={(question) => { setTab("chat"); void send(question); }} /> : <div className="assistant-layout">
      <aside>
        <div className="ai-mark"><Bot/></div>
        <h2>Con herramientas, no con adivinanzas</h2>
        <p>Chispy no recibe el workspace entero: pide lo que necesita y cada consulta queda a la vista.</p>
        <ul>
          <li><Database/> Catálogo oficial con fuente y fecha</li>
          <li><Check/> Datos personales enmascarados en código</li>
          <li><ShieldCheck/> Sin decisiones de aprobación</li>
          <li><Volume2/> Respuesta por voz opcional</li>
        </ul>
        <small>Si se agota el presupuesto del modelo o falla la red, responde el motor local con la misma base de conocimiento.</small>
      </aside>

      <section className="chat-card">
        <div className="chat-head"><div><span className="live-dot"/><strong>Chispy disponible</strong></div><span>Entorno de demostración</span></div>
        <div className="messages">
          {messages.map((message, index) => <div key={index} className={`message ${message.role}`}>
            <span>{message.role === "assistant" ? <Bot/> : initials}</span>
            <div>
              {message.thinking?.map((thought, thoughtIndex) => <p key={thoughtIndex} className="chispy-thought">{thought}</p>)}
              {message.traces && message.traces.length > 0 && <div className="chispy-traces">
                {message.traces.map((trace, traceIndex) => <span key={traceIndex} className={trace.done ? "done" : ""}>
                  {trace.done ? <Check size={13}/> : <RefreshCw size={13} className="spin"/>}
                  <b>{trace.name.replaceAll("_", " ")}</b>{trace.detail}
                </span>)}
              </div>}
              {message.text && <p>{message.text}</p>}
              {message.live && !message.text && <p className="chispy-waiting">Chispy está trabajando…</p>}
              {message.fuentes && message.fuentes.length > 0 && <div className="chispy-sources">
                <small><Database size={12}/> Fuentes citadas</small>
                {message.fuentes.map((source) => <cite key={source}>{source}</cite>)}
              </div>}
              {message.nota && <small className="chispy-note"><ShieldCheck size={12}/> {message.nota}</small>}
              {message.role === "assistant" && message.text && !message.live && <button className="message-audio" disabled={speaking} onClick={() => void speak(message.text)}><Volume2/> {speaking ? "Reproduciendo…" : "Escuchar respuesta"}</button>}
            </div>
          </div>)}
          <div ref={endRef}/>
        </div>
        <div className="suggestions">{prompts.map((prompt) => <button key={prompt} onClick={() => void send(prompt)} disabled={pending}>{prompt}</button>)}</div>
        <form className="chat-input" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <input value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder="Pregunta por requisitos, tasas, un caso o los indicadores…"/>
          <button aria-label="Enviar" disabled={pending}><ArrowRight/></button>
        </form>
        <p className="chat-note"><ShieldCheck/> No incluyas datos personales. Las respuestas no equivalen a una decisión crediticia.</p>
      </section>
    </div>}
  </div>;
}

/**
 * La bandeja de casos: donde la persona asesora trabaja.
 *
 * Antes esto se llamaba "revisión humana" y parecía una pestaña de compliance:
 * una lista plana de etiquetas de alerta. El concepto era bueno —es el punto
 * donde un humano autoriza o bloquea el contacto comercial, y donde aterrizan
 * las solicitudes del recorrido del afiliado— pero no se veía como un lugar de
 * trabajo. Ahora cada caso trae lo que hace falta para resolverlo de una vez:
 * el veredicto, por qué, el correo que ya salió y el mensaje listo para enviar.
 */
function Reviews({ profiles, ownCases, onOpen, flash, log }: { profiles: Profile[]; ownCases: LocalCase[]; onOpen: (p: Profile) => void; flash: (s: string) => void; log: (a: string, d: string, actor?: string) => void }) {
  const [decisions, setDecisions] = useState<Record<string, "APROBADO_CONTACTO" | "DEVUELTO">>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  /*
   * Los correos de las solicitudes salen del navegador, no del servidor. Es la
   * otra mitad del mismo cambio: si el caso vive aquí, su correspondencia
   * también, y así el jurado ve el correo exacto que generó su recorrido en vez
   * de la bandeja compartida de todos los visitantes.
   */
  const outbox: OutboxMessage[] = useMemo(() => localMessages(ownCases), [ownCases]);
  const ownCaseIds = useMemo(() => new Set(ownCases.map((item) => item.profile.id)), [ownCases]);

  const forgetOwnCases = () => {
    clearCases();
    log("LOCAL_CASES_CLEARED", "Casos declarados en este navegador eliminados a petición del titular", "Titular");
    flash("Listo: los casos que creaste en este navegador ya no existen.");
  };

  /*
   * Afinidad, viabilidad y política se calculan una vez por perfil y no en cada
   * render. Sin esto, abrir un caso recomputaba treinta y seis veredictos —cada
   * uno con sus ocho afinidades— y el desplegable tardaba medio segundo en
   * abrirse delante del jurado.
   */
  const cases = useMemo(() => profiles
    .map((profile) => {
      const result = calculateAllAffinities(profile)[0]!;
      const declared = typeof profile.requestedAmount === "number";
      const decision = evaluateDecision({
        productId: result.productId,
        amount: profile.requestedAmount ?? 5_000_000,
        termMonths: profile.requestedTermMonths ?? 24,
        incomeRange: profile.incomeRange,
        category: profile.category,
        employmentStatus: profile.contractType,
        tenureMonths: profile.tenureMonths,
        dependents: profile.dependentsCount,
        declaredObligations: profile.declaredObligations,
        gender: profile.gender,
        consent: profile.consent,
      });
      return {
        profile,
        result,
        declared,
        decision,
        policy: evaluateContactPolicy(profile),
        next: buildNextBestAction(profile, result),
        message: suggestContactMessage(profile, decision, getProduct(result.productId).name),
      };
    })
    .filter((item) => item.profile.contactRequestedAt || item.result.requiresHumanReview)
    .sort((a, b) => Number(Boolean(b.profile.contactRequestedAt)) - Number(Boolean(a.profile.contactRequestedAt))),
  [profiles]);

  const open = cases.filter((item) => !decisions[item.profile.id]);
  const incoming = cases.filter((item) => item.profile.contactRequestedAt).length;
  const blocked = cases.filter((item) => !item.policy.approvable).length;

  const decide = (p: Profile, decision: "APROBADO_CONTACTO" | "DEVUELTO") => {
    setDecisions((d) => ({ ...d, [p.id]: decision }));
    log("HUMAN_REVIEW", `Caso ${p.id.slice(0, 8)}: ${decision === "APROBADO_CONTACTO" ? "aprobado para contacto comercial" : "devuelto para corrección"}`, "Revisor demo");
    flash(decision === "APROBADO_CONTACTO" ? "Aprobado para contacto comercial; no es aprobación de crédito" : "Caso devuelto para corrección");
  };

  const copy = async (id: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 2200);
      log("MESSAGE_COPIED", `Mensaje de contacto copiado para el caso ${id.slice(0, 8)}`);
    } catch {
      flash("El navegador bloqueó el portapapeles; selecciona el texto y cópialo a mano.");
    }
  };

  return <>
    <SectionHeader eyebrow="BANDEJA DEL ASESOR" title="Los casos que esperan una decisión tuya" text="Cada caso llega con su veredicto, sus motivos, el correo que ya salió y el mensaje listo para enviar. Ninguna acción comercial ocurre sin que alguien la apruebe aquí."/>

    <div className="inbox-summary">
      <article className="highlight"><strong>{open.length}</strong><span>casos abiertos</span></article>
      <article><strong>{incoming}</strong><span>solicitudes del afiliado</span></article>
      <article><strong>{blocked}</strong><span>con contacto bloqueado</span></article>
      <article><strong>{outbox.length}</strong><span>correos generados</span></article>
      <article><strong>{Object.keys(decisions).length}</strong><span>resueltos en esta sesión</span></article>
    </div>

    {ownCaseIds.size > 0 && <div className="inbox-own-note">
      <ShieldCheck size={17}/>
      <div>
        <strong>{ownCaseIds.size === 1 ? "Un caso de este navegador" : `${ownCaseIds.size} casos de este navegador`}</strong>
        <p>Lo que declaraste en el recorrido no se guardó en ningún servidor: vive en este equipo, caduca en 24 horas y nadie más puede verlo.</p>
      </div>
      <button className="button button-secondary" onClick={forgetOwnCases}>Borrar mis datos</button>
    </div>}

    <div className="inbox-list">{cases.slice(0, 12).map(({ profile, result, declared, decision, policy, next, message }) => {
      const mail = outbox.find((item) => item.profileId === profile.id && item.audience === "ASESOR");
      const resolved = decisions[profile.id];
      const isOpen = expanded === profile.id;
      const tone = decision.status === "ESCENARIO_VIABLE" ? "ok" : decision.status === "REQUIERE_CONFIRMACION" ? "warn" : "stop";

      return <article key={profile.id} className={`inbox-case${resolved ? " resolved" : ""}`}>
        <header onClick={() => setExpanded(isOpen ? null : profile.id)}>
          <span className="avatar">{profile.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>
          <div className="inbox-case-who">
            <h3>{profile.fullName}</h3>
            <p>{documentLabel(profile.documentNumber)} · {profile.city} · {getProduct(result.productId).name}</p>
            {profile.origin === "AFFILIATE_SELF_SERVICE" && <span className="self-service-origin"><UserRound/> {ownCaseIds.has(profile.id) ? "Tu recorrido, guardado en este navegador" : "Autogestión del afiliado"}</span>}
          </div>
          <span className={`verdict-chip verdict-chip-${tone}`}>{decision.status.replaceAll("_", " ")}</span>
          <span className={policy.approvable ? (policy.allowed ? "ok-tag" : "info-tag") : "warning-tag"}>{policy.approvable ? (policy.allowed ? <Check/> : <History size={13}/>) : <AlertTriangle/>}{policy.label}</span>
          <ChevronRight className={isOpen ? "rotated" : ""}/>
        </header>

        {isOpen && <div className="inbox-case-body">
          <div className="inbox-case-grid">
            <div><small>Meta declarada</small><strong>{profile.declaredGoal ?? profile.needs[0] ?? "Sin declarar"}</strong></div>
            <div><small>{declared ? "Cuota estimada" : "Escenario de referencia"}</small><strong>{`$${Math.round(decision.monthlyPayment).toLocaleString("es-CO")}`} · {Math.round(decision.paymentToIncome * 100)} % del ingreso</strong>{!declared && <em>La persona aún no declaró monto ni plazo.</em>}</div>
            <div><small>Canal y horario autorizados</small><strong>{next.channelLabel} · {TIME_BAND_LABELS[profile.preferences?.preferredTimeBand ?? "WEEKDAY_MORNING"]}</strong></div>
          </div>

          <ul className="inbox-reasons">
            {decision.reasons.filter((reason) => reason.impact !== "POSITIVO").slice(0, 3).map((reason) => <li key={reason.label} className={`impact-${reason.impact.toLowerCase()}`}>
              <strong>{reason.label}.</strong> {reason.detail}
            </li>)}
            {decision.reasons.every((reason) => reason.impact === "POSITIVO") && <li className="impact-positivo"><strong>Sin bloqueantes.</strong> El escenario declarado se sostiene; falta la verificación formal.</li>}
          </ul>

          {policy.blockers.length > 0 && <div className="inbox-blocked"><ShieldCheck/><div><strong>Por qué no se puede contactar</strong><ul>{policy.blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul></div></div>}
          {policy.blockers.length === 0 && policy.timing.length > 0 && <div className="inbox-timing"><History size={17}/><div><strong>Se puede aprobar ahora, se envía dentro de la franja</strong><p>{policy.timing[0]}</p></div></div>}

          {mail && <div className="inbox-mail"><Mail/><div><strong>{mail.subject}</strong><small>Enviado a {mail.to} · {mail.delivery === "ENVIADO" ? "entregado" : "retenido en la bandeja de la demo"}</small></div></div>}

          <div className="inbox-message">
            <div className="inbox-message-head"><span><Bot size={14}/> Mensaje sugerido por Chispy</span><button onClick={() => void copy(profile.id, message)}>{copied === profile.id ? <><Check size={14}/> Copiado</> : <><ClipboardCheck size={14}/> Copiar</>}</button></div>
            <p>{message}</p>
            <small>Destino: {profile.phone ? maskPhone(profile.phone) : profile.email ? maskEmail(profile.email) : "sin canal declarado"} · el mensaje no promete aprobación, monto ni tasa.</small>
          </div>

          <div className="inbox-actions">
            <button className="button button-secondary" onClick={() => onOpen(profile)}>Ver trazabilidad completa</button>
            {resolved ? <span className={resolved === "APROBADO_CONTACTO" ? "ok-tag" : "warning-tag"}>{resolved === "APROBADO_CONTACTO" ? "Aprobado para contacto" : "Devuelto para corrección"}</span> : <>
              <button className="button button-secondary" onClick={() => decide(profile, "DEVUELTO")}>Devolver</button>
              <button className="button button-primary" disabled={!policy.approvable} title={policy.blockers.join(" ")} onClick={() => decide(profile, "APROBADO_CONTACTO")}><Check size={16}/> Aprobar contacto</button>
            </>}
          </div>
        </div>}
      </article>;
    })}</div>

    {cases.length === 0 && <div className="empty-state"><ClipboardCheck/><h3>La bandeja está vacía</h3><p>Cuando alguien complete el recorrido del afiliado y pida acompañamiento, su caso aparecerá aquí.</p></div>}
  </>;
}

function Sources({ connectors }: { connectors: Connector[] }) {
  /*
   * Solo se muestran las fuentes que de verdad alimentan el workspace. Los
   * conectores deshabilitados (identidad, buró, open banking) contaban una
   * intención de futuro, no un hecho, y ocupaban la mitad de la pantalla con
   * tarjetas grises. Lo que sí importa —que no se consulta un buró— se dice
   * arriba, en una frase.
   */
  const active = connectors.filter((connector) => connector.enabled);
  return <><SectionHeader eyebrow="PROCEDENCIA" title="Cada dato conserva su historia" text="Solo se activa una fuente cuando existe base legal, consentimiento y una referencia trazable."/>
    <div className="source-banner"><ShieldCheck/><div><h2>Sin scraping ni consultas externas</h2><p>Creasy no busca personas por cédula, no consulta centrales de riesgo, no lee redes sociales y no rompe restricciones de ningún portal. Todo lo que ves entró por una de estas {active.length} fuentes.</p></div></div>
    <div className="connector-grid">{active.map((connector) => <article key={connector.id}>
      <div className="connector-head"><span><Database/></span><i className="on"/></div>
      <h3>{connector.name}</h3><p>{connector.description}</p>
      <div className="connector-fields">{connector.fieldsProvided.map((field) => <span key={field}>{field}</span>)}</div>
      <dl>
        <div><dt>Base legal</dt><dd>{connector.legalBasis}</dd></div>
        <div><dt>Consentimiento</dt><dd>{connector.consentRequired ? "Requerido" : "No aplica"}</dd></div>
        <div><dt>Límite</dt><dd>{connector.rateLimit}</dd></div>
      </dl>
      <footer><span className="ok-tag"><Check/> {connector.healthStatus}</span></footer>
    </article>)}</div>
    <ExogenousCalendar/>
    <div className="source-closed"><ShieldCheck/><p><strong>Fuera del alcance por diseño:</strong> centrales de riesgo, proveedores de identidad y open banking. No están deshabilitadas a la espera de una tecla: requieren contrato, base legal y autorización expresa antes de existir.</p></div>
  </>;
}

/**
 * La variable exógena que sí se puede usar.
 *
 * El reto pide información que Colsubsidio no tiene. Esta pantalla enseña de
 * dónde sale la nuestra: no de la persona, sino del calendario en el que vive.
 * Se deriva de la ciudad declarada y de la fecha de hoy, es pública, es
 * verificable y no dice nada de nadie en particular.
 */
function ExogenousCalendar() {
  const now = new Date();
  const cities = ["Bogotá", "Soacha", "Chía"];
  const rows = cities.map((city) => ({ city, triggers: activeTriggers(city, now) }));
  const open = rows[0]?.triggers.length ?? 0;

  return <section className="exogenous-panel">
    <div className="exogenous-head">
      <div>
        <span className="eyebrow"><CalendarClock size={14}/> VARIABLE EXÓGENA · SIN BUSCAR A NADIE</span>
        <h2>El dato que falta no es sobre la persona: es sobre su calendario</h2>
        <p>Colsubsidio sabe dónde vive y dónde trabaja cada afiliado, pero no cruza ese dato con el almanaque. Una matrícula cierra, un predial vence, la prima entra en junio. Estas ventanas se derivan de la ciudad declarada y de la fecha de hoy; son públicas y no hablan de ninguna persona.</p>
      </div>
      <div className="exogenous-count"><strong>{open}</strong><span>ventanas abiertas hoy en Bogotá</span></div>
    </div>
    <div className="exogenous-grid">{rows.map(({ city, triggers }) => <article key={city}>
      <h3>{city}</h3>
      {triggers.length === 0
        ? <p className="exogenous-empty">Ninguna ventana abierta hoy. El motor no fuerza una urgencia que no existe.</p>
        : triggers.map((trigger) => <div key={trigger.id} className={`exogenous-row urgency-${trigger.urgency.toLowerCase()}`}>
            <strong>{trigger.timing}</strong>
            <span>{trigger.productIds.map((id) => getProduct(id).shortName).join(" · ")}</span>
            <small>{trigger.sourceLabel}{trigger.precision === "MES" && " · precisión de mes"}</small>
          </div>)}
    </article>)}</div>
    <footer><ShieldCheck size={15}/> Una ventana abierta no convierte a nadie en candidato: solo cambia el momento de quien ya declaró esa necesidad. Versión del calendario {CALENDAR_VERSION}.</footer>
  </section>;
}

function Audit({ events, log, onNavigate }: { events: AuditEvent[]; log: (a: string, d: string, actor?: string) => void; onNavigate: (view: View) => void }) {
  /*
   * El CSV se conserva porque un auditor lo pide en ese formato, pero deja de
   * ser la acción principal: una hoja de cálculo con cuarenta filas no le
   * explica nada a nadie. Lo primero que se ofrece es el informe narrado.
   */
  const exportAudit = () => {
    const csv = [["fecha", "accion", "actor", "detalle"].map(safeCsvCell).join(","), ...events.map((e) => [e.createdAt, e.action, e.actor, e.detail].map(safeCsvCell).join(","))].join("\n");
    download("auditoria-creasy.csv", csv);
    log("EXPORT", "Registro de auditoría exportado a CSV");
  };
  const byActor = [...new Set(events.map((event) => event.actor))];
  const byAction = [...new Set(events.map((event) => event.action))];
  return <><SectionHeader eyebrow="TRAZABILIDAD" title="Nada importante ocurre en silencio" text="Registro para demo, sin documentos, correos, teléfonos ni textos completos."/>
    <div className="audit-summary">
      <article><strong>{events.length}</strong><span>eventos registrados</span></article>
      <article><strong>{byActor.length}</strong><span>{byActor.length === 1 ? "actor involucrado" : "actores involucrados"}</span></article>
      <article><strong>{byAction.length}</strong><span>{byAction.length === 1 ? "tipo de acción" : "tipos de acción"}</span></article>
      <article><strong>0</strong><span>datos personales almacenados</span></article>
    </div>
    <div className="audit-report-cta">
      <div><Bot/><div><strong>Pídele el informe a Chispy</strong><p>Resume qué se hizo, quién lo hizo y qué controles se activaron, en lenguaje legible y listo para imprimir.</p></div></div>
      <div>
        <button className="button button-primary" onClick={() => { log("EXPORT", "Informe de auditoría solicitado a Chispy"); onNavigate("assistant"); }}><Bot size={16}/> Generar informe</button>
        <button className="button button-secondary" onClick={exportAudit}><Download size={16}/> CSV para auditoría</button>
      </div>
    </div>
    <div className="panel audit-list"><div className="audit-head"><strong>Actividad reciente ({events.length})</strong></div>{events.map((e) => <article key={e.id}><span><Activity/></span><div><h3>{e.detail}</h3><p>{e.action} · {e.actor}</p></div><time>{new Date(e.createdAt).toLocaleString("es-CO")}</time></article>)}</div>
  </>;
}

function Impact({ metrics, profiles, onAsk }: { metrics: Metrics; profiles: Profile[]; onAsk?: (question: string) => void }) {
  const explainable = profiles.filter((profile) => calculateAllAffinities(profile)[0]!.positiveSignals.length >= 3).length;
  const sufficient = profiles.filter((profile) => calculateAllAffinities(profile)[0]!.confidence >= 60).length;
  const contactConsented = profiles.filter((profile) => hasActiveConsent(profile, "COMMERCIAL_CONTACT")).length;
  const blocked = profiles.filter((profile) =>
    !hasActiveConsent(profile, "COMMERCIAL_CONTACT")
    || profile.commercialContactBlocked
    || profile.rneExcluded
    || profile.preferences?.maxContactFrequency === "NO_CONTACT"
  ).length;
  const channelCounts = profiles.reduce<Record<string, number>>((counts, profile) => {
    const channel = profile.preferences?.preferredChannel ?? "Sin preferencia";
    counts[channel] = (counts[channel] ?? 0) + 1;
    return counts;
  }, {});
  const preferredChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0] ?? ["Sin preferencia", 0];
  const funnel = [
    [metrics.profiles, "Perfiles analizados"],
    [sufficient, "Con señales suficientes"],
    [explainable, "Con orientación explicable"],
    [contactConsented, "Con permiso de contacto"],
    [metrics.reviews, "Pendientes de revisión humana"],
    [blocked, "Acciones bloqueadas por control"],
  ] as const;
  return <>
    <div className="impact-callout"><BarChart3/><div><span>Orientaciones explicables</span><h2>{explainable} de {metrics.profiles} perfiles tienen una orientación sustentada por al menos tres señales</h2><p>{blocked} acciones quedan bloqueadas antes del contacto y los {metrics.reviews} casos conservan revisión humana obligatoria.</p></div></div>
    <div className="impact-funnel" aria-label="Embudo calculado de la demostración">{funnel.map(([value, label], index) => <article key={label} style={{ width: `${100 - index * 7}%` }}><strong>{value}</strong><span>{label}</span><small>Calculado en esta sesión</small></article>)}</div>
    <div className="impact-grid">
      <article><strong>{metrics.sourced} %</strong><p>Evidencias con fuente trazable</p><span>Calculado</span></article>
      <article><strong>{preferredChannel[1]}</strong><p>Perfiles prefieren {preferredChannel[0]}</p><span>Distribución declarada</span></article>
      <article><strong>0</strong><p>Decisiones automáticas de aprobación o rechazo</p><span>Control de diseño</span></article>
    </div>
    <BusinessCase />

    {onAsk && <div className="impact-ask">
      <div><Bot/><div><strong>¿Quieres el detalle de alguna cifra?</strong><p>Chispy recalcula estos indicadores sobre los perfiles actuales y explica de dónde sale cada uno.</p></div></div>
      <div>
        <button onClick={() => onAsk("Explícame el embudo de impacto y qué significa cada paso")}>Explicar el embudo</button>
        <button onClick={() => onAsk("¿Por qué hay acciones bloqueadas por control y cuáles son?")}>Ver bloqueos</button>
        <button onClick={() => onAsk("Genera el informe de auditoría de esta sesión")}>Informe de auditoría</button>
      </div>
    </div>}
    <div className="principle-card"><p>“Creasy no decide por Colsubsidio ni por el afiliado.</p><h2>Les permite entenderse mejor.”</h2></div>
  </>;
}

/**
 * La pregunta que hace todo jurado: ¿cuánto vale esto?
 *
 * La respuesta cómoda sería un porcentaje de conversión, y sería inventada: sin
 * línea base ni experimento, nadie puede saberlo desde un prototipo. Lo que sí
 * se puede afirmar —y comprobar con una división— es cuánta parte del año está
 * cada línea fuera de su temporada. Si la comunicación no mira el almanaque,
 * esa fracción del esfuerzo llega tarde o temprano, nunca a tiempo.
 *
 * El volumen lo escribe quien pregunta, porque son sus envíos y no una cifra
 * nuestra. Nosotros solo ponemos el calendario y la aritmética.
 */
function BusinessCase() {
  const [volume, setVolume] = useState(10_000);
  const timings = useMemo(() => productTimings(), []);
  const campaign = useMemo(() => campaignArithmetic("educativo", volume), [volume]);

  return <section className="business-case">
    <div className="business-case-head">
      <div>
        <span className="eyebrow"><CalendarClock size={15}/> La cuenta que sí podemos hacer</span>
        <h2>No prometemos vender más. Mostramos cuánto esfuerzo llega fuera de tiempo.</h2>
        <p>Una matrícula se decide entre noviembre y febrero, o entre mayo y julio. Son siete meses de doce. Repartir la oferta educativa por igual durante el año significa que cinco doceavas partes llegan cuando la decisión ya se tomó o todavía no existe. La división la puede hacer cualquiera; los meses son públicos.</p>
      </div>
      <label className="business-case-input">
        <span>Comunicaciones al año</span>
        <input
          type="number" min={100} max={10_000_000} step={1_000} value={volume}
          onChange={(event) => setVolume(Math.min(10_000_000, Math.max(0, Number(event.target.value) || 0)))}
          onBlur={() => setVolume((current) => Math.max(100, current))}
        />
        <small>Pon tu volumen real: la cuenta se rehace sola.</small>
      </label>
    </div>

    {campaign && <div className="business-case-figures">
      <article className="out"><strong>{campaign.outOfWindow.toLocaleString("es-CO")}</strong><span>llegan fuera de la ventana</span><small>{12 - campaign.monthsInWindow} de 12 meses</small></article>
      <article><strong>{campaign.inWindow.toLocaleString("es-CO")}</strong><span>caen dentro de la temporada</span><small>{campaign.monthsInWindow} de 12 meses</small></article>
      <article><strong>0</strong><span>datos personales usados en esta cuenta</span><small>Solo el calendario y tu volumen</small></article>
    </div>}

    <div className="business-case-table">
      <h3>Qué parte del año está en temporada, línea por línea</h3>
      <table>
        <thead><tr><th>Línea</th><th>Meses en ventana</th><th>Fuera de temporada</th><th>Ventanas</th></tr></thead>
        <tbody>{timings.map((timing) => <tr key={timing.productId} className={timing.productId === "educativo" ? "featured" : undefined}>
          <td><strong>{timing.productName}</strong></td>
          <td>{timing.monthsInWindow} / 12</td>
          <td><span className="business-case-share">{Math.round(timing.shareOutOfWindow * 100)} %</span></td>
          <td>{timing.windows.join(" · ")}</td>
        </tr>)}</tbody>
      </table>
      <small>Las líneas que el calendario no cubre no aparecen: una hipoteca no se decide contra un almanaque público y estimarla por analogía sería inventar. Calendario {BUSINESS_CASE_VERSION}.</small>
    </div>

    <div className="business-case-assumptions">
      {BUSINESS_CASE_ASSUMPTIONS.map((assumption) => <article key={assumption.label}>
        <strong>{assumption.label}</strong>
        <p>{assumption.detail}</p>
      </article>)}
    </div>
  </section>;
}

const tourSteps = [
  ["1. Revisa el resumen", "El dashboard traduce los perfiles de ejemplo en cobertura, trazabilidad y oportunidades explicables."],
  ["2. Carga y valida", "CSV y XLSX pasan por mapeo de columnas, validaciones por fila y un proceso asíncrono simulado."],
  ["3. Abre un perfil", "Explora la necesidad declarada, el consentimiento y la afinidad principal."],
  ["4. Revisa la evidencia", "Cada señal conserva fuente, fecha, naturaleza y confianza. Los datos sensibles quedan fuera."],
  ["5. Pregunta al copiloto", "El modo demo responde sin API y rechaza solicitudes para revelar PII."],
  ["6. Mide el impacto", "Cierra con métricas calculadas y un mensaje honesto: afinidad no es aprobación."],
];

function Tour({ step, onNext, onClose }: { step: number; onNext: () => void; onClose: () => void }) {
  return <div className="tour-card"><div className="tour-progress">{tourSteps.map((_, i) => <i key={i} className={i <= step ? "active" : ""}/>)}</div><button className="icon-button" onClick={onClose} aria-label="Cerrar demo guiada"><X/></button><span className="tour-icon"><Sparkles/></span><h2>{tourSteps[step]?.[0]}</h2><p>{tourSteps[step]?.[1]}</p><div><small>{step + 1} de {tourSteps.length}</small><button className="button button-primary" onClick={onNext}>{step === tourSteps.length - 1 ? "Finalizar" : "Siguiente"}<ArrowRight/></button></div></div>;
}
