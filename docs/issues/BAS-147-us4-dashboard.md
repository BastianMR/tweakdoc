# BAS-147 — US4: Dashboard de salud + logs de exportación navegables

- **Estado real**: ✅ DONE (56 tests · typecheck 0)
- **Labels**: frontend · **Estimate**: 3 · **Priority**: Medium
- **Blocked by**: BAS-151

## Acceptance criteria (T031–T033)
- [x] T031 `src/server/docHealth.ts`: campos usados/resueltos/unresolved (por columnId), columnas sin usar, filas incompletas solo por columnas resueltas, readiness N/M + tests unitarios (3 casos incl. ghost-only y hoja vacía)
- [x] T032 `GET/DELETE /api/documents/[id]/export-logs` + tests (listado tras corrida rota, clear persistente)
- [x] T033 Vista Dashboard: tarjetas Dataset / Fields (resolved+unresolved+unused) / Readiness + Export logs con badges por reasonCode, go-to-row (cambia a tab Table y pre-selecciona la fila vía evento) y Clear

## Regla de semántica ratificada
Readiness cuenta solo celdas vacías en columnas resueltas (escenario spec 16/20); los campos unresolved se muestran en su tarjeta propia y bloquean la exportación (no el readiness).
