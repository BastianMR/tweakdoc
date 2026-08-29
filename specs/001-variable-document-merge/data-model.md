# Data Model: Variable Document Merge

**Date**: 2026-08-23 · Fuente: [spec.md](./spec.md) Key Entities + clarificaciones Q1–Q3

## Entidades

### Document
Plantilla autoreada por el usuario.

| Campo | Tipo | Reglas |
|---|---|---|
| id | TEXT uuid pk | generado en creación, inmutable |
| name | TEXT NOT NULL | usado en filenames exportados → se sanitiza al exportar (ver contracts/naming) |
| format_type | TEXT enum `blank\|letter\|official_letter` | default `blank`; define skeleton inicial (inmutable después salvo re-aplicar preset manualmente) |
| content_html | TEXT default '' | HTML canónico de TipTap; contiene chips `<span data-variable-id data-variable-name>` |
| settings_json | TEXT JSON | ver StyleSettings abajo; defaults al crear |
| created_at / updated_at | TEXT ISO-8601 | updated_at en cada PATCH |

**StyleSettings (contenido de settings_json)**:
```json
{
  "page":    { "size": "A4" | "Letter", "marginMm": { "top": 20, "right": 20, "bottom": 20, "left": 20 } },
  "header":  { "enabled": false, "logoPath": null, "pageNumbers": false },
  "typography": { "fontFamily": "serif-stack-name", "bodySizePt": 11, "bodyAlign": "justify", "headingScalePt": { "h1": 20, "h2": 16, "h3": 13 } }
}
```
Validación: size ∈ {A4, Letter}; marginMm 0–50; bodySizePt 8–18; headingScalePt ≥ bodySizePt y jerárquico h1>h2>h3.

### Dataset
Hoja de cálculo vinculada **1:1** a un Document (cascade delete).

| Campo | Tipo | Reglas |
|---|---|---|
| id | TEXT uuid pk | |
| document_id | TEXT fk UNIQUE → documents.id ON DELETE CASCADE | 1 dataset por documento |
| name | TEXT NOT NULL | label del origen de datos |
| sheet_json | TEXT JSON | estructura completa (ver Sheet abajo); escritura last-write-wins |
| next_row_number | INTEGER NOT NULL default 1 | contador monotónico — nunca decrece ni reutiliza (clarificación Q2) |

**Sheet (contenido de sheet_json)**:
```json
{
  "columns": [ { "id": "col_uuid", "name": "Client" } ],
  "rows":    [ { "id": "row_uuid", "num": 1, "values": { "col_uuid": "Acme SA" } } ]
}
```
- `column.id` = identidad estable del binding de chips (FR-004): renombrar cambia solo `name`.
- `row.num` = número visible permanente; único dentro del dataset; huecos permitidos tras deletes.
- Nombres de columna duplicados en import → auto-sufijo `"Name (2)"` con notificación.
- Valores de celda: string (vacío `""` cuenta como EMPTY_CELL para variables usadas).

### ExportLogEntry
Registro de omisiones/fallos de generación (FR-012/013).

| Campo | Tipo | Reglas |
|---|---|---|
| id | TEXT uuid pk | |
| document_id | TEXT fk → documents.id ON DELETE CASCADE | |
| row_id | TEXT nullable fk lógico a row.id | null cuando el fallo es run-level (UNBOUND_FIELD) |
| row_label | TEXT | snapshot legible `"Row 14 · Acme SA"`; sobrevive deletes de fila (edge case spec) |
| reason_code | TEXT enum `EMPTY_CELL\|UNBOUND_FIELD\|RENDER_ERROR` | EMPTY_CELL → por fila; UNBOUND_FIELD → 1 por corrida; RENDER_ERROR → por fila |
| detail | TEXT | mensaje humano, ej. `Empty cell in column 'Date'` |
| created_at | TEXT ISO-8601 | |

### AppSetting
Configuración global local (key/value).

| key | value | Reglas |
|---|---|---|
| ai_base_url | TEXT url | default `https://api.openai.com/v1` |
| ai_api_key | TEXT secreto | jamás loguear, jamás commitear, jamás devolver por GET (solo booleano derivado) |

## Relaciones

```text
Document 1──1 Dataset        (cascade)
Document 1──* ExportLogEntry (cascade)
Dataset.sheet_json ── referencia por columnId desde Document.content_html (lógica, no fk)
```

## Transiciones de estado

- **Column**: `active → renamed` (id estable, nombre nuevo) · `active → deleted` (chips quedan UNBOUND; sin borrado físico de valores hasta save)
- **Row**: `created(num=next_row_number++) → edited → deleted` (num retirado para siempre)
- **Export run**: `started → per-row: generated | skipped(EMPTY_CELL|RENDER_ERROR) ; run-level: UNBOUND_FIELD(una vez) → finished(summary{generated, skipped})`
- **Document**: `draft(content vacío) → authored → exported` (sin estados bloqueantes; regenerable siempre)

## Reglas de validación clave (derivadas de FR)

1. Import: primera fila = headers obligatoria; archivo ilegible → rechazo completo con ubicación del problema (US2-3).
2. API rows injection: toda columna referenciada debe existir; un solo desconocido → rechazo total 422 sin writes parciales (FR-015).
3. Generación: celda vacía en columna usada ⇒ skip + log por fila; chip UNBOUND ⇒ 0 PDFs + 1 log run-level (clarificación Q1).
4. Filenames: `{sanitized(name)}_{row.num}.pdf` (contracts/naming).
