# BAS-151 — US3: Generación PDF individual/batch con política estricta

- **Estado real**: ✅ DONE (51 tests incl. smoke real de Chromium · typecheck 0 · lint 0)
- **Labels**: backend · **Estimate**: 5 · **Priority**: High
- **Blocked by**: BAS-146

## Acceptance criteria (T027–T030)
- [x] T027 `src/server/pdfService.ts`: Puppeteer singleton lazy, wrapper print CSS desde tokens compartidos, logo→data URL, page numbers vía footerTemplate + smoke test real gateado por presencia de Chromium
- [x] T028 `src/server/zipService.ts`: archiver@7 streaming (createRequire para interop CJS) + test integridad PK
- [x] T029 `POST /api/documents/[id]/pdf` política estricta completa:
  - EMPTY_CELL → skip row-level + log por fila (detail nombra columnas vacías)
  - UNBOUND_FIELD → cero PDFs, 1 log run-level `row_id=null`, respuesta JSON `{blocked:{code,fields}}`
  - RENDER_ERROR → 1 retry, luego skip + log
  - summary `{generated,skipped}` en header `X-Export-Summary` (base64url)
  - single = PDF stream con filename; multi/all = ZIP
  - dataset vacío → JSON `{generated:0,skipped:0}` sin output
- [x] T030 `ExportActions` en tab Table: Generate selected/all, descarga blob, toasts de summary/blocked/nothing-to-generate

## Verificación
7 casos de test cubren cada rama de contracts/api.md. Smoke Chromium genera `%PDF` real.
