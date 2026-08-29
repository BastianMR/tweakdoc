# Feature Specification: Variable Document Merge

**Feature Branch**: `001-variable-document-merge`

**Created**: 2026-08-23

**Status**: Draft

**Input**: User description: "Combinar un editor de texto y una hoja de cálculo: se sube información a la hoja y cada fila es una permutación del documento con campos personalizados (como contratos). Las variables se insertan en el documento por drag-and-drop o notación; al generar el PDF se reemplazan automáticamente con los valores de la fila. Cada variable es una columna; cada fila es una iteración." Refinado en brainstorming hasta diseño v5 (múltiples documentos con buscador, 4 vistas por documento, logs de exportación, presets carta/oficio, estilos globales, revisión ortográfica es/en, agente IA con clave propia del usuario, inyección de datos vía API, archivos nombrados documento+id de fila, plataforma en inglés).

## Clarifications

### Session 2026-08-23

- Q: ¿Qué política aplica al exportar cuando existe un campo sin resolver en la plantilla? → A: Nunca se bloquea el lote completo con un diálogo: se generan todos los PDFs cuyo contenido queda completo y se omite (con registro) cualquier salida afectada por datos faltantes o campos sin resolver; las condiciones de campo sin resolver se registran una vez por corrida.
- Q: ¿Cómo se comportan los números visibles de fila ante eliminaciones? → A: Permanentes: cada fila conserva su número aunque otras se borren y las nuevas filas reciben el siguiente número nunca usado (puede haber huecos en la secuencia visible).
- Q: ¿Cómo se determina el idioma para el chequeo ortográfico offline? → A: Selector por documento (Español / English / Auto); en Auto una palabra se marca solo si no existe ni en el diccionario español ni en el inglés.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Author a template with reusable fields (Priority: P1)

A user creates a new document and writes rich formatted content (headings, bold, lists, tables). From a side panel listing the linked table's columns, they drag a field into the text — or simply type the field notation — and it becomes a highlighted placeholder inside the sentence. The placeholder stays connected to its column: if the column is later renamed, the placeholder follows the new name; if the column is deleted, the placeholder is visually flagged as unresolved.

**Why this priority**: This is the core mechanic of the product — without reusable fields there are no permutations and no product.

**Independent Test**: Can be fully tested by creating one document, linking a small table, inserting two fields, and verifying they render as placeholders both when typed and when dragged.

**Acceptance Scenarios**:

1. **Given** a document linked to a table with columns "Client" and "Amount", **When** the user drags "Client" from the fields panel into a paragraph, **Then** a visually distinct placeholder appears inline where dropped.
2. **Given** the same document, **When** the user types the notation `{{Amount}}` in the editor, **Then** it converts into the same kind of placeholder automatically upon completion.
3. **Given** an inserted placeholder bound to "Client", **When** the column is renamed to "Customer", **Then** the placeholder displays "Customer" and remains functional.
4. **Given** an inserted placeholder bound to "Amount", **When** the column is deleted, **Then** the placeholder is shown as unresolved (distinct visual state) and the document still opens and edits normally.
5. **Given** a typed notation that matches no existing column, **When** the user completes typing it, **Then** it becomes an unresolved placeholder that resolves automatically once a column with that name exists.

---

### User Story 2 - Manage recipient data in the spreadsheet (Priority: P1)

The user uploads a CSV or Excel file to populate the table linked to a document, and/or edits rows and columns directly in the app's grid. Each row shows a visible sequence number the user can refer to. Changes persist without an explicit save action.

**Why this priority**: The table supplies the values that make each permutation real; import + editing is what turns the tool into a bulk generator.

**Independent Test**: Can be tested by importing a sample CSV, observing rows/columns appear with visible row numbers, editing cells inline, reloading, and confirming persistence.

**Acceptance Scenarios**:

1. **Given** a valid CSV/XLSX file whose first row contains headers, **When** the user uploads it to a document's table, **Then** columns and rows appear in the grid and become available as fields.
2. **Given** any grid state, **When** the user adds/removes rows or columns or edits a cell, **Then** changes are persisted automatically without pressing save.
3. **Given** a corrupted or unreadable import file, **When** the user attempts upload, **Then** the system rejects the whole file and reports the problem location instead of importing partial data.
4. **Given** a table with N rows, **When** the user views the grid, **Then** each row displays a stable visible sequence number that does not change when other rows are deleted.

---

### User Story 3 - Generate personalized PDFs (Priority: P1)

For the linked table, the user generates one filled PDF per row — either a single selected row or all rows at once as a downloadable bundle. Files are named after the document plus the visible row number. If a row lacks a value for a column the document uses, that row's PDF is not produced; the rest complete normally and the omission is reported.

**Why this priority**: This is the output the entire product exists to produce.

**Independent Test**: Can be tested with a 3-row table where one row has an empty used cell: expect 2 correctly-filled PDFs with proper names and 1 reported skip.

**Acceptance Scenarios**:

1. **Given** a template with placeholders and a table of 3 complete rows, **When** the user triggers batch generation, **Then** 3 PDFs are produced, one per row, each with that row's values substituted, delivered as a single downloadable bundle.
2. **Given** the same setup, **When** the user generates only row 2, **Then** exactly one PDF is produced containing row 2's values.
3. **Given** a row with an empty cell in a column the document uses, **When** batch generation runs, **Then** that row produces no PDF while all other rows do, and a record of the omission (row identifier + reason) is kept.
4. **Given** generated PDFs, **When** the user inspects filenames, **Then** each file is named with the document name followed by the row's visible sequence number.
5. **Given** a template containing an unresolved placeholder, **When** generation runs, **Then** no PDF is produced (every output would be incomplete), a single run-level entry names the unresolved field, and previously generated files remain untouched — with no blocking dialog preventing the user from fixing and retrying.

---

### User Story 4 - Monitor document health and export failures (Priority: P2)

Each document has a dashboard view summarizing its state: whether a table is linked and its size, how many fields the document uses and which are unresolved, which columns are never referenced, which rows have empty values in used columns, and overall generation readiness. Failed generations are listed with row, reason, and date, with quick actions to inspect the offending row or clear the history.

**Why this priority**: Turns failures from silent surprises into actionable information; essential for trustworthy bulk generation, but not needed to prove the core loop.

**Independent Test**: Can be tested by creating a deliberately broken state (empty cell, deleted column), running an export, and verifying the dashboard lists exact causes and counts.

**Acceptance Scenarios**:

1. **Given** a run where one row was skipped due to an empty cell in "Date", **When** the user opens the dashboard, **Then** the failure log shows the row's visible number, the column name, and the timestamp.
2. **Given** a document with 5 fields, one bound to a deleted column, **When** the dashboard loads, **Then** the fields card shows 4 resolved and 1 unresolved, naming the unresolved field.
3. **Given** a document with 20 rows of which 4 have empty used cells, **When** the dashboard loads, **Then** the readiness summary states 16 rows are ready to generate out of 20.
4. **Given** existing failure logs, **When** the user clears them, **Then** the list empties and stays empty after reload.
5. **Given** a failure entry, **When** the user clicks its go-to-row action, **Then** the app navigates to the table view focused on that row.

---

### User Story 5 - Work with multiple documents (Priority: P2)

The user keeps several documents side by side. A persistent sidebar lists them by name with a simple search box filtering as you type. Creating, renaming, and deleting documents is possible; deleting removes its linked table and failure history too.

**Why this priority**: Real usage involves multiple contract types; trivial to understand, needed before showcasing.

**Independent Test**: Can be tested by creating three documents with distinguishable names, searching a substring, renaming one, deleting another, and verifying results persist after reload.

**Acceptance Scenarios**:

1. **Given** documents "Contract A", "Invoice B", "Letter C", **When** the user types "let" in the sidebar search, **Then** only "Letter C" remains listed.
2. **Given** a document, **When** renamed, **Then** the new name shows everywhere the document appears (sidebar, editor header, exported filenames).
3. **Given** a document with linked table and failure history, **When** deleted, **Then** neither the document nor its table nor its history appear again after restart.

---

### User Story 6 - Push external data into the table (Priority: P2)

An external process (script, form, another tool) can append rows to a document's table through a local HTTP endpoint receiving JSON records keyed by column names. Unknown column names are rejected with a clear list so no ghost columns are created silently.

**Why this priority**: Enables collection workflows outside the app; valuable integration surface but not required for the core manual flow.

**Independent Test**: Can be tested by sending a JSON payload of two records to a document's table endpoint and verifying the grid gains exactly two rows; then sending a bad payload and verifying rejection naming the unknown column.

**Acceptance Scenarios**:

1. **Given** a table with columns "Name" and "Email", **When** a client posts two well-formed records, **Then** the table gains two rows and the response confirms the count added.
2. **Given** the same table, **When** a record includes unknown column "Phone", **Then** the request is rejected entirely with a response naming "Phone" as unknown and no partial rows are added.

---

### User Story 7 - Start from a document structure preset (Priority: P3)

When creating a document the user picks a structure: Letter, Official Letter, or Blank. Letter and Official Letter prefill a conventional skeleton (header area, date, recipient block, subject line, body, signature) that the user then edits freely; Blank starts empty.

**Why this priority**: Nice accelerator for the target use case (contracts/official correspondence) but users can build templates manually without it.

**Independent Test**: Can be tested by creating one document of each type and verifying the skeletons differ accordingly and remain fully editable.

**Acceptance Scenarios**:

1. **Given** creation dialog, **When** user chooses "Official Letter", **Then** the new document contains the official-letter skeleton sections ready to edit.
2. **Given** a prefilled skeleton, **When** the user deletes or rewrites any part of it, **Then** the system imposes no restriction beyond normal editing.

---

### User Story 8 - Control document-wide appearance (Priority: P3)

A Styles tab per document lets the user set page size and margins, enable a header/footer with an uploaded logo and page numbering, choose the body font, body alignment (justified by default), and heading size scale. These settings drive both the live editing preview and the final PDF so they always match.

**Why this priority**: Professional output quality depends on consistent styling; separable from core mechanics.

**Independent Test**: Can be tested by changing base font and enabling logo + page numbers, then comparing the editor preview against an exported PDF for consistency.

**Acceptance Scenarios**:

1. **Given** default styles, **When** the user sets A4, margins, justified body text, and a custom heading scale, **Then** the editor preview reflects those choices immediately.
2. **Given** those styles, **When** a PDF is exported, **Then** the PDF exhibits the same page geometry, alignment, fonts, logo header, and page numbers.
3. **Given** a document without a logo uploaded, **When** styles have header enabled, **Then** the header renders gracefully without a logo rather than failing.

---

### User Story 9 - Check writing quality (Priority: P3)

While writing, the user gets offline spelling checks for Spanish and English — misspelled words are visibly marked in the text and collectable in a side list. Optionally, the user can invoke an AI-powered review that returns grammar/style observations with concrete suggestions, accepting or rejecting each individually. The AI feature works with the user's own API credentials configured once in application settings; without credentials, everything else keeps working.

**Why this priority**: Quality aid layered on top of a working product; must never be a dependency of core flows.

**Independent Test**: Spell checking can be tested with a document containing deliberate misspellings in both languages; AI review can be tested with a mock/local OpenAI-compatible credential.

**Acceptance Scenarios**:

1. **Given** a document in Spanish containing misspelled words, **When** checking is active, **Then** misspelled words are visually marked and listed with suggested corrections applicable per word.
2. **Given** a document mixing Spanish sentences and English sentences, **When** checking runs, **Then** words are evaluated according to their language.
3. **Given** valid AI credentials configured, **When** the user invokes AI review on a paragraph with a grammatical issue, **Then** observations with suggested rewrites appear and the user can accept one, updating the text, or reject it leaving text unchanged.
4. **Given** no AI credentials configured, **When** the user invokes AI review, **Then** a clear setup prompt appears and no other functionality is affected.
5. **Given** invalid or unreachable AI credentials, **When** review is invoked, **Then** a clear error appears and the document remains untouched.

### Edge Cases

- What happens when two imported columns share the same header name? The second is auto-renamed with a numeric suffix and the user is informed.
- How does the system handle a very large table (thousands of rows)? Batch generation remains functional and reports progress; the interface stays usable while generating.
- What happens when a document name contains characters invalid in filenames? Exported files use a sanitized version of the name.
- What happens when the user deletes a row that has previous failure log entries? Logs keep their historical text (they store the label, not a live link).
- What happens when generation is interrupted mid-batch (app closed)? Completed files up to that point remain valid; the interrupted run may be retried and already-generated rows regenerate cleanly.
- What happens when the linked table has zero rows? Generation buttons indicate there is nothing to generate instead of producing empty output.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let users create, rename, delete, and search documents by name from a persistent sidebar.
- **FR-002**: System MUST provide a rich-text editor supporting headings, bold/italic, lists, tables, and text alignment within documents.
- **FR-003**: System MUST present the linked table's columns as insertable fields, insertable by dragging into the editor or by typing the double-brace notation.
- **FR-004**: System MUST bind inserted fields to their column by stable identity so column renames propagate to every occurrence.
- **FR-005**: System MUST visually distinguish unresolved fields (column deleted or not-yet-existing) inside the editor.
- **FR-006**: System MUST allow importing CSV and XLSX files into a document's table using the first row as column headers.
- **FR-007**: System MUST provide an editable grid to add/remove/edit rows and columns with automatic persistence.
- **FR-008**: System MUST assign each row a stable visible sequence number shown in the grid and usable in exports and logs; numbers are permanent — never reused after row deletion, with new rows taking the next never-used number (visible gaps allowed).
- **FR-009**: System MUST replace every resolved field with the corresponding row value when generating output, preserving surrounding formatting.
- **FR-010**: System MUST escape substituted values so their content can never alter the document's own structure.
- **FR-011**: System MUST generate one PDF per processed row, individually selectable or in batch as a bundled download, with filenames composed of document name and the row's visible sequence number.
- **FR-012**: System MUST NOT generate a PDF for a row whose output would be incomplete — whether due to an empty value in a used column (skip recorded per row) or an unresolved field in the template (recorded once per run); complete outputs MUST always proceed without any blocking dialog.
- **FR-013**: System MUST record unresolved-field conditions once per generation run rather than once per row, while empty-cell skips are recorded individually with their row identifier.
- **FR-014**: System MUST show per-document dashboards covering: table linkage and size, field resolution status, unreferenced columns, rows incomplete for used fields, generation readiness, and the failure log with go-to-row and clear actions.
- **FR-015**: System MUST expose a local HTTP endpoint to append rows to a specific document's table from external tools, rejecting payloads referencing unknown columns entirely (no partial writes).
- **FR-016**: System MUST offer document structure presets (Blank, Letter, Official Letter) that prefill editable skeletons.
- **FR-017**: System MUST provide a Styles tab controlling page size, margins, header/footer toggle, logo upload, page numbering, body font, body alignment, and heading scale, applied identically in editor preview and exported PDFs.
- **FR-018**: System MUST provide offline spelling checking for Spanish and English with in-text marking and per-word correction suggestions; each document has a check language selector (Spanish / English / Auto) where Auto marks a word only when it exists in neither dictionary.
- **FR-019**: System MUST offer optional AI-assisted writing review that returns observations with suggestions the user accepts or rejects individually, operating exclusively with user-supplied OpenAI-compatible credentials stored locally.
- **FR-020**: System MUST keep all platform interface text in English regardless of document language.
- **FR-021**: System MUST persist all user data locally across sessions without requiring any account or login.
- **FR-022**: System MUST prevent deletion-linked surprises: deleting a document also removes its linked table and failure history.

### Key Entities *(include if feature involves data)*

- **Document**: a template the user authors; has a unique name, chosen structure preset (Blank/Letter/Official Letter), rich-text content including field placeholders, and document-wide style settings.
- **Dataset**: the spreadsheet linked one-to-one to a document; owns ordered columns and rows.
- **Column**: a named field inside a dataset; stable identity independent of its display name.
- **Row**: one iteration; carries a stable visible sequence number and one value per column (possibly empty).
- **Export Log Entry**: record of a failed/skipped generation: affected row reference (label snapshot), machine-readable reason, human-readable detail, timestamp.
- **App Settings**: global local configuration, notably AI provider credentials (base URL and secret key).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user goes from empty app to having exported their first correct PDF in under 15 minutes without external help.
- **SC-002**: Substituting fields in a 100-row batch completes in under 5 minutes on an average laptop, with skipped rows reported and never mixed into successful outputs.
- **SC-003**: Every skipped row in any run has exactly one explanatory entry visible in the dashboard, traceable to the exact row and cause, with zero silent failures.
- **SC-004**: After a column rename, 100% of existing placeholders continue resolving correctly without user repair.
- **SC-005**: An externally pushed batch of 50 valid records appears in the grid completely and immediately; a payload with any unknown column adds zero rows.
- **SC-006**: Style changes made in the Styles tab are reflected identically in the next exported PDF with no manual adjustment.
- **SC-007**: Deliberate misspellings in Spanish and English test documents are detected with correct suggestions in at least 9 out of 10 cases using only offline checking.

## Assumptions

- Single-user, single-machine usage: no authentication, no concurrent multi-user editing, no cloud deployment for this version.
- One dataset links to exactly one document (no sharing tables between documents in v1).
- Imported spreadsheets treat the first row as headers; merged cells and formulas are flattened to their displayed value by the import process best-effort.
- Duplicated column names on import are auto-suffixed (e.g., "Date (2)") with user notification rather than rejected.
- PDF fidelity goal is faithful reproduction of the editor's rendering; exotic print features (bleed, CMYK, watermarks) are out of scope.
- AI review is opt-in and disabled-by-default; the app functions fully without it. Credentials are entered manually by the user and never synced or transmitted anywhere except the configured AI endpoint.
- Platform interface ships in English only for this version; document content may be Spanish or English freely.
