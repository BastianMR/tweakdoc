# Proyecto: TweakDoc — Variable Document Merge

- **Team**: Bastian Marquez · **State**: Planned · **Color**: #7a5af8
- **URL Linear**: https://linear.app/bastian-marquez/project/tweakdoc-variable-document-merge-404bd759111f
- **Summary**: Local web app merging a Notion-style editor with a linked spreadsheet to batch-generate personalized PDFs with strict skip policies and export logs.
- **Repo**: `C:\Users\basma\Downloads\000_GOOGLE DRIVE\TweakDoc`
- **Spec fuente**: `specs/001-variable-document-merge/spec.md`

## Contenido documental (resumen ejecutivo)

### Clarificaciones ratificadas (2026-08-23)
1. **Campos sin resolver al exportar**: nunca se bloquea el lote con diálogo; se generan los PDFs completos y se omite con registro lo afectado. UNBOUND_FIELD se registra 1 vez por corrida.
2. **Números de fila**: permanentes, nunca reutilizados; nuevos toman el siguiente nunca usado (huecos visibles permitidos).
3. **Spellcheck idioma**: selector por documento Español/English/Auto; en Auto se marca solo lo inválido en ambos diccionarios.

### User Stories
| ID | Prioridad | Historia |
|---|---|---|
| US1 | P1 | Autoría de plantillas con campos reutilizables (drag + notación, binding estable por columnId) |
| US2 | P1 | Gestión de datos (import CSV/XLSX + grid editable + numeración permanente) |
| US3 | P1 | Generación PDFs individual/batch con política estricta y filenames `{doc}_{num}.pdf` |
| US4 | P2 | Dashboard de salud del documento + logs de exportación navegables |
| US5 | P2 | Library multi-documento con búsqueda/rename/delete cascade |
| US6 | P2 | Inyección de datos vía API local (columnas estrictas) |
| US7 | P3 | Presets estructurales Blank/Letter/Official Letter |
| US8 | P3 | Tab Styles global consistente preview↔PDF |
| US9 | P3 | Spellcheck offline es/en + AI review opcional BYO |

### Criterios de éxito medibles
- SC-001 primer PDF <15 min desde cero
- SC-002 batch 100 filas <5 min local
- SC-003 cero fallos silenciosos (cada skip = 1 entrada en dashboard)
- SC-004 renombres de columna no rompen placeholders (100%)
- SC-005 inyección de 50 registros válidos aparece completa; payload inválido agrega 0 filas
- SC-006 estilos idénticos preview↔PDF sin ajuste manual
- SC-007 ≥9/10 misspellings es/en detectadas offline

### Fuera de alcance v1
Auth/multiusuario/cloud; tablas compartidas entre documentos; print features exóticas (bleed/CMYK/watermarks); i18n de UI beyond inglés.

### Stack (constitution Article V)
TypeScript 5 / Node 20+ · Next.js **15** App Router · React 19 · Tailwind v4 + shadcn/ui · TipTap 3 · react-data-grid 7 beta.47 · SheetJS · SQLite better-sqlite3 + Drizzle · Puppeteer (Chromium singleton) · archiver 7 · nspell + Hunspell es/en.

## Estado de avance (cierre de sesión)

- tasks.md: ver checkbox `- [x]` (30+/50 al momento de este snapshot; M1 core completo).
- Verificación continua: typecheck 0 errores · tests Vitest ≥72 pasando · lint 0 errores · build OK.
- Pendientes al cierre: verificación final BAS-150/BAS-153, BAS-154 polish + revisión integral.

## Notas de sincronización Linear

Proyecto e issues ya existían en Linear antes de la desconexión (IDs BAS-143…154).
Este directorio permite reconstruirlos o actualizar estados sin pérdida de información.
