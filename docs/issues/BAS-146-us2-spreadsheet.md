# BAS-146 — US2: Spreadsheet importable y editable con numeración permanente

- **Estado real**: ✅ DONE (43 tests · typecheck 0 · build OK)
- **Labels**: frontend · **Estimate**: 5 · **Priority**: High
- **Blocked by**: BAS-145

## Descripción
US2 P1 — datos que hacen reales las permutaciones.

## Acceptance criteria (T021–T026)
- [x] T021 `GET/PUT /api/datasets/[id]` + conflicto `expectedNextRowNumber`→409 + tests
- [x] T022 `POST .../import` multipart vía formats.ts; rechazo total con location; 415 extensión + tests
- [x] T023 `TableSection` react-data-grid tematizada, columna `#` fija leyendo `row.num`, edición inline, add/remove filas y columnas
- [x] T024 Autosave debounce PUT + manejo 409 (reload + toast)
- [x] T025 `ImportDialog` archivo + feedback renamedColumns/errores; tab Table montada
- [x] T026 Hook `useDataset` compartido FieldsPanel↔Grid con invalidación cruzada

## Decisiones
- Import **reemplaza** la hoja (flujo editar-en-Excel-y-reimportar); numeración continúa monotónica.
- Contador `next_row_number` avanza también en PUT si el sheet trae nums mayores.
- react-data-grid fijado a `7.0.0-beta.47` (beta.61 requiere React canary useEffectEvent).
