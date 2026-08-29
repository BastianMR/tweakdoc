# BAS-152 — US7: Presets estructurales Letter/Oficio/Blank

- **Estado real**: ✅ DONE (tests 2/2 · typecheck 0)
- **Labels**: frontend · **Estimate**: 2 · **Priority**: Low
- **Blocked by**: BAS-145

## Acceptance criteria (T038–T039)
- [x] T038 `NewDocumentDialog` con selector Blank/Letter/Official letter (tarjetas con hint) + nombre opcional; reemplaza el create básico del sidebar
- [x] T039 `tests/api/presets.test.ts`: official_letter contiene Ref:/Subject:/Signature y es editable (PATCH persiste); blank vacío; letter distinto de blank
