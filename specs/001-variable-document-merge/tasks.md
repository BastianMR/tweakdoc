# Tasks: Variable Document Merge (TweakDoc Core)

**Input**: Design documents from `/specs/001-variable-document-merge/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/api.md ✅ · quickstart.md ✅

**Tests**: INCLUIDOS — constitution Article II exige TDD (test rojo → verde por task).

**Organization**: Tasks agrupados por user story (spec.md tiene 9 historias P1–P3). Hitos del brainstorming: **M1** = Phases 1–6 (Setup…US3), **M2** = US7+US8, **M3** = US9.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivos distintos, sin dependencia pendiente)
- **[Story]**: user story dueña (US1–US9 según spec.md)
- Paths relativos a la raíz del repo (`C:\Users\basma\Downloads\000_GOOGLE DRIVE\TweakDoc`)

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Scaffold Next.js 15 app con TypeScript, Tailwind v4 y directorio `src/`: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` en la raíz del repo
- [x] T002 Instalar dependencias productivas: `@tiptap/react @tiptap/starter-kit @tiptap/extension-* react-data-grid xlsx puppeteer archiver nspell drizzle-orm better-sqlite3` y dev: `drizzle-kit vitest @vitejs/plugin-react @types/archiver @types/nspell`
- [x] T003 [P] Inicializar shadcn/ui (`npx shadcn@latest init`) y generar componentes base usados por todas las vistas: button, dialog, input, tabs, card, dropdown-menu, toast en `src/components/ui/`
- [x] T004 [P] Configurar Vitest (`vitest.config.ts`, alias `@/`) y scripts `npm test` / `npm run typecheck` / `npm run lint`; reemplazar los TODO de `.github/workflows/ci.yml` con Node 20 + `npm ci && npm run lint && npm run typecheck && npm test`
- [x] T005 Crear esquema Drizzle con las 4 tablas del data-model (`documents`, `datasets`, `export_logs`, `app_settings`) en `src/server/schema.ts`, cliente en `src/server/db.ts`, config `drizzle.config.ts` apuntando a `data/tweakdoc.db` y script `db:push`

**Checkpoint**: `npm run dev` levanta página vacía; `npm test` corre suite vacía en verde.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Ninguna user story empieza antes de completar esta fase.

- [x] T006 [P] Crear módulo de strings de plataforma `src/lib/i18n/en.ts` (todas las etiquetas UI en inglés, FR-020)
- [x] T007 [P] Implementar `exportFileName(documentName, rowNum)` con sanitización según contracts/naming en `src/lib/naming.ts` + tests colocalados `naming.test.ts` (caracteres inválidos, límite 80 chars, unicidad por num)
- [x] T008 [P] Implementar parser CSV/XLSX con SheetJS → `{columns, rows}` con headers en primera fila, sufijo automático de duplicados `"Name (2)"` y rechazo con ubicación en `src/lib/formats.ts` + tests `formats.test.ts` (fixtures csv y xlsx en `tests/fixtures/`)
- [x] T009 [P] Implementar conversión `settings_json` → CSS variables para preview y print en `src/lib/styleTokens.ts` + validación de rangos (A4/Letter, margins 0–50mm, bodySizePt 8–18) + tests
- [x] T010 [P] Implementar skeletons de formato (blank/letter/official_letter) como HTML canónico con chips de ejemplo en `src/lib/presets.ts` + test de contenido mínimo por formato
- [x] T011 [P] Implementar motor de interpolación puro `interpolate(html, valuesByColumnId)` según contracts/interpolation en `src/lib/interpolation.ts` + suite completa `interpolation.test.ts`: escape HTML, EMPTY_CELL, UNBOUND_FIELD, re-bind por columnId, markup pegado malicioso ignorado
- [x] T012 Construir shell global: `app/layout.tsx` con sidebar de documentos (lista desde DB) + buscador client-side + botón New document, y `app/page.tsx` redirect a primer documento o estado vacío en `src/components/shell/documentsSidebar.tsx`
- [x] T013 Implementar endpoints de documentos `app/api/documents/route.ts` (GET lista, POST crea con skeleton + dataset vacío vinculado) y `app/api/documents/[id]/route.ts` (GET/PATCH nombre-formato-contenido-settings validado/DELETE cascade) + integración en `tests/api/documents.test.ts` (crea→lista→patch→delete cascade verifica datasets y logs vacíos)

**Checkpoint**: Foundation lista — las user stories pueden implementarse en orden de prioridad.

---

## Phase 3: User Story 1 — Author template with reusable fields (P1) 🎯 MVP

**Goal**: Editor rich-text con campos arrastrables/tipeados ligados por columnId estable.

**Independent Test**: crear documento, vincular tabla pequeña con datos, insertar 2 campos (drag + notación), verificar chips renderizadas y persistidas tras reload.

### Implementation for User Story 1

- [x] T014 [US1] Crear nodo TipTap VariableField (chip `<span data-variable-id data-variable-name>`, marca `data-unbound`) en `src/components/editor/variableField.ts` + test de serialización HTML canónica `variableField.test.ts`
- [x] T015 [US1] Implementar input-rule que convierte texto tipeado `{{Name}}` en chip al cerrar llaves dentro de `src/components/editor/variableField.ts` (extiende T014)
- [x] T016 [US1] Construir `TemplateEditor` con StarterKit + VariableField + estilo pill de chips y estado unresolved rojo en `src/components/editor/templateEditor.tsx`; integrarlo como tab Document en `app/documents/[id]/page.tsx`
- [x] T017 [US1] Construir `FieldsPanel` (columnas del dataset vinculado, click inserta en cursor) en `src/components/editor/fieldsPanel.tsx`
- [x] T018 [US1] Añadir drag HTML5 desde FieldsPanel (`text/x-tweakdoc-variable` JSON {columnId,name}) y drop-handler en TemplateEditor que inserta la chip (research D12)
- [x] T019 [US1] Autosave con debounce del `content_html` vía PATCH + resolución de nombres de chips contra columnas actuales al renderizar (rename propaga, delete marca unbound) en `src/components/editor/useTemplateAutosave.ts`
- [x] T020 [US1] Integración E2E del flujo US1 según Independent Test usando quickstart Escenario 1 pasos 1–4 (manual checklist + test de API de persistencia de chips en `tests/api/chips.test.ts`)

**Checkpoint**: US1 funcional independiente — plantilla con campos vivos.

---

## Phase 4: User Story 2 — Manage recipient data in spreadsheet (P1)

**Goal**: Import CSV/XLSX + grid editable inline con numeración permanente y autoguardado.

**Independent Test**: importar CSV de quickstart, ver filas/columnas con `#`, editar celda, recargar y verificar persistencia.

- [x] T021 [US2] Implementar `GET/PUT /api/datasets/[id]` con conflicto `expectedNextRowNumber` → 409 según contracts en `app/api/datasets/[id]/route.ts` + tests `tests/api/datasets.test.ts`
- [x] T022 [US2] Implementar `POST /api/datasets/[id]/import` multipart delegando en `src/lib/formats.ts`, rechazo total con location, respuesta con renamedColumns en `app/api/datasets/[id]/import/route.ts` + tests (csv válido, xlsx válido, archivo corrupto → 422, extensión rara → 415)
- [x] T023 [US2] Construir `DataGridSheet` con react-data-grid tematizada shadcn, columna `#` fija leyendo `row.num`, edición inline y add/remove rows/columns en `src/components/grid/dataGridSheet.tsx`
- [x] T024 [US2] Autoguardado con debounce del sheet via PUT + manejo de 409 (recargar sheet y avisar) en `src/components/grid/useSheetAutosave.ts`
- [x] T025 [US2] Construir `ImportDialog` (drag-drop de archivo, feedback de renamedColumns, errores con ubicación) en `src/components/grid/importDialog.tsx`; montar tab Table en `app/documents/[id]/page.tsx`
- [x] T026 [US2] Hook compartido de dataset (`useDataset`) que alimenta FieldsPanel (US1) y DataGridSheet con invalidación cruzada tras edits en `src/components/grid/useDataset.ts`

**Checkpoint**: US1+US2 operativos: plantilla + datos editables.

---

## Phase 5: User Story 3 — Generate personalized PDFs (P1)

**Goal**: PDFs individuales y batch ZIP con política estricta y filenames `{doc}_{num}.pdf`.

**Independent Test**: tabla de 3 filas con una celda vacía → 2 PDFs correctos + 1 skip logueado (quickstart Escenario 1 paso 5–6).

- [x] T027 [US3] Implementar Puppeteer singleton con wrapper print CSS desde styleTokens (page size/margins/header/footer/pageNumbers placeholders) en `src/server/pdfService.ts` + smoke test de render básico `pdfService.test.ts` (marca global para saltar si Chromium no disponible en CI)
- [x] T028 [US3] Implementar ZIP streaming con archiver en `src/server/zipService.ts` + test de integridad del zip generado
- [x] T029 [US3] Implementar `POST /api/documents/[id]/pdf` con política estricta completa: resolver chips → EMPTY_CELL skip row-level, UNBOUND_FIELD abort-all con 1 log run-level, RENDER_ERROR 1 retry luego skip, logs insertados, summary `{generated, skipped}`, single=PDF stream / multi=ZIP, filename vía `exportFileName` en `app/api/documents/[id]/pdf/route.ts` + tests `tests/api/pdf.test.ts` cubriendo cada rama de contracts
- [x] T030 [US3] Añadir acciones de generación en tab Table (Generate selected / Generate all) con descarga y toast del summary + estado "nothing to generate" con dataset vacío en `src/components/grid/exportActions.tsx`

**Checkpoint**: MVP completo (M1): autoría + datos + generación con observabilidad mínima.

---

## Phase 6: User Story 4 — Monitor document health & export failures (P2)

**Goal**: Dashboard con tarjetas de estado y logs de omisiones navegables.

**Independent Test**: estado roto deliberado (celda vacía + columna borrada) → dashboard lista causas y conteos exactos (quickstart Escenario 2).

- [x] T031 [US4] Implementar servicio de salud del documento (campos usados/resueltos/unresolved, columnas sin usar, filas incompletas, readiness N de M) leyendo content_html + sheet en `src/server/docHealth.ts` + tests unitarios `docHealth.test.ts`
- [x] T032 [US4] Implementar `GET/DELETE /api/documents/[id]/export-logs` en `app/api/documents/[id]/export-logs/route.ts` + tests (listado desc, clear persistente)
- [x] T033 [US4] Construir vista Dashboard: `HealthCards`, `ReadinessCard`, `ExportLogsCard` con go-to-row (navega a Table y enfoca fila) y Clear en `src/components/dashboard/*.tsx`; montarla como tab default en `app/documents/[id]/page.tsx`

**Checkpoint**: M1 completo con observabilidad total.

---

## Phase 7: User Story 5 — Work with multiple documents (P2)

**Goal**: Library multi-documento con búsqueda, renombrado y borrado cascade confiable.

**Independent Test**: 3 documentos → buscar substring filtra, renombrar propaga a exports, borrar elimina todo tras reload (quickstart Escenario 5).

- [x] T034 [US5] Completar sidebar: filtro client-side por substring, rename inline, delete con confirmación explícita de cascade en `src/components/shell/documentsSidebar.tsx`
- [x] T035 [US5] Test de integración de ciclo de vida multi-documento en `tests/api/lifecycle.test.ts`: crear 3, patch name, delete uno → GET lista refleja y sus datasets/logs desaparecen

---

## Phase 8: User Story 6 — Push external data into the table (P2)

**Goal**: Endpoint local de inyección de filas con validación estricta de columnas.

**Independent Test**: payload válido agrega exactamente esas filas; payload con columna desconocida → 422 y cero writes (quickstart Escenario 4).

- [x] T036 [US6] Implementar `POST /api/datasets/[id]/rows` transaccional (validar todas las columnas antes de insertar, usar next_row_number monotónico) en `app/api/datasets/[id]/rows/route.ts` + tests `tests/api/rowsInjection.test.ts` (válido, unknown column → 422 sin partial write, múltiples filas)
- [x] T037 [P] [US6] Documentar el endpoint con ejemplos curl/fetch en sección "Data injection API" de `README.md`

---

## Phase 9: User Story 7 — Start from a document structure preset (P3) · hito M2

**Goal**: Diálogo de creación con Blank/Letter/Official Letter aplicando skeletons editables.

**Independent Test**: crear uno de cada tipo verifica skeletons distintos y plenamente editables.

- [x] T038 [US7] Diálogo New Document con selector de formato consumiendo `presets.ts` + vista previa miniatura en `src/components/shell/newDocumentDialog.tsx` (reemplaza el create básico del T012)
- [x] T039 [US7] Test: crear official_letter → content_html contiene secciones del skeleton y es editable (PATCH posterior persiste) en `tests/api/presets.test.ts`

---

## Phase 10: User Story 8 — Control document-wide appearance (P3) · hito M2

**Goal**: Tab Styles con page setup/header-logo-páginas/tipografía aplicada idéntica en preview y PDF.

**Independent Test**: cambiar fuente + logo + números de página → preview refleja y PDF exportado coincide (quickstart Escenario 6).

- [x] T040 [US8] Construir `StylesForm` (page size/margins, header toggle + LogoUpload guardando en `data/uploads/`, page numbers, font/body/h-scale) escribiendo settings_json validado en `src/components/styles-tab/stylesForm.tsx` y `logoUpload.tsx`; montar tab Styles
- [x] T041 [US8] Aplicar styleTokens en vivo al wrapper del editor (preview fiel) y completar soporte de logo/pageNumbers en `src/server/pdfService.ts` (header img desde uploads, footer con contador) extendiendo tests del T027
- [x] T042 [US8] Test de consistencia preview↔PDF: mismos tokens generan mismo CSS en ambos contextos (`styleTokens.test.ts` extendido) + verificación manual del Escenario 6 anotada en PR

---

## Phase 11: User Story 9 — Check writing quality (P3) · hito M3

**Goal**: Spellcheck offline es/en con Auto dual + revisión IA opcional BYO.

**Independent Test**: misspellings deliberadas marcadas con sugerencias; IA con credencial mock aplica/rechaza sugerencias; sin credenciales todo lo demás funciona (quickstart Escenario 7).

- [x] T043 [P] [US9] Descargar diccionarios Hunspell `en_US` y `es_ES` (.aff+.dic) a `src/lib/dictionaries/` e implementar `checkWords(text, lang)` con lógica Auto dual (inválida solo si falla en ambos) en `src/lib/spellcheck.ts` + tests con casos es/en mezclados
- [x] T044 [US9] Marcado en-editor de palabras inválidas (decoration plugin TipTap) + `ChecksPanel` lateral con lista y aplicar sugerencia por palabra en `src/components/editor/checksPanel.tsx`
- [x] T045 [US9] Implementar `GET/PUT /api/settings` (clave jamás devuelta, solo `aiConfigured`) en `app/api/settings/route.ts` + `SettingsDialog` en `src/components/shell/settingsDialog.tsx` + tests de masking
- [x] T046 [US9] Implementar cliente IA OpenAI-compatible por fetch con timeout 30s y errores sin filtrar clave en `src/server/aiClient.ts` + `AiReviewPanel` con apply/reject individual en `src/components/editor/aiReviewPanel.tsx` + tests con servidor mock (sin credencial real) en `tests/api/aiReview.test.ts`

---

## Phase 12: Polish & Cross-Cutting Concerns

- [x] T047 Ejecutar validación manual completa de `quickstart.md` (7 escenarios) y registrar evidencia en el reporte de converge
- [x] T048 Performance sanity: batch de 100 filas genera <5 min local (SC-002) — script desechable `scripts/perf-batch.mjs`
- [x] T049 Security pass: grep de secretos en logs/código, confirmar `data/` gitignored y clave IA ausente de responses
- [x] T050 Actualizar `CHANGELOG.md` bajo `[Unreleased]` con features M1–M3 y correr `graphify update .` para refrescar el knowledge graph

---

## Dependencies & Execution Order

### Phase dependencies
- Setup (1) → Foundational (2) → **US1 (3) → US2 (4) → US3 (5)** = MVP/M1 secuencial por dependencias naturales (editor↔dataset↔export comparten estado)
- US4–US6 (6–8) requieren M1; entre sí independientes ([P] a nivel fase)
- US7+US8 (9–10) = M2; US9 (11) = M3; Polish (12) al final

### Story milestones
| Hito | Stories | Criterio de demo |
|---|---|---|
| M1 Core | US1, US2, US3, US4, US5, US6 | Primer PDF batch con logs (SC-001/002/003) |
| M2 Structure & Styles | US7, US8 | Preset oficial + estilos consistentes (SC-006) |
| M3 Quality | US9 | Spellcheck es/en + IA BYO (SC-007) |

### Parallel opportunities
- Dentro de Foundational: T006–T011 todos [P]
- US4/US5/US6 pueden ejecutarse en paralelo entre sí (archivos disjuntos)
- T037 y T043 son [P] dentro de su fase
- Tests de cada story corren junto a su implementación (mismo PR/task)

## Implementation Strategy

1. **MVP First**: Phases 1–5 → validar con quickstart Escenarios 1–2 → demo del core loop
2. **Incremental**: sumar US4–US6 (observabilidad + integraciones) → US7–US8 (M2) → US9 (M3)
3. Cada task = commit lógico (Conventional Commits) con test verde antes de avanzar
4. `/speckit.analyze` opcional post-tasks; obligatorio `verification-before-completion` antes de converge
