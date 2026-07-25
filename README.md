# Creasy — Hackathon Colsubsidio × 30X

> La orientación correcta, en el momento correcto y por el canal autorizado.

Creasy es un MVP de afinidad crediticia explicable. Conecta metas declaradas, contexto y señales propias autorizadas para orientar al afiliado y darle a la persona asesora una conversación relevante.

No aprueba ni rechaza créditos, no calcula riesgo o capacidad de pago y no reemplaza validaciones financieras, documentales, jurídicas ni humanas.

## Demostración rápida

1. Ejecuta el proyecto y abre `http://localhost:3000/demo`.
2. Pulsa **Explorar demostración**. No necesitas registrarte.
3. Lee primero la meta de Valentina, Samuel y Laura.
4. Compara producto, momento y canal; abre la trazabilidad de un caso.
5. Pulsa **Ver impacto honesto** para cerrar con conteos calculados.

La demostración usa una sesión temporal, abre los tres casos clave y permite reiniciar el recorrido con un clic. El guion de presentación está en [docs/PITCH_120_SECONDS.md](docs/PITCH_120_SECONDS.md).

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
