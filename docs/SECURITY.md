# Modelo técnico de seguridad

Este documento describe controles presentes en el código y requisitos aún necesarios para operar con datos reales. La recepción de vulnerabilidades se gestiona mediante la [política de seguridad del repositorio](../SECURITY.md).

## Fronteras de confianza

| Frontera | Control |
|---|---|
| Entradas HTTP y formularios | Esquemas Zod, normalización y límites explícitos |
| Archivos CSV/XLSX | Tipo y tamaño restringidos, máximo de filas y validación por fila |
| Exportaciones | Neutralización de fórmulas que empiecen por `=`, `+`, `-` o `@` |
| Respuestas y logs | Identificadores enmascarados y eventos de auditoría sin PII completa |
| Señales | Consentimiento, sensibilidad, procedencia y vigencia antes del cálculo |
| Proveedores de IA | Datos agregados o redactados, salida estructurada y fallback local |
| Navegador | CSP, anti-framing, `nosniff`, política de permisos y HSTS en producción |
| Dependencias | Lockfile, auditoría productiva, Dependabot y CI |
| Código | TypeScript estricto, ESLint, pruebas automatizadas y análisis CodeQL |

## Controles implementados

- Las claves permanecen en el servidor y `.env*` está ignorado salvo `.env.example`.
- Ningún secreto de ejemplo usa un valor funcional.
- Las rutas de carga restringen tamaño, extensión y cantidad de registros.
- El contenido aportado por una persona no se renderiza como HTML.
- Chispy limita longitud, consultas por IP y presupuesto diario; al superar el límite degrada al motor local.
- Un identificador sintético desconocido no inicia consultas ni genera perfiles.
- La memoria compartida no conserva los casos declarados por visitantes; el handoff vive en el navegador con caducidad y tope.
- La política de contacto verifica autorización, horario, frecuencia y exclusiones antes de sugerir una acción.
- La CSP de producción elimina `unsafe-eval`, bloquea objetos y framing, y limita recursos al mismo origen.
- El esquema de referencia en `db/schema.sql` modela aislamiento por workspace, RLS, soft delete y separación de PII; no afirma que exista una base productiva desplegada.

## Riesgos residuales del prototipo

- La autenticación del portal es local y no protege recursos de servidor.
- Los límites en memoria no son globales entre instancias serverless.
- La persistencia es efímera y no implementa recuperación, backups ni borrado verificable en infraestructura.
- La CSP conserva `unsafe-inline` por compatibilidad con el render de Next.js; una implantación productiva debe migrar a nonces o hashes.
- No hay WAF, antivirus de archivos, SIEM, gestión centralizada de secretos ni pruebas de penetración.
- Los conectores externos y la entrega real de correo son opcionales y requieren evaluación contractual.

## Requisitos previos a producción

1. Identidad corporativa con MFA, autorización por roles y sesiones gestionadas en servidor.
2. KMS para cifrado, rotación de secretos y separación de ambientes.
3. Persistencia con RLS validada por operación, backups y políticas de retención ejecutables.
4. Rate limiting distribuido, WAF, protección de subida de archivos y límites por tenant.
5. Monitoreo, alertas, trazabilidad inmutable y runbooks de incidente y rollback.
6. SAST, DAST, revisión de dependencias y prueba de penetración independiente.
7. Validación jurídica, financiera, operativa y de riesgo antes de usar datos reales.

## Verificación local

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm audit:prod
```
