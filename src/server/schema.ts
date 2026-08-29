import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  formatType: text('format_type', { enum: ['blank', 'letter', 'official_letter'] })
    .notNull()
    .default('blank'),
  contentHtml: text('content_html').notNull().default(''),
  settingsJson: text('settings_json')
    .notNull()
    .default('{"page":{"size":"A4","marginMm":{"top":20,"right":20,"bottom":20,"left":20}},"header":{"enabled":false,"logoPath":null,"pageNumbers":false},"typography":{"fontFamily":"serif","bodySizePt":11,"bodyAlign":"justify","headingScalePt":{"h1":20,"h2":16,"h3":13}}}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const datasets = sqliteTable('datasets', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .unique()
    .references(() => documents.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sheetJson: text('sheet_json').notNull().default('{"columns":[],"rows":[]}'),
  nextRowNumber: integer('next_row_number').notNull().default(1),
})

export const exportLogs = sqliteTable('export_logs', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  rowId: text('row_id'),
  rowLabel: text('row_label').notNull().default(''),
  reasonCode: text('reason_code', { enum: ['EMPTY_CELL', 'UNBOUND_FIELD', 'RENDER_ERROR'] }).notNull(),
  detail: text('detail').notNull().default(''),
  createdAt: text('created_at').notNull(),
})

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
