# Contracts: Variable Document Merge

**Date**: 2026-08-23 · Interfaces externas e internas del sistema. Errores siempre `{ error: string, ...contexto }`.

## REST API (local, sin auth)

### Documents

#### `GET /api/documents`
Lista para el sidebar. → `200 [{ id, name, formatType, updatedAt }]`

#### `POST /api/documents`
`{ name: string, formatType: "blank" | "letter" | "official_letter" }`
→ `201 { id, name, formatType, datasetId }` — crea skeleton según formato (presets) + dataset vacío vinculado.
`400` si name vacío o formatType inválido.

#### `PATCH /api/documents/:id`
`{ name?, formatType?, contentHtml?, settings? }` — campos opcionales independientes; `settings` reemplaza el objeto validado.
→ `200 { document }` · `404` · `400` validación de StyleSettings.

#### `DELETE /api/documents/:id`
Cascade: dataset + export_logs. → `204`

### Datasets

#### `GET /api/datasets/:id`
→ `200 { id, documentId, name, sheet: Sheet, nextRowNumber }`

#### `PUT /api/datasets/:id`
`{ sheet: Sheet, expectedNextRowNumber?: number }` — last-write-wins; si llega `expectedNextRowNumber` y difiere → `409 { error, currentNextRowNumber }` (evita pisar filas nuevas llegadas por API mientras el grid estaba abierto).
→ `200 { savedAt }`

#### `POST /api/datasets/:id/import`
Multipart: `file` (.csv | .xlsx | .xls). Primera fila = headers.
→ `201 { columnsCreated, rowsAdded, renamedColumns: string[], columns: Column[] }`
→ `422 { error, location: { row?: number, column?: string } }` rechazo completo sin partial write.
→ `415` extensión no soportada.

#### `POST /api/datasets/:id/rows`  *(inyección externa)*
```json
{ "rows": [ { "Client": "Acme SA", "Date": "2026-08-23" } ] }
```
Claves = nombres exactos de columna existente.
→ `200 { added, totalRows }`
→ `422 { error: "unknown_columns", unknownColumns: ["Phone"] }` — rechazo total, cero writes parciales (FR-015).

### Generación PDF

#### `POST /api/documents/:id/pdf`
`{ rowIds?: number[], all?: true }` — exactamente uno de los dos.
Respuesta exitosa: `200`
- 1 fila → `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="{doc}_{num}.pdf"`
- N filas → `application/zip` con un PDF por fila generada + `X-Export-Summary: {generated, skipped}` (base64url JSON).

Semántica estricta (clarificación Q1):
- Celda vacía en columna usada por la plantilla → esa fila NO genera PDF; se inserta ExportLogEntry `EMPTY_CELL` (row-level).
- Algún chip UNBOUND en plantilla → **cero** PDFs; UNA entrada `UNBOUND_FIELD` run-level (`row_id=null`). Sin diálogo bloqueante: la corrida simplemente reporta.
- `RENDER_ERROR` técnico → skip de esa fila + log; el resto continúa.
- `all:true` con 0 filas en dataset → `200` zip vacío + summary `{generated:0, skipped:0}` y toast UI "nothing to generate" (no error HTTP).

#### `GET /api/documents/:id/export-logs`
→ `200 [{ id, rowId, rowLabel, reasonCode, detail, createdAt }]` ordenado desc.

#### `DELETE /api/documents/:id/export-logs`
→ `204`

### Settings

#### `GET /api/settings`
→ `200 { aiBaseUrl, aiConfigured: boolean }` — **nunca** devuelve la clave.

#### `PUT /api/settings`
`{ aiBaseUrl?, aiApiKey? }` — clave se persiste solo en SQLite local. → `200 { aiBaseUrl, aiConfigured }`

## Interpolation contract (`src/lib/interpolation.ts`)

```ts
type ChipMatch = { columnId: string; columnName: string }
type Issue =
  | { type: 'EMPTY_CELL'; columnId: string }
  | { type: 'UNBOUND_FIELD'; columnId: null; columnName: string }

interpolate(
  html: string,
  valuesByColumnId: Record<string, string>,   // solo columnas existentes; ausencia = unbound
): { html: string; issues: Issue[] }
```
- Markup canónico reconocido: `<span data-variable-id="{colId}" data-variable-name="{name}">…</span>` producido exclusivamente por TipTap VariableField node.
- `columnId` presente en `valuesByColumnId` pero valor `""` → sustituye por vacío + issue `EMPTY_CELL`.
- `columnId` ausente del map → chip marcada `data-unbound="true"` (roja) + issue `UNBOUND_FIELD`; si hay ≥1 unbound el caller no debe renderizar PDFs.
- Todo valor sustituido pasa por escape HTML (`& < > " '`).
- Determinística y pura: misma entrada ⇒ mismo output (testeada).

## Naming contract (`src/lib/naming.ts`)

```ts
exportFileName(documentName: string, rowNum: number): string
// "{sanitized}-{num}.pdf"? No: "{sanitized}_{num}.pdf"
```
- Sanitización: trim; colapsa whitespace a `_`; remueve `\ / : * ? " < > |` y caracteres de control; colapsa `_` repetidos; máx 80 chars conservando sufijo `_{num}.pdf`.
- Garantía: dos llamadas con igual doc+num ⇒ nombre idéntico; distinto num dentro de un batch ⇒ nombres distintos (nums únicos por dataset).

## Spellcheck contract (`src/lib/spellcheck.ts`)

```ts
type Lang = 'es' | 'en' | 'auto'
checkWords(text: string, lang: Lang): { word: string; offset: number; suggestions: string[] }[]
// auto: palabra inválida SOLO si falla en ambos diccionarios (Q3)
```

## AI review contract (`src/server/aiClient.ts`)

```ts
reviewText(text: string, cfg: { baseUrl: string; apiKey: string }): Promise<
  { ok: true; observations: { original: string; suggestion: string; reason: string }[] }
| { ok: false; error: string }>
```
- Endpoint: `POST {baseUrl}/chat/completions`, modelo configurable futuro (default razonable), respuesta JSON forzada por prompt; timeout 30s; errores de red/clave → `{ ok:false }` sin filtrar la clave.
