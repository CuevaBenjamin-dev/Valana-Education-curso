# ESCS · IA y Digitalización

Landing editorial para el curso **Inteligencia Artificial y Digitalización para el Trabajo y los Negocios**, dictado por Benjamín Cueva. Su conversión principal es abrir WhatsApp con una consulta preparada.

Sitio estático desarrollado con Astro 7.3.3, TypeScript, HTML semántico y CSS nativo. No requiere backend, base de datos, checkout ni un framework de interfaz. Incluye una página de privacidad editable y medición opcional sujeta al consentimiento.

## Requisitos e instalación

- Node.js **22.12 o superior de la rama 22**, o **24 LTS**.
- npm **9.6.5 o superior**, incluido con las versiones indicadas de Node.js.

```sh
npm install
```

El `package-lock.json` fija las versiones instaladas. En un entorno de integración continua puede utilizarse `npm ci`.

## Desarrollo y build

```sh
npm run dev
npm run check
npm run build
npm run preview
```

- `dev`: servidor de desarrollo; la terminal muestra la URL local.
- `check`: verificación de Astro y TypeScript.
- `build`: genera el sitio estático en `dist/`.
- `preview`: permite revisar el contenido compilado localmente, después de `build`.

Las pruebas unitarias cubren consentimiento, atribución, exposición, proveedores y el helper de WhatsApp:

```sh
npm test
```

El equivalente directo en Node 24 es `node --test src/lib/analytics/analytics.test.ts tests/contact.test.ts`. El script npm añade `--experimental-strip-types` para funcionar también en Node 22.12.

### Pruebas en navegador

Requieren Google Chrome instalado; Playwright lo inicia sin interfaz gráfica. No es necesario instalar un navegador adicional para estos scripts.

Para la revisión responsive y de accesibilidad, dejar todas las variables de contacto y proveedores vacías, compilar y abrir una vista previa:

```sh
npm run build
npm run preview -- --port 4321
```

En otra terminal ejecutar:

```sh
npm run test:e2e
```

Equivale a `node tests/e2e.mjs`. Utiliza `http://localhost:4321` por defecto; `TEST_BASE_URL` permite indicar otro servidor local. Comprueba la landing y privacidad a 360, 390, 430, 768, 1024, 1280 y 1440 px, overflow, controles, navegación por teclado, reduced motion, consola y ausencia de proveedores sin configurar. Las capturas y el informe se guardan en `test-results/`, excluido de Git.

La integración de analítica se comprueba por separado:

```sh
npm run test:analytics
```

Equivale a `node tests/analytics-browser.mjs`. Inicia y cierra su propio servidor local en el puerto 4322; se puede cambiar con `ANALYTICS_TEST_PORT`. Utiliza IDs de prueba solo en el entorno del proceso hijo, sin modificar `.env`, y **intercepta todas las solicitudes externas**: no transmite datos a Clarity, Meta, TikTok ni WhatsApp. Comprueba consentimiento, revocación, saneamiento de URL, eventos, deduplicación y conversión utilizando SDKs simulados. No sustituye la validación posterior de los IDs reales en las herramientas de cada proveedor.

Para Lighthouse móvil, con el build servido en el puerto 4323:

```sh
npm run preview -- --port 4323
npm run audit:lighthouse
```

`TEST_BASE_URL` permite cambiar la URL de la auditoría. Los informes HTML y JSON se guardan en `test-results/`. La validación local del 17 de septiembre de 2026 obtuvo **100 rendimiento / 100 accesibilidad / 100 buenas prácticas / 100 SEO**, LCP 1,4 s y CLS 0, con los placeholders actuales y sin proveedores de analítica configurados. Las fotos, los SDKs consentidos, el alojamiento y la conexión reales pueden cambiar estas mediciones.

La revisión final del build completó **132 comprobaciones E2E**, sin overflow en los siete anchos, errores de consola/red ni infracciones automáticas de accesibilidad en las páginas evaluadas. Las **14 pruebas unitarias** y la integración de consentimiento también pasaron.

## Estructura

```text
public/                    Recursos públicos, favicon, imagen social y robots.txt
src/
  components/              Secciones editoriales y componentes reutilizables
    AnalyticsConsent.astro Consentimiento de medición
    InstructorPortrait.astro Retrato o placeholder del docente
  config/
    contact.ts             Número, mensaje y generación del enlace de WhatsApp
    site.ts                Marca, metadatos y URL pública validada
  data/
    course.ts              Contenido del curso, docente, sesiones y preguntas
  layouts/
    Layout.astro           Documento, fuentes, metadatos y scripts compartidos
  lib/
    analytics/             Proveedores, atribución y eventos centralizados
  pages/
    index.astro            Landing
    privacidad.astro       Plantilla de privacidad que debe completarse
  styles/                  Tokens, composición, responsive y movimiento
.env.example               Variables públicas disponibles
```

## Editar contenidos

Modificar `src/data/course.ts`. Los exports agrupan las responsabilidades:

| Export | Contenido |
| --- | --- |
| `course` | Título completo, título corto y descripción |
| `instructor` | Nombre, cargo, biografía y configuración de la fotografía |
| `problemItems` | Situaciones de trabajo con las que se identifica el visitante |
| `outcomes` | Resultados de aprendizaje |
| `sessions` | Cuatro sesiones propuestas, con descripción, temas y duración |
| `methodology` | Problema → demostración → práctica → resultado |
| `courseInfo` | Modalidad, nivel, sesiones y condiciones; `pending` indica datos pendientes |
| `faq` | Preguntas y respuestas; conservar identificadores estables para analítica |

El programa es provisional. No se incluyen testimonios, estadísticas, certificaciones ni condiciones comerciales no confirmadas.

Los textos de marca y SEO se editan en `src/config/site.ts`; el mensaje de WhatsApp, en `src/config/contact.ts`.

## Variables de entorno

Copiar `.env.example` a `.env` y completar únicamente los valores disponibles. El proyecto funciona con todos ellos vacíos.

| Variable | Uso |
| --- | --- |
| `PUBLIC_SITE_URL` | URL pública definitiva con `https://`. Permite generar referencias canónicas y sociales con el dominio correcto. |
| `PUBLIC_WHATSAPP_NUMBER` | Número internacional con código de país, de 8 a 15 cifras y sin prefijo `00`. |
| `PUBLIC_CLARITY_PROJECT_ID` | ID del proyecto de Microsoft Clarity. Opcional. |
| `PUBLIC_META_PIXEL_ID` | ID numérico del píxel de Meta. Opcional. |

Son variables **públicas**, incorporadas al sitio durante el build. No colocar claves secretas aquí. Después de cambiarlas hay que reiniciar el servidor de desarrollo o volver a generar y desplegar el sitio.

Si `PUBLIC_SITE_URL` falta o no es una URL HTTP(S) válida, la configuración no inventa un dominio. Utilizar el dominio raíz definitivo, sin una ruta de página.

## WhatsApp

Configurar `PUBLIC_WHATSAPP_NUMBER` y reconstruir el sitio. El helper `buildWhatsAppUrl()` de `src/config/contact.ts` elimina espacios y guiones, admite un `+` inicial y valida el formato internacional. Devuelve `null` para números ausentes o inválidos. Esto evita publicar un enlace hacia un número ficticio.

El mensaje predeterminado es:

> Hola, vi el curso de Inteligencia Artificial y Digitalización para el Trabajo y los Negocios y quisiera recibir más información.

El mensaje se codifica con `encodeURIComponent`. El enlace abre una conversación; el visitante revisa y envía el mensaje en WhatsApp. No hay envío automático.

Los CTA comparten la misma configuración y se identifican con `data-cta-location`, entre ellos `hero`, `curriculum`, `instructor` y `final`. Solo los enlaces de WhatsApp configurados generan el evento de contacto real. Sin un número válido, los CTA llevan al bloque de contacto, donde se indica que el canal está en preparación.

## Agregar la fotografía real

1. Guardar el retrato optimizado en `public/images/`, preferentemente WebP o AVIF.
2. En `src/data/course.ts`, cambiar `instructor.portrait.src` por su ruta pública, por ejemplo `/images/benjamin-cueva.webp`.
3. Ajustar `width` y `height` a las dimensiones reales y revisar `alt`.
4. Comprobar el recorte en hero y sección docente a 360, 390, 430 y 1440 px.

`src` vacío conserva el placeholder explícito **Fotografía de Benjamín Cueva**. El espacio vertical reservado evita tener que reconstruir el hero cuando llegue la imagen. No se utiliza una persona de stock ni una fotografía generada.

El recurso `public/og-course.png` es la imagen social provisional. Puede reemplazarse manteniendo el nombre; revisar también el alt y los metadatos si cambia su contenido.

La composición tipográfica de ese recurso está en `scripts/generate-og.mjs`; `npm run og` regenera el PNG de 1200 × 630 px.

## Analítica y consentimiento

La implementación está centralizada en `src/lib/analytics/`. Los componentes aportan atributos de contexto; no invocan a los proveedores directamente.

Sin IDs, la página funciona sin cargar scripts de Clarity ni Meta y no muestra un aviso de consentimiento innecesario. Configurar un ID no basta para iniciar la medición: el visitante debe elegir **ACEPTAR**. **SOLO ESENCIALES** conserva la navegación y la conversión sin activar esas herramientas. La elección se recuerda localmente durante 180 días. Si el almacenamiento persistente no está disponible, se utiliza un respaldo de sesión.

Para Microsoft Clarity, crear el proyecto y configurar `PUBLIC_CLARITY_PROJECT_ID`. La integración utiliza su [API Consent V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2). Para Meta, configurar `PUBLIC_META_PIXEL_ID`; la integración utiliza `PageView` por carga de página, `Contact` para la primera pulsación real de WhatsApp de la sesión y `ViewContent` al acumular 10 segundos de exposición al currículo. Meta no recibe cada microinteracción de la página.

El control de preferencias del footer, identificado con `data-consent-settings`, permite revisar la elección cuando hay medición configurada. Al pasar de aceptar a solo esenciales, se comunica la revocación a los proveedores y se recarga la página para retirar completamente sus SDKs.

La arquitectura permite añadir proveedores, incluido TikTok, pero no carga un píxel de TikTok.

### Eventos

- `landing_view`.
- `section_problem_view`, `section_outcomes_view`, `section_curriculum_view`, `section_methodology_view`, `section_instructor_view`, `section_course_info_view`, `section_faq_view`.
- `scroll_25`, `scroll_50`, `scroll_75`, `scroll_90`.
- `faq_open`, con el identificador de la pregunta.
- `whatsapp_click`, con la ubicación del CTA, y sus variantes `whatsapp_hero_click`, `whatsapp_curriculum_click`, `whatsapp_instructor_click`, `whatsapp_final_click`.
- `section_engaged`, con la sección y un rango de tiempo visible acumulado.

La exposición se observa con `IntersectionObserver`: se requiere ver de forma continua durante un segundo al menos el 50 % del área visible posible de la sección, usando el menor tamaño entre sección y viewport. Así también pueden medirse las secciones más altas que una pantalla de móvil. Pasar brevemente por un borde no cuenta como una sección vista. El tiempo con la pestaña oculta no cuenta. `section_engaged` se emite al superar 10, 30 y 60 segundos de exposición activa acumulada. Los eventos de vista y umbrales se deduplican durante la sesión; no se emiten eventos cada segundo.

Las UTMs `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` y `utm_term` se conservan después de aceptar y se incorporan como contexto de medición. Se mantiene la primera atribución de la sesión. No aparecen en la interfaz. Usar identificadores de campaña ASCII de hasta 64 caracteres, sin espacios; la capa descarta valores con URLs, correos o patrones telefónicos. Nunca incluir nombres, correos, teléfonos ni otros datos personales en parámetros UTM. La fuente de referencia se clasifica como Facebook, Instagram, TikTok, búsqueda orgánica, otra referencia o directo, sin enviar la URL completa de origen.

Antes de cargar un proveedor y después de aceptar, se sanea la URL del navegador mediante `history.replaceState`: se conservan únicamente las UTMs admitidas y un identificador de clic `fbclid` con formato válido. Los demás parámetros de consulta se eliminan para evitar que la captura automática de URL del proveedor incluya valores descartados. Se conservan los anclajes válidos de las secciones. La landing no utiliza parámetros de consulta para funciones propias.

Almacenamiento utilizado por la implementación:

| Clave | Ubicación | Propósito |
| --- | --- | --- |
| `escs:consent:v1` | `localStorage`; respaldo en sesión | Preferencia `all` o `essential` |
| `escs:analytics:utm:v1` | `sessionStorage` | Atribución de la sesión después de aceptar |
| `escs:analytics:events:v1` | `sessionStorage` | Evitar duplicados |
| `escs:analytics:time:v1` | `sessionStorage` | Tiempo visible acumulado por sección |

La página `/privacidad` es una **plantilla pendiente de revisión**, con apartados por completar. Deben confirmarse responsable, contacto, condiciones y usos de datos antes de publicar; el proyecto no afirma cumplimiento legal automático.

## Despliegue en Cloudflare Pages

El resultado es estático y **no necesita el adaptador de Cloudflare**, Workers ni Pages Functions.

1. Subir el proyecto a un repositorio y conectarlo a un proyecto de **Cloudflare Pages**.
2. Elegir la raíz de este proyecto como directorio de trabajo.
3. Configurar:

   | Campo | Valor |
   | --- | --- |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node.js | Versión compatible con los requisitos anteriores; por ejemplo la misma rama 24 usada en local |

4. Añadir las variables públicas en el entorno de build de Pages. Configurar producción y preview por separado cuando corresponda.
5. Desplegar y revisar la URL obtenida. Al disponer del dominio definitivo, actualizar `PUBLIC_SITE_URL` y ejecutar un nuevo despliegue.

También puede generarse `dist/` localmente y cargarse mediante una opción de despliegue estático compatible. No subir `.env` ni `node_modules` como parte del sitio.

## Revisión antes de publicar

- Confirmar número de WhatsApp y comprobar la URL y el texto que abre cada CTA.
- Confirmar modalidad, duración, fecha, horario, inversión, contenido incluido y programa.
- Sustituir la fotografía y, si corresponde, la imagen social provisional.
- Completar y revisar `/privacidad` y configurar el dominio definitivo.
- Elegir los IDs de medición y comprobar consentimiento, rechazo y cambios de preferencia.
- Ejecutar `npm run check` y `npm run build`; revisar después `npm run preview`.
- Revisar navegación por teclado, FAQ, menú móvil, consola y ausencia de overflow horizontal a 360, 390, 430, 768 y 1440 px.
- Revisar con `prefers-reduced-motion: reduce`: el contenido debe ser visible sin depender de animaciones.
- Medir rendimiento y accesibilidad sobre el sitio compilado. Los objetivos de Lighthouse son orientativos; no se presentan como puntuaciones obtenidas sin ejecutar la medición.
