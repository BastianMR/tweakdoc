# TweakDoc — Issues & Project Documentation

Esta carpeta es la **fuente local** de la documentación de gestión que vivía en Linear
(proyecto `TweakDoc — Variable Document Merge`, team `Bastian Marquez`). Se creó porque
el MCP de Linear quedó sin conexión; cuando se restaure, cada archivo aquí es el payload
listo para recrear proyecto e issues 1:1.

## Índice

| Archivo | Issue | Título | Estado real | Est | Pri |
|---|---|---|---|---|---|
| [PROJECT.md](./PROJECT.md) | — | Proyecto TweakDoc | Planned | — | — |
| [BAS-143-setup.md](./BAS-143-setup.md) | BAS-143 | Setup: scaffold Next.js + deps + Vitest + Drizzle | **DONE** | 3 | High |
| [BAS-144-foundation.md](./BAS-144-foundation.md) | BAS-144 | Foundation: libs + shell + API docs | **DONE** | 5 | High |
| [BAS-145-us1-editor.md](./BAS-145-us1-editor.md) | BAS-145 | US1 Editor campos drag/notación | **DONE** | 5 | High |
| [BAS-146-us2-spreadsheet.md](./BAS-146-us2-spreadsheet.md) | BAS-146 | US2 Spreadsheet importable/editable | **DONE** | 5 | High |
| [BAS-151-us3-pdf-export.md](./BAS-151-us3-pdf-export.md) | BAS-151 | US3 Generación PDF política estricta | **DONE** | 5 | High |
| [BAS-147-us4-dashboard.md](./BAS-147-us4-dashboard.md) | BAS-147 | US4 Dashboard salud + logs | **DONE** | 3 | Medium |
| [BAS-148-us5-library.md](./BAS-148-us5-library.md) | BAS-148 | US5 Library multi-documento | **DONE** | 2 | Medium |
| [BAS-149-us6-api-injection.md](./BAS-149-us6-api-injection.md) | BAS-149 | US6 Inyección vía API | **DONE** | 2 | Medium |
| [BAS-152-us7-presets.md](./BAS-152-us7-presets.md) | BAS-152 | US7 Presets Letter/Oficio/Blank | **DONE** | 2 | Low |
| [BAS-150-us8-styles.md](./BAS-150-us8-styles.md) | BAS-150 | US8 Tab Styles preview↔PDF | **DONE** (pendiente verificación final) | 3 | Low |
| [BAS-153-us9-quality.md](./BAS-153-us9-quality.md) | BAS-153 | US9 Spellcheck + AI review | **En verificación final** | 5 | Low |
| [BAS-154-polish.md](./BAS-154-polish.md) | BAS-154 | Polish: validación integral + perf + security | Pending | 2 | Medium |

## Grafo de dependencias (sin ciclos)

```text
143 → 144 → 145 → 146 → 151 ─┬→ 147 ─┐
                    ├→ 152    ├→ 150 ├→ 154
                    └→ 153    └→ 148 ─┤
                              149 ────┘
```

## Convenciones

- Cada issue = un `.md` con: descripción original, acceptance criteria como checklist,
  estimate, prioridad, labels y estado real al cierre de sesión.
- Los checks `- [x]` reflejan trabajo **verificado** (tests + typecheck + lint + build),
  consistente con `specs/001-variable-document-merge/tasks.md`.
- Fuente de verdad funcional: `specs/001-variable-document-merge/spec.md`.

## Sincronización futura a Linear

Al recuperar conexión MCP (`linear_save_project` + `linear_save_issue`), usar cada `.md`
como description del issue y recrear las relaciones `blockedBy` según el grafo anterior.
Proyecto ya creado en Linear: id `f498d0ab-0718-41d5-b501-0e06e7dbfa59`
(https://linear.app/bastian-marquez/project/tweakdoc-variable-document-merge-404bd759111f).
Issues ya creados allí: BAS-143…154 (los IDs locales coinciden por convención).
