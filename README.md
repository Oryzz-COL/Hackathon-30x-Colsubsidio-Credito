# Creasy — Hackathon Colsubsidio × 30X

**La oferta correcta, en el momento correcto y por el canal correcto.**

Creasy es un MVP de orientación y afinidad crediticia explicable. Convierte información declarada y señales propias autorizadas en recomendaciones comprensibles para el afiliado y en contexto accionable para la persona asesora.

Creasy no aprueba ni rechaza créditos, no calcula riesgo y no reemplaza las validaciones financieras, documentales, jurídicas o de capacidad de pago.

## Recorrido recomendado para jurados

La prueba principal toma menos de tres minutos:

1. Abre `http://localhost:3000/demo?view=pulse`.
2. Simula actividad propia autorizada y observa cómo cambia el contexto sin diligenciar un formulario.
3. Revisa la vigencia, confianza y procedencia de cada señal.
4. Abre `http://localhost:3000/demo?view=scenarios` para comparar tres personas con productos, momentos y canales diferentes.
5. Visita `http://localhost:3000/orientacion` para completar el recorrido del afiliado.

| Perfil sintético | Categoría | Necesidad | Recomendación principal | Momento | Canal |
|---|---:|---|---|---|---|
| Valentina Ríos | A | Especialización | Crédito educativo | Próximos tres meses | WhatsApp |
| Samuel Mendoza | B | Vivienda propia | Crédito hipotecario | Etapa de planeación | Portal |
| Laura Cárdenas | C | Emprendimiento | Crédito Mujer | Necesidad inmediata | Llamada |

## Problema y propuesta

La información sociodemográfica permite conocer parte del contexto de una persona, pero no necesariamente su intención actual. Creasy complementa ese contexto con datos declarados, uso de servicios, intereses, momento de vida e interacciones propias autorizadas.

El resultado responde cinco preguntas:

- Qué producto puede corresponder mejor a la necesidad.
- Por qué se recomienda.
- Cuándo conviene continuar la conversación.
- Por cuál canal autorizado.
- Qué debe revisar o hacer una persona asesora.

## Capacidades del MVP

- Autogestión para afiliados y portal para asesores conectados al mismo motor.
- Registro, inicio y cierre de sesión para múltiples asesores en el navegador de demostración.
- Categorías de afiliación A, B, C y D visibles en captura, perfiles y trazabilidad.
- 36 perfiles sintéticos y tres escenarios centrales reproducibles.
- Recomendaciones explicadas con al menos tres señales.
- Perfil vivo que convierte actividad propia autorizada en contexto sin pedir formularios repetitivos.
- Detección de cambios basada en recencia, consistencia, intensidad y consentimiento.
- Exclusión automática de señales vencidas o sin autorización.
- Preferencias de canal, franja, frecuencia y producto.
- Consentimientos separados para orientación, personalización, contacto y simulación.
- Importación y validación de perfiles mediante CSV o XLSX.
- Comparación de alternativas y revisión humana obligatoria.
- Copiloto con respuesta determinista local e integraciones opcionales de IA.
- Registro de auditoría redactado y persistencia efímera para la demostración.

## Portafolio representado

El catálogo contiene las cinco familias centrales del reto y productos complementarios descritos en el material de referencia:

1. Cupo de crédito o consumo rotativo.
2. Crédito hipotecario.
3. Crédito educativo.
4. Compra de cartera.
5. Crédito Mujer.
6. Crédito complementario.
7. Crédito rotativo para seguros e impuestos.
8. Libre inversión, identificado expresamente como producto adicional pendiente de validación oficial.

Las categorías de afiliación se presentan como contexto:

- **A:** hasta 2 SMMLV.
- **B:** más de 2 y hasta 4 SMMLV.
- **C:** más de 4 SMMLV.
- **D:** persona no afiliada.

La categoría y la edad nunca se usan como señales adversas ni sustituyen el estudio de crédito. El género no se infiere por el nombre: se solicita como dato declarado y se usa únicamente para comprobar si Crédito Mujer corresponde. No modifica la afinidad de los demás productos.

## Cómo funciona

```text
Entrada declarada y autorizada
        ↓
Validación y normalización
        ↓
Exclusión de señales sensibles o no autorizadas
        ↓
Afinidad determinista por cinco familias de señales
        ↓
Producto + explicación + momento + canal + siguiente acción
        ↓
Revisión humana
```

Un proveedor de IA, cuando se configura, solo resume resultados ya calculados. Las salidas se validan con Zod y siempre existe un respaldo determinista para mantener disponible la demostración.

## Ejecutar localmente

Requisitos:

- Node.js 20.9 o superior.
- pnpm 9 o superior.

```bash
git clone https://github.com/salazarlarajuancamilo5-dev/Hackathon-30x-Colsubsidio-Credito.git
cd Hackathon-30x-Colsubsidio-Credito
pnpm install
pnpm dev
```

Rutas:

- Inicio: `http://localhost:3000`
- Orientación para afiliados: `http://localhost:3000/orientacion`
- Portal para asesores: `http://localhost:3000/demo`
- Hiperpersonalización automática: `http://localhost:3000/demo?view=pulse`
- Prueba central: `http://localhost:3000/demo?view=scenarios`

El portal del afiliado no requiere cuenta. En el portal asesor cada persona puede crear una cuenta local de demostración, elegir si mantiene la sesión iniciada y cerrarla cuando quiera. Las contraseñas se derivan antes de almacenarse y nunca se guardan como texto plano. Este mecanismo persiste únicamente en el navegador y debe sustituirse por el proveedor de identidad corporativo antes de producción.

Las integraciones externas son opcionales y están documentadas en [.env.example](.env.example).

## Verificación

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Estado validado del MVP:

- 94 pruebas unitarias aprobadas.
- 6 recorridos completos de navegador aprobados.
- Compilación de producción correcta.

## Estructura pública

```text
app/          páginas y rutas API
components/   interfaz del afiliado y portal asesor
config/       marca y catálogo de productos
data/         perfiles sintéticos
db/           esquema SQL de referencia
docs/         arquitectura, API, datos, privacidad y seguridad
lib/          afinidad, personalización, validación e integraciones
public/       marca y archivos de ejemplo
tests/        pruebas unitarias y recorridos E2E
```

Documentación:

- [Arquitectura](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Diccionario de datos](docs/DATA_DICTIONARY.md)
- [Flujos de usuario](docs/USER_FLOWS.md)
- [Privacidad](docs/PRIVACY.md)
- [Seguridad](docs/SECURITY.md)
- [Matriz pública de controles](docs/COMPLIANCE_MATRIX.md)

## Datos y límites

Los archivos de [ejemplo CSV](public/ejemplos/perfiles-sinteticos.csv) y [ejemplo XLSX](public/ejemplos/perfiles-sinteticos.xlsx) contienen exclusivamente información ficticia.

- No se consultan centrales de riesgo, correos, redes sociales ni navegación externa.
- No se utilizan datos personales reales.
- La persistencia activa es efímera y se reinicia con el proceso.
- `db/schema.sql` es una referencia preparada para una futura persistencia en Supabase.
- La demo no incluye autenticación productiva.
- Las métricas mostradas corresponden a datos sintéticos o al contexto público del reto y no constituyen resultados auditados.

> Prototipo sujeto a validación jurídica, operativa, financiera y de riesgo antes de utilizar datos reales o condiciones oficiales de producto.
