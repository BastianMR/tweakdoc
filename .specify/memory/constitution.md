# TweakDoc Constitution

## Artículos base (heredados del workflow global)

### Article I — Principios de código
1. La solución más simple que funciona gana (YAGNI). Antes de agregar una dependencia: ¿existe ya en el repo? ¿lo cubre la stdlib/plataforma?
2. CERO comentarios salvo pedido explícito del usuario. El código se explica solo.
3. Mimic el estilo del codebase existente: convenciones, librerías, patrones vecinos antes que gusto propio.
4. Seguridad primero: nunca loguear secretos, nunca commitear credenciales, validar input externo.

### Article II — Calidad y verificación
1. TDD cuando exista feature/bugfix con test framework definido: test rojo → mínimo verde → refactor.
2. Evidencia antes de afirmaciones: ningún "listo" sin comando de verificación ejecutado y su output confirmado.
3. Lint/typecheck del stack corren antes de dar un cambio por terminado.
4. Bugs: diagnosticar causa raíz ANTES de editar; el fix va en la capa más angosta responsable.

### Article III — Flujo SDD híbrido
1. Toda feature nueva pasa por el router `sdd-hybrid`: ruta superpowers (chicos) o Spec Kit (medianos/grandes).
2. En ruta SDD la fuente de verdad es la spec: los cambios de comportamiento empiezan editando spec.md, nunca parcheando código directo.
3. Cada fase produce artefacto versionable; ninguna fase salta gates de revisión humana.
4. `verification-before-completion` es obligatorio antes de declarar `/speckit.converge` converged.

### Article IV — Proceso
1. Nunca commitear sin pedido explícito del usuario.
2. Plan mode = read-only: clarifying questions antes de asumir stack o features.
3. Delegar exploración/investigación a subagents para proteger contexto principal.

## Artículos [PROYECTO]

### Article V — Stack y arquitectura
- Lenguaje/runtime: TypeScript 5.x sobre Node.js 20+
- Framework(s) principales: Next.js 15 (App Router) + React 19 + Tailwind CSS v4 con shadcn/ui; TipTap (editor), react-data-grid (tabla), SheetJS (import CSV/XLSX), Puppeteer (PDF), archiver (ZIP)
- Gestor de paquetes: npm
- Decisiones arquitectónicas registradas en: `.specify/specs/*/plan.md` (SDD) y `docs/superpowers/specs/` si aplica ruta A

### Article VI — Testing y CI
- Test runner: Vitest
- Comando de tests: `npm test`
- Comando lint/typecheck: `npm run lint` y `npm run typecheck`
- Cobertura mínima: sin gate de cobertura en v1 (M1–M3); aspiracional ≥70% en la lib compartida de interpolación

### Article VII — Convenciones del proyecto
- Estilo de commits: Conventional Commits
- Estructura de carpetas relevante: `app/` (App Router: páginas + API routes), `src/components`, `src/lib` (interpolación compartida, tokens CSS), `src/server` (db, servicios PDF), `data/*.db` (SQLite local, gitignored), uploads bajo `data/uploads`
- Restricciones específicas: app local sin auth; UI de plataforma en inglés, contenido de documentos es/en; claves de IA (OpenAI-compatible) viven solo en SQLite local, jamás en git ni logs; Puppeteer usa singleton de Chromium (una instancia por proceso servidor); export estricta: fila con celda vacía en variable usada NO genera PDF y se registra en `export_logs`

---
*Ratificado: 2026-08-23 · Última enmienda: 2026-08-23 · Versión: 1.0.0*
