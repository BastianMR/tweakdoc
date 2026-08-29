# TweakDoc

Local web app that merges a Notion-style editor with a linked spreadsheet to batch-generate personalized PDF documents.

- Author templates with reusable `{{fields}}` (drag & drop or type the notation)
- Import CSV/XLSX or edit rows inline; each row is one document iteration
- Generate one PDF per row — single or batch ZIP — with a strict skip policy and export failure logs
- Optional AI writing review with your own OpenAI-compatible credentials (stored locally only)

## Installation

```bash
npm install
npm run db:push   # creates data/tweakdoc.db (SQLite, local)
```

## Usage

```bash
npm run dev       # http://localhost:3000
```

1. Click **+ New document** in the sidebar.
2. **Table** tab → import a CSV/XLSX (first row = headers) or add columns/rows manually.
3. **Document** tab → drag fields from the left panel into the text, or type `{{ColumnName}}`.
4. Select rows and click **Generate selected**, or use **Generate all** for a ZIP bundle.

Files are named `{DocumentName}_{RowNumber}.pdf`. Rows with an empty value in any used column are skipped and reported in the **Dashboard** tab.

## Data injection API

Push rows from external tools (scripts, forms, etc.) into a document's table:

```bash
curl -X POST http://localhost:3000/api/datasets/{datasetId}/rows \
  -H "Content-Type: application/json" \
  -d '{"rows":[{"Client":"Acme SA","Date":"2026-08-23"}]}'
# → {"added":1,"totalRows":12}
```

- Keys must match existing column names exactly. Any unknown column rejects the whole request with HTTP 422 and lists them — no partial writes:

```bash
curl -X POST ... -d '{"rows":[{"Phone":"555"}]}'
# → HTTP 422 {"error":"unknown_columns","unknownColumns":["Phone"]}
```

Find `datasetId` in the network tab of your browser DevTools while the Table tab is open (`GET /api/datasets/{id}`).

## Development

```bash
git clone https://github.com/BastianMR/tweakdoc.git
cd tweakdoc
npm install
npm run db:push
npm test        # Vitest
npm run lint    # ESLint
npm run typecheck
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License
