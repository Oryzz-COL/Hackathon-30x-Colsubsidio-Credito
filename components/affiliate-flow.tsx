"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type FieldErrors, type Path, type UseFormRegister } from "react-hook-form";
import {
  ArrowLeft, ArrowRight, BadgeCheck, BookOpenCheck, BriefcaseBusiness, CalendarClock, Check, ChevronRight,
  CircleAlert, FileCheck2, GraduationCap, Home, Layers, LoaderCircle, Mail,
  MessageCircle, MessageSquare, Minus, Pencil, Phone, ReceiptText, Rocket,
  Plus, Scale, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Target, UserRound,
  type LucideIcon,
} from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { ChannelPreview } from "@/components/channel-preview";
import { getProduct, PRODUCTS } from "@/config/products";
import { saveCase } from "@/lib/demo-case";
import { suggestContactMessage, type OutboxMessage } from "@/lib/notificaciones";
import {
  AFFILIATE_NEEDS, affiliateContactPayload, affiliateGuidanceSchema,
  calculateAffiliateGuidance, type AffiliateGuidanceInput,
} from "@/lib/affiliate-guidance";
import { buildNextBestAction } from "@/lib/personalization";
import {
  estimateMonthlyPayment, hasPayrollOption, rateFor, RATES,
  type DecisionResult,
} from "@/lib/decision/engine";
import { CITIES_BY_DEPARTMENT, cityLabel } from "@/data/ciudades";
import type { AffinityResult, Profile } from "@/lib/types";

type Guidance = ReturnType<typeof calculateAffiliateGuidance>;
type Stage = "onboarding" | "analyzing" | "result" | "contacted";
type ConsentField = "guidanceConsent" | "behaviorConsent" | "contactConsent" | "financialDataConsent";

/* ── Configuración del simulador ────────────────────────────────── */
const AMOUNT_MIN = 500_000;
const AMOUNT_MAX = 80_000_000;
const AMOUNT_STEP = 500_000;
/** Plazos publicados: 6 a 72 meses con libranza, 6 a 60 sin ella. */
const TERM_OPTIONS = [6, 12, 18, 24, 36, 48, 60, 72];
const DEFAULT_AMOUNT = 5_000_000;
const DEFAULT_TERM = 24;

/**
 * La cuota del simulador sale del mismo motor que después emite el veredicto.
 * Si aquí se calculara aparte, el afiliado vería una cifra en el paso 3 y otra
 * distinta en el resultado, que es la clase de detalle que hunde una demo.
 */
const estimateMonthly = (amount: number, months: number, ea?: number) =>
  estimateMonthlyPayment(amount, months, ea);

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
  const [notifications, setNotifications] = useState<OutboxMessage[]>([]);
  const [openMail, setOpenMail] = useState<{ subject: string; html: string } | null>(null);

  const { register, handleSubmit, control, trigger, setValue, formState: { errors, isSubmitted } } =
    useForm<AffiliateGuidanceInput>({
      resolver: zodResolver(affiliateGuidanceSchema),
      mode: "onTouched",
      defaultValues: {
        identifier: "", fullName: "", email: "", addressOrZone: "", incomeRange: "", employmentStatus: "",
        affiliationCategory: undefined, gender: undefined, need: undefined, interestedProducts: [],
        loanAmount: DEFAULT_AMOUNT, dependents: 0, tenureMonths: undefined,
        termMonths: DEFAULT_TERM,
        monthlyPayment: estimateMonthly(DEFAULT_AMOUNT, DEFAULT_TERM),
        horizon: "EXPLORING", preferredChannel: "IN_APP", preferredTimeBand: "WEEKDAY_MORNING",
        contactFrequency: "ONCE_MONTH", wantsAdvisor: false, guidanceConsent: false,
        behaviorConsent: false, contactConsent: false, financialDataConsent: false, rneExcluded: false,
      },
    });

  const v = useWatch({ control }) as Partial<AffiliateGuidanceInput>;
  const loanAmount = v.loanAmount ?? DEFAULT_AMOUNT;
  /*
   * La tasa se afina sola: al llegar al paso 3 todavía no sabemos categoría ni
   * vinculación, así que se usa la de referencia; si la persona vuelve atrás
   * después de declararlas, la cuota se recalcula con su tasa real.
   */
  const appliedRate = useMemo(
    () => rateFor("libre-inversion", v.affiliationCategory, hasPayrollOption(v.employmentStatus)),
    [v.affiliationCategory, v.employmentStatus]
  );
  const estimatedCuota = useMemo(
    () => estimateMonthly(loanAmount, termMonths, appliedRate),
    [loanAmount, termMonths, appliedRate]
  );

  const syncAmount = (amount: number) => {
    setValue("loanAmount", amount, { shouldValidate: false });
    setValue("monthlyPayment", estimateMonthly(amount, termMonths, appliedRate));
  };
  const syncTerm = (months: number) => {
    setTermMonths(months);
    setValue("termMonths", months);
    setValue("monthlyPayment", estimateMonthly(loanAmount, months, appliedRate));
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
      const payload = await response.json() as { data: Profile; notifications?: OutboxMessage[] };
      const messages = payload.notifications ?? [];
      /*
       * El caso se guarda aquí, en el navegador de quien lo creó, y por eso el
       * portal de la asesora lo encuentra al abrirlo. El servidor no conserva
       * copia: si esto no se guardara, la solicitud no existiría en ninguna
       * parte, que es exactamente lo que pasaba antes.
       */
      saveCase(payload.data, messages);
      setNotifications(messages);
      setStage("contacted");
    } catch {
      setContactError("No pudimos registrar la solicitud. Tus datos siguen guardados para que intentes de nuevo.");
    } finally {
      setSendingContact(false);
    }
  };

  const openMessage = (id: string) => {
    const message = notifications.find((item) => item.id === id);
    if (message) setOpenMail({ subject: message.subject, html: message.html });
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
    const mine = notifications.find((notification) => notification.audience === "AFILIADO");
    const advisor = notifications.find((notification) => notification.audience === "ASESOR");
    return (
      <main className="affiliate-page">
        <section className="affiliate-state affiliate-success" aria-live="polite">
          <span className="success-mark"><Check /></span>
          <p className="eyebrow">Solicitud registrada</p>
          <h1>Tu caso quedó listo para revisión humana</h1>
          <p>El portal conserva tus autorizaciones y preferencias. Un contacto solo podrá realizarse si el consentimiento, el canal, el RNE simulado, la frecuencia y el horario lo permiten.</p>

          {notifications.length > 0 && <div className="mail-sent">
            <div className="mail-sent-head"><Mail /><div><strong>Enviamos {notifications.length} correos</strong><small>Uno para ti con tu resultado y otro para el equipo asesor con tu caso.</small></div></div>
            {mine && <button type="button" className="mail-sent-row" onClick={() => openMessage(mine.id)}>
              <span className="mail-tag">Para ti</span>
              <div><strong>{mine.subject}</strong><small>{mine.to}</small></div>
              <ChevronRight />
            </button>}
            {advisor && <button type="button" className="mail-sent-row" onClick={() => openMessage(advisor.id)}>
              <span className="mail-tag advisor">Para tu asesora</span>
              <div><strong>{advisor.subject}</strong><small>{advisor.to}</small></div>
              <ChevronRight />
            </button>}
            <small className="mail-sent-note"><ShieldCheck /> En esta demostración los correos se retienen en la aplicación para poder mostrarlos; el contenido es exactamente el que se enviaría.</small>
          </div>}

          <div className="contact-summary">
            <span>Producto orientado</span>
            <strong>{getProduct(guidance.recommendations[0]!.productId).name}</strong>
            <small>No representa aprobación de crédito.</small>
          </div>
          <Link className="button button-primary" href="/demo?view=reviews">Ver caso en portal para asesores <ChevronRight /></Link>
          <Link className="text-link" href="/">Volver al inicio</Link>
        </section>
        {openMail && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={openMail.subject} onClick={() => setOpenMail(null)}>
          <div className="mail-preview" onClick={(event) => event.stopPropagation()}>
            <header><strong>{openMail.subject}</strong><button type="button" onClick={() => setOpenMail(null)} aria-label="Cerrar">×</button></header>
            <iframe title={openMail.subject} srcDoc={openMail.html} sandbox="" />
          </div>
        </div>}
      </main>
    );
  }

  const pct = step === 0 ? 0 : Math.round((step / LAST_STEP) * 100);

  return (
    <main className="onb">
      <header className="onb-top">
        {step > 0
          ? <button type="button" className="onb-back" onClick={back} aria-label="Volver"><ArrowLeft /></button>
          : <BrandLockup surface="light" />}
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
              <p className="onb-quote-note"><ShieldCheck /> Calculada con la tasa de {(appliedRate * 100).toFixed(2)} % E.A., {RATES.vigencia}. Es una foto de demo que debe actualizarse antes de uso real; no es una oferta ni una aprobación.</p>
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
                  <button type="button" onClick={() => setValue("dependents", Math.min(20, (v.dependents ?? 0) + 1))} aria-label="Más"><Plus /></button>
                </div>
              </div>
              {/*
                * La nota tiene que explicar el paso en el que está. Aquí decía
                * que el género solo valida Crédito Mujer, dos pantallas antes de
                * que se pregunte el género: quien lo leía se quedaba buscando un
                * campo que no existe todavía.
                */}
              <p className="onb-quote-note"><UserRound /> Con esto estimamos cuánto de tu ingreso queda libre para una cuota. No cambia el producto que te corresponde ni se usa para descartarte.</p>
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
                <span>Cédula (opcional)</span>
                {/*
                  * El filtro de dígitos ocurre al escribir, no al enviar: si la
                  * persona teclea puntos por costumbre, simplemente no aparecen,
                  * en vez de recibir un error después de rellenar todo.
                  */}
                <input
                  inputMode="numeric" autoComplete="off" maxLength={10} placeholder="Puedes dejarlo en blanco"
                  {...register("identifier", {
                    onChange: (event) => {
                      const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
                      if (digits !== event.target.value) setValue("identifier", digits, { shouldValidate: false });
                    },
                  })}
                />
                <small>Para orientarte no necesitamos identificarte. Si lo dejas, la asesora encuentra tu caso más rápido; si no, recibes exactamente la misma orientación.</small>
                {errors.identifier && <em>{errors.identifier.message}</em>}
              </label>
              <label className="onb-input">
                <span>Ciudad *</span>
                <select {...register("addressOrZone")} defaultValue="">
                  <option value="" disabled>Selecciona tu ciudad</option>
                  {Object.entries(CITIES_BY_DEPARTMENT).map(([department, cities]) => (
                    <optgroup key={department} label={department}>
                      {cities.map((city) => {
                        const label = cityLabel(city);
                        return <option key={label} value={label}>{city.name}</option>;
                      })}
                    </optgroup>
                  ))}
                </select>
                {errors.addressOrZone && <em>{errors.addressOrZone.message}</em>}
              </label>
              <label className="onb-input">
                <span>Correo *</span>
                <input type="email" autoComplete="email" placeholder="persona@ejemplo.com" {...register("email")} />
                <small>Aquí te enviamos el resultado de tu solicitud.</small>
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
            <StepShell title="Términos y condiciones" subtitle="Léelos, acéptalos y listo. Si prefieres decidir permiso por permiso, puedes hacerlo abajo.">
              <TermsStep
                values={v}
                errors={isSubmitted ? errors : {}}
                onAcceptMinimum={() => {
                  setValue("guidanceConsent", true, { shouldValidate: true });
                }}
                onToggle={(field, value) => setValue(field, value, { shouldValidate: true })}
                register={register}
              />
            </StepShell>
          )}
        </div>

        <footer className={`onb-foot${step === 0 ? " intro" : ""}`}>
          {step === LAST_STEP
            ? <button type="submit" className="button button-primary onb-cta">Ver mis opciones <ArrowRight /></button>
            : <button type="button" className="button button-primary onb-cta" onClick={() => void next()}>
                {step === 0 ? "Comenzar" : "Continuar"} <ArrowRight />
              </button>}
          {step === 0 && <small className="onb-foot-note"><ShieldCheck /> No consultamos fuentes externas durante la orientación.</small>}
        </footer>
      </form>

      {step === 0 && <ProductCatalog />}
    </main>
  );
}

/**
 * Términos y condiciones con autorización mínima visible.
 *
 * La orientación es la única finalidad imprescindible para mostrar el
 * resultado. Contacto, comportamiento y datos financieros se eligen por
 * separado y nunca quedan activos por aceptar lo mínimo.
 */
function TermsStep({ values, errors, onAcceptMinimum, onToggle, register }: {
  values: Partial<AffiliateGuidanceInput>;
  errors: FieldErrors<AffiliateGuidanceInput>;
  onAcceptMinimum: () => void;
  onToggle: (field: ConsentField, value: boolean) => void;
  register: UseFormRegister<AffiliateGuidanceInput>;
}) {
  const permissions: { field: ConsentField; title: string; text: string; required?: boolean }[] = [
    {
      field: "guidanceConsent",
      title: "Orientación con los datos que declaré",
      text: "Usamos lo que nos contaste para calcular qué línea de crédito corresponde a tu meta y si el escenario que planteaste se sostiene. Sin esta autorización no hay resultado que mostrarte.",
      required: true,
    },
    {
      field: "contactConsent",
      title: "Contacto comercial",
      text: "Una persona asesora puede escribirte o llamarte, solo por el canal, el horario y la frecuencia que elegiste en el paso anterior. Puedes revocarlo cuando quieras.",
    },
    {
      field: "behaviorConsent",
      title: "Personalización con mis interacciones",
      text: "Guardamos lo que haces dentro de Creasy —qué consultas, qué comparas— para afinar la orientación. No incluye navegación externa, redes sociales ni datos de terceros.",
    },
    {
      field: "financialDataConsent",
      title: "Simulación financiera con datos que yo entregue",
      text: "Si más adelante compartes soportes de ingresos, los usamos para afinar la simulación. Nunca los buscamos por nuestra cuenta ni consultamos centrales de riesgo.",
    },
  ];

  const minimumAccepted = Boolean(values.guidanceConsent);

  return <div className="terms">
    <div className="terms-doc">
      <h3>Autorización de tratamiento de datos personales</h3>
      <p>Al continuar autorizas a la Caja de Compensación Familiar Colsubsidio a tratar los datos personales que declaraste en este formulario con las finalidades que se detallan abajo, en los términos de la Ley 1581 de 2012 y del Decreto 1074 de 2015.</p>
      <p>Como titular puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar esta autorización en cualquier momento. Creasy no consulta centrales de riesgo, no adquiere bases de datos de terceros y no infiere información que no hayas declarado. La orientación que recibas no constituye una oferta ni una aprobación de crédito.</p>
    </div>

    <button type="button" className={`terms-accept-all${minimumAccepted ? " accepted" : ""}`} onClick={onAcceptMinimum}>
      <span>{minimumAccepted ? <Check /> : <span className="terms-box" />}</span>
      <span><strong>Autorizo solo lo necesario para ver mi orientación</strong><small>No activa contacto, seguimiento de interacciones ni datos financieros.</small></span>
    </button>

    <details className="terms-detail">
      <summary>Administrar permisos opcionales</summary>
      <div className="terms-list">
        {permissions.map((permission) => <label key={permission.field} className="terms-item">
          <input
            type="checkbox"
            checked={Boolean(values[permission.field])}
            onChange={(event) => onToggle(permission.field, event.target.checked)}
          />
          <span>
            <strong>{permission.title}{permission.required && <b> · obligatoria</b>}</strong>
            <small>{permission.text}</small>
          </span>
        </label>)}
      </div>
      <label className="terms-item rne">
        <input type="checkbox" {...register("rneExcluded")} />
        <span>
          <strong>Simular que estoy inscrito en el Registro Nacional de Excluidos</strong>
          <small>Bloquea cualquier contacto comercial. Esta opción no consulta ni modifica el RNE real: es una demostración del control.</small>
        </span>
      </label>
    </details>

    {errors.guidanceConsent && <p className="onb-error"><CircleAlert /> {errors.guidanceConsent.message}</p>}
    {errors.contactConsent && <p className="onb-error"><CircleAlert /> {errors.contactConsent.message}</p>}
  </div>;
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
  const [top, ...rest] = guidance.recommendations;
  /*
   * Una alternativa en cero no es una alternativa: es el motor diciendo que ese
   * producto no aplica. Enseñar "Crédito hipotecario 0/100" debajo de la
   * recomendación no informaba nada y hacía dudar del resto de la pantalla.
   */
  const alternatives = rest.filter((result) => result.affinityScore > 0);
  const product = getProduct(top!.productId);
  const next = buildNextBestAction(guidance.profile, top!);
  const decision = guidance.decision;
  const canRequest = input.wantsAdvisor && input.contactConsent && !input.rneExcluded && input.contactFrequency !== "NO_CONTACT";
  return <section className="affiliate-result">
    <div className="result-heading"><div><span className="eyebrow"><Sparkles /> Resultado de tu solicitud</span><h1>{decision.headline}</h1><p>{decision.summary}</p></div><button className="button button-secondary" onClick={onEdit}><Pencil /> Modificar información</button></div>

    <Verdict decision={decision} productName={product.name} />

    <article className="affiliate-top-card"><div className="affiliate-score"><strong>{top!.affinityScore}</strong><span>/100</span></div><div><small>Producto con mayor afinidad para tu meta</small><h2>{product.name}</h2><p>{product.objective}</p><span className="confidence-pill">Confianza {top!.confidence}%</span></div></article>
    <div className="affiliate-explanation four">
      <article><h3>Por qué esta opción</h3><ul>{top!.positiveSignals.slice(0, 3).map((signal) => <li key={signal}><Check />{signal}</li>)}</ul></article>
      <article>
        <h3>Por qué podría ser un buen momento</h3>
        {guidance.trigger
          ? <>
              <p><CalendarClock /> {guidance.trigger.timing}</p>
              <p className="moment-secondary">{next.moment}</p>
              <small>{guidance.trigger.sourceLabel}{guidance.trigger.precision === "MES" && " · ventana por mes; la fecha exacta la publica la entidad cada año"}</small>
            </>
          : <><p>{next.moment}</p><small>Basado únicamente en el horizonte que seleccionaste.</small></>}
      </article>
      <article><h3>Qué necesitamos confirmar</h3><ul>{next.missing.length ? next.missing.map((signal) => <li key={signal}><CircleAlert />{signal}</li>) : <li><Check />No hay faltantes básicos en esta orientación.</li>}</ul></article>
      <article><h3>Cómo prefieres continuar</h3><p>Canal: <strong>{next.channelLabel}</strong></p><p>Siguiente paso: <strong>{next.actionLabel}</strong></p><small>Siempre requiere revisión humana.</small></article>
    </div>
    <section className="channel-delivery">
      <h2>Así te llegaría</h2>
      <p>Elegiste {next.channel === "IN_APP" ? "el portal" : CHANNEL_OPTIONS.find((option) => option.value === next.channel)?.label.toLowerCase()}. El mensaje se escribe para ese canal, no se copia y pega de otro.</p>
      <ChannelPreview
        channel={next.channel}
        firstName={input.fullName.split(" ")[0] ?? "Hola"}
        productName={product.name}
        message={suggestContactMessage(guidance.profile, decision, product.name)}
        timeBand={input.preferredTimeBand}
      />
    </section>

    <ScoreReceipt result={top!} />
    {alternatives.length > 0 && <div className="affiliate-alternatives"><h2>También podrían interesarte</h2><div>{alternatives.slice(0, 2).map((result) => { const item = getProduct(result.productId); return <article key={result.productId}><span>{result.affinityScore}/100</span><h3>{item.name}</h3><p>{item.objective}</p>{result.dismissal && <small>{result.dismissal}</small>}</article>; })}</div></div>}
    <div className="affiliate-disclaimer"><ShieldCheck /><p>Esta orientación no es una oferta ni una aprobación. Monto, tasa, condiciones y elegibilidad requieren validación oficial, estudio de crédito y revisión humana.</p></div>
    <div className="affiliate-result-actions"><button className="button button-primary" disabled={sendingContact || !canRequest} onClick={onContact}>{sendingContact ? "Registrando solicitud…" : "Solicitar ayuda de una asesora"} <ArrowRight /></button><button className="button button-secondary" onClick={onEdit}><ArrowLeft /> Regresar y modificar</button></div>
    {!canRequest && <p className="affiliate-policy-note"><ShieldCheck /> No registramos contacto porque no lo solicitaste, falta autorización o elegiste una preferencia de bloqueo.</p>}
    {contactError && <p className="affiliate-error" role="alert"><CircleAlert />{contactError}</p>}
  </section>;
}

const RECEIPT_LABELS: Record<string, string> = {
  goal: "Lo que dijiste que quieres lograr",
  behavior: "Lo que hiciste dentro de Creasy",
  services: "Servicios de Colsubsidio que usas",
  interests: "Intereses que declaraste",
  moment: "El momento que describiste",
};

/**
 * El mismo desglose que ve la asesora, en el idioma del afiliado.
 *
 * Va plegado porque casi nadie quiere ver la aritmética, y disponible porque
 * quien la pide tiene derecho a comprobarla. Es la diferencia entre "nuestro
 * modelo determinó" y "esto pesó esto, y aquí está la cuenta".
 */
function ScoreReceipt({ result }: { result: AffinityResult }) {
  if (!result.contributions.length) return null;
  return <details className="score-receipt">
    <summary><Scale /> Cómo llegamos a {result.affinityScore} sobre 100</summary>
    <ul>
      {result.contributions.map((item) => <li key={item.key}>
        <span>{RECEIPT_LABELS[item.key] ?? item.key}</span><strong>+{item.points}</strong>
      </li>)}
      {result.adjustments.map((item) => <li key={item.label} className="negative">
        <span>{item.label}</span><strong>{item.points}</strong>
      </li>)}
    </ul>
    <p>Regla {result.ruleVersion}. El puntaje mide qué tanto se parece este producto a lo que necesitas, no si te lo van a aprobar: eso lo responde el bloque de arriba y lo confirma el estudio de crédito.</p>
  </details>;
}

/**
 * La respuesta a "¿me lo van a dar?".
 *
 * Tres estados, nunca un rechazo definitivo: cuando el escenario no se
 * sostiene, la tarjeta enseña el que sí. El estado sale del motor determinista;
 * aquí solo se pinta.
 */
function Verdict({ decision, productName }: { decision: DecisionResult; productName: string }) {
  const tone = decision.status === "ESCENARIO_VIABLE" ? "ok" : decision.status === "REQUIERE_CONFIRMACION" ? "warn" : "stop";
  const badge = decision.status === "ESCENARIO_VIABLE"
    ? "ESCENARIO VIABLE"
    : decision.status === "REQUIERE_CONFIRMACION"
      ? "REQUIERE CONFIRMACIÓN"
      : "HOY NO ES VIABLE";
  const Icon = decision.status === "ESCENARIO_VIABLE" ? BadgeCheck : decision.status === "REQUIERE_CONFIRMACION" ? Scale : CircleAlert;

  return <section className={`verdict verdict-${tone}`} aria-live="polite">
    <header>
      <span className="verdict-badge"><Icon /> {badge}</span>
      <small>{productName} · {(decision.annualRate * 100).toFixed(2)} % E.A. · {decision.rateValidity}{decision.payrollDeduction ? " con libranza" : " sin libranza"} · regla {decision.ruleVersion}</small>
    </header>

    <div className="verdict-figures">
      <div><small>Cuota mensual estimada</small><strong>{cop(decision.monthlyPayment)}</strong></div>
      <div><small>Sobre tu ingreso declarado</small><strong>{Math.round(decision.paymentToIncome * 100)} %</strong></div>
      <div><small>Ingreso estimado</small><strong>{cop(decision.estimatedIncome)}</strong></div>
    </div>

    <ul className="verdict-reasons">
      {decision.reasons.map((reason) => <li key={reason.label} className={`impact-${reason.impact.toLowerCase()}`}>
        {reason.impact === "POSITIVO" ? <Check /> : reason.impact === "ATENCION" ? <Scale /> : <CircleAlert />}
        <div><strong>{reason.label}</strong><p>{reason.detail}</p></div>
      </li>)}
    </ul>

    {decision.counterOffer && <div className="verdict-counter">
      <span><Sparkles /> Lo que sí podemos hacer hoy</span>
      <strong>{cop(decision.counterOffer.amount)} a {decision.counterOffer.termMonths} meses · cuota de {cop(decision.counterOffer.monthlyPayment)}</strong>
      <p>{decision.counterOffer.explanation}</p>
    </div>}

    <div className="verdict-requirements">
      <h3>Requisitos</h3>
      <ul>
        {decision.requirements.map((requirement) => <li key={requirement.label} className={`req-${requirement.status.toLowerCase()}`}>
          <i />{requirement.label}
          <b>{requirement.status === "CUMPLE" ? "Cumple" : requirement.status === "NO_CUMPLE" ? "No cumple" : "Por verificar"}</b>
        </li>)}
      </ul>
    </div>

    <p className="verdict-note"><ShieldCheck /> {decision.disclaimer}</p>
  </section>;
}

function ProductCatalog() {
  const publicProducts = PRODUCTS.filter((product) => product.status === "DOCUMENTADO_BRIEF");
  return <section className="product-catalog" id="catalogo" aria-labelledby="catalog-title">
    <div className="catalog-heading"><span className="eyebrow"><BookOpenCheck /> Opciones de crédito</span><h2 id="catalog-title">Alternativas para diferentes metas y momentos</h2><p>Explora información orientativa de las opciones disponibles. La elegibilidad, los montos y las condiciones siempre deben confirmarse durante la revisión.</p></div>
    <div className="catalog-grid">{publicProducts.map((product) => <article key={product.id}>
      <h3>{product.name}</h3><p>{product.objective}</p>
      <details><summary>Ver información disponible</summary>{product.facts.length > 0 ? <ul>{product.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <p>No se muestran condiciones hasta contar con validación oficial.</p>}{product.notice && <div className="catalog-notice"><CircleAlert />{product.notice}</div>}</details>
    </article>)}</div>
  </section>;
}
