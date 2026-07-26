/**
 * La frontera de privacidad del servidor.
 *
 * `GET /api/profiles` es público y sin sesión. Durante un tiempo devolvió la
 * cédula, el correo y el teléfono en claro mientras la interfaz mostraba
 * `99••••00`, que es la peor combinación posible: el control existía solo donde
 * nadie lo estaba atacando. Estas pruebas fijan que el enmascarado ocurra antes
 * de que el dato salga y que el catálogo no se pueda mutar desde fuera.
 */

import { describe, expect, it } from "vitest";
import { maskDocument, maskEmail, maskPhone, publicProfile } from "@/lib/privacy";
import { store } from "@/lib/store";

describe("lo que sale por la API", () => {
  it("cubre documento, correo y teléfono", () => {
    const masked = publicProfile({
      documentNumber: "1020304050",
      email: "valentina.rios@example.com",
      phone: "3001234567",
    });

    expect(masked.documentNumber).not.toContain("1020304050");
    expect(masked.email).not.toContain("valentina.rios");
    expect(masked.phone).not.toContain("3001234");
  });

  it("no rompe cuando el perfil no trae esos campos", () => {
    expect(publicProfile({ documentNumber: "", email: "", phone: "" })).toEqual({
      documentNumber: "",
      email: "",
      phone: "",
    });
  });

  it("puede aplicarse dos veces sin degradar el texto", () => {
    /* La interfaz vuelve a enmascarar lo que ya llega enmascarado. */
    expect(maskDocument(maskDocument("1020304050"))).toBe(maskDocument("1020304050"));
    expect(maskEmail(maskEmail("valentina@example.com"))).toBe(maskEmail("valentina@example.com"));
    expect(maskPhone(maskPhone("3001234567"))).toBe(maskPhone("3001234567"));
  });

  it("ningún perfil del catálogo público conserva su documento completo", () => {
    for (const profile of store.list().map(publicProfile)) {
      expect(profile.documentNumber).toMatch(/•/);
    }
  });
});

describe("el catálogo de demostración", () => {
  it("no se puede mutar desde fuera", () => {
    const before = store.list().length;
    const copy = store.list();
    copy.push({ ...copy[0]!, id: "intruso" });
    copy[0]!.fullName = "Modificado";

    expect(store.list()).toHaveLength(before);
    expect(store.list()[0]!.fullName).not.toBe("Modificado");
  });

  it("registra auditoría sin exponer datos personales", () => {
    store.log({ action: "PROFILE_READ", actor: "Asesora demo", detail: "Perfil 12ab34cd consultado" });
    const [latest] = store.audit();

    expect(latest!.detail).not.toMatch(/@|\b\d{7,}\b/);
  });
});
