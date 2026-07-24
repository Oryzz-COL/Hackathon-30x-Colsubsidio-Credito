"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bot, Check, ChevronRight,
  CircleHelp, ClipboardCheck, Database, Download, Eye, FileSpreadsheet, Gauge,
  History, Home, Info, Layers3, Menu, MoreHorizontal, Plus, RefreshCw,
  Search, ShieldCheck, Sparkles, Upload, UserRound, UsersRound, Volume2, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { BRAND } from "@/config/brand";
import { BrandLockup } from "@/components/brand-lockup";
import { getProduct } from "@/config/products";
import { JURY_PROFILE_IDS, SAMPLE_CSV } from "@/data/profiles";
import { calculateAllAffinities } from "@/lib/affinity-engine/engine";
import { buildNextBestAction, buildPersonalizedOffer, evaluateContactPolicy } from "@/lib/personalization";
import { demoAssistant, type AssistantAnswer } from "@/lib/llm/demo";
import { deriveMetrics } from "@/lib/metrics";
import { maskDocument, maskEmail, maskPhone, safeCsvCell } from "@/lib/privacy";
import { declaredEvidence, rowToProfile, validateRows, type RowValidation } from "@/lib/validation/batch-row";
import type { AuditEvent, Profile } from "@/lib/types";

export type View = "dashboard" | "scenarios" | "profiles" | "batch" | "assistant" | "reviews" | "sources" | "audit" | "impact";
type Metrics = ReturnType<typeof deriveMetrics>;
type Connector = { id: string; name: string; description: string; enabled: boolean; legalBasis: string; consentRequired: boolean; fieldsProvided: readonly string[]; rateLimit: string; healthStatus: string };

const NAV: { id: View; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Resumen", icon: Home },
  { id: "scenarios", label: "3 perfiles clave", icon: Sparkles },
  { id: "profiles", label: "Perfiles", icon: UsersRound },
  { id: "batch", label: "Carga masiva", icon: FileSpreadsheet },
  { id: "assistant", label: "Copiloto", icon: Bot },
  { id: "reviews", label: "Revisión humana", icon: ClipboardCheck },
  { id: "sources", label: "Fuentes", icon: Database },
  { id: "audit", label: "Auditoría", icon: History },
  { id: "impact", label: "Impacto", icon: Gauge },
];

const COLORS = ["#3367d6", "#7f5af0", "#19a37c", "#e79b32", "#e36d7a", "#4f83cc", "#83a947", "#a96aac"];

function download(name: string, content: string, type = "text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function DemoApp({ initialProfiles, initialAudit, metrics: initialMetrics, connectors, initialTour = false, initialView = "dashboard" }: { initialProfiles: Profile[]; initialAudit: AuditEvent[]; metrics: Metrics; connectors: Connector[]; initialTour?: boolean; initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [audit, setAudit] = useState(initialAudit);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [tour, setTour] = useState(initialTour);
  const [tourStep, setTourStep] = useState(0);
  const [toast, setToast] = useState("");
  const startTour = () => { setTour(true); setTourStep(0); setView("dashboard"); };
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const log = (action: string, detail: string, actor = "Asesora demo") =>
    setAudit((events) => [{ id: crypto.randomUUID(), action, actor, detail, createdAt: new Date().toISOString() }, ...events]);

  useEffect(() => {
    void fetch("/api/profiles", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ data: Profile[] }> : null)
      .then((payload) => {
        if (payload?.data) setProfiles(payload.data);
      })
      .catch(() => undefined);
  }, []);

  const metrics = useMemo(
    () => (profiles === initialProfiles ? initialMetrics : deriveMetrics(profiles)),
    [profiles, initialProfiles, initialMetrics]
  );
  const alerts = useMemo(() => ({
    noConsent: profiles.filter((p) => !p.consent).length,
    stale: profiles.filter((p) => p.staleSource).length,
    sensitive: profiles.filter((p) => p.sensitiveBlocked).length,
    reviews: metrics.reviews,
  }), [profiles, metrics]);

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
    dashboard: <Dashboard metrics={metrics} profiles={profiles} alerts={alerts} onOpen={setSelected} onNavigate={setView} />,
    scenarios: <ScenarioShowcase profiles={profiles} onOpen={setSelected} />,
    profiles: <Profiles profiles={profiles} onOpen={setSelected} onNew={() => setCreating(true)} />,
    batch: <Batch flash={flash} onImport={importProfiles} onNavigate={setView} />,
    assistant: <Assistant profiles={profiles} log={log} />,
    reviews: <Reviews profiles={profiles} onOpen={setSelected} flash={flash} log={log} />,
    sources: <Sources connectors={connectors} />,
    audit: <Audit events={audit} log={log} />,
    impact: <Impact metrics={metrics} />,
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <BrandLockup compact/>
          <button className="icon-button mobile-only" onClick={() => setSidebar(false)} aria-label="Cerrar navegación"><X/></button>
        </div>
        <div className="workspace-card"><span>Workspace</span><strong>Demo Hackathon</strong><small><span className="live-dot"/> {profiles.length} perfiles sintéticos</small></div>
        <nav aria-label="Navegación principal">
          {NAV.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "nav-active" : ""} onClick={() => { setView(id); setSidebar(false); }}><Icon size={18}/><span>{label}</span>{id === "reviews" && alerts.reviews > 0 && <b>{alerts.reviews}</b>}</button>)}
        </nav>
        <div className="sidebar-footer">
          <button onClick={startTour}><Sparkles size={17}/><span>Iniciar demo guiada</span></button>
          <div className="user-card"><span className="avatar small">AM</span><div><strong>Andrea M.</strong><small>Asesora demo</small></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div><button className="icon-button menu-button" onClick={() => setSidebar(true)} aria-label="Abrir navegación"><Menu/></button><span className="breadcrumb">Creasy / <strong>{NAV.find((n) => n.id === view)?.label}</strong></span></div>
          <div className="top-actions"><Link className="affiliate-switch-link" href="/orientacion"><UserRound/> Orientación afiliado</Link><span className="synthetic-label"><ShieldCheck size={15}/> Datos 100 % sintéticos</span><button className="icon-button" aria-label="Ayuda: iniciar demo guiada" title="Ayuda: iniciar demo guiada" onClick={startTour}><CircleHelp/></button></div>
        </header>
        <div className="content">{screens[view]}</div>
      </main>
      {creating && <ProfileForm onClose={() => setCreating(false)} onCreate={createProfile} />}
      {selected && <ProfileDetail profile={selected} onClose={() => setSelected(null)} onUpdate={(next) => { setProfiles((items) => items.map((p) => p.id === next.id ? next : p)); setSelected(next); }} flash={flash} log={log} />}
      {tour && <Tour step={tourStep} onNext={() => {
        if (tourStep === 0) setView("batch");
        if (tourStep === 1) setView("profiles");
        if (tourStep === 2) setSelected(profiles[0]!);
        if (tourStep === 3) { setSelected(null); setView("assistant"); }
        if (tourStep === 4) setView("impact");
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

function Dashboard({ metrics, profiles, alerts, onOpen, onNavigate }: { metrics: Metrics; profiles: Profile[]; alerts: { noConsent: number; stale: number; sensitive: number; reviews: number }; onOpen: (p: Profile) => void; onNavigate: (v: View) => void }) {
  const opportunities = profiles.map((p) => ({ profile: p, result: calculateAllAffinities(p)[0]! })).sort((a, b) => b.result.affinityScore - a.result.affinityScore).slice(0, 5);
  return <>
    <section className="welcome-band">
      <div><span className="eyebrow light"><Sparkles size={15}/> Inteligencia con propósito</span><h1>Buenos días, Andrea.</h1><p>Hay <strong>{alerts.reviews} casos</strong> que necesitan revisión antes de una conversación comercial.</p></div>
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
      </section>
      <section className="panel confidence-panel">
        <div className="panel-title"><div><h2>Confianza de la evidencia</h2><p>Calidad, cobertura y frescura</p></div></div>
        <div className="donut-wrap"><ResponsiveContainer width="55%" height={220}><PieChart><Pie data={metrics.confidence} innerRadius={62} outerRadius={88} dataKey="value" stroke="white" strokeWidth={4}>{metrics.confidence.map((_, i) => <Cell key={i} fill={["#3367d6","#9b7de3","#d6dbe6"][i]}/>)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><strong>{metrics.sufficient}%</strong><span>evidencia suficiente</span></div><div className="legend">{metrics.confidence.map((item, i) => <span key={item.name}><i style={{ background: ["#3367d6","#9b7de3","#d6dbe6"][i] }}/>{item.name}<b>{item.value}</b></span>)}</div></div>
      </section>
      <section className="panel opportunities">
        <div className="panel-title"><div><h2>Oportunidades explicables</h2><p>Priorizadas por correspondencia de necesidad, no por riesgo</p></div><button className="text-button" onClick={() => onNavigate("profiles")}>Ver todos <ArrowRight size={15}/></button></div>
        <div className="table-wrap"><table><thead><tr><th>Perfil</th><th>Necesidad</th><th>Mayor afinidad</th><th>Confianza</th><th></th></tr></thead><tbody>{opportunities.map(({ profile, result }) => <tr key={profile.id} onClick={() => onOpen(profile)}><td><div className="person-cell"><span className="avatar small">{profile.fullName.split(" ").map((n) => n[0]).slice(0,2).join("")}</span><div><strong>{profile.fullName}</strong><small>{maskDocument(profile.documentNumber)}</small></div></div></td><td><span className="need-tag">{profile.needs[0]}</span></td><td><strong>{getProduct(result.productId).shortName}</strong><div className="mini-bar"><i style={{ width: `${result.affinityScore}%` }}/></div></td><td><span className="confidence-tag">{result.confidence}%</span></td><td><ChevronRight size={17}/></td></tr>)}</tbody></table></div>
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

function ScenarioShowcase({ profiles, onOpen }: { profiles: Profile[]; onOpen: (profile: Profile) => void }) {
  const featured = JURY_PROFILE_IDS.map((id) => profiles.find((profile) => profile.id === id)).filter((profile): profile is Profile => Boolean(profile));
  const outputs = featured.map((profile) => {
    const result = calculateAllAffinities(profile)[0]!;
    return { profile, result, offer: buildPersonalizedOffer(profile, result) };
  });
  return <>
    <SectionHeader eyebrow="DEMO NO NEGOCIABLE" title="Tres personas, tres ofertas realmente diferentes" text="Cada resultado combina perfil, comportamiento, momento de vida y preferencia de canal. Ninguna recomendación equivale a aprobación."/>
    <section className="scenario-proof">
      <div><strong>{outputs.length}</strong><span>perfiles sintéticos comparables</span></div>
      <div><strong>{new Set(outputs.map((item) => item.result.productId)).size}</strong><span>productos recomendados</span></div>
      <div><strong>{new Set(outputs.map((item) => item.offer.channel)).size}</strong><span>canales elegidos</span></div>
      <div><strong>3+</strong><span>señales por recomendación</span></div>
    </section>
    <div className="scenario-grid">{outputs.map(({ profile, result, offer }, index) => <article key={profile.id} className="scenario-card">
      <header><span className="scenario-number">0{index + 1}</span><div><small>Perfil sintético · Categoría {profile.category}</small><h2>{profile.fullName}</h2><p>{profile.ageRange} · {profile.city} · {profile.occupation}</p></div><button className="icon-button" aria-label={`Abrir detalle de ${profile.fullName}`} onClick={() => onOpen(profile)}><ChevronRight/></button></header>
      <div className="scenario-goal"><small>Necesidad y momento de vida</small><strong>{offer.detectedNeed}</strong><p>{profile.lifeEvent}</p></div>
      <div className="scenario-product"><span>{result.affinityScore}/100</span><small>Oferta contextual</small><h3>{getProduct(result.productId).name}</h3><p>{getProduct(result.productId).objective}</p></div>
      <div className="scenario-delivery">
        <div><small>Cuándo</small><strong>{offer.timing}</strong></div>
        <div><small>Canal</small><strong>{offer.channelLabel}</strong><span>{offer.timeBandLabel}</span></div>
      </div>
      <div className="scenario-signals"><h4>Señales que sí influyeron</h4>{offer.signals.slice(0, 4).map((signal) => <p key={signal}><Check/>{signal}</p>)}</div>
      <blockquote>“{offer.message}”</blockquote>
      <footer><span><ShieldCheck/> {offer.nextStep}</span><button onClick={() => onOpen(profile)}>Ver trazabilidad <ArrowRight/></button></footer>
    </article>)}</div>
    <section className="scenario-safety"><ShieldCheck/><div><strong>Lo que Creasy no usa</strong><p>DataCrédito, burós externos, género o edad como decisión adversa, tasas inventadas ni datos reales de terceros.</p></div></section>
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
        <div className="profile-card-head"><span className="avatar">{profile.fullName.split(" ").map((n) => n[0]).slice(0,2).join("")}</span><div><h3>{profile.fullName}</h3><p>{profile.city} · Categoría {profile.category ?? "sin declarar"} · {maskDocument(profile.documentNumber)}</p></div><ChevronRight/></div>
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
  gender: z.enum(["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY"], { required_error: "Selecciona el género declarado" }),
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
        <label className="field"><span>Número de documento *</span><input {...register("documentNumber")} placeholder="Solo datos sintéticos"/>{errors.documentNumber && <em>{errors.documentNumber.message}</em>}</label>
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
      <div className="form-actions"><small><ShieldCheck size={14}/> Prototipo de hackathon: usa únicamente datos ficticios.</small><div><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" disabled={isSubmitting}><Plus size={16}/> Crear y analizar</button></div></div>
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
    const html = `<html><head><title>Reporte ${profile.id}</title><style>body{font-family:Arial;padding:48px;color:#30302f}h1,h2{color:#0067b1}.box{padding:16px;border:1px solid #ddd;margin:16px 0}.nba{border-left:8px solid #ffd000}</style></head><body><h1>Creasy para Colsubsidio</h1><p>Reporte anonimizado · ${new Date().toLocaleDateString("es-CO")} · regla ${top.ruleVersion}</p><div class="box"><b>${profile.fullName.split(" ")[0]} ${profile.fullName.split(" ")[1]?.[0] ?? ""}.</b><p>Documento ${maskDocument(profile.documentNumber)} · Consentimiento: ${profile.consent ? "vigente" : "no vigente"}</p></div><h2>${getProduct(top.productId).name}: ${top.affinityScore}/100</h2><p>${top.positiveSignals.join(". ") || "Sin señales suficientes."}</p><p><b>Faltantes:</b> ${top.missingSignals.join("; ")}</p><div class="box nba"><b>Siguiente mejor acción: ${nextBestAction.action.replaceAll("_", " ")}</b><p>${nextBestAction.moment}</p><p>Canal: ${nextBestAction.channel}. Revisión humana obligatoria.</p></div><p>${BRAND.disclaimer}</p><p>Prototipo diseñado con privacidad desde el diseño y sujeto a validación jurídica, operativa y de riesgo antes de utilizar datos reales o tomar decisiones financieras.</p><small>Datos sintéticos · confianza ${top.confidence}%</small></body></html>`;
    const win = window.open("", "_blank"); if (win) { win.document.write(html); win.document.close(); win.print(); }
    log("EXPORT", `Reporte individual del perfil ${profile.id.slice(0, 8)} exportado (anonimizado)`);
  };
  const exportOwnData = () => {
    const payload = {
      titular: profile.fullName,
      documento: maskDocument(profile.documentNumber),
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
    <div className="drawer-head"><button className="icon-button" onClick={onClose} aria-label="Cerrar detalle"><X/></button><span className="synthetic-label"><ShieldCheck/> Perfil sintético</span><button className="button button-secondary" onClick={exportReport}><Download size={16}/> Exportar reporte</button></div>
    <div className="profile-hero"><span className="avatar large">{profile.fullName.split(" ").map((n) => n[0]).slice(0,2).join("")}</span><div><h2>{profile.fullName}</h2><p>{profile.city}{profile.email ? ` · ${maskEmail(profile.email)}` : ""}{profile.phone ? ` · ${maskPhone(profile.phone)}` : ""}</p><span className={profile.consent ? "ok-tag" : "warning-tag"}>{profile.consent ? <Check/> : <AlertTriangle/>}{profile.consent ? "Consentimiento vigente" : "Uso comercial bloqueado"}</span></div></div>
    <div className="drawer-tabs"><button className={tab === "affinity" ? "active" : ""} onClick={() => setTab("affinity")}>Afinidad</button><button className={tab === "evidence" ? "active" : ""} onClick={() => setTab("evidence")}>Evidencia</button><button className={tab === "behavior" ? "active" : ""} onClick={() => setTab("behavior")}>Comportamiento</button><button className={tab === "privacy" ? "active" : ""} onClick={() => setTab("privacy")}>Privacidad</button></div>
    <div className="drawer-body">
      {tab === "affinity" && <>
        <section className="top-recommendation"><div className="score-orb"><strong>{top.affinityScore}</strong><small>/100</small></div><div><span>Mayor correspondencia</span><h2>{getProduct(top.productId).name}</h2><p>{top.affinityLevel} · confianza {top.confidence}%</p></div><span className="review-badge"><Eye/> Revisión humana</span></section>
        <section className="next-best-action"><div><small>Siguiente mejor acción explicable</small><h3>{nextBestAction.action.replaceAll("_", " ")}</h3><p>{nextBestAction.moment}</p></div><div><span>Canal: <strong>{nextBestAction.channel}</strong></span><span className={contactPolicy.allowed ? "ok-tag" : "warning-tag"}>{contactPolicy.label}</span></div>{!contactPolicy.allowed && <ul>{contactPolicy.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}</section>
        <section className="profile-context"><div><small>Categoría individual</small><strong>{profile.category ?? "No declarada"}</strong></div><div><small>Género declarado</small><strong>{{ WOMAN: "Mujer", MAN: "Hombre", NON_BINARY: "No binario", PREFER_NOT_TO_SAY: "Prefiere no responder" }[profile.gender ?? "PREFER_NOT_TO_SAY"]}</strong></div><div><small>Meta</small><strong>{profile.declaredGoal ?? "Por confirmar"}</strong></div><div><small>Momento de vida</small><strong>{profile.lifeEvent ?? "Por confirmar"}</strong></div></section>
        <div className="explain-grid"><section><h3><Check/> ¿Por qué aparece?</h3>{top.positiveSignals.length ? top.positiveSignals.map((s) => <p key={s}>{s}</p>) : <p>No existe evidencia suficiente.</p>}</section><section><h3><CircleHelp/> ¿Qué falta?</h3>{top.missingSignals.map((s) => <p key={s}>{s}</p>)}</section></div>
        {top.contradictorySignals.length > 0 && <section className="contradiction-box"><h3><AlertTriangle/> Contradicciones detectadas</h3>{top.contradictorySignals.map((s) => <p key={s}>{s}</p>)}</section>}
        <section className="excluded-box"><h3><ShieldCheck/> Señales excluidas</h3>{top.excludedSignals.map((s) => <span key={s}>{s}</span>)}</section>
        <section className="eligibility-box"><h3>Elegibilidad preliminar (separada de la afinidad)</h3>{top.eligibility.map((e) => <div key={e.label}><span>{e.label}</span><b className={`elig elig-${e.status.toLowerCase()}`}>{e.status.replaceAll("_", " ")}</b></div>)}<small>Nunca se muestra “rechazado”: todo requisito no comprobado queda sujeto a validación oficial.</small></section>
        <div className="alternatives-head"><h3>Alternativas</h3><button className="text-button" onClick={() => setCompare(!compare)}><Layers3/> {compare ? "Cerrar comparación" : "Comparar 3 productos"}</button></div>
        {compare ? <div className="compare-grid">{results.slice(0,3).map((r) => <article key={r.productId}><small>{getProduct(r.productId).objective}</small><h3>{getProduct(r.productId).name}</h3><strong>{r.affinityScore}</strong><p>{r.positiveSignals[0] ?? "No existe evidencia suficiente"}</p><p className="compare-missing">Falta: {r.missingSignals[0]}</p><span>Pendiente de validación oficial</span></article>)}</div> : <div className="ranking">{results.slice(1,4).map((r) => <div key={r.productId}><span>{getProduct(r.productId).name}</span><i><b style={{ width: `${r.affinityScore}%` }}/></i><strong>{r.affinityScore}</strong></div>)}</div>}
        <section className="questions-box"><h3><Bot/> Preguntas sugeridas para el asesor</h3><ul>{buildAdvisorQuestions(profile).map((q) => <li key={q}>{q}</li>)}</ul></section>
        <section className="disclaimer"><Info/><p>{BRAND.disclaimer}</p></section>
      </>}
      {tab === "evidence" && <div className="timeline">{profile.evidence.length ? profile.evidence.map((ev) => <article key={ev.id}><span className="timeline-dot"/><div><div><h3>{ev.label}</h3><span className={ev.evidenceStatus === "VIGENTE" ? "ok-tag" : "warning-tag"}>{ev.evidenceStatus}</span></div><strong>{ev.value}</strong><p>{ev.sourceName} · {ev.sourceReference}</p><small>{ev.dataNature} · confianza {Math.round(ev.confidence * 100)}% · verificado {new Date(ev.lastVerifiedAt).toLocaleDateString("es-CO")}</small></div></article>) : <div className="empty-state"><Database/><h3>Sin evidencia registrada</h3><p>La ausencia de información no se interpreta como riesgo: solo reduce la confianza.</p></div>}</div>}
      {tab === "behavior" && <div className="timeline">{profile.behaviorEvents?.length ? profile.behaviorEvents.map((event) => <article key={event.id}><span className="timeline-dot"/><div><div><h3>{event.type.replaceAll("_", " ")}</h3><span className="synthetic-tag">Primera parte · demo</span></div><p>Finalidad autorizada: {event.authorizedPurpose}</p><small>{new Date(event.occurredAt).toLocaleString("es-CO")} · retención {event.retentionClass}</small></div></article>) : <div className="empty-state"><Activity/><h3>Sin eventos autorizados</h3><p>No se registra navegación externa ni actividad sin una finalidad autorizada.</p></div>}</div>}
      {tab === "privacy" && <div className="privacy-panel"><ShieldCheck/><h2>Centro de privacidad</h2><p>Autorizaciones vigentes: {profile.consents?.filter((c) => c.status === "GRANTED").length ?? (profile.consent ? 1 : 0)} · RNE simulado: {profile.rneExcluded ? "excluido" : "sin exclusión declarada"}</p><div className="consent-records">{profile.consents?.map((record) => <div key={record.id}><strong>{record.purpose.replaceAll("_", " ")}</strong><span className={record.status === "GRANTED" ? "ok-tag" : "warning-tag"}>{record.status}</span><small>{record.scope} · aviso {record.noticeVersion}</small></div>)}</div><div className="privacy-actions"><button className="button button-secondary" onClick={exportOwnData}><Download/> Exportar mis datos</button><button className="button button-secondary" onClick={() => { log("RECTIFICATION_REQUESTED", `Solicitud de rectificación registrada (perfil ${profile.id.slice(0, 8)})`, "Titular demo"); flash("Solicitud de rectificación registrada"); }}><RefreshCw/> Actualizar preferencias</button><button className="button button-danger" disabled={!profile.consent} onClick={() => { const now = new Date().toISOString(); const next = { ...profile, consent: false, consentPurpose: "Revocada por el titular", commercialContactBlocked: true, consents: profile.consents?.map((c) => ({ ...c, status: "REVOKED" as const, revokedAt: now })) }; onUpdate(next); log("CONSENT_REVOKED", `Consentimientos revocados por el titular (perfil ${profile.id.slice(0, 8)})`, "Titular demo"); flash("Autorizaciones revocadas. Uso comercial bloqueado."); }}><X/> Revocar autorizaciones</button></div><small>Prototipo diseñado con privacidad desde el diseño y sujeto a validación jurídica, operativa y de riesgo antes de utilizar datos reales o tomar decisiones financieras.</small></div>}
    </div>
    <div className="drawer-footer"><button className="button button-secondary" onClick={() => { log("HUMAN_REVIEW", `Caso ${profile.id.slice(0, 8)} devuelto para completar información`); flash("Caso devuelto para completar información"); }}>Solicitar información</button><button className="button button-primary" onClick={() => { log("HUMAN_REVIEW", `Caso ${profile.id.slice(0, 8)} enviado a revisión humana`); flash("Caso enviado a revisión humana. No implica aprobación de crédito."); }}><ClipboardCheck/> Enviar a revisión</button></div>
  </div></div>;
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

const BATCH_FIELDS = ["tipo_documento", "documento", "nombre", "ciudad", "categoria", "necesidades", "consentimiento"] as const;

function guessTarget(header: string): string {
  const h = header.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
  if (/tipo.*doc/.test(h)) return "tipo_documento";
  if (/documento|cedula|identificacion/.test(h)) return "documento";
  if (/nombre/.test(h)) return "nombre";
  if (/ciudad|municipio/.test(h)) return "ciudad";
  if (/categoria|afiliacion/.test(h)) return "categoria";
  if (/necesidad|interes/.test(h)) return "necesidades";
  if (/consent|autoriza/.test(h)) return "consentimiento";
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
  const [importedCount, setImportedCount] = useState(0);

  const reset = () => { setFileName(""); setRawRows([]); setHeaders([]); setMapping({}); setPhase("idle"); setProgress(0); setValidation([]); setImportedCount(0); };

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
        setImportedCount(profiles.length);
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

  const exportResult = () => {
    const csv = [["fila", "estado", "observaciones"].map(safeCsvCell).join(","), ...validation.map((r) => [r.row, r.status === "VALID" ? "VALIDA" : "ERROR", r.errors.join(" | ") || "Lista para afinidad"].map(safeCsvCell).join(","))].join("\n");
    download(`resultado-${fileName.replace(/\.(csv|xlsx)$/i, "")}.csv`, csv);
    flash("Resultados del lote exportados");
  };

  const invalid = validation.filter((r) => r.status === "INVALID");

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
        <div className="validation-cards"><article><span className="ok-icon"><Check/></span><div><strong>{importedCount}</strong><p>Perfiles importados</p></div></article><article><span className="warn-icon"><AlertTriangle/></span><div><strong>{invalid.length}</strong><p>Filas rechazadas</p></div></article><article><span className="info-icon"><Database/></span><div><strong>{Object.values(mapping).filter((m) => m !== "ignorar").length}</strong><p>Campos mapeados</p></div></article></div>
        {invalid.length > 0 && <div className="errors-list"><h3>Errores por fila</h3>{invalid.slice(0, 10).map((r) => <p key={r.row}><b>Fila {r.row}:</b> {r.errors.join("; ")}</p>)}{invalid.length > 10 && <small>… y {invalid.length - 10} filas más (descarga el resultado completo).</small>}</div>}
        <div className="batch-actions"><button className="button button-secondary" onClick={retry}><RefreshCw size={16}/> Reintentar fallidas</button><button className="button button-secondary" onClick={exportResult}><Download/> Exportar resultados</button><button className="button button-primary" onClick={() => onNavigate("profiles")}><UsersRound size={16}/> Ver perfiles importados</button></div>
      </>}
    </section>}
  </>;
}

function Assistant({ profiles, log }: { profiles: Profile[]; log: (a: string, d: string, actor?: string) => void }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string; evidence?: string[] }[]>([{ role: "assistant", text: "Hola, Andrea. Puedo ayudarte a explorar afinidades, evidencia y faltantes del workspace sin revelar datos personales." }]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [provider, setProvider] = useState("demo");
  const [speaking, setSpeaking] = useState(false);
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
    if (!query.trim() || pending) return;
    setMessages((m) => [...m, { role: "user", text: query }]);
    setText(""); setPending(true);
    let answer: AssistantAnswer;
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { data: AssistantAnswer; provider: string };
      answer = json.data; setProvider(json.provider);
    } catch {
      answer = demoAssistant(query, profiles); setProvider("demo");
    }
    setMessages((m) => [...m, { role: "assistant", text: answer.answer, evidence: answer.evidenceIds }]);
    setPending(false);
    log("ASSISTANT_QUERY", "Consulta al copiloto procesada; el texto y la PII no se registran");
  };
  const prompts = ["Muéstrame perfiles con alta afinidad educativa", "¿Cuántos perfiles declararon interés en vivienda?", "¿Qué recomendaciones tienen evidencia insuficiente?"];
  return <div className="assistant-page">
    <SectionHeader eyebrow="COPILOTO" title="Pregunta con privacidad incorporada" text="Respuestas deterministas en modo demo, fundamentadas únicamente en el workspace."/>
    <div className="assistant-layout"><aside><div className="ai-mark"><Bot/></div><h2>{provider === "demo" ? "Modo demo seguro" : `Proveedor: ${provider}`}</h2><p>{provider === "demo" ? "Sin API key. No envía información a servicios externos." : "Salida JSON validada con contexto anonimizado."}</p><ul><li><Check/> PII enmascarada</li><li><Check/> Evidencia citada</li><li><Check/> Sin decisiones crediticias</li><li><Volume2/> Respuesta por voz opcional</li></ul><small>Proveedores: demo / Gemini / Qwen / OpenAI / Anthropic</small></aside>
      <section className="chat-card"><div className="chat-head"><div><span className="live-dot"/><strong>Copiloto disponible</strong></div><span>Workspace: Demo Hackathon</span></div><div className="messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}><span>{m.role === "assistant" ? <Bot/> : "AM"}</span><div><p>{m.text}</p>{m.evidence?.length ? <small><Database/> {m.evidence.length} IDs de evidencia usados</small> : null}{m.role === "assistant" && <button className="message-audio" disabled={speaking} onClick={() => void speak(m.text)}><Volume2/> {speaking ? "Reproduciendo…" : "Escuchar respuesta"}</button>}</div></div>)}{pending && <div className="message assistant"><span><Bot/></span><div><p>Consultando el workspace…</p></div></div>}</div><div className="suggestions">{prompts.map((p) => <button key={p} onClick={() => void send(p)}>{p}</button>)}</div><form className="chat-input" onSubmit={(e) => { e.preventDefault(); void send(); }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Pregunta sobre los datos autorizados…"/><button aria-label="Enviar" disabled={pending}><ArrowRight/></button></form><p className="chat-note"><ShieldCheck/> No incluyas datos personales. Las respuestas no equivalen a una decisión crediticia.</p></section>
    </div>
  </div>;
}

function Reviews({ profiles, onOpen, flash, log }: { profiles: Profile[]; onOpen: (p: Profile) => void; flash: (s: string) => void; log: (a: string, d: string, actor?: string) => void }) {
  const [decisions, setDecisions] = useState<Record<string, "APROBADO_CONTACTO" | "DEVUELTO">>({});
  const cases = profiles
    .filter((p) => p.contactRequestedAt || calculateAllAffinities(p)[0]!.requiresHumanReview)
    .sort((a, b) => Number(Boolean(b.contactRequestedAt)) - Number(Boolean(a.contactRequestedAt)));
  const open = cases.filter((p) => !decisions[p.id]);
  const noConsent = cases.filter((p) => !p.consent).length;
  const sensitive = cases.filter((p) => p.sensitiveBlocked).length;
  const stale = cases.filter((p) => p.staleSource).length;
  const selfService = cases.filter((p) => p.origin === "AFFILIATE_SELF_SERVICE").length;
  const decide = (p: Profile, decision: "APROBADO_CONTACTO" | "DEVUELTO") => {
    setDecisions((d) => ({ ...d, [p.id]: decision }));
    log("HUMAN_REVIEW", `Caso ${p.id.slice(0, 8)}: ${decision === "APROBADO_CONTACTO" ? "aprobado para contacto comercial" : "devuelto para corrección"}`, "Revisor demo");
    flash(decision === "APROBADO_CONTACTO" ? "Aprobado para contacto comercial; no es aprobación de crédito" : "Caso devuelto para corrección");
  };
  return <><SectionHeader eyebrow="CONTROL HUMANO" title="La decisión final siempre tiene contexto" text="Revisa solicitudes de contacto, consentimientos, contradicciones, frescura y calidad antes de continuar."/>
    <div className="review-summary"><span><strong>{open.length}</strong> casos abiertos</span><span><strong>{selfService}</strong> desde autogestión</span><span><strong>{noConsent}</strong> sin consentimiento</span><span><strong>{sensitive}</strong> {sensitive === 1 ? "dato sensible excluido" : "datos sensibles excluidos"}</span><span><strong>{stale}</strong> {stale === 1 ? "fuente vencida" : "fuentes vencidas"}</span><span><strong>{Object.keys(decisions).length}</strong> revisados</span></div>
    <div className="panel review-list">{cases.slice(0, 12).map((p) => { const r = calculateAllAffinities(p)[0]!; const policy = evaluateContactPolicy(p); const nba = buildNextBestAction(p, r); const reason = p.contactRequestedAt ? "Contacto solicitado" : !p.consent ? "Falta de consentimiento" : p.sensitiveBlocked ? "Dato sensible detectado" : p.contradiction ? "Contradicción" : p.staleSource ? "Fuente vencida" : "Baja confianza"; const decision = decisions[p.id]; return <article key={p.id}><button className="review-main" onClick={() => onOpen(p)}><span className="avatar">{p.fullName.split(" ").map((n) => n[0]).slice(0,2).join("")}</span><div><h3>{p.fullName}</h3><p>{maskDocument(p.documentNumber)} · {getProduct(r.productId).name}</p><small>{nba.moment} · canal {nba.channel} · {policy.label}</small>{p.origin === "AFFILIATE_SELF_SERVICE" && <span className="self-service-origin"><UserRound/> Autogestión del afiliado</span>}</div><span className={`reason-tag ${p.contactRequestedAt ? "contact-reason" : ""}`}><AlertTriangle/> {reason}</span><strong>{r.confidence}%</strong><ChevronRight/></button>{decision ? <div className="quick-actions"><span className={decision === "APROBADO_CONTACTO" ? "ok-tag" : "warning-tag"}>{decision === "APROBADO_CONTACTO" ? "Aprobado para contacto" : "No contactar / corregir"}</span></div> : <div className="quick-actions"><button onClick={() => decide(p, "DEVUELTO")}>No contactar</button><button disabled={!policy.allowed} title={policy.reasons.join(" ")} onClick={() => decide(p, "APROBADO_CONTACTO")}>Aprobar contacto</button></div>}</article>; })}</div>
  </>;
}

function Sources({ connectors }: { connectors: Connector[] }) {
  return <><SectionHeader eyebrow="PROCEDENCIA" title="Cada dato conserva su historia" text="Conectores habilitados solo cuando existe base legal, consentimiento y una fuente trazable."/>
    <div className="source-banner"><ShieldCheck/><div><h2>Sin scraping invasivo</h2><p>Creasy no busca personas por cédula, no rompe restricciones y no consulta centrales sin autorización.</p></div></div>
    <div className="connector-grid">{connectors.map((c) => <article key={c.id} className={!c.enabled ? "disabled" : ""}><div className="connector-head"><span><Database/></span><i className={c.enabled ? "on" : ""}/></div><h3>{c.name}</h3><p>{c.description}</p><dl><div><dt>Base legal</dt><dd>{c.legalBasis}</dd></div><div><dt>Consentimiento</dt><dd>{c.consentRequired ? "Requerido" : "No aplica"}</dd></div><div><dt>Estado</dt><dd>{c.healthStatus}</dd></div></dl><footer><span className={c.enabled ? "ok-tag" : ""}>{c.enabled && <Check/>} Simulación · Sin consulta real</span></footer></article>)}</div>
  </>;
}

function Audit({ events, log }: { events: AuditEvent[]; log: (a: string, d: string, actor?: string) => void }) {
  const exportAudit = () => {
    const csv = [["fecha", "accion", "actor", "detalle"].map(safeCsvCell).join(","), ...events.map((e) => [e.createdAt, e.action, e.actor, e.detail].map(safeCsvCell).join(","))].join("\n");
    download("auditoria-creasy.csv", csv);
    log("EXPORT", "Registro de auditoría exportado a CSV");
  };
  return <><SectionHeader eyebrow="TRAZABILIDAD" title="Nada importante ocurre en silencio" text="Registro para demo, sin documentos, correos, teléfonos ni textos completos."/>
    <div className="panel audit-list"><div className="audit-head"><strong>Actividad reciente ({events.length})</strong><button className="button button-secondary" onClick={exportAudit}><Download/> Exportar registro</button></div>{events.map((e) => <article key={e.id}><span><Activity/></span><div><h3>{e.detail}</h3><p>{e.action} · {e.actor}</p></div><time>{new Date(e.createdAt).toLocaleString("es-CO")}</time></article>)}</div>
  </>;
}

function Impact({ metrics }: { metrics: Metrics }) {
  const cards = [
    ["8 min", "Tiempo estimado ahorrado por perfil", "Supuesto de demo"],
    [`${metrics.explainable}%`, "Perfiles con recomendación explicable", "Calculado"],
    [`${metrics.sourced}%`, "Datos con fuente trazable", "Calculado"],
    [`${metrics.sufficient}%`, "Recomendaciones con evidencia suficiente", "Calculado"],
    [`${metrics.reviews}`, "Casos que requieren revisión", "Calculado"],
    [`${metrics.profiles - metrics.consented}`, "Casos sin consentimiento", "Calculado"],
  ];
  return <><SectionHeader eyebrow="IMPACTO SIMULADO" title="Menos búsqueda. Más conversaciones relevantes." text="Métricas calculadas sobre datos sintéticos; no representan resultados empresariales reales."/>
    <div className="impact-callout"><BarChart3/><div><span>Potencial de priorización comercial</span><h2>{metrics.explainable}% de los perfiles tiene al menos una afinidad explicable</h2><p>Antes de cualquier contacto, {metrics.reviews} casos deben pasar por control humano.</p></div></div>
    <div className="impact-grid">{cards.map(([v, l, n]) => <article key={l}><strong>{v}</strong><p>{l}</p><span>{n}</span></article>)}</div>
    <section className="benefit-accelerator">
      <div><span>ACELERADORES DE LA HACKATHON</span><h2>Beneficios convertidos en capacidad real</h2><p>Todos son opcionales: el MVP continúa funcionando sin servicios externos.</p></div>
      <div className="benefit-grid">
        <article><Bot/><strong>Gemini + Qwen</strong><span>Explicaciones estructuradas con fallback determinista.</span></article>
        <article><ShieldCheck/><strong>Hugging Face</strong><span>Evaluación futura de guardrails y calidad, sin puntuar crédito.</span></article>
        <article><Volume2/><strong>Deepgram + ElevenLabs</strong><span>Accesibilidad por voz con consentimiento y texto anonimizado.</span></article>
        <article><RefreshCw/><strong>Make</strong><span>Automatización futura de revisión y CRM, nunca de decisiones.</span></article>
        <article><Database/><strong>DigitalOcean</strong><span>Contingencia cloud y servicios administrados para el piloto.</span></article>
      </div>
    </section>
    <div className="principle-card"><p>“Creasy no decide por Colsubsidio ni por el afiliado.</p><h2>Les permite entenderse mejor.”</h2></div>
  </>;
}

const tourSteps = [
  ["1. Mira el pulso del lote", "El dashboard traduce los perfiles sintéticos en cobertura, trazabilidad y oportunidades explicables."],
  ["2. Carga y valida", "CSV y XLSX pasan por mapeo de columnas, validaciones por fila y un proceso asíncrono simulado."],
  ["3. Abre un perfil", "Explora la necesidad declarada, el consentimiento y la afinidad principal."],
  ["4. Revisa la evidencia", "Cada señal conserva fuente, fecha, naturaleza y confianza. Los datos sensibles quedan fuera."],
  ["5. Pregunta al copiloto", "El modo demo responde sin API y rechaza solicitudes para revelar PII."],
  ["6. Mide el impacto", "Cierra con métricas calculadas y un mensaje honesto: afinidad no es aprobación."],
];

function Tour({ step, onNext, onClose }: { step: number; onNext: () => void; onClose: () => void }) {
  return <div className="tour-card"><div className="tour-progress">{tourSteps.map((_, i) => <i key={i} className={i <= step ? "active" : ""}/>)}</div><button className="icon-button" onClick={onClose} aria-label="Cerrar demo guiada"><X/></button><span className="tour-icon"><Sparkles/></span><h2>{tourSteps[step]?.[0]}</h2><p>{tourSteps[step]?.[1]}</p><div><small>{step + 1} de {tourSteps.length}</small><button className="button button-primary" onClick={onNext}>{step === tourSteps.length - 1 ? "Finalizar" : "Siguiente"}<ArrowRight/></button></div></div>;
}
