# BAS-144 — Foundation: interpolación/naming/formats/styleTokens/presets + shell + API docs

- **Estado real**: ✅ DONE (verificado: 32+ tests · typecheck 0 · lint 0 · rutas registradas)
- **Labels**: backend · **Estimate**: 5 · **Priority**: High
- **Blocked by**: BAS-143

## Descripción
Fase 2 Foundational — motor puro de interpolación compartido preview↔PDF, libs sin side-effects, i18n y CRUD de documentos.

## Acceptance criteria (T006–T013)
- [x] T006 `src/lib/i18n/en.ts` strings plataforma inglés (FR-020)
- [x] T007 `exportFileName(documentName,rowNum)` sanitización `{doc}_{num}.pdf` + tests
- [x] T008 Parser CSV/XLSX SheetJS → columns/rows, sufijo duplicados `"Name (2)"`, rechazo total + tests con fixtures
- [x] T009 `styleTokens.ts` settings→CSS vars validados (A4/Letter, margins 0–50, body 8–18pt, escala jerárquica) + tests
- [x] T010 Presets blank/letter/official_letter + tests
- [x] T011 `interpolate(html, valuesByColumnId)` puro: escape HTML, EMPTY_CELL, UNBOUND_FIELD, re-bind por columnId, markup extraño intacto + suite
- [x] T012 Shell global layout + sidebar lista/búsqueda/New document
- [x] T013 API documents CRUD + cascade + integración `tests/api/documents.test.ts`

## Decisiones clave
- Interpolación regex sobre markup canónico producido por TipTap (sin cheerio).
- Tests de integración contra SQLite `:memory:` con DDL en `tests/setup.ts`.
