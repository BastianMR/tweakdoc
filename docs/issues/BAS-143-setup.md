# BAS-143 — Setup: scaffold Next.js 15 + deps + Vitest + schema Drizzle

- **Estado real**: ✅ DONE (verificado: build ✓ · typecheck 0 · lint 0 · `npm test` verde · `data/tweakdoc.db` creada)
- **Labels**: chore · **Estimate**: 3 · **Priority**: High
- **Blocked by**: —

## Descripción
Infraestructura compartida del proyecto (Phase 1 de tasks.md).

## Acceptance criteria (T001–T005)
- [x] T001 Scaffold Next.js con TypeScript, Tailwind v4 y directorio `src/` en la raíz del repo
- [x] T002 Dependencias productivas: TipTap suite, react-data-grid@beta.47, xlsx, puppeteer (Chromium diferido), archiver@7, nspell, drizzle-orm, better-sqlite3 + dev: drizzle-kit, vitest, jsdom
- [x] T003 shadcn/ui init + componentes base en `src/components/ui/` (button, dialog, input, tabs, card, dropdown-menu, sonner, label, select, switch, slider)
- [x] T004 Vitest config (`vitest.config.ts`, alias @/, passWithNoTests) + scripts `test/typecheck/lint/db:push/db:generate` + `.github/workflows/ci.yml` real (Node 20)
- [x] T005 Esquema Drizzle 4 tablas en `src/server/schema.ts` + cliente `src/server/db.ts` (soporte `TWEAKDOC_DB_PATH`) + `drizzle.config.ts`

## Notas de implementación
- Scaffold vía create-next-app en temp y movimiento a repo no-vacío.
- `PUPPETEER_SKIP_DOWNLOAD=1` en setup; Chromium instalado explícitamente antes de US3 (`npx puppeteer browsers install chrome`).
- Stack alineado a constitution: **next@15.5.23** (create-next-app traía 16; se bajó) + eslint-config-next@15 con FlatCompat.
