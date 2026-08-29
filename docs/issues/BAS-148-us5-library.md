# BAS-148 — US5: Library multi-documento con búsqueda/rename/delete cascade

- **Estado real**: ✅ DONE (57 tests · typecheck 0)
- **Labels**: frontend · **Estimate**: 2 · **Priority**: Medium
- **Blocked by**: BAS-144

## Acceptance criteria (T034–T035)
- [x] T034 Sidebar: filtro client-side substring, rename inline (Enter confirma/Esc cancela), delete con confirmación explícita mencionando cascade
- [x] T035 `tests/api/lifecycle.test.ts`: crea 3 docs, siembra dataset+log en uno, DELETE → listado lo excluye, datasets y export_logs en 0

## Nota
La búsqueda es client-side sobre la lista ya cargada (FR-001); el rename propaga a exports porque los filenames se componen al momento de generar.
