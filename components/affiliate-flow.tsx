"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Path } from "react-hook-form";
import {
  ArrowLeft, ArrowRight, BookOpenCheck, BriefcaseBusiness, Check, ChevronRight,
  CircleAlert, FileCheck2, GraduationCap, Home, Layers, LoaderCircle, Mail,
  MessageCircle, MessageSquare, Minus, Pencil, Phone, ReceiptText, Rocket,
  ShieldCheck, ShoppingBag, Smartphone, Sparkles, Target, UserRound,
  type LucideIcon,
} from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { getProduct, PRODUCTS } from "@/config/products";
import {
  AFFILIATE_NEEDS, affiliateContactPayload, affiliateGuidanceSchema,
  calculateAffiliateGuidance, type AffiliateGuidanceInput,
} from "@/lib/affiliate-guidance";
import { buildNextBestAction } from "@/lib/personalization";
import type { AffinityResult, Profile } from "@/lib/types";

type Guidance = { profile: Profile; recommendations: AffinityResult[] };
type Stage = "onboarding" | "analyzing" | "result" | "contacted";

/* ── Configuración del simulador ────────────────────────────────── */
const AMOUNT_MIN = 500_000;
const AMOUNT_MAX = 80_000_000;
const AMOUNT_STEP = 500_000;
const TERM_OPTIONS = [6, 12, 18, 24, 36, 48, 60, 72];
const EA_ILUSTRATIVA = 0.19; // tasa efectiva anual ilustrativa (no es oferta)
const DEFAULT_AMOUNT = 5_000_000;
const DEFAULT_TERM = 24;

function estimateMonthly(amount: number, months: number): number {
  if (!amount || !months) return 0;
  const i = Math.pow(1 + EA_ILUSTRATIVA, 1 / 12) - 1;
  const cuota = (amount * i) / (1 - Math.pow(1 + i, -months));
  return Math.round(cuota);
}

const cop = (value: number) => `$${value.toLocaleString("es-CO")}`;

/* ── Opciones de cada paso ──────────────────────────────────────── */
const NEED_META: Record<string, { icon: LucideIcon; hint: string }> = {
  educacion: { icon: GraduationCap, hint: "Pregrado, posgrado, cursos o formación" },
  vivienda: { icon: Home, hint: "Cuota inicial, compra o mejora de vivienda" },
  "compra-cartera": { icon: Layers, hint: "Reunir y ordenar tus obligaciones" },
  "gastos-cotidianos": { icon: ShoppingBag, hint: "Compras, tecnología o imprevistos" },
  "impuestos-seguros": { icon: ReceiptText, hint: "Impuestos, pólizas o seguros" },
  "mujer-emprende": { icon: Rocket, hint: "Proyecto productivo o emprendimiento" },
  otra: { icon: Target, hint: "Otro proyecto personal" },
};

const HORIZON_OPTIONS = [
  { value: "NOW", label: "Ahora mismo", hint: "Tengo una necesidad inmediata" },
  { value: "THIS_MONTH", label: "Este mes", hint: "Quiero avanzar pronto" },
  { value: "NEXT_THREE_MONTHS", label: "En 1 a 3 meses", hint: "Estoy planeando" },
  { value: "EXPLORING", label: "Solo explorando", hint: "Sin prisa, quiero informarme" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "A", label: "Categoría A", hint: "Hasta 2 SMMLV" },
  { value: "B", label: "Categoría B", hint: "Más de 2 y hasta 4 SMMLV" },
  { value: "C", label: "Categoría C", hint: "Más de 4 SMMLV" },
  { value: "D", label: "Categoría D", hint: "Persona no afiliada" },
] as const;

const incomeOptions = ["Hasta 1 SMMLV", "Entre 1 y 2 SMMLV", "Entre 2 y 4 SMMLV", "Más de 4 SMMLV"];
const employmentOptions = [
  ["indefinido", "Contrato indefinido"], ["fijo", "Contrato a término fijo"],
  ["independiente", "Independiente"], ["pensionado", "Pensionado"], ["otro", "Otra situación"],
] as const;

const CHANNEL_OPTIONS = [
  { value: "IN_APP", label: "En la app", icon: Smartphone },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "EMAIL", label: "Correo", icon: Mail },
  { value: "SMS", label: "SMS", icon: MessageSquare },
  { value: "CALL", label: "Llamada", icon: Phone },
] as const;

const TIMEBAND_OPTIONS = [
  { value: "WEEKDAY_MORNING", label: "Lunes a viernes · mañana" },
  { value: "WEEKDAY_AFTERNOON", label: "Lunes a viernes · tarde" },
  { value: "SATURDAY", label: "Sábado" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "ONCE_WEEK", label: "Una vez por semana" },
  { value: "TWICE_MONTH", label: "Dos veces al mes" },
  { value: "ONCE_MONTH", label: "Una vez al mes" },
  { value: "NO_CONTACT", label: "No deseo contacto" },
] as const;

const LAST_STEP = 9;
const STEP_FIELDS: Record<number, Path<AffiliateGuidanceInput>[]> = {
  1: ["need"],
  2: ["loanAmount"],
  3: [],
  4: ["horizon"],
  5: ["employmentStatus", "affiliationCategory"],
  6: ["dependents"],
  7: ["fullName", "gender", "identifier", "addressOrZone", "email"],
  8: [],
  9: ["guidanceConsent", "contactConsent"],
};

/* ── Componentes de apoyo ───────────────────────────────────────── */
function OptionCard({
  selected, onClick, icon: Icon, label, hint,
}: { selected: boolean; onClick: () => void; icon?: LucideIcon; label: string; hint?: string }) {
  return (
    <button type="button" className={`onb-option${selected ? " selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      {Icon && <span className="onb-option-icon"><Icon /></span>}
      <span className="onb-option-text"><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
      <span className="onb-option-check">{selected && <Check />}</span>
    </button>
  );
}

/* ── Flujo principal ────────────────────────────────────────────── */
export function AffiliateFlow() {
  const [stage, setStage] = useState<Stage>("onboarding");
  const [step, setStep] = useState(0);
  const [termMonths, setTermMonths] = useState(DEFAULT_TERM);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [submittedData, setSubmittedData] = useState<AffiliateGuidanceInput | null>(null);
  const [contactError, setContactError] = useState("");
  const [sendingContact, setSendingContact] = useState(false);

  const { register, handleSubmit, control, trigger, setValue, formState: { errors } } =
    useForm<AffiliateGuidanceInput>({
      resolver: zodResolver(affiliateGuidanceSchema),
      mode: "onTouched",
      defaultValues: {
        identifier: "", fullName: "", email: "", addressOrZone: "", incomeRange: "", employmentStatus: "",
        affiliationCategory: undefined, gender: undefined, need: undefined, interestedProducts: [],
        loanAmount: DEFAULT_AMOUNT, dependents: 0, tenureMonths: undefined,
        monthlyPayment: estimateMonthly(DEFAULT_AMOUNT, DEFAULT_TERM),
        horizon: "EXPLORING", preferredChannel: "IN_APP", preferredTimeBand: "WEEKDAY_MORNING",
        contactFrequency: "ONCE_MONTH", wantsAdvisor: false, guidanceConsent: false,
        behaviorConsent: false, contactConsent: false, financialDataConsent: false, rneExcluded: false,
      },
    });

  const v = useWatch({ control }) as Partial<AffiliateGuidanceInput>;
  const loanAmount = v.loanAmount ?? DEFAULT_AMOUNT;
  const estimatedCuota = useMemo(() => estimateMonthly(loanAmount, termMonths), [loanAmount, termMonths]);

  const syncAmount = (amount: number) => {
    setValue("loanAmount", amount, { shouldValidate: false });
    setValue("monthlyPayment", estimateMonthly(amount, termMonths));
  };
  const syncTerm = (months: number) => {
    setTermMonths(months);
    setValue("monthlyPayment", estimateMonthly(loanAmount, months));
  };

  const next = async () => {
    const fields = STEP_FIELDS[step] ?? [];
    if (fields.length && !(await trigger(fields))) return;
    setStep((current) => Math.min(current + 1, LAST_STEP));
  };
  const back = () => setStep((current) => Math.max(current - 1, 0));

  const analyze = (data: AffiliateGuidanceInput) => {
    setSubmittedData(data);
    setStage("analyzing");
    window.setTimeout(() => {
      setGuidance(calculateAffiliateGuidance(data));
      setStage("result");
    }, 650);
  };

  const requestContact = async () => {
    if (!submittedData) return;
    setSendingContact(true);
    setContactError("");
    try {
      const response = await fetch("/api/profiles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(affiliateContactPayload(submittedData)),
      });
      if (!response.ok) throw new Error("No fue posible registrar la solicitud");
      setStage("contacted");
    } catch {
      setContactError("No pudimos registrar la solicitud. Tus datos siguen guardados para que intentes de nuevo.");
    } finally {
      setSendingContact(false);
    }
  };

  if (stage === "analyzing") {
    return (
      <main className="affiliate-page">
        <section className="affiliate-state" aria-live="polite">
          <span className="analysis-spinner"><LoaderCircle /></span>
          <p className="eyebrow">Analizando afinidad</p>
          <h1>Estamos organizando lo que nos contaste</h1>
          <div className="analysis-steps">
            <span><Check /> Datos que declaraste en el onboarding</span>
            <span><Check /> Interacciones propias solo si las autorizaste</span>
            <span><Check /> Catálogo y reglas explicables</span>
          </div>
          <small>No evaluamos aprobación, riesgo ni capacidad de pago.</small>
        </section>
      </main>
    );
  }

  if (stage === "result" && guidance) {
    return (
      <main className="affiliate-page">
        <AffiliateResult
          guidance={guidance} input={submittedData!} sendingContact={sendingContact}
          contactError={contactError} onContact={() => void requestContact()}
          onEdit={() => { setStage("onboarding"); setStep(1); }}
        />
      </main>
    );
  }

  if (stage === "contacted" && guidance) {
    return (
      <main className="affiliate-page">
        <section className="affiliate-state affiliate-success" aria-live="polite">
          <span className="success-mark"><Check /></span>
          <p className="eyebrow">Solicitud registrada</p>
          <h1>Tu caso quedó listo para revisión humana</h1>
          <p>El portal conserva tus autorizaciones y preferencias. Un contacto solo podrá realizarse si el consentimiento, el canal, el RNE simulado, la frecuencia y el horario lo permiten.</p>
          <div className="contact-summary">
            <span>Producto orientado</span>
            <strong>{getProduct(guidance.recommendations[0]!.productId).name}</strong>
            <small>No representa aprobación de crédito.</small>
          </div>
          <Link className="button button-primary" href="/demo?view=reviews">Ver caso en portal para asesores <ChevronRight /></Link>
          <Link className="text-link" href="/">Volver al inicio</Link>
        </section>
      </main>
    );
  }

  const pct = step === 0 ? 0 : Math.round((step / LAST_STEP) * 100);

  return (
    <main className="onb">
      <header className="onb-top">
        {step > 0
          ? <button type="button" className="onb-back" onClick={back} aria-label="Volver"><ArrowLeft /></button>
          : <BrandLockup />}
        {step > 0 && <div className="onb-progress" aria-hidden><i style={{ width: `${pct}%` }} /></div>}
        {step > 0
          ? <span className="onb-count">{step} / {LAST_STEP}</span>
          : <Link href="/demo" className="experience-switch"><BriefcaseBusiness /> Asesores</Link>}
      </header>

      <form className="onb-body" onSubmit={handleSubmit(analyze)} noValidate>
        <div className="onb-stage" key={step}>
          {step === 0 && (
            <div className="onb-intro">
              <span className="eyebrow"><Sparkles /> Orientación crediticia</span>
              <h1>Encontremos el crédito que se parece a lo que necesitas.</h1>
              <p>Te haremos unas pocas preguntas. Creasy explica la afinidad y deja la decisión financiera en manos de los procesos autorizados de Colsubsidio.</p>
              <div className="onb-intro-trust">
                <span><ShieldCheck /> Autorizaciones separadas por finalidad</span>
                <span><FileCheck2 /> Recomendaciones con razones y datos faltantes</span>
                <span><UserRound /> Tú eliges si quieres contacto humano</span>
              </div>
              <p className="onb-intro-time">⏱️ Menos de 2 minutos · sin consultas externas</p>
            </div>
          )}

          {step === 1 && (
            <StepShell title="¿Qué quieres lograr?" subtitle="Elige tu objetivo principal. Con esto empezamos a orientar la mejor opción.">
              <div className="onb-options">
                {AFFILIATE_NEEDS.map((need) => {
                  const meta = NEED_META[need.value];
                  return (
                    <OptionCard key={need.value} selected={v.need === need.value}
                      onClick={() => setValue("need", need.value, { shouldValidate: true })}
                      icon={meta?.icon} label={need.label} hint={meta?.hint} />
                  );
                })}
              </div>
              {errors.need && <p className="onb-error"><CircleAlert /> {errors.need.message}</p>}
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="¿Cuánto necesitas?" subtitle="Mueve el control para acercarte al monto que tienes en mente. Es solo una referencia.">
              <div className="onb-amount">
                <strong>{cop(loanAmount)}</strong>
                <input type="range" min={AMOUNT_MIN} max={AMOUNT_MAX} step={AMOUNT_STEP}
                  value={loanAmount} onChange={(e) => syncAmount(Number(e.target.value))}
                  className="onb-slider" aria-label="Monto aproximado" />
                <div className="onb-slider-scale"><span>{cop(AMOUNT_MIN)}</span><span>{cop(AMOUNT_MAX)}</span></div>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="¿En cuánto tiempo lo pagarías?" subtitle="Ajusta el plazo y verás una cuota mensual estimada al instante.">
              <div className="onb-terms">
                {TERM_OPTIONS.map((months) => (
                  <button type="button" key={months} className={`onb-term${termMonths === months ? " selected" : ""}`} onClick={() => syncTerm(months)}>
                    {months} <small>meses</small>
                  </button>
                ))}
              </div>
              <div className="onb-quote">
                <div><small>Cuota mensual estimada</small><strong>{cop(estimatedCuota)}</strong></div>
                <div><small>Plazo</small><b>{termMonths} meses</b></div>
              </div>
              <p className="onb-quote-note"><ShieldCheck /> Estimación ilustrativa con una tasa de referencia. No es una oferta ni una aprobación; el monto, la tasa y las condiciones requieren estudio de crédito.</p>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="¿Cuándo te gustaría avanzar?" subtitle="Esto nos ayuda a saber el momento correcto para acompañarte, no a presionarte.">
              <div className="onb-options">
                {HORIZON_OPTIONS.map((option) => (
                  <OptionCard key={option.value} selected={v.horizon === option.value}
                    onClick={() => setValue("horizon", option.value, { shouldValidate: true })}
                    label={option.label} hint={option.hint} />
                ))}
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Tu situación laboral" subtitle="Colsubsidio conoce parte de esto por tus aportes. Confírmalo para orientar mejor tu elegibilidad.">
              <p className="onb-field-label">Categoría de afiliación *</p>
              <div className="onb-options compact">
                {CATEGORY_OPTIONS.map((option) => (
                  <OptionCard key={option.value} selected={v.affiliationCategory === option.value}
                    onClick={() => setValue("affiliationCategory", option.value, { shouldValidate: true })}
                    label={option.label} hint={option.hint} />
                ))}
              </div>
              {errors.affiliationCategory && <p className="onb-error"><CircleAlert /> {errors.affiliationCategory.message}</p>}

              <p className="onb-field-label">Situación laboral *</p>
              <div className="onb-chips">
                {employmentOptions.map(([value, label]) => (
                  <button type="button" key={value} className={`onb-chip${v.employmentStatus === value ? " selected" : ""}`}
                    onClick={() => setValue("employmentStatus", value, { shouldValidate: true })}>{label}</button>
                ))}
              </div>
              {errors.employmentStatus && <p className="onb-error"><CircleAlert /> {errors.employmentStatus.message}</p>}

              <div className="onb-inline">
                <p className="onb-field-label">Ingreso aproximado</p>
                <div className="onb-chips">
                  {incomeOptions.map((option) => (
                    <button type="button" key={option} className={`onb-chip${v.incomeRange === option ? " selected" : ""}`}
                      onClick={() => setValue("incomeRange", option)}>{option}</button>
                  ))}
                </div>
              </div>

              <label className="onb-input">
                <span>Antigüedad laboral aproximada (meses)</span>
                <input type="number" min="0" max="600" placeholder="Ej. 18"
                  {...register("tenureMonths", { setValueAs: (value) => value === "" ? undefined : Number(value) })} />
                <small>Referencia oficial: 2 meses (6 si el contrato no es indefinido).</small>
              </label>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell title="Tu hogar" subtitle="El número de personas a cargo nos ayuda a entender tu etapa de vida. Es opcional.">
              <div className="onb-stepper">
                <span>Personas a cargo</span>
                <div>
                  <button type="button" onClick={() => setValue("dependents", Math.max(0, (v.dependents ?? 0) - 1))} aria-label="Menos"><Minus /></button>
                  <strong>{v.dependents ?? 0}</strong>
                  <button type="button" onClick={() => setValue("dependents", Math.min(20, (v.dependents ?? 0) + 1))} aria-label="Más"><ArrowRight style={{ transform: "rotate(-90deg)" }} /></button>
                </div>
              </div>
              <p className="onb-quote-note"><UserRound /> El género declarado solo verifica si Crédito Mujer corresponde. Nunca modifica la afinidad de los demás productos.</p>
            </StepShell>
          )}

          {step === 7 && (
            <StepShell title="¿Quién eres?" subtitle="Para dejar tu orientación lista y, si lo pides, disponible para una asesora.">
              <label className="onb-input">
                <span>Nombre completo *</span>
                <input autoComplete="name" placeholder="Ej. Valentina Ríos" {...register("fullName")} />
                {errors.fullName && <em>{errors.fullName.message}</em>}
              </label>
              <div>
                <p className="onb-field-label">Género declarado *</p>
                <div className="onb-chips">
                  {[
                    ["WOMAN", "Mujer"],
                    ["MAN", "Hombre"],
                    ["NON_BINARY", "No binario"],
                    ["PREFER_NOT_TO_SAY", "Prefiero no responder"],
                  ].map(([value, label]) => (
                    <button type="button" key={value} className={`onb-chip${v.gender === value ? " selected" : ""}`}
                      onClick={() => setValue("gender", value as AffiliateGuidanceInput["gender"], { shouldValidate: true })}>{label}</button>
                  ))}
                </div>
                {errors.gender && <p className="onb-error"><CircleAlert /> {errors.gender.message}</p>}
                <small className="onb-field-help">No inferimos este dato por el nombre. Solo se usa para validar la correspondencia de Crédito Mujer.</small>
              </div>
              <label className="onb-input">
                <span>Cédula o identificador *</span>
                <input inputMode="numeric" placeholder="Ej. 1020304050" {...register("identifier")} />
                {errors.identifier && <em>{errors.identifier.message}</em>}
              </label>
              <label className="onb-input">
                <span>Ciudad o zona *</span>
                <input autoComplete="address-level2" placeholder="Ej. Bogotá · Suba" {...register("addressOrZone")} />
                {errors.addressOrZone && <em>{errors.addressOrZone.message}</em>}
              </label>
              <label className="onb-input">
                <span>Correo (opcional)</span>
                <input type="email" autoComplete="email" placeholder="persona@ejemplo.com" {...register("email")} />
                {errors.email && <em>{errors.email.message}</em>}
              </label>
            </StepShell>
          )}

          {step === 8 && (
            <StepShell title="¿Cómo prefieres que te acompañemos?" subtitle="Tú defines el canal, el horario y con qué frecuencia.">
              <p className="onb-field-label">Canal preferido</p>
              <div className="onb-chips">
                {CHANNEL_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button type="button" key={value} className={`onb-chip icon${v.preferredChannel === value ? " selected" : ""}`}
                    onClick={() => setValue("preferredChannel", value)}><Icon /> {label}</button>
                ))}
              </div>
              <p className="onb-field-label">Horario preferido</p>
              <div className="onb-chips">
                {TIMEBAND_OPTIONS.map(({ value, label }) => (
                  <button type="button" key={value} className={`onb-chip${v.preferredTimeBand === value ? " selected" : ""}`}
                    onClick={() => setValue("preferredTimeBand", value)}>{label}</button>
                ))}
              </div>
              <p className="onb-field-label">Frecuencia máxima</p>
              <div className="onb-chips">
                {FREQUENCY_OPTIONS.map(({ value, label }) => (
                  <button type="button" key={value} className={`onb-chip${v.contactFrequency === value ? " selected" : ""}`}
                    onClick={() => setValue("contactFrequency", value)}>{label}</button>
                ))}
              </div>
              <label className="onb-toggle">
                <input type="checkbox" {...register("wantsAdvisor")} />
                <span>Quiero que una asesora me ayude a continuar.</span>
              </label>
            </StepShell>
          )}

          {step === 9 && (
            <StepShell title="Tus permisos" subtitle="Elige para qué podemos usar tus datos. Puedes recibir orientación sin autorizar contacto.">
              <label className="onb-consent">
                <input type="checkbox" {...register("guidanceConsent")} />
                <span><strong>Orientación con lo que declaré.</strong> Necesaria para mostrar resultados. *</span>
              </label>
              <label className="onb-consent">
                <input type="checkbox" {...register("behaviorConsent")} />
                <span><strong>Personalización por mis interacciones en Creasy.</strong> No incluye rastreo externo.</span>
              </label>
              <label className="onb-consent">
                <input type="checkbox" {...register("contactConsent")} />
                <span><strong>Contacto comercial.</strong> Solo por el canal y la frecuencia que elegí{v.wantsAdvisor ? " (necesaria para solicitar asesora)" : ""}.</span>
              </label>
              <label className="onb-consent">
                <input type="checkbox" {...register("financialDataConsent")} />
                <span><strong>Simulación financiera futura.</strong> Para usar datos financieros que yo entregue de forma expresa.</span>
              </label>
              {errors.guidanceConsent && <p className="onb-error"><CircleAlert /> {errors.guidanceConsent.message}</p>}
              {errors.contactConsent && <p className="onb-error"><CircleAlert /> {errors.contactConsent.message}</p>}
              <details className="onb-privacy">
                <summary>Preferencias de privacidad del prototipo</summary>
                <label className="onb-consent"><input type="checkbox" {...register("rneExcluded")} /><span>Simular que estoy inscrito en el Registro de Números Excluidos (bloquea contacto).</span></label>
                <small>Esta opción no consulta ni modifica el RNE real.</small>
              </details>
            </StepShell>
          )}
        </div>

        <footer className={`onb-foot${step === 0 ? " intro" : ""}`}>
          {step === LAST_STEP
            ? <button type="submit" className="button button-primary onb-cta">Ver mis opciones <ArrowRight /></button>
            : <button type="button" className="button button-primary onb-cta" onClick={() => void next()}>
                {step === 0 ? "Comenzar" : "Continuar"} <ArrowRight />
              </button>}
          {step === 0 && <small className="onb-foot-note"><ShieldCheck /> Prototipo sin consultas externas reales.</small>}
        </footer>
      </form>

      {step === 0 && <ProductCatalog />}
    </main>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="onb-step">
      <div className="onb-step-head"><h1>{title}</h1><p>{subtitle}</p></div>
      {children}
    </div>
  );
}

function AffiliateResult({ guidance, input, sendingContact, contactError, onContact, onEdit }: {
  guidance: Guidance; input: AffiliateGuidanceInput; sendingContact: boolean; contactError: string; onContact: () => void; onEdit: () => void;
}) {
  const [top, ...alternatives] = guidance.recommendations;
  const product = getProduct(top!.productId);
  const next = buildNextBestAction(guidance.profile, top!);
  const canRequest = input.wantsAdvisor && input.contactConsent && !input.rneExcluded && input.contactFrequency !== "NO_CONTACT";
  return <section className="affiliate-result">
    <div className="result-heading"><div><span className="eyebrow"><Sparkles /> Orientación lista</span><h1>Esta opción tiene mayor afinidad contigo</h1><p>La calculamos con lo que declaraste en el onboarding y reglas transparentes del portafolio.</p></div><button className="button button-secondary" onClick={onEdit}><Pencil /> Modificar información</button></div>
    <article className="affiliate-top-card"><div className="affiliate-score"><strong>{top!.affinityScore}</strong><span>/100</span></div><div><small>Mayor afinidad</small><h2>{product.name}</h2><p>{product.objective}</p><span className="confidence-pill">Confianza {top!.confidence}%</span></div></article>
    <div className="affiliate-explanation four">
      <article><h3>Por qué esta opción</h3><ul>{top!.positiveSignals.slice(0, 3).map((signal) => <li key={signal}><Check />{signal}</li>)}</ul></article>
      <article><h3>Por qué podría ser un buen momento</h3><p>{next.moment}</p><small>Basado únicamente en el horizonte que seleccionaste.</small></article>
      <article><h3>Qué necesitamos confirmar</h3><ul>{next.missing.length ? next.missing.map((signal) => <li key={signal}><CircleAlert />{signal}</li>) : <li><Check />No hay faltantes básicos en esta orientación.</li>}</ul></article>
      <article><h3>Cómo prefieres continuar</h3><p>Canal: <strong>{next.channel}</strong></p><p>Acción sugerida: <strong>{next.action.replaceAll("_", " ")}</strong></p><small>Siempre requiere revisión humana.</small></article>
    </div>
    {alternatives.length > 0 && <div className="affiliate-alternatives"><h2>También podrían interesarte</h2><div>{alternatives.slice(0, 2).map((result) => { const item = getProduct(result.productId); return <article key={result.productId}><span>{result.affinityScore}/100</span><h3>{item.name}</h3><p>{item.objective}</p></article>; })}</div></div>}
    <div className="affiliate-disclaimer"><ShieldCheck /><p>Esta orientación no es una oferta ni una aprobación. Monto, tasa, condiciones y elegibilidad requieren validación oficial, estudio de crédito y revisión humana.</p></div>
    <div className="affiliate-result-actions"><button className="button button-primary" disabled={sendingContact || !canRequest} onClick={onContact}>{sendingContact ? "Registrando solicitud…" : "Solicitar ayuda de una asesora"} <ArrowRight /></button><button className="button button-secondary" onClick={onEdit}><ArrowLeft /> Regresar y modificar</button></div>
    {!canRequest && <p className="affiliate-policy-note"><ShieldCheck /> No registramos contacto porque no lo solicitaste, falta autorización o elegiste una preferencia de bloqueo.</p>}
    {contactError && <p className="affiliate-error" role="alert"><CircleAlert />{contactError}</p>}
  </section>;
}

function ProductCatalog() {
  return <section className="product-catalog" id="catalogo" aria-labelledby="catalog-title">
    <div className="catalog-heading"><span className="eyebrow"><BookOpenCheck /> Catálogo del prototipo</span><h2 id="catalog-title">Cinco familias principales y el portafolio ampliado</h2><p>El reto prioriza Cupo/Consumo, Vivienda, Crédito Mujer y Educativo. El brief amplía la referencia con Compra de cartera, Complementario y Seguros e impuestos. Libre inversión permanece como categoría adicional pendiente de validación oficial.</p></div>
    <div className="catalog-grid">{PRODUCTS.map((product) => <article key={product.id}>
      <span className={product.briefSource === "RECURSOS_RETO_CREDITO_PDF" ? "source-tag documented" : "source-tag pending"}>{product.briefSource === "RECURSOS_RETO_CREDITO_PDF" ? "Documentado en brief" : "Producto adicional"}</span>
      <h3>{product.name}</h3><p>{product.objective}</p>
      <details><summary>Ver información disponible</summary>{product.facts.length > 0 ? <ul>{product.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <p>No se muestran condiciones hasta contar con validación oficial.</p>}{product.notice && <div className="catalog-notice"><CircleAlert />{product.notice}</div>}</details>
    </article>)}</div>
  </section>;
}
