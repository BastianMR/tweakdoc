# Research: Variable Document Merge

**Date**: 2026-08-23 · **Status**: completo — cero NEEDS CLARIFICATION (todas las decisiones tomadas en brainstorming con el usuario y ratificadas en constitution Article V)

## Decisiones

### D1 — Framework: Next.js 15 monolito (App Router)
- **Decision**: Un solo proyecto Next.js con UI + API Routes.
- **Rationale**: mismo proceso para editor y generación PDF; `npm run dev` único; ideal para portafolio; el usuario lo aprobó explícitamente sobre SPA+Express.
- **Alternatives considered**: Vite React + Express separado (doble build/CORS sin beneficio local); Tauri/Electron (descartado: pediste web app).

### D2 — Editor: TipTap v2
- **Decision**: TipTap sobre ProseMirror para el editor rich-text.
- **Rationale**: UX tipo Notion (slash commands, markdown shortcuts), nodos inline custom para chips de variable (patrón *mention* probado), input-rules para convertir `{{texto}}` tipeado en chip, control total del esquema HTML.
- **Alternatives considered**: Lexical (ecosistema más joven para nodos custom con DnD); Slate (más bajo nivel, más código); textarea/markdown (rechazado: requiere rich text completo).

### D3 — Grid de datos: react-data-grid
- **Decision**: react-data-grid (MIT) tematizada con tokens shadcn.
- **Rationale**: edición inline tipo Excel, liviana, MIT sin restricción comercial.
- **Alternatives considered**: Handsontable (licencia comercial restrictiva); AG Grid community (peso mayor del necesario).

### D4 — Import CSV/XLSX: SheetJS (`xlsx`)
- **Decision**: SheetJS para parsear ambos formatos con una sola dependencia.
- **Rationale**: API única para CSV y Excel; lectura de headers en primera fila; maneja celdas fórmula → valor mostrado (supuesto documentado en spec).
- **Alternatives considered**: papaparse + exceljs (dos deps para dos formatos); parser propio (frágil con xlsx binario).

### D5 — Persistencia: SQLite vía better-sqlite3 + Drizzle ORM
- **Decision**: SQLite embebido sincrónico, esquema y migraciones con Drizzle.
- **Rationale**: datos durables en archivo local sin servidor; Drizzle da tipado SQL sin runtime pesado; coincide con Article V.
- **Alternatives considered**: IndexedDB solo-navegador (pérdida de datos al limpiar, rechazado por usuario); Prisma (motor binario mayor, cold start peor); JSON files (sin queries ni integridad).
- **Nota**: la hoja se guarda como blob JSON (`sheet_json`) — YAGNI vs normalización EAV; migración futura solo si aparecen queries parciales.

### D6 — PDF: Puppeteer server-side singleton
- **Decision**: Chromium headless como singleton lazy; render del HTML interpolado envuelto en CSS print (page size/margins desde styleTokens) → `page.pdf()`.
- **Rationale**: fidelidad total del rich text (tablas, fuentes, headers con logo, numeración de páginas) — requisito de contratos; el usuario eligió "motor real" sobre jsPDF.
- **Alternatives considered**: jsPDF/pdfmake cliente (fidelidad y tablas limitadas); Playwright (más pesado para un solo caso de uso).
- **Constraint**: singleton obligatorio por constitution VII (arrancar Chromium por request es inviable).

### D7 — ZIP batch: archiver
- **Decision**: archiver en streaming hacia la Response.
- **Rationale**: streaming nativo evita buffer completo en memoria con tablas grandes; API estable.
- **Alternatives considered**: jszip (buffering en memoria); CLI zip (dependencia externa del SO).

### D8 — Motor de interpolación: función pura compartida, matching por regex controlado
- **Decision**: `src/lib/interpolation.ts` — recibe HTML + valores por columnId; los chips son spans canónicos generados por TipTap (`<span data-variable-id data-variable-name>`); el motor los resuelve, escapa valores (anti-inyección) y reporta issues EMPTY_CELL / UNBOUND_FIELD. La misma función alimenta preview (cliente, DOMParser adapter) y PDF (server).
- **Rationale**: una sola fuente de verdad visual/lógica (SC-006); regex seguro porque el productor del markup es nuestro propio editor y el contenido pegado pasa por el schema de TipTap; cero dependencias.
- **Alternatives considered**: cheerio/jsdom en server (dep extra para parsear markup propio); dos motores separados preview/PDF (riesgo de drift — violaría SC-006).
- **Validación**: suite de tests cubre escape, missing, rename-by-id, markup pegado malicioso.

### D9 — Spellcheck offline: nspell + diccionarios Hunspell es/en
- **Decision**: nspell con diccionarios en_US y es_ES empaquetados como assets; selector por documento Spanish/English/Auto; en Auto una palabra se marca solo si no existe en ningún diccionario.
- **Rationale**: offline determinístico (constitution: sin red obligatoria); patrón probado (GitHub usa nspell); cumple FR-018 y clarificación Q3.
- **Alternatives considered**: spellcheck nativo del navegador (incontrolable, sin lista de issues ni idioma dual); LanguageTool (JVM/server pesado).

### D10 — Revisión IA: REST directo OpenAI-compatible, BYO credenciales
- **Decision**: `fetch` a `{aiBaseUrl}/chat/completions` con clave de `app_settings`; sin SDK.
- **Rationale**: baseUrl configurable cubre OpenAI/Groq/Ollama local; REST es estable y evita lock-in de SDK; clave jamás logueada ni commiteada (constitution VII).
- **Alternatives considered**: openai SDK oficial (acopla versiones, no aporta sobre fetch para un endpoint).

### D11 — Data fetching UI: Server Components + route handlers + fetch nativo
- **Decision**: páginas server-rendered leyendo DB directamente via servicios `src/server`; mutaciones del cliente con `fetch` + `router.refresh()`.
- **Rationale**: app pequeña de usuario único — YAGNI para react-query/SWR; menos capas = menos bugs.
- **Alternatives considered**: TanStack Query (caching sofisticado innecesario aquí).

### D12 — Drag & drop de campos: HTML5 DnD nativo
- **Decision**: dragstart con `text/x-tweakdoc-variable` (JSON {columnId,name}) desde FieldsPanel; drop handler de TipTap inserta el nodo chip; click también inserta en cursor.
- **Rationale**: caso panel→editor simple; dnd-kit aporta ordenamiento complejo que no necesitamos (Article I).
- **Alternatives considered**: dnd-kit (extra dep para un flujo unidireccional).

### D13 — Numeración de filas: contador monotónico por dataset
- **Decision**: `next_row_number` persistido en dataset; cada fila nueva toma ese valor y se incrementa; borrar filas nunca libera números (clarificación Q2).
- **Rationale**: logs y nombres de archivo históricos permanecen inequívocos (FR-008).

### D14 — Estilos globales: settings_json → CSS variables compartidas
- **Decision**: `src/lib/styleTokens.ts` convierte `settings_json` a variables CSS inyectadas en el wrapper del editor (preview) y en el wrapper print de Puppeteer (PDF).
- **Rationale**: idéntica fuente de verdad estética en pantalla y papel (SC-006, US8).

### D15 — Idioma de plataforma: strings en módulo `src/lib/i18n/en.ts`
- **Decision**: todo texto de UI centralizado en un módulo en inglés; sin framework i18n en v1.
- **Rationale**: i18n-ready sin sobreingeniería (FR-020); agregar locale futuro = nuevo módulo.

## Referencias rápidas

- Spec: [spec.md](./spec.md) · Contratos: [contracts/api.md](./contracts/api.md) · Modelo: [data-model.md](./data-model.md)
- Constitution: `.specify/memory/constitution.md` (Articles I–VII)
