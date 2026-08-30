# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Editor autosave now flushes pending changes when switching tabs or closing the window, and re-entering the Docs tab restores the latest saved content instead of the page-load snapshot.
- Deleting the currently open document no longer lands on a 404 page; the app navigates home before the delete refresh.

### Added

- Multi-document library with persistent sidebar, live search, inline rename and cascading delete.
- Notion-style rich text editor (TipTap) with reusable `{{fields}}`: drag & drop from the fields panel or type the notation; chips bind by stable column id so renames propagate and deletions render as unresolved.
- Linked spreadsheet per document: CSV/XLSX import (duplicate headers auto-suffixed), editable grid with permanent visible row numbers and conflict-aware autosave.
- PDF generation via headless Chromium: single row or batch ZIP, filenames `{Document}_{RowNumber}.pdf`, document styles (page size/margins/header/logo/page numbers/typography) shared between editor preview and output.
- Strict export policy: rows with empty used cells are skipped and logged (`EMPTY_CELL`); unresolved template fields abort the run with a single `UNBOUND_FIELD` entry — never a blocking dialog.
- Document dashboard: dataset status, field resolution, unused columns, incomplete rows, generation readiness N/M and navigable export failure logs.
- Local data injection API: `POST /api/datasets/{id}/rows` with strict column validation (422 + zero partial writes on unknown columns).
- Offline spell checking for Spanish and English (Hunspell dictionaries) with Auto dual-language mode and in-text highlighting.
- Optional AI writing review using user-supplied OpenAI-compatible credentials (base URL + key stored locally in SQLite, never returned by the API).
- Document structure presets: Blank, Letter and Official Letter skeletons.

### Changed

- Platform UI ships in English; documents may be written in Spanish or English.

