import { describe, expect, it } from "vitest";
import {
  advisorFirstName,
  advisorInitials,
  advisorLoginSchema,
  advisorRegistrationSchema,
  normalizeAdvisorEmail,
} from "@/lib/advisor-auth";

describe("acceso de asesores", () => {
  it("normaliza el correo antes de buscar una cuenta", () => {
    expect(normalizeAdvisorEmail("  Camila@Ejemplo.COM ")).toBe("camila@ejemplo.com");
  });

  it("acepta una cuenta con datos completos", () => {
    const result = advisorRegistrationSchema.safeParse({
      fullName: "Camila Rodríguez",
      email: "camila@ejemplo.com",
      role: "Asesoría de crédito",
      password: "Creasy2026",
      confirmPassword: "Creasy2026",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza contraseñas débiles", () => {
    const result = advisorRegistrationSchema.safeParse({
      fullName: "Camila Rodríguez",
      email: "camila@ejemplo.com",
      role: "Asesoría de crédito",
      password: "corta",
      confirmPassword: "corta",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseñas que no coinciden", () => {
    const result = advisorRegistrationSchema.safeParse({
      fullName: "Camila Rodríguez",
      email: "camila@ejemplo.com",
      role: "Asesoría de crédito",
      password: "Creasy2026",
      confirmPassword: "Creasy2027",
    });
    expect(result.success).toBe(false);
  });

  it("valida los datos mínimos de inicio de sesión", () => {
    expect(advisorLoginSchema.safeParse({ email: "asesor@ejemplo.com", password: "clave" }).success).toBe(true);
    expect(advisorLoginSchema.safeParse({ email: "correo-invalido", password: "" }).success).toBe(false);
  });

  it("construye nombre e iniciales para personalizar el portal", () => {
    expect(advisorFirstName("Juan Camilo Salazar")).toBe("Juan");
    expect(advisorInitials("Juan Camilo Salazar")).toBe("JC");
  });
});
