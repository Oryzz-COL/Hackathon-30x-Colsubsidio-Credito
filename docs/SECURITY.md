# Seguridad de Creasy

- Validación Zod en servidor; tipos/tamaño de carga restringidos.
- PII enmascarada y logs redactados.
- Neutralización de fórmulas CSV (`=`, `+`, `-`, `@`).
- CSP, `nosniff`, `DENY`, permisos de navegador mínimos y `poweredByHeader` deshabilitado.
- Rate limit básico del copiloto.
- Texto cargado nunca se renderiza como HTML.
- Claves solo en servidor; ninguna incluida en el repositorio.
- RLS por workspace y autorización basada en membresía, nunca `user_metadata`.

Pendiente de producción: KMS para cifrado, rate limiter distribuido, antivirus de archivos, WAF, rotación de secretos, SSO/MFA, pruebas de penetración, políticas RLS completas para cada operación, Supabase Advisors y monitoreo.
