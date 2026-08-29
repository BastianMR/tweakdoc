# BAS-149 — US6: Inyección de datos vía API con validación estricta

- **Estado real**: ✅ DONE (tests 2/2 · typecheck 0 · README documentado)
- **Labels**: backend · **Estimate**: 2 · **Priority**: Medium
- **Blocked by**: BAS-146

## Acceptance criteria (T036–T037)
- [x] T036 `POST /api/datasets/[id]/rows` transaccional: valida TODAS las claves contra columnas existentes antes de escribir; unknown → `422 {error:'unknown_columns', unknownColumns:[...]}` cero writes parciales; usa `next_row_number` monotónico; completa celdas faltantes con '' + tests (válido multi-fila, rechazo total, seed previo)
- [x] T037 README sección "Data injection API" con curl válido y curl 422

## Contrato
`{rows:[{ColName:value}]}` → `200 {added,totalRows}` | `422 {unknownColumns}` | columnas deben pre-existir (se crean por import/grid).
