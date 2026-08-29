export {}

process.env.TWEAKDOC_DB_PATH = ':memory:'

const { sqlite } = await import('../src/server/db')

sqlite.exec(`
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format_type TEXT NOT NULL DEFAULT 'blank',
  content_html TEXT NOT NULL DEFAULT '',
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sheet_json TEXT NOT NULL DEFAULT '{"columns":[],"rows":[]}',
  next_row_number INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS export_logs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  row_id TEXT,
  row_label TEXT NOT NULL DEFAULT '',
  reason_code TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`)
