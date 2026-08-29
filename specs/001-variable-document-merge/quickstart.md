# Quickstart: Variable Document Merge

Guía de validación end-to-end. Detalles de contratos en [contracts/api.md](./contracts/api.md) y modelo en [data-model.md](./data-model.md).

## Prerrequisitos

- Node.js 20+
- npm 10+

## Setup

```powershell
npm install
npx drizzle-kit push        # crea data/tweakdoc.db
npm run dev                 # http://localhost:3000
```

## Escenario 1 — Primer PDF en <15 min (SC-001, US1+US2+US3)

1. `Documents sidebar → New document` → nombre `Contract A`, formato Blank.
2. Tab **Table** → `Import` con CSV de prueba:
   ```csv
   Client,Amount,Date
   Acme SA,1200,2026-08-23
   Globex,800,
   ```
   **Esperado**: grid con 3 columnas + columna `#` (1, 2); fila 2 con Date vacía.
3. Tab **Document** → panel izquierdo muestra campos `Client`, `Amount`, `Date`.
4. Escribir "Service agreement between {{Client}} for {{Amount}} USD on {{Date}}.":
   - Arrastrar `Client` desde el panel al editor → chip aparece inline.
   - Tipear `{{Amount}}` y cerrar llaves → se convierte en chip automáticamente.
5. Seleccionar fila 1 en el grid → `Generate PDF`.
   **Esperado**: descarga `Contract A_1.pdf`; el texto contiene los valores de fila 1; formato preservado.
6. `Generate all`:
   **Esperado**: ZIP con **solo** `Contract A_1.pdf` (fila 2 omitida) + summary `{generated:1, skipped:1}`.

## Escenario 2 — Dashboard y logs (US4, FR-012/014)

1. Tras el escenario 1, tab **Dashboard**:
   - Fields card: 3 resolved / 0 unresolved.
   - Data card: 2 rows, 1 incomplete.
   - Readiness: "1 of 2 rows ready".
   - Export logs: entrada `EMPTY_CELL — Empty cell in column 'Date'` con row label `Row 2 · Globex`.
2. Click go-to-row en la log entry → navega a Table enfocando fila 2.
3. Completar la celda Date de fila 2 → regenerar todo → ZIP con 2 PDFs; logs previos siguen históricos hasta `Clear`.

## Escenario 3 — Renombrado y campos sin resolver (US1-3/4, FR-004/005, Q1)

1. En Table renombrar columna `Client` → `Customer`. Volver al editor: la chip ahora muestra `{{Customer}}` y sigue funcionando.
2. Borrar columna `Customer`:
   - Chip pasa a estado visual unresolved (roja).
   - `Generate all` → **cero PDFs**, una entrada run-level `UNBOUND_FIELD` nombrando la columna; sin diálogo bloqueante.
3. Recrear columna `Customer` con datos → chips se re-vinculan solas.

## Escenario 4 — Inyección vía API (US6, FR-015)

```powershell
curl -X POST http://localhost:3000/api/datasets/{datasetId}/rows -H "Content-Type: application/json" -d "{\"rows\":[{\"Client\":\"Initech\",\"Amount\":\"500\",\"Date\":\"2026-09-01\"}]}"
# Esperado: {"added":1,"totalRows":3}

curl -X POST ... -d "{\"rows\":[{\"Phone\":\"555\"}]}"
# Esperado: HTTP 422 {"error":"unknown_columns","unknownColumns":["Phone"]} y cero filas agregadas
```
Verificar en Table que aparece la fila nueva con `#` = siguiente número nunca usado.

## Escenario 5 — Múltiples documentos y búsqueda (US5)

1. Crear `Invoice B` y `Letter C` además de `Contract A`.
2. Buscar `let` en el sidebar → solo `Letter C`.
3. Renombrar `Contract A` → exportar → filename usa el nuevo nombre.
4. Eliminar `Letter C` → desaparecen documento, su tabla y sus logs tras reload.

## Escenario 6 — Estilos globales (US8, SC-006)

1. Tab **Styles**: page size Letter, body align justify, activar header + logo + page numbers.
2. Editor refleja cambios inmediatamente; generar PDF → geometría, justificado, logo y numeración idénticos al preview.

## Escenario 7 — Calidad de escritura (US9, FR-018/019)

1. Documento con texto es/en mezclado, selector Auto: escribir "The recibo is dué tomorrow" → `recibo` y `dué` marcadas; sugerencias por palabra aplicables.
2. Settings → cargar baseUrl+apiKey válidos → `Review with AI` sobre un párrafo con error gramatical → observaciones con apply/reject individuales.
3. Sin credenciales configuradas → prompt de setup claro; resto de la app intacto.

## Comandos de verificación

```powershell
npm test          # unit (interpolation, naming, formats, spellcheck) + integración API
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
```

Criterio de listo: todos los escenarios arriba verificados manualmente + suite verde + lint/typecheck limpios antes de `/speckit.converge` (constitution Article II/III).
