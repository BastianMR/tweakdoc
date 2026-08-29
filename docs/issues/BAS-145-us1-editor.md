# BAS-145 — US1: Editor con campos drag/notación ligados por columnId

- **Estado real**: ✅ DONE (37 tests al cierre · typecheck 0)
- **Labels**: frontend · **Estimate**: 5 · **Priority**: High
- **Blocked by**: BAS-144

## Acceptance criteria (T014–T020)
- [x] T014 Nodo TipTap `variableField` — chip `<span data-variable-id data-variable-name>` con estado unbound + test de serialización canónica
- [x] T015 Input-rule: tipear `{{Name}}` + cerrar llaves crea chip (queda pendiente de bind por nombre)
- [x] T016 `EditorSurface` + toolbar mínima (B/I/H1-3/listas/undo) y tab Document montada en workspace con 4 tabs
- [x] T017 `FieldsPanel` columnas del dataset, click inserta en cursor (`insertVariableField`)
- [x] T018 Drag HTML5 `text/x-tweakdoc-variable` → drop handler inserta chip en posición del cursor
- [x] T019 Autosave debounce PATCH contentHtml + `refreshVariableFieldBindings(columns)`: rename→propaga por id/nombre; delete→unbound rojo; recrear columna→re-vincula sola (prioridad bind-por-nombre)
- [x] T020 Persistencia de chips cubierta por `tests/api/chips.test.ts`; E2E manual del flujo completo se ejecuta dentro de la validación quickstart (BAS-154/T047)

## Comando clave
`refreshVariableFieldBindings`: 1º intenta bind por NOMBRE (recreación), luego valida por ID existente, si no → unbound.
