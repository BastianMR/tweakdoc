# BAS-150 — US8: Tab Styles global consistente preview↔PDF

- **Estado real**: ✅ DONE (implementación + tests; verificación final integral pendiente en BAS-154)
- **Labels**: frontend · **Estimate**: 3 · **Priority**: Low
- **Blocked by**: BAS-151

## Acceptance criteria (T040–T042)
- [x] T040 `StylesForm` (page size/margins, header toggle, logo upload vía `POST /api/uploads` → `data/uploads/`, page numbers switch, font/body/align/h-scale) escribiendo settings_json validado con debounce + toast de guardado/error
- [x] T041 Tokens aplicados en vivo al editor (`<style>` con `.variable-doc{...}` regenerado por settings) y `documentPrintCss()` compartido consumido por pdfService (logo data-URL + numeración footerTemplate)
- [x] T042 Test consistencia: `documentPrintCss` embebe exactamente `styleTokensToCss`, determinístico, refleja todos los knobs

## Refactor clave
El CSS de impresión vive SOLO en `src/lib/styleTokens.ts#documentPrintCss`; pdfService y el preview del editor consumen la misma fuente → SC-006 garantizado estructuralmente.
