# TweakDoc — Project History

Cronología completa de la construcción (sesiones del 23–24 de agosto de 2026).
Fuente funcional: `specs/001-variable-document-merge/spec.md` · Gestión: GitHub issues del repo (backlog en el board *Personal - Dev*).

## Fase 0 — Idea y clasificación SDD
- **Idea original**: combinar un editor de texto con una hoja de cálculo; cada fila es una permutación del documento mediante campos personalizados (tipo contratos); variables insertadas por drag-and-drop; al generar el PDF se reemplazan automáticamente.
- **Router `sdd-hybrid`**: proyecto nuevo multi-módulo → **ruta B (Spec Kit)** con `repo-base` primero. Brainstorming clasificado *architectural*.
- **Decisiones tempranas** (ronda de preguntas): app local primero (portafolio GitHub) → web app local → import CSV/XLSX + grid editable → PDFs individuales + batch ZIP → rich text estilo Notion → backend + SQLite → fidelidad PDF con motor real.

## Diseño evolutivo (v1 → v5)
- **v2**: multiple documentos con sidebar + buscador; cada documento con 3 vistas (Dashboard de errores/estado, Documento con panel izquierdo de campos, Tabla).
- **v3**: exportación estricta con **logs de fallos persistidos** visibles en el dashboard (fila omitida por celda vacía → no se genera + aviso con motivo).
- **v4**: diseño **shadcn/ui**; filenames `{documento}_{id_fila_visible}.pdf`; **API de inyección** de datos externa.
- **v5**: UI en inglés; documentos es/en; presets Letter/Oficio; **vista Styles** global (página, header/logo/páginas, tipografía → tokens CSS compartidos); **spellcheck offline es/en** + **agente IA BYO** (clave OpenAI-compatible propia). Alcance dividido en hitos **M1 core → M2 structure/styles → M3 quality**.

## Fase 0–6 — Pipeline Spec Kit ejecutado
1. `repo-base` scaffold en `…\Downloads\000_GOOGLE DRIVE\TweakDoc` + constitution instanciada (artículos V–VII ratificados por el usuario).
2. `/speckit.specify` → `specs/001-variable-document-merge/spec.md` (9 user stories, 22 FRs, 7 SCs, checklist 16/16).
3. `/speckit.clarify` → 3 aclaraciones ratificadas: política no-bloqueante de export (Q1), numeración de filas permanente (Q2), idioma de spellcheck con Auto dual (Q3).
4. `/speckit.plan` → 15 decisiones (D1–D15) + Constitution Check 10/10 + data-model + contracts + quickstart.
5. `/speckit.tasks` → 50 tasks en 12 fases mapeadas a los 3 hitos.
6. **Linear sync**: proyecto + 12 issues (BAS-143…154, 39 pts) con grafo de dependencias sin ciclos.

## Fases 7–9 — Implementación (task por task, TDD)
### M1 Core
- **BAS-143 Setup**: Next 15.5 + TS + Tailwind v4 + shadcn + Vitest + CI + SQLite/Drizzle.
- **BAS-144 Foundation**: interpolación compartida preview↔PDF, naming sanitizado, parser CSV/XLSX, styleTokens, presets, i18n, shell + CRUD de documentos.
- **BAS-145 US1**: TipTap con chips auto-bindeadas (drag, `{{notación}}`, re-vínculo por nombre, unbound rojo).
- **BAS-146 US2**: import CSV/XLSX (reemplazo limpio), grid editable con `#` permanente, autosave con detección 409.
- **BAS-151 US3**: Chromium singleton, ZIP streaming, política estricta completa (EMPTY_CELL por fila · UNBOUND_FIELD 1×/corrida · RENDER_ERROR con retry) + logs.
### P2/P3
- **BAS-147 US4** dashboard de salud + logs navegables · **BAS-148 US5** library multi-doc · **BAS-149 US6** inyección por API · **BAS-152 US7** presets · **BAS-150 US8** styles consistente · **BAS-153 US9** spellcheck Hunspell + AI review BYO.
- **BAS-154 Polish**: validación E2E automatizada (12/12 escenarios contra build de producción), perf SC-002 (105 filas → 17 s), security pass, CHANGELOG, graphify.

## Incidentes resueltos (aprendizajes)
1. **`app/` raíz vs `src/app/`**: los handlers se escribieron sin `src/`; Next prioriza el `app/` raíz y silenciaba TODAS las páginas. Fix: mover API routes bajo `src/app/api/`.
2. **Next 16 → 15.5**: `create-next-app@latest` trajo 16.3.2 fuera de spec; se alineó a la constitution.
3. **Interop ESM/CJS bajo Vitest**: SheetJS y archiver exigieron estrategias explícitas (named imports / `createRequire` / dynamic import con fallback `default`).
4. **`Sheets[0]` vs `Sheets[SheetNames[0]]`**: la API de workbook de SheetJS es un diccionario por nombre, no array.
5. **react-data-grid beta.61** requería React canary (`useEffectEvent`); fijado a beta.47 estable.
6. **eslint-config-next@15** exige `FlatCompat` en flat config.
7. **Chrome 152 del sistema dejó de lanzar** (0xC0000142) tras funcionar: se implementó resolución de ejecutable con **fallback automático a Edge** del sistema (Chromium), con override por `PUPPETEER_EXECUTABLE_PATH`.
8. **`shadcn` como prod-dep** y componentes ui sin uso: poda final pre-publicación.

## Reposición de gestión
Linear quedó inaccesible al cierre; toda la documentación de proyecto e issues se materializó en `docs/issues/` (README + PROJECT + 12 issues) y esta historia. La publicación en GitHub con issues históricos cerrados + backlog abierto la reemplaza 1:1.

## Entrega
- **v1.0.0** — 50/50 tasks · 12/12 issues · 72+ tests · E2E 12/12 · typecheck/lint 0 · build limpio.
