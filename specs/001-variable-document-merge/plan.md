# Implementation Plan: Variable Document Merge (TweakDoc Core)

**Branch**: `001-variable-document-merge` | **Date**: 2026-08-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-variable-document-merge/spec.md`

## Summary

TweakDoc es una web app local que combina un editor de documentos rich-text estilo Notion con una spreadsheet vinculada: el usuario inserta campos (chips) arrastrables o por notación `{{...}}` ligados a columnas de la tabla, importa/edita datos (CSV/XLSX o API local), y genera un PDF por fila — individual o batch ZIP — con política estricta de omisión y logs de fallos visibles en el dashboard del documento. Enfoque técnico: monolito Next.js (App Router) con SQLite local, motor de interpolación compartido entre preview y render PDF vía Puppeteer singleton, spellcheck offline es/en y revisión IA opcional BYO OpenAI-compatible.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20+

**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS v4 + shadcn/ui, TipTap v2, react-data-grid, SheetJS (xlsx), Puppeteer, archiver, nspell, Drizzle ORM + better-sqlite3

**Storage**: SQLite local (`data/tweakdoc.db`, gitignored); uploads en `data/uploads/`

**Testing**: Vitest (`npm test`), tests unitarios colocalados `*.test.ts` + integración API en `tests/api/`

**Target Platform**: Windows/macOS/Linux desktop browser (localhost), Chromium embebido vía Puppeteer para render PDF

**Project Type**: Web app fullstack monolito (un solo proceso `next dev` / `next start`)

**Performance Goals**: Batch de 100 filas → PDFs en <5 min (SC-002); primera generación <15 min desde cero incluyendo setup (SC-001)

**Constraints**: Sin auth ni red externa obligatoria (todo local); claves IA solo en SQLite local jamás en git/logs; Puppeteer singleton (1 instancia Chromium por proceso); UI de plataforma en inglés; export estricta sin bloqueo de lote

**Scale/Scope**: Usuario único local; tablas de cientos a pocos miles de filas; 4 vistas por documento + library; hitos M1 (core) → M2 (structure & styles) → M3 (quality: spellcheck + IA)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Artículo | Estado | Evidencia |
|---|---|---|
| I. Simplicidad/YAGNI | ✅ PASS | Monolito único (no SPA+Express); hoja como blob JSON (no EAV normalizado); DnD nativo HTML5 (no dnd-kit); interpolación regex sin cheerio; fetch directo sin react-query |
| I. Dependencias justificadas | ✅ PASS | Cada dependencia cubre necesidad sin equivalente stdlib: TipTap (editor), SheetJS (xlsx), Puppeteer (fidelidad PDF), nspell (offline es/en), archiver (ZIP streaming), Drizzle (types SQL) |
| I. Cero comentarios | ✅ PASS | Regla aplicada en implementación |
| II. TDD | ✅ PASS | Vitest definido; interpolación/naming/import-parser con test rojo→verde por task |
| II. Evidencia antes de afirmar | ✅ PASS | Gate `verification-before-completion` antes de converge |
| III. Flujo SDD | ✅ PASS | Este plan es artefacto de ruta B; spec.md fuente de verdad |
| IV. Proceso | ✅ PASS | Sin commits sin pedido explícito |
| V. Stack registrado | ✅ PASS | Coincide 1:1 con Article V de `.specify/memory/constitution.md` |
| VI. Testing/CI | ✅ PASS | `npm test`, `npm run lint`, `npm run typecheck` declarados en ci.yml al scaffoldear |
| VII. Convenciones | ✅ PASS | Estructura `app/` + `src/components|lib|server`; `data/*.db` gitignored; secretos IA solo locales; Puppeteer singleton |

**Post-design re-check (Phase 1)**: sin violaciones nuevas — los artefactos de diseño no introducen proyectos adicionales, patrones de repositorio ni capas especulativas.

## Project Structure

### Documentation (this feature)

```text
specs/001-variable-document-merge/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md           # REST + interpolation + naming contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                     # Shell global: sidebar + search + área de vistas
├── page.tsx                       # Redirect a /documents
├── documents/
│   └── [id]/
│       ├── page.tsx               # Workspace con tabs Dashboard | Document | Table | Styles
├── api/
│   ├── documents/
│   │   ├── route.ts               # GET lista, POST crear (con skeleton por formato)
│   │   └── [id]/
│   │       ├── route.ts           # GET/PATCH (nombre, formato, contenido, estilos)/DELETE cascade
│   │       ├── pdf/route.ts       # POST generación individual/batch → PDF stream o ZIP
│   │       └── export-logs/route.ts # GET logs, DELETE limpiar
│   ├── datasets/
│   │   └── [id]/
│   │       ├── route.ts           # GET sheet completa, PUT guardar sheet
│   │       ├── import/route.ts    # POST multipart CSV/XLSX
│   │       └── rows/route.ts      # POST inyección externa de filas (columnas estrictas)
│   └── settings/route.ts          # GET (key IA enmascarada)/PUT credenciales IA locales
src/
├── components/
│   ├── ui/                        # Componentes shadcn/ui generados
│   ├── shell/                     # DocumentsSidebar, SearchBox
│   ├── editor/                    # TemplateEditor (TipTap), VariableField, FieldsPanel, ChecksPanel, AiReviewPanel
│   ├── grid/                      # DataGridSheet (react-data-grid), ImportDialog, RowNumberColumn
│   ├── dashboard/                 # HealthCards, ReadinessCard, ExportLogsCard
│   └── styles-tab/                # StylesForm, LogoUpload
├── lib/
│   ├── interpolation.ts           # Motor compartido preview↔PDF (puro, testeado)
│   ├── naming.ts                  # Sanitización `{doc}_{rowNum}.pdf`
│   ├── spellcheck.ts              # Wrapper nspell es/en + modo Auto dual
│   ├── presets.ts                 # Skeletons Letter/Official Letter/Blank
│   ├── styleTokens.ts             # settings_json → CSS variables (editor y print)
│   ├── formats.ts                 # Parser CSV/XLSX (SheetJS) → columns/rows
│   └── i18n/en.ts                 # Strings de plataforma (ingleś, i18n-ready)
├── server/
│   ├── db.ts                      # Cliente Drizzle + migraciones
│   ├── schema.ts                  # Tablas documents/datasets/export_logs/app_settings
│   ├── pdfService.ts              # Singleton Puppeteer + wrapper print CSS
│   ├── zipService.ts              # archiver streaming
│   └── aiClient.ts                # Chat completions OpenAI-compatible por baseUrl
tests/
└── api/                           # Integración: CRUD, import, rows, pdf smoke
```

**Structure Decision**: Monolito Next.js App Router — rutas UI bajo `app/`, handlers bajo `app/api/`, lógica pura compartida en `src/lib/`, servicios con side-effects en `src/server/`. Tests unitarios colocalados junto a cada módulo de `src/lib/`; integración HTTP en `tests/api/`.

## Complexity Tracking

> Sin violaciones de constitution que justifiquen complejidad adicional.
