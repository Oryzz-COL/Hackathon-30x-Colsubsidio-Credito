"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Check, ChevronRight, CircleAlert,
  FileCheck2, LoaderCircle, Pencil, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import { BRAND } from "@/config/brand";
import { getProduct } from "@/config/products";
import {
  AFFILIATE_NEEDS,
  affiliateContactPayload,
  affiliateGuidanceSchema,
  calculateAffiliateGuidance,
  type AffiliateGuidanceInput,
} from "@/lib/affiliate-guidance";
import type { AffinityResult, Profile } from "@/lib/types";

type Guidance = { profile: Profile; recommendations: AffinityResult[] };
type Stage = "form" | "analyzing" | "result" | "contacted";

const incomeOptions = [
  { value: "", label: "Prefiero no indicarlo" },
  { value: "Hasta 1 SMMLV", label: "Hasta 1 SMMLV" },
  { value: "Entre 1 y 2 SMMLV", label: "Entre 1 y 2 SMMLV" },
  { value: "Entre 2 y 4 SMMLV", label: "Entre 2 y 4 SMMLV" },
  { value: "Más de 4 SMMLV", label: "Más de 4 SMMLV" },
];

const employmentOptions = [
  { value: "indefinido", label: "Empleado con contrato indefinido" },
  { value: "fijo", label: "Empleado con contrato a término fijo" },
  { value: "independiente", label: "Independiente" },
  { value: "pensionado", label: "Pensionado" },
  { value: "otro", label: "Otra situación" },
];

export function AffiliateFlow() {
  const [stage, setStage] = useState<Stage>("form");
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [submittedData, setSubmittedData] = useState<AffiliateGuidanceInput | null>(null);
  const [contactError, setContactError] = useState("");
  const [sendingContact, setSendingContact] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AffiliateGuidanceInput>({
    resolver: zodResolver(affiliateGuidanceSchema),
    defaultValues: { identifier: "", incomeRange: "", employmentStatus: "", consent: false },
  });

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(affiliateContactPayload(submittedData)),
      });
      if (!response.ok) throw new Error("No fue posible registrar la solicitud");
      setStage("contacted");
    } catch {
      setContactError("No pudimos registrar la solicitud. Intenta nuevamente.");
    } finally {
      setSendingContact(false);
    }
  };

  return (
    <main className="affiliate-page">
      <nav className="affiliate-nav">
        <Link href="/" className="brand"><span className="brand-mark">C</span><span>{BRAND.name}</span></Link>
        <Link href="/demo" className="experience-switch"><BriefcaseBusiness/> Portal para asesores</Link>
      </nav>

      {stage === "form" && (
        <section className="affiliate-shell">
          <div className="affiliate-intro">
            <span className="eyebrow"><Sparkles/> Orientación personalizada</span>
            <h1>Encuentra una opción para ti</h1>
            <p>Cuéntanos tu necesidad y te mostraremos los productos con mayor afinidad. Este recorrido no realiza una aprobación de crédito.</p>
            <div className="affiliate-trust">
              <span><ShieldCheck/> Tus datos se usan solo con autorización.</span>
              <span><FileCheck2/> Cada recomendación muestra su explicación.</span>
              <span><UserRound/> Una asesora continúa el proceso si lo solicitas.</span>
            </div>
          </div>
          <form className="affiliate-form panel" onSubmit={handleSubmit(analyze)} noValidate>
            <div className="affiliate-form-head"><span>Paso 1 de 2</span><h2>Cuéntanos lo esencial</h2><p>Todos los campos marcados con * son obligatorios.</p></div>
            <label className="field">
              <span>Cédula o identificador *</span>
              <input inputMode="numeric" autoComplete="off" placeholder="Ej. 1020304050" aria-invalid={Boolean(errors.identifier)} {...register("identifier")}/>
              {errors.identifier && <em role="alert">{errors.identifier.message}</em>}
            </label>
            <label className="field">
              <span>Necesidad principal *</span>
              <select aria-invalid={Boolean(errors.need)} defaultValue="" {...register("need")}>
                <option value="" disabled>Selecciona una opción</option>
                {AFFILIATE_NEEDS.map((need) => <option key={need.value} value={need.value}>{need.label}</option>)}
              </select>
              {errors.need && <em role="alert">{errors.need.message}</em>}
            </label>
            <div className="affiliate-form-row">
              <label className="field">
                <span>Ingreso aproximado</span>
                <select {...register("incomeRange")}>{incomeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              </label>
              <label className="field">
                <span>Situación laboral *</span>
                <select aria-invalid={Boolean(errors.employmentStatus)} defaultValue="" {...register("employmentStatus")}>
                  <option value="" disabled>Selecciona una opción</option>
                  {employmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {errors.employmentStatus && <em role="alert">{errors.employmentStatus.message}</em>}
              </label>
            </div>
            <label className="field">
              <span>Antigüedad aproximada en meses</span>
              <input type="number" min="0" max="600" placeholder="Ej. 18" {...register("tenureMonths", { setValueAs: (value) => value === "" ? undefined : Number(value) })}/>
              {errors.tenureMonths && <em role="alert">{errors.tenureMonths.message}</em>}
            </label>
            <label className="affiliate-consent">
              <input type="checkbox" {...register("consent")}/>
              <span>Autorizo el tratamiento y la consulta de los datos que declaro para recibir orientación de afinidad y, si lo solicito, continuar con una asesora. *</span>
            </label>
            {errors.consent && <p className="affiliate-error" role="alert"><CircleAlert/>{errors.consent.message}</p>}
            <button className="button button-primary affiliate-submit" type="submit">Ver opciones para mí <ArrowRight/></button>
            <small className="affiliate-form-note"><ShieldCheck/> En este prototipo no se consultan centrales de riesgo ni fuentes externas reales.</small>
          </form>
        </section>
      )}

      {stage === "analyzing" && (
        <section className="affiliate-state" aria-live="polite">
          <span className="analysis-spinner"><LoaderCircle/></span>
          <p className="eyebrow">Analizando afinidad</p>
          <h1>Estamos organizando tu información</h1>
          <div className="analysis-steps">
            <span><Check/> Datos declarados por ti</span>
            <span><Check/> Fuentes externas autorizadas: no disponibles en esta demo</span>
            <span><Check/> Reglas y características del portafolio</span>
          </div>
          <small>No evaluamos aprobación, riesgo ni capacidad de pago.</small>
        </section>
      )}

      {stage === "result" && guidance && (
        <AffiliateResult
          guidance={guidance}
          sendingContact={sendingContact}
          contactError={contactError}
          onContact={() => void requestContact()}
          onEdit={() => setStage("form")}
        />
      )}

      {stage === "contacted" && guidance && (
        <section className="affiliate-state affiliate-success" aria-live="polite">
          <span className="success-mark"><Check/></span>
          <p className="eyebrow">Solicitud registrada</p>
          <h1>Una asesora ya puede continuar tu caso</h1>
          <p>Guardamos tu autorización, los datos que declaraste y la recomendación generada. El caso aparece con origen <strong>Autogestión del afiliado</strong>.</p>
          <div className="contact-summary">
            <span>Producto orientado</span>
            <strong>{getProduct(guidance.recommendations[0]!.productId).name}</strong>
            <small>La solicitud de contacto no representa aprobación de crédito.</small>
          </div>
          <Link className="button button-primary" href="/demo?view=reviews">Ver caso en portal para asesores <ChevronRight/></Link>
          <Link className="text-link" href="/">Volver al inicio</Link>
        </section>
      )}
    </main>
  );
}

function AffiliateResult({
  guidance,
  sendingContact,
  contactError,
  onContact,
  onEdit,
}: {
  guidance: Guidance;
  sendingContact: boolean;
  contactError: string;
  onContact: () => void;
  onEdit: () => void;
}) {
  const [top, ...alternatives] = guidance.recommendations;
  const product = getProduct(top!.productId);
  return (
    <section className="affiliate-result">
      <div className="result-heading">
        <div><span className="eyebrow"><Sparkles/> Orientación lista</span><h1>Esta opción tiene mayor afinidad contigo</h1><p>La calculamos con tus datos declarados y las reglas configuradas del portafolio.</p></div>
        <button className="button button-secondary" onClick={onEdit}><Pencil/> Modificar información</button>
      </div>
      <article className="affiliate-top-card">
        <div className="affiliate-score"><strong>{top!.affinityScore}</strong><span>/100</span></div>
        <div><small>Mayor afinidad</small><h2>{product.name}</h2><p>{product.objective}</p><span className="confidence-pill">Confianza {top!.confidence}%</span></div>
      </article>
      <div className="affiliate-explanation">
        <article><h3>¿Por qué aparece?</h3><ul>{top!.positiveSignals.slice(0, 3).map((signal) => <li key={signal}><Check/>{signal}</li>)}</ul></article>
        <article><h3>Datos utilizados</h3><ul><li><Check/>Necesidad declarada voluntariamente</li><li><Check/>Situación y antigüedad laboral declaradas</li><li><Check/>Reglas vigentes en el catálogo de demostración</li></ul></article>
        <article><h3>Datos por validar</h3><ul>{top!.missingSignals.slice(0, 3).map((signal) => <li key={signal}><CircleAlert/>{signal}</li>)}</ul><small>Fuentes externas autorizadas: no disponibles en este prototipo.</small></article>
      </div>
      {alternatives.length > 0 && <div className="affiliate-alternatives"><h2>También podrían interesarte</h2><div>{alternatives.slice(0, 2).map((result) => { const alternative = getProduct(result.productId); return <article key={result.productId}><span>{result.affinityScore}/100</span><h3>{alternative.name}</h3><p>{alternative.objective}</p></article>; })}</div></div>}
      <div className="affiliate-disclaimer"><ShieldCheck/><p>Esta orientación muestra los productos con mayor afinidad para tu necesidad. El monto, la tasa y la aprobación están sujetos al estudio de crédito y a la validación de requisitos.</p></div>
      <div className="affiliate-result-actions">
        <button className="button button-primary" disabled={sendingContact} onClick={onContact}>{sendingContact ? "Registrando solicitud…" : "Quiero que me contacte un asesor"} <ArrowRight/></button>
        <button className="button button-secondary" onClick={onEdit}><ArrowLeft/> Regresar y modificar</button>
      </div>
      {contactError && <p className="affiliate-error" role="alert"><CircleAlert/>{contactError}</p>}
    </section>
  );
}
