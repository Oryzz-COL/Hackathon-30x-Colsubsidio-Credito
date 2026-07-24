"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  ArrowLeft, ArrowRight, BookOpenCheck, BriefcaseBusiness, Check, ChevronRight,
  CircleAlert, FileCheck2, LoaderCircle, Pencil, ShieldCheck, Sparkles, UserRound,
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
type Stage = "form" | "analyzing" | "result" | "contacted";

const incomeOptions = ["Prefiero no indicarlo", "Hasta 1 SMMLV", "Entre 1 y 2 SMMLV", "Entre 2 y 4 SMMLV", "Más de 4 SMMLV"];
const employmentOptions = [
  ["indefinido", "Empleado con contrato indefinido"], ["fijo", "Empleado con contrato a término fijo"],
  ["independiente", "Independiente"], ["pensionado", "Pensionado"], ["otro", "Otra situación"],
] as const;

export function AffiliateFlow() {
  const [stage, setStage] = useState<Stage>("form");
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [submittedData, setSubmittedData] = useState<AffiliateGuidanceInput | null>(null);
  const [contactError, setContactError] = useState("");
  const [sendingContact, setSendingContact] = useState(false);
  const { register, handleSubmit, control, formState: { errors } } = useForm<AffiliateGuidanceInput>({
    resolver: zodResolver(affiliateGuidanceSchema),
    defaultValues: {
      identifier: "", fullName: "", email: "", addressOrZone: "", incomeRange: "", employmentStatus: "", interestedProducts: [],
      horizon: "EXPLORING", preferredChannel: "IN_APP", preferredTimeBand: "WEEKDAY_MORNING",
      contactFrequency: "ONCE_MONTH", wantsAdvisor: false, guidanceConsent: false,
      behaviorConsent: false, contactConsent: false, financialDataConsent: false, rneExcluded: false,
    },
  });
  const wantsAdvisor = useWatch({ control, name: "wantsAdvisor" });

  const analyze = (data: AffiliateGuidanceInput) => {
    setSubmittedData(data);
    setStage("analyzing");
    window.setTimeout(() => {
      setGuidance(calculateAffiliateGuidance(data));
      setStage("result");
    }, 450);
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
      setContactError("No pudimos registrar la solicitud. Tus datos siguen en el formulario para que intentes nuevamente.");
    } finally {
      setSendingContact(false);
    }
  };

  return (
    <main className="affiliate-page">
      <nav className="affiliate-nav">
        <BrandLockup/>
        <div className="affiliate-nav-links"><a href="#catalogo">Catálogo</a><Link href="/demo" className="experience-switch"><BriefcaseBusiness/> Portal para asesores</Link></div>
      </nav>

      {stage === "form" && (
        <>
          <section className="affiliate-shell">
            <div className="affiliate-intro">
              <span className="eyebrow"><Sparkles/> Orientación personalizada</span>
              <h1>Encuentra una opción que se parezca a lo que necesitas</h1>
              <p>Declara solo lo que quieras compartir. Creasy explica la afinidad y deja la decisión financiera en manos de los procesos autorizados de Colsubsidio.</p>
              <div className="affiliate-trust">
                <span><ShieldCheck/> Autorizaciones separadas por finalidad.</span>
                <span><FileCheck2/> Recomendaciones con razones y datos faltantes.</span>
                <span><UserRound/> Tú eliges si deseas contacto humano.</span>
              </div>
            </div>
            <form className="affiliate-form panel" onSubmit={handleSubmit(analyze)} noValidate>
              <div className="affiliate-form-head"><span>Paso 1 de 2</span><h2>Cuéntanos lo esencial</h2><p>Los campos marcados con * son obligatorios.</p></div>
              <div className="affiliate-form-row">
                <label className="field"><span>Nombre completo *</span><input autoComplete="name" placeholder="Ej. Valentina Ríos" aria-invalid={Boolean(errors.fullName)} {...register("fullName")}/>{errors.fullName && <em role="alert">{errors.fullName.message}</em>}</label>
                <label className="field"><span>Correo autorizado (opcional)</span><input type="email" autoComplete="email" placeholder="persona@ejemplo.com" aria-invalid={Boolean(errors.email)} {...register("email")}/>{errors.email && <em role="alert">{errors.email.message}</em>}</label>
              </div>
              <div className="affiliate-form-row">
                <label className="field"><span>Ciudad o zona *</span><input autoComplete="address-level2" placeholder="Ej. Bogotá · Suba" aria-invalid={Boolean(errors.addressOrZone)} {...register("addressOrZone")}/>{errors.addressOrZone && <em role="alert">{errors.addressOrZone.message}</em>}</label>
                <label className="field"><span>Categoría de afiliación *</span><select defaultValue="" aria-invalid={Boolean(errors.affiliationCategory)} {...register("affiliationCategory")}><option value="" disabled>Selecciona tu categoría</option><option value="A">A · Hasta 2 SMMLV</option><option value="B">B · Más de 2 y hasta 4 SMMLV</option><option value="C">C · Más de 4 SMMLV</option><option value="D">D · Persona no afiliada</option></select>{errors.affiliationCategory && <em role="alert">{errors.affiliationCategory.message}</em>}</label>
              </div>
              <label className="field"><span>Cédula o identificador *</span><input inputMode="numeric" autoComplete="off" placeholder="Ej. 1020304050" aria-invalid={Boolean(errors.identifier)} {...register("identifier")}/>{errors.identifier && <em role="alert">{errors.identifier.message}</em>}</label>
              <label className="field"><span>Necesidad principal *</span><select aria-invalid={Boolean(errors.need)} defaultValue="" {...register("need")}><option value="" disabled>Selecciona una opción</option>{AFFILIATE_NEEDS.map((need) => <option key={need.value} value={need.value}>{need.label}</option>)}</select>{errors.need && <em role="alert">{errors.need.message}</em>}</label>
              <fieldset className="product-interest"><legend>Productos que te interesan (opcional)</legend><div>{PRODUCTS.map((product) => <label key={product.id}><input type="checkbox" value={product.id} {...register("interestedProducts")}/><span>{product.shortName}</span></label>)}</div></fieldset>
              <div className="affiliate-form-row">
                <label className="field"><span>Ingreso aproximado</span><select {...register("incomeRange")}><option value="">Prefiero no indicarlo</option>{incomeOptions.slice(1).map((option) => <option key={option}>{option}</option>)}</select></label>
                <label className="field"><span>Situación laboral *</span><select aria-invalid={Boolean(errors.employmentStatus)} defaultValue="" {...register("employmentStatus")}><option value="" disabled>Selecciona una opción</option>{employmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.employmentStatus && <em role="alert">{errors.employmentStatus.message}</em>}</label>
              </div>
              <div className="affiliate-form-row">
                <label className="field"><span>Antigüedad aproximada en meses</span><input type="number" min="0" max="600" placeholder="Ej. 18" {...register("tenureMonths", { setValueAs: (value) => value === "" ? undefined : Number(value) })}/></label>
                <label className="field"><span>Cuota mensual que podrías manejar</span><input type="number" min="0" placeholder="Ej. 350000" {...register("monthlyPayment", { setValueAs: (value) => value === "" ? undefined : Number(value) })}/></label>
              </div>
              <div className="affiliate-form-row">
                <label className="field"><span>¿Cuándo te gustaría avanzar?</span><select {...register("horizon")}><option value="NOW">Ahora</option><option value="THIS_MONTH">Este mes</option><option value="NEXT_THREE_MONTHS">En los próximos 3 meses</option><option value="EXPLORING">Solo estoy explorando</option></select></label>
                <label className="field"><span>Canal preferido</span><select {...register("preferredChannel")}><option value="IN_APP">Dentro de Creasy</option><option value="EMAIL">Correo</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option><option value="CALL">Llamada</option></select></label>
              </div>
              <div className="affiliate-form-row">
                <label className="field"><span>Horario preferido</span><select {...register("preferredTimeBand")}><option value="WEEKDAY_MORNING">Lunes a viernes · mañana</option><option value="WEEKDAY_AFTERNOON">Lunes a viernes · tarde</option><option value="SATURDAY">Sábado</option></select></label>
                <label className="field"><span>Frecuencia máxima</span><select {...register("contactFrequency")}><option value="ONCE_WEEK">Una vez por semana</option><option value="TWICE_MONTH">Dos veces al mes</option><option value="ONCE_MONTH">Una vez al mes</option><option value="NO_CONTACT">No deseo contacto</option></select></label>
              </div>
              <label className="affiliate-consent"><input type="checkbox" {...register("wantsAdvisor")}/><span>Quiero que una asesora me ayude a continuar.</span></label>
              <div className="consent-purpose-list" aria-label="Autorizaciones por finalidad">
                <h3>Elige para qué podemos usar tus datos</h3>
                <label className="affiliate-consent"><input type="checkbox" {...register("guidanceConsent")}/><span><strong>Orientación con lo que declaré.</strong> Necesaria para mostrar resultados. *</span></label>
                <label className="affiliate-consent"><input type="checkbox" {...register("behaviorConsent")}/><span><strong>Personalización por mis interacciones en Creasy.</strong> No incluye rastreo externo.</span></label>
                <label className="affiliate-consent"><input type="checkbox" {...register("contactConsent")}/><span><strong>Contacto comercial.</strong> Solo por el canal y la frecuencia que elegí{wantsAdvisor ? " (necesaria para solicitar asesora)" : ""}.</span></label>
                <label className="affiliate-consent"><input type="checkbox" {...register("financialDataConsent")}/><span><strong>Simulación financiera futura.</strong> Para usar datos financieros que yo entregue de forma expresa.</span></label>
              </div>
              {errors.guidanceConsent && <p className="affiliate-error" role="alert"><CircleAlert/>{errors.guidanceConsent.message}</p>}
              {errors.contactConsent && <p className="affiliate-error" role="alert"><CircleAlert/>{errors.contactConsent.message}</p>}
              <details className="privacy-simulation"><summary>Preferencias de privacidad del prototipo</summary><label className="affiliate-consent"><input type="checkbox" {...register("rneExcluded")}/><span>Simular que estoy inscrito en el Registro de Números Excluidos (bloquea contacto).</span></label><small>Esta opción no consulta ni modifica el RNE real.</small></details>
              <button className="button button-primary affiliate-submit" type="submit">Ver opciones para mí <ArrowRight/></button>
              <small className="affiliate-form-note"><ShieldCheck/> Categorías: A hasta 2 SMMLV; B más de 2 y hasta 4; C más de 4; D persona no afiliada. Prototipo sin consultas externas reales.</small>
            </form>
          </section>
          <ProductCatalog/>
        </>
      )}

      {stage === "analyzing" && <section className="affiliate-state" aria-live="polite"><span className="analysis-spinner"><LoaderCircle/></span><p className="eyebrow">Analizando afinidad</p><h1>Estamos organizando lo que declaraste</h1><div className="analysis-steps"><span><Check/> Datos aportados por ti</span><span><Check/> Interacciones propias solo si las autorizaste</span><span><Check/> Catálogo y reglas explicables</span></div><small>No evaluamos aprobación, riesgo ni capacidad de pago.</small></section>}

      {stage === "result" && guidance && <AffiliateResult guidance={guidance} input={submittedData!} sendingContact={sendingContact} contactError={contactError} onContact={() => void requestContact()} onEdit={() => setStage("form")}/>}

      {stage === "contacted" && guidance && <section className="affiliate-state affiliate-success" aria-live="polite"><span className="success-mark"><Check/></span><p className="eyebrow">Solicitud registrada</p><h1>Tu caso quedó listo para revisión humana</h1><p>El portal conserva tus autorizaciones y preferencias. Un contacto solo podrá realizarse si el consentimiento, el canal, el RNE simulado, la frecuencia y el horario lo permiten.</p><div className="contact-summary"><span>Producto orientado</span><strong>{getProduct(guidance.recommendations[0]!.productId).name}</strong><small>No representa aprobación de crédito.</small></div><Link className="button button-primary" href="/demo?view=reviews">Ver caso en portal para asesores <ChevronRight/></Link><Link className="text-link" href="/">Volver al inicio</Link></section>}
    </main>
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
    <div className="result-heading"><div><span className="eyebrow"><Sparkles/> Orientación lista</span><h1>Esta opción tiene mayor afinidad contigo</h1><p>La calculamos con datos declarados y reglas transparentes del portafolio.</p></div><button className="button button-secondary" onClick={onEdit}><Pencil/> Modificar información</button></div>
    <article className="affiliate-top-card"><div className="affiliate-score"><strong>{top!.affinityScore}</strong><span>/100</span></div><div><small>Mayor afinidad</small><h2>{product.name}</h2><p>{product.objective}</p><span className="confidence-pill">Confianza {top!.confidence}%</span></div></article>
    <div className="affiliate-explanation four">
      <article><h3>Por qué esta opción</h3><ul>{top!.positiveSignals.slice(0, 3).map((signal) => <li key={signal}><Check/>{signal}</li>)}</ul></article>
      <article><h3>Por qué podría ser un buen momento</h3><p>{next.moment}</p><small>Basado únicamente en el horizonte que seleccionaste.</small></article>
      <article><h3>Qué necesitamos confirmar</h3><ul>{next.missing.length ? next.missing.map((signal) => <li key={signal}><CircleAlert/>{signal}</li>) : <li><Check/>No hay faltantes básicos en esta orientación.</li>}</ul></article>
      <article><h3>Cómo prefieres continuar</h3><p>Canal: <strong>{next.channel}</strong></p><p>Acción sugerida: <strong>{next.action.replaceAll("_", " ")}</strong></p><small>Siempre requiere revisión humana.</small></article>
    </div>
    {alternatives.length > 0 && <div className="affiliate-alternatives"><h2>También podrían interesarte</h2><div>{alternatives.slice(0, 2).map((result) => { const item = getProduct(result.productId); return <article key={result.productId}><span>{result.affinityScore}/100</span><h3>{item.name}</h3><p>{item.objective}</p></article>; })}</div></div>}
    <div className="affiliate-disclaimer"><ShieldCheck/><p>Esta orientación no es una oferta ni una aprobación. Monto, tasa, condiciones y elegibilidad requieren validación oficial, estudio de crédito y revisión humana.</p></div>
    <div className="affiliate-result-actions"><button className="button button-primary" disabled={sendingContact || !canRequest} onClick={onContact}>{sendingContact ? "Registrando solicitud…" : "Solicitar ayuda de una asesora"} <ArrowRight/></button><button className="button button-secondary" onClick={onEdit}><ArrowLeft/> Regresar y modificar</button></div>
    {!canRequest && <p className="affiliate-policy-note"><ShieldCheck/> No registramos contacto porque no lo solicitaste, falta autorización o elegiste una preferencia de bloqueo.</p>}
    {contactError && <p className="affiliate-error" role="alert"><CircleAlert/>{contactError}</p>}
  </section>;
}

function ProductCatalog() {
  return <section className="product-catalog" id="catalogo" aria-labelledby="catalog-title">
    <div className="catalog-heading"><span className="eyebrow"><BookOpenCheck/> Catálogo del prototipo</span><h2 id="catalog-title">Cinco familias principales y el portafolio ampliado</h2><p>El reto prioriza Cupo/Consumo, Vivienda, Crédito Mujer y Educativo. El brief amplía la referencia con Compra de cartera, Complementario y Seguros e impuestos. Libre inversión permanece como categoría adicional pendiente de validación oficial.</p></div>
    <div className="catalog-grid">{PRODUCTS.map((product) => <article key={product.id}>
      <span className={product.briefSource === "RECURSOS_RETO_CREDITO_PDF" ? "source-tag documented" : "source-tag pending"}>{product.briefSource === "RECURSOS_RETO_CREDITO_PDF" ? "Documentado en brief" : "Producto adicional"}</span>
      <h3>{product.name}</h3><p>{product.objective}</p>
      <details><summary>Ver información disponible</summary>{product.facts.length > 0 ? <ul>{product.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <p>No se muestran condiciones hasta contar con validación oficial.</p>}{product.notice && <div className="catalog-notice"><CircleAlert/>{product.notice}</div>}</details>
    </article>)}</div>
  </section>;
}
