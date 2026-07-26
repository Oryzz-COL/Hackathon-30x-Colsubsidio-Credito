"use client";

import { useState, useSyncExternalStore, type ComponentProps, type FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { DemoApp } from "@/components/demo-app";
import { advisorLoginSchema, normalizeAdvisorEmail, type AdvisorIdentity } from "@/lib/advisor-auth";

const SESSION_KEY = "creasy.advisor.session.v1";

/**
 * Cuenta local y visible para recorrer el portal sin un proveedor de identidad.
 *
 * Las credenciales están publicadas en la propia pantalla y no protegen
 * recursos de servidor. Una implantación real debe sustituir esta capa por
 * identidad corporativa, autorización por roles y validación en servidor.
 */
const DEMO_ACCOUNT = {
  email: "asesor@creasy.demo",
  password: "creasy2026",
  identity: {
    id: "advisor-demo",
    fullName: "Daniela Moreno",
    email: "asesor@creasy.demo",
    role: "Asesoría de crédito",
  } as AdvisorIdentity,
};

type DemoProps = Omit<ComponentProps<typeof DemoApp>, "advisor" | "onLogout">;
type FieldErrors = Record<string, string | undefined>;

function readSession() {
  try {
    const temporary = window.sessionStorage.getItem(SESSION_KEY);
    if (temporary) return JSON.parse(temporary) as AdvisorIdentity;
    const persisted = window.localStorage.getItem(SESSION_KEY);
    return persisted ? JSON.parse(persisted) as AdvisorIdentity : null;
  } catch {
    return null;
  }
}

function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}

const subscribeToHydration = () => () => undefined;

export function AdvisorPortal(props: DemoProps) {
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [session, setSession] = useState<AdvisorIdentity | null>(() =>
    typeof window === "undefined" ? null : readSession()
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const saveSession = (identity: AdvisorIdentity, persist: boolean) => {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    (persist ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(identity));
    setSession(identity);
  };

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setNotice("");
    const values = formValues(event.currentTarget);
    const parsed = advisorLoginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setPending(true);
    const matches =
      normalizeAdvisorEmail(parsed.data.email) === DEMO_ACCOUNT.email &&
      parsed.data.password === DEMO_ACCOUNT.password;
    setPending(false);
    if (!matches) {
      setNotice("Esas credenciales no corresponden a la cuenta de demostración. Usa las que aparecen arriba.");
      return;
    }
    saveSession(DEMO_ACCOUNT.identity, values.rememberSession === "on");
  };

  const logout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setErrors({});
    setNotice("");
  };

  if (!ready) {
    return <main className="access-loading"><BrandLockup surface="light"/><span>Preparando acceso seguro…</span></main>;
  }

  if (session) {
    return <DemoApp {...props} advisor={session} onLogout={logout}/>;
  }

  if (props.juryMode) {
    return <DemoApp
      {...props}
      advisor={{
        id: "jury-direct",
        fullName: "Visitante de demostración",
        email: "visitante@demo.local",
        role: "Analítica",
      }}
    />;
  }

  return (
    <main className="advisor-access">
      <section className="access-story">
        <BrandLockup/>
        <div>
          <span className="eyebrow light"><ShieldCheck/> La próxima mejor acción, explicada</span>
          <h1>La oferta correcta ya está en tus datos.</h1>
          <p>Creasy convierte señales autorizadas en una respuesta concreta para cada afiliado: qué ofrecer, por qué, cuándo y por qué canal.</p>
        </div>
        <ul>
          <li><Check/> Cada caso termina en una acción clara</li>
          <li><Check/> Cada recomendación se puede explicar</li>
          <li><Check/> Cada contacto conserva control humano</li>
        </ul>
      </section>

      <section className="access-panel">
        <div className="access-mobile-brand"><BrandLockup surface="light"/></div>
        <div className="demo-login-note">
          <ShieldCheck/>
          <div><strong>Usuario demo listo</strong><p>Las credenciales ya están escritas. Solo pulsa entrar.</p></div>
        </div>

        <form className="access-form" onSubmit={submitLogin} noValidate>
          <header><span><LockKeyhole/></span><h2>Entra y prueba Creasy</h2><p>Todo está listo para la demostración.</p></header>
          <AccessField label="Correo" name="email" type="email" autoComplete="email" defaultValue={DEMO_ACCOUNT.email} error={errors.email}/>
          <PasswordField label="Contraseña" name="password" autoComplete="current-password" defaultValue={DEMO_ACCOUNT.password} error={errors.password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)}/>
          <label className="access-remember"><input name="rememberSession" type="checkbox" defaultChecked/><span><strong>Mantener mi sesión iniciada</strong><small>Desmárcalo si estás usando un equipo compartido.</small></span></label>
          {notice && <p className="access-notice" role="alert">{notice}</p>}
          <button className="button button-primary access-submit" disabled={pending}>{pending ? "Verificando…" : "Entrar al portal"}<ArrowRight/></button>
        </form>
      </section>
    </main>
  );
}

function AccessField({ label, error, ...props }: {
  label: string;
  error?: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return <label className="access-field"><span>{label}</span><input {...props}/>{error && <em>{error}</em>}</label>;
}

function PasswordField({ label, name, autoComplete, hint, error, visible, onToggle, defaultValue }: {
  label: string;
  name: string;
  autoComplete: string;
  hint?: string;
  error?: string;
  visible: boolean;
  onToggle: () => void;
  defaultValue?: string;
}) {
  return <div className="access-field"><label htmlFor={name}>{label}</label><div><input id={name} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} defaultValue={defaultValue}/><button type="button" onClick={onToggle} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff/> : <Eye/>}</button></div>{hint && <small>{hint}</small>}{error && <em>{error}</em>}</div>;
}
