# Creasy — Hackathon 30X Colsubsidio

Creasy es un prototipo de enriquecimiento y afinidad crediticia explicable. Convierte datos autorizados en necesidades financieras comprensibles, compara esas necesidades con un catálogo de productos y muestra la evidencia utilizada para apoyar mejores conversaciones entre afiliados y asesores.

Creasy no aprueba ni rechaza créditos, no calcula riesgo y no sustituye las validaciones financieras, documentales, legales o de capacidad de pago.

El MVP utiliza un modelo híbrido: **el afiliado recibe orientación inmediata y la asesora recibe un perfil enriquecido y explicable para continuar el proceso**.

## Estado del proyecto

El repositorio contiene un MVP funcional construido para la Hackathon Colsubsidio × 30X. La aplicación puede ejecutarse completamente en modo local con datos sintéticos y sin credenciales.

Actualmente funcionan:

- Dos entradas conectadas al mismo motor: autogestión del afiliado y portal para asesores.
- Formulario accesible de orientación con consentimiento obligatorio.
- Resultado individual con producto principal, alternativas, explicación, datos faltantes y confianza.
- Solicitud de contacto que crea un caso con origen `Autogestión del afiliado`.
- Landing page y demo navegable.
- 36 perfiles sintéticos y un catálogo configurable de 8 productos.
- Motor determinista de afinidad con reglas versionadas.
- Explicaciones con señales positivas, faltantes, confianza y procedencia.
- Importación y validación de archivos CSV y XLSX.
- Comparación de productos y revisión humana.
- Copiloto con modo local y adaptadores opcionales para Gemini, Qwen, OpenAI y Anthropic.
- Lectura de respuestas con ElevenLabs o síntesis local del navegador.
- Registro de auditoría redactado.
- API de demostración, esquema SQL de referencia y pruebas automatizadas.

## Tecnologías

- Next.js 16 y React 19.
- TypeScript.
- React Hook Form y Zod.
- Recharts.
- PapaParse y SheetJS.
- Vitest y Playwright.
- Supabase/PostgreSQL como modelo de persistencia de referencia.

## Arquitectura

La interfaz y la API se ejecutan en una sola aplicación Next.js. El flujo principal es:

```text
Entrada → validación → normalización → consentimiento
→ exclusión de datos sensibles → afinidad determinista
→ explicación → revisión humana
```

Los proveedores de IA solo resumen resultados ya calculados. Las respuestas se validan con Zod y tienen un respaldo determinista para mantener la demo disponible.

Más información:

- [Arquitectura](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Diccionario de datos](docs/DATA_DICTIONARY.md)
- [Privacidad](docs/PRIVACY.md)
- [Seguridad](docs/SECURITY.md)
- [Flujos de usuario](docs/USER_FLOWS.md)

## Estructura

```text
app/          páginas y rutas API
components/   interfaz principal de la demo
config/       marca y catálogo de productos
data/         perfiles sintéticos
db/           esquema SQL de referencia
docs/         documentación técnica pública
lib/          dominio, privacidad, validación e integraciones
public/       recursos y archivos de ejemplo
tests/        pruebas unitarias y E2E
```

## Requisitos

- Node.js 20.9 o superior.
- pnpm 9 o superior.

## Instalación

```bash
git clone https://github.com/salazarlarajuancamilo5-dev/Hackathon-30x-Colsubsidio-Credito.git
cd Hackathon-30x-Colsubsidio-Credito
pnpm install
```

La configuración externa es opcional. Para habilitarla:

```bash
cp .env.example .env.local
```

En PowerShell:

```powershell
Copy-Item .env.example .env.local
```

## Ejecutar localmente

```bash
pnpm dev
```

Abrir:

- Aplicación: `http://localhost:3000`
- Orientación para afiliados: `http://localhost:3000/orientacion`
- Demo: `http://localhost:3000/demo`

El frontend y las rutas backend se inician con el mismo comando.

## Variables de entorno

Ninguna variable es obligatoria para el modo demo.

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicación |
| `LLM_PROVIDER` | `demo`, `gemini`, `qwen`, `openai` o `anthropic` |
| `GEMINI_API_KEY` | Proveedor Gemini |
| `QWEN_API_KEY` / `QWEN_BASE_URL` | Proveedor Qwen compatible |
| `OPENAI_API_KEY` | Proveedor OpenAI |
| `ANTHROPIC_API_KEY` | Proveedor Anthropic |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | Síntesis de voz |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase |
| `SUPABASE_SECRET_KEY` | Clave de servidor; nunca debe exponerse al navegador |

Consulta `.env.example` para ver toda la configuración admitida. No publiques `.env.local` ni credenciales reales.

## Verificaciones

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Para el recorrido E2E:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Datos de ejemplo

Los archivos `public/ejemplos/perfiles-sinteticos.csv` y `public/ejemplos/perfiles-sinteticos.xlsx` contienen exclusivamente información ficticia para demostrar el procesamiento masivo.

## Limitaciones conocidas

- La persistencia activa del modo demo es efímera y se reinicia con el proceso.
- `db/schema.sql` es una referencia preparada para Supabase, pero la interfaz todavía usa el almacenamiento local.
- La demo no tiene autenticación real ni debe exponerse como sistema productivo.
- No se utilizan fuentes exógenas reales ni datos personales reales.
- Las métricas mostradas corresponden a datos sintéticos.

## Colaboración

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) antes de crear una rama o abrir un pull request.
