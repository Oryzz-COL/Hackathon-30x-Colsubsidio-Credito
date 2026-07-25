"use client";

import { useState, useSyncExternalStore, type ComponentProps, type FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { DemoApp } from "@/components/demo-app";
import {
  advisorLoginSchema,
  advisorRegistrationSchema,
  advisorRoles,
  normalizeAdvisorEmail,
  type AdvisorIdentity,
  type StoredAdvisorAccount,
} from "@/lib/advisor-auth";

const ACCOUNTS_KEY = "creasy.advisor.accounts.v1";
const SESSION_KEY = "creasy.advisor.session.v1";
const HASH_ITERATIONS = 120_000;

type DemoProps = Omit<ComponentProps<typeof DemoApp>, "advisor" | "onLogout">;
type Mode = "login" | "register";
type FieldErrors = Record<string, string | undefined>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function readSession() {
  try {
    const temporary = window.sessionStorage.getItem(SESSION_KEY);
    if (temporary) return JSON.parse(temporary) as AdvisorIdentity;
  } catch {
    // Continúa con la sesión persistente si el almacenamiento temporal no está disponible.
  }
  return readJson<AdvisorIdentity | null>(SESSION_KEY, null);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{1,2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

async function derivePassword(password: string, salt: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations: HASH_ITERATIONS },
    material,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function createSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}

function toIdentity(account: StoredAdvisorAccount): AdvisorIdentity {
  return {
    id: account.id,
    fullName: account.fullName,
    email: account.email,
    role: account.role,
  };
}

const subscribeToHydration = () => () => undefined;

export function AdvisorPortal(props: DemoProps) {
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [session, setSession] = useState<AdvisorIdentity | null>(() =>
    typeof window === "undefined" ? null : readSession()
  );
  const [mode, setMode] = useState<Mode>("login");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const openMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrors({});
    setNotice("");
    setShowPassword(false);
  };

  const saveSession = (identity: AdvisorIdentity, persist: boolean) => {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    const storage = persist ? window.localStorage : window.sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(identity));
    setSession(identity);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
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
    const email = normalizeAdvisorEmail(parsed.data.email);
    const account = readJson<StoredAdvisorAccount[]>(ACCOUNTS_KEY, []).find((item) => item.email === email);
    const passwordHash = account ? await derivePassword(parsed.data.password, account.salt) : "";
    setPending(false);
    if (!account || passwordHash !== account.passwordHash) {
      setNotice("El correo o la contraseña no coinciden. Revisa los datos o crea una cuenta.");
      return;
    }
    saveSession(toIdentity(account), values.rememberSession === "on");
  };

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setNotice("");
    const values = formValues(event.currentTarget);
    const parsed = advisorRegistrationSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setPending(true);
    const accounts = readJson<StoredAdvisorAccount[]>(ACCOUNTS_KEY, []);
    const email = normalizeAdvisorEmail(parsed.data.email);
    if (accounts.some((account) => account.email === email)) {
      setPending(false);
      setErrors({ email: "Ya existe una cuenta con este correo" });
      return;
    }
    const salt = createSalt();
    const account: StoredAdvisorAccount = {
      id: crypto.randomUUID(),
      fullName: parsed.data.fullName.trim(),
      email,
      role: parsed.data.role,
      salt,
      passwordHash: await derivePassword(parsed.data.password, salt),
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
    setPending(false);
    saveSession(toIdentity(account), values.rememberSession === "on");
  };

  const logout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    openMode("login");
  };

  if (!ready) {
    return <main className="access-loading"><BrandLockup/><span>Preparando acceso seguro…</span></main>;
  }

  if (session) {
    return <DemoApp {...props} advisor={session} onLogout={logout}/>;
  }

  return (
    <main className="advisor-access">
      <section className="access-story">
        <BrandLockup/>
        <div>
          <span className="eyebrow light"><ShieldCheck/> Acceso para el equipo asesor</span>
          <h1>Una sesión propia para cada conversación.</h1>
          <p>Crea tu cuenta de demostración o entra con los datos que registraste. La identidad del asesor aparecerá en el portal y en la trazabilidad.</p>
        </div>
        <ul>
          <li><Check/> Cuentas múltiples en este navegador</li>
          <li><Check/> Contraseña derivada, nunca guardada en texto plano</li>
          <li><Check/> Cierre de sesión disponible desde el portal</li>
        </ul>
        <small>Modo MVP: las cuentas se conservan únicamente en este navegador y no se conectan al directorio corporativo.</small>
      </section>

      <section className="access-panel">
        <div className="access-mobile-brand"><BrandLockup/></div>
        <div className="access-tabs" role="tablist" aria-label="Opciones de acceso">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => openMode("login")}>Iniciar sesión</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => openMode("register")}>Crear cuenta</button>
        </div>

        {mode === "login" ? (
          <form className="access-form" onSubmit={(event) => void submitLogin(event)} noValidate>
            <header><span><LockKeyhole/></span><h2>Bienvenido de nuevo</h2><p>Ingresa con una cuenta creada en este dispositivo.</p></header>
            <AccessField label="Correo" name="email" type="email" autoComplete="email" placeholder="asesor@ejemplo.com" error={errors.email}/>
            <PasswordField label="Contraseña" name="password" autoComplete="current-password" error={errors.password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)}/>
            <label className="access-remember"><input name="rememberSession" type="checkbox" defaultChecked/><span><strong>Mantener mi sesión iniciada</strong><small>Desmárcalo si estás usando un equipo compartido.</small></span></label>
            {notice && <p className="access-notice" role="alert">{notice}</p>}
            <button className="button button-primary access-submit" disabled={pending}>{pending ? "Verificando…" : "Entrar al portal"}<ArrowRight/></button>
            <p className="access-switch">¿Aún no tienes cuenta? <button type="button" onClick={() => openMode("register")}>Créala aquí</button></p>
          </form>
        ) : (
          <form className="access-form" onSubmit={(event) => void submitRegistration(event)} noValidate>
            <header><span><UserPlus/></span><h2>Crea tu acceso</h2><p>Usa datos ficticios para esta demostración pública.</p></header>
            <AccessField label="Nombre completo" name="fullName" autoComplete="name" placeholder="Camila Rodríguez" error={errors.fullName}/>
            <AccessField label="Correo" name="email" type="email" autoComplete="email" placeholder="camila@ejemplo.com" error={errors.email}/>
            <label className="access-field"><span>Rol</span><select name="role" defaultValue={advisorRoles[0]}>{advisorRoles.map((role) => <option key={role}>{role}</option>)}</select>{errors.role && <em>{errors.role}</em>}</label>
            <PasswordField label="Contraseña" name="password" autoComplete="new-password" hint="Mínimo 8 caracteres, una letra y un número." error={errors.password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)}/>
            <PasswordField label="Confirmar contraseña" name="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)}/>
            <label className="access-remember"><input name="rememberSession" type="checkbox" defaultChecked/><span><strong>Mantener mi sesión iniciada</strong><small>Puedes cerrarla cuando quieras desde el portal.</small></span></label>
            <button className="button button-primary access-submit" disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta y entrar"}<ArrowRight/></button>
            <p className="access-switch">¿Ya tienes una cuenta? <button type="button" onClick={() => openMode("login")}>Inicia sesión</button></p>
          </form>
        )}
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
}) {
  return <label className="access-field"><span>{label}</span><input {...props}/>{error && <em>{error}</em>}</label>;
}

function PasswordField({ label, name, autoComplete, hint, error, visible, onToggle }: {
  label: string;
  name: string;
  autoComplete: string;
  hint?: string;
  error?: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return <div className="access-field"><label htmlFor={name}>{label}</label><div><input id={name} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete}/><button type="button" onClick={onToggle} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff/> : <Eye/>}</button></div>{hint && <small>{hint}</small>}{error && <em>{error}</em>}</div>;
}
