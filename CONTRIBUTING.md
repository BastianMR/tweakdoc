# Contribuir a este repo

Flujo de trabajo y mejores prácticas. Board vinculado: **Personal - Dev** (el tab *Projects* de este repo muestra el mismo board con sus vistas).

## Flujo

1. **Issue primero**: toda tarea nace como issue (templates: Reporte de bug / Feature / Tarea). Los issues nuevos entran solos al board en `Backlog`.
2. **Branch** desde `main`: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`.
3. **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:` — igual que en los títulos de issues.
4. **PR** hacia `main` usando el template. Vinculá el issue con `Closes #N`.
5. El item pasa a `In Progress` cuando abrís el PR y a `Done` al mergear.

## Semántica de status del board (Kanban dev)

| Status | Significado | Regla |
|---|---|---|
| Backlog | ideas y pendientes sin priorizar | ilimitado |
| Todo | próximas a tomar | ordenadas por prioridad |
| In Progress | trabajo activo (PR abierto) | **WIP máx. 2** |
| Done | merge a `main` | se filtra a la vista Completadas |

## Definition of Done (checklist del PR)

- [ ] Lint y typecheck sin errores (si aplica)
- [ ] Tests pasando (si aplica)
- [ ] Probado localmente
- [ ] Issue vinculado (`Closes #N`)
