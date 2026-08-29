# BAS-153 — US9: Spellcheck es/en offline + AI review BYO

- **Estado real**: 🔄 En verificación final (implementación completa; 72 tests al último corte; build interrumpido a mitad — re-verificar)
- **Labels**: ai · **Estimate**: 5 · **Priority**: Low
- **Blocked by**: BAS-145

## Acceptance criteria (T043–T046)
- [x] T043 Diccionarios Hunspell `en_US`/`es_ES` en `public/dictionaries/` + `src/lib/spellcheck.ts`: provider inyectable (fs en tests / fetch en browser), tokenizador unicode es/en, modos Spanish/English/**Auto** (marca solo si inválida en ambos) + 4 tests (offsets incluidos)
- [x] T044 `qualityPanels.tsx`: `useSpellcheck` (debounce 900ms sobre update), subrayado en vivo vía CSS Custom Highlights API (`::highlight(tweakdoc-spell)`), ChecksPanel con sugerencias aplicables (replace-all seguro por rangos absolutos)
- [x] T045 `GET/PUT /api/settings` (clave jamás devuelta; solo booleano derivado `aiConfigured`) + `SettingsDialog` ⚙ en sidebar + test masking implícito en aiReview tests
- [x] T046 `POST /api/ai/review` → `src/server/aiClient.ts` fetch OpenAI-compatible (timeout 30s AbortController, 401→'invalid API key' sin filtrar key, parse JSON tolerante a fences) + botón "Review with AI" + panel Accept/Reject individual + 4 tests con fetch mockeado

## Pendiente para cierre
Re-ejecutar suite completa + build (interrumpidos) y validar flujo manual del Escenario 7.
