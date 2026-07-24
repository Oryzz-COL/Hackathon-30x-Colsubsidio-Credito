import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, Fingerprint, ShieldCheck, Sparkles } from "lucide-react";
import { BRAND } from "@/config/brand";

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">C</span><span>{BRAND.name}</span></Link>
        <span className="demo-chip">Prototipo Hackathon · Datos sintéticos</span>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={16}/> Afinidad explicable, no aprobación automática</p>
          <h1>{BRAND.tagline}</h1>
          <p className="hero-lead">Convierte datos autorizados en necesidades financieras comprensibles, recomendaciones trazables y mejores conversaciones entre afiliados y asesores.</p>
          <div className="hero-actions">
            <Link href="/demo" className="button button-primary">Entrar a la demo <ArrowRight size={18}/></Link>
            <Link href="/demo?tour=1" className="button button-secondary">Iniciar demo guiada</Link>
          </div>
          <div className="trust-row">
            <span><ShieldCheck/> Privacidad por diseño</span>
            <span><Eye/> Evidencia visible</span>
            <span><Fingerprint/> Revisión humana</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Vista previa de un análisis explicable">
          <div className="visual-head"><span className="avatar">VR</span><div><strong>Valentina R.</strong><small>Perfil sintético · Bogotá</small></div><span className="source-pill">3 fuentes</span></div>
          <div className="need-note"><small>Necesidad declarada</small><strong>Financiar una especialización</strong><p>Fuente: formulario del afiliado · hace 3 días</p></div>
          <div className="score-preview">
            <div className="score-ring"><strong>92</strong><small>/ 100</small></div>
            <div><small>Índice de afinidad</small><h3>Crédito educativo</h3><p><CheckCircle2/> 3 señales con evidencia</p></div>
          </div>
          <div className="human-strip"><ShieldCheck size={17}/><span>Requiere validación formal y revisión humana</span></div>
        </div>
      </section>
      <section className="value-grid">
        <article><strong>100 %</strong><span>de recomendaciones explicables en la demo</span></article>
        <article><strong>36</strong><span>perfiles sintéticos listos para explorar</span></article>
        <article><strong>8</strong><span>productos en catálogo configurable</span></article>
        <article><strong>0</strong><span>decisiones de aprobación automatizadas</span></article>
      </section>
      <section className="principle"><p>Colsubsidio no necesita más datos sin contexto.</p><h2>Necesita convertir datos autorizados en necesidades explicables y acciones relevantes.</h2></section>
    </main>
  );
}
