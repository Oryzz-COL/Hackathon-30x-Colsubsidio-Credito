# Creasy — Hackathon Colsubsidio × 30X

> La orientación correcta, en el momento correcto y por el canal autorizado.

Creasy es un MVP de afinidad crediticia explicable. Conecta metas declaradas, contexto y señales propias autorizadas para orientar al afiliado y darle a la persona asesora una conversación relevante.

Responde tres preguntas con datos declarados: qué producto corresponde a la meta de la persona, si el escenario que plantea se sostiene, y qué haría falta para que sí.

No aprueba ni rechaza créditos, no consulta centrales de riesgo, no verifica ingresos y no reemplaza validaciones financieras, documentales, jurídicas ni humanas. Toda decisión final corresponde al estudio de crédito de Colsubsidio y a una persona.

## Demostración rápida

1. Ejecuta el proyecto y abre `http://localhost:3000/orientacion`.
2. Completa el recorrido pidiendo un monto desproporcionado para el ingreso que declares.
3. Comprueba que el resultado dice **hoy no es viable**, con motivos y con el escenario que sí funcionaría.
4. Pulsa **Solicitar ayuda de una asesora** y abre los dos correos que se generan.
5. Entra al portal en `http://localhost:3000/demo` (credenciales precargadas), abre **Bandeja de casos** y **Chispy**.

El guion de presentación está en [docs/PITCH_120_SECONDS.md](docs/PITCH_120_SECONDS.md).

### Acceso

| Experiencia | Ruta | Acceso |
|---|---|---|
| Inicio público | `/` | Libre |
| Recorrido del afiliado | `/orientacion` | Libre, sin cuenta |
| Demostración para jurado | `/demo` → **Explorar demostración** | Temporal, sin registro |
| Portal asesor | `/demo` | `david@oryzz.com` / `12345678`, precargadas |

| Caso de ejemplo | Categoría | Meta | Mayor afinidad | Momento | Canal |
|---|---:|---|---|---|---|
| Valentina Ríos | A | Iniciar una especialización | Crédito educativo | Próximos tres meses | WhatsApp |
| Samuel Mendoza | B | Comprar vivienda | Crédito hipotecario | Etapa de planeación | Portal |
| Laura Cárdenas | C | Fortalecer su emprendimiento | Crédito Mujer | Ahora | Llamada |

Cada tarjeta muestra como mínimo tres señales con fuente, fecha de verificación y confianza, además de faltantes, exclusiones, versión de la regla, siguiente acción y revisión humana obligatoria.

## Probar los dos portales

| Experiencia | Ruta | Acceso |
|---|---|---|
| Inicio público | `/` | Libre |
| Orientación del afiliado | `/orientacion` | Libre; no exige cuenta |
| Demostración interactiva | `/demo` → **Explorar demostración** | Temporal y sin registro |
| Portal asesor | `/demo` | Cuenta local de demostración |

En el portal asesor puedes crear varias cuentas, iniciar sesión, elegir **Mantener mi sesión iniciada** y cerrar sesión desde la barra superior. Las contraseñas se derivan antes de almacenarse; este acceso solo demuestra el flujo y debe sustituirse por identidad corporativa antes de producción.

## Qué problema resuelve

La categoría de afiliación o el rango de edad describen una parte del contexto, pero no explican por sí solos qué necesita una persona ahora. Creasy responde:

- cuál producto tiene mayor correspondencia con su objetivo;
- qué señales autorizadas sustentan la orientación;
- por qué podría ser un buen momento;
- por cuál canal y franja prefiere continuar;
- qué información falta y qué debe revisar una persona.

## Cómo funciona

```text
Datos declarados + señales propias autorizadas
                      ↓
Validación, normalización y control de consentimiento
                      ↓
Exclusión de datos sensibles, vencidos o no autorizados
                      ↓
Motor determinista de afinidad
                      ↓
Producto + explicación + momento + canal + siguiente acción
                      ↓
Revisión humana obligatoria
```

El copiloto, si se configura un proveedor de IA, solo resume resultados ya calculados. Su salida se valida con un esquema estricto y siempre existe una respuesta determinista local.

## Viabilidad preliminar

`lib/decision/engine.ts` evalúa el escenario declarado con reglas versionadas y devuelve uno de tres estados, nunca un rechazo definitivo:

| Estado | Cuándo |
|---|---|
| `PREAPROBADO` | Cumple antigüedad, la cuota cabe en el ingreso declarado y el monto respeta los topes |
| `REQUIERE_REVISION` | Falta declarar algo, o la cuota queda ajustada entre el 30 % y el 40 % del ingreso |
| `NO_VIABLE_HOY` | No cumple antigüedad, la cuota supera el 40 % del ingreso o el monto excede el tope aplicable |

Cuando no da, la respuesta incluye el escenario que sí daría: monto y plazo alcanzables con lo declarado.

Las reglas y las cifras salen del reglamento vigente de Colsubsidio: antigüedad de 2 meses con contrato indefinido y 6 con cualquier otro; ingreso mínimo de 1 SMMLV; monto de 1 a 150 SMMLV sin superar 15 veces el ingreso; plazos de 6 a 72 meses con libranza y de 6 a 60 sin ella; y las tasas efectivas anuales publicadas para enero de 2026 por categoría de afiliación. La categoría mueve la tasa y nada más: nunca se usa como criterio adverso.

## Chispy

El copiloto del portal es un agente con herramientas, no un prompt largo. Recibe un resumen agregado del workspace y decide qué consultar: la base de conocimiento oficial, los perfiles, un caso concreto, los indicadores o el registro de auditoría. Cada llamada a herramienta se emite como evento y se pinta en pantalla mientras ocurre.

- **Fundamentado**: `data/conocimiento.ts` guarda hechos verificables con su fuente y su fecha; Chispy cita el documento del que sale cada cifra.
- **Sin PII**: el enmascarado ocurre en las herramientas, en código, no en una instrucción del sistema.
- **Sin decisiones**: los motores deterministas calculan; Chispy explica lo ya calculado.
- **Siempre disponible**: sin clave, sin cuota o con el proveedor caído responde el motor local sobre la misma base de conocimiento.
- **Con techo de gasto**: límite por IP, límite diario e interruptor manual. Superar un límite no devuelve un error, devuelve la respuesta local.

## Capacidades

- Recorrido de autogestión del afiliado y portal de asesor.
- 36 perfiles de ejemplo y tres casos centrales reproducibles.
- Afinidad explicable con evidencia, procedencia, vigencia y confianza.
- Consentimientos separados para orientación, personalización, contacto y simulación.
- Política de contacto por canal, horario, frecuencia, bloqueo y RNE simulado.
- Categorías A, B, C y D como contexto no adverso.
- Género declarado, nunca inferido, usado solo para correspondencia de Crédito Mujer.
- Revisión humana, auditoría redactada y exportación de tarjeta explicable.
- Importación CSV/XLSX con mapeo y validación por fila.
- Copiloto local con integraciones de IA y voz estrictamente opcionales.
- Embudo de impacto calculado, sin promesas de colocación, conversión o ahorro.

## Catálogo público

El recorrido público presenta siete opciones con información documentada: Cupo de crédito / consumo rotativo, Vivienda, Educativo, Crédito Mujer, Compra de cartera, Crédito complementario y Seguros e impuestos.

Cupo y consumo rotativo son una sola línea y no se creó un producto duplicado. Las opciones sin información suficientemente validada no se muestran al público.

La categoría y la edad no aumentan ni reducen afinidad de forma adversa. El género no cambia otros productos. Creasy no consulta centrales de riesgo, correos, redes sociales, navegación externa ni fuentes no autorizadas.

## Instalación local

Requisitos: Node.js 20.9 o superior y pnpm 9 o superior.

```bash
git clone https://github.com/salazarlarajuancamilo5-dev/Hackathon-30x-Colsubsidio-Credito.git
cd Hackathon-30x-Colsubsidio-Credito
pnpm install
pnpm dev
```

Abre `http://localhost:3000`. Si el puerto está ocupado, Next.js mostrará en la terminal el puerto alternativo.

## Configuración opcional

El MVP funciona completo sin credenciales externas. Copia `.env.example` a `.env.local` solo si quieres probar integraciones:

| Grupo | Variables | Comportamiento sin configurar |
|---|---|---|
| Copiloto | `LLM_PROVIDER` y credenciales del proveedor | Respuesta determinista local |
| Voz | `ELEVENLABS_*` | El texto sigue disponible |
| Persistencia futura | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY` | Memoria efímera del proceso |
| Límites | `MAX_BATCH_ROWS`, `MAX_UPLOAD_BYTES` | Valores seguros del MVP |

Nunca publiques `.env.local` ni uses una clave secreta con prefijo `NEXT_PUBLIC_`.

## Verificación

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Las pruebas cubren motor y catálogo, tres perfiles distintos, consentimiento y bloqueos, equidad por edad/categoría/género, fallback del copiloto, flujo afiliado, autenticación, demostración interactiva y revisión humana.

## Estructura

```text
app/          páginas, portal y rutas API
components/   experiencias del afiliado y asesor
config/       catálogo clasificado y marca
data/         perfiles de ejemplo reproducibles
db/           esquema SQL de referencia
docs/         arquitectura, uso, privacidad y controles
lib/          afinidad, personalización, validación e integraciones
public/       marca y archivos de ejemplo
tests/        pruebas unitarias y recorridos de navegador
```

Documentación pública:

- [Guion de 120 segundos](docs/PITCH_120_SECONDS.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Diccionario de datos](docs/DATA_DICTIONARY.md)
- [Flujos de usuario](docs/USER_FLOWS.md)
- [Privacidad](docs/PRIVACY.md)
- [Seguridad](docs/SECURITY.md)
- [Matriz de controles](docs/COMPLIANCE_MATRIX.md)

## Límites del prototipo

- Todos los perfiles, interacciones, consentimientos y métricas usan datos de demostración generados.
- La memoria del servidor se reinicia con el proceso; las cuentas demo viven solo en el navegador.
- `db/schema.sql` es una referencia para persistencia futura, no una base productiva conectada.
- Monto, tasa, elegibilidad y condiciones requieren una fuente oficial vigente.
- Antes de usar datos reales se necesitan validaciones jurídica, operativa, financiera, de seguridad y de riesgo.
