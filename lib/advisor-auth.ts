import { z } from "zod";

/*
 * Los cargos se nombran por la función y no por quien la ejerce. El proyecto
 * habla de "persona asesora" en todas partes; que el catálogo de roles obligara
 * a elegir entre asesor y asesora era la única esquina donde no se cumplía.
 */
export const advisorRoles = ["Asesoría de crédito", "Liderazgo comercial", "Analítica"] as const;
export type AdvisorRole = (typeof advisorRoles)[number];

export interface AdvisorIdentity {
  id: string;
  fullName: string;
  email: string;
  role: AdvisorRole;
}

export interface StoredAdvisorAccount extends AdvisorIdentity {
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export const advisorRegistrationSchema = z.object({
  fullName: z.string().trim().min(3, "Escribe tu nombre completo").max(80, "Máximo 80 caracteres"),
  email: z.string().trim().email("Escribe un correo válido").max(120),
  role: z.enum(advisorRoles),
  password: z.string()
    .min(8, "Usa al menos 8 caracteres")
    .regex(/[A-Za-z]/, "Incluye al menos una letra")
    .regex(/\d/, "Incluye al menos un número"),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas no coinciden",
});

export const advisorLoginSchema = z.object({
  email: z.string().trim().email("Escribe un correo válido").max(120),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const normalizeAdvisorEmail = (email: string) => email.trim().toLowerCase();

export function advisorInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AS";
}

export function advisorFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Asesor";
}
