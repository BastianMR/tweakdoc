import { read as xlsxRead, utils as xlsxUtils } from 'xlsx'

export type ColumnType = 'text' | 'number' | 'date'

export interface ParsedColumn {
  id: string
  name: string
  type: ColumnType
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function detectColumnType(values: string[]): ColumnType {
  const samples = values.map((v) => v.trim()).filter((v) => v !== '')
  if (samples.length === 0) return 'text'
  if (samples.every((v) => NUMBER_RE.test(v))) return 'number'
  if (samples.every((v) => ISO_DATE_RE.test(v))) return 'date'
  return 'text'
}

export interface ParsedRow {
  id: string
  num: number
  values: Record<string, string>
}

export interface ParseResult {
  columns: ParsedColumn[]
  rows: ParsedRow[]
  renamedColumns: string[]
}

export class SpreadsheetParseError extends Error {}

function randomId(): string {
  return globalThis.crypto.randomUUID()
}

function isBinaryWorkbook(buffer: Buffer): boolean {
  return (
    (buffer[0] === 0x50 && buffer[1] === 0x4b) ||
    (buffer[0] === 0xd0 && buffer[1] === 0xcf)
  )
}

function readWorkbook(buffer: Buffer) {
  try {
    if (isBinaryWorkbook(buffer)) {
      const wb = xlsxRead(buffer, { type: 'buffer' })
      return wb.Sheets[wb.SheetNames[0]]
    }
    const text = buffer.toString('utf8')
    const wb = xlsxRead(text, { type: 'string', raw: true })
    return wb.Sheets[wb.SheetNames[0]]
  } catch {
    throw new SpreadsheetParseError('unreadable_file')
  }
}

export function parseSpreadsheet(buffer: Buffer): ParseResult {
  const sheet = readWorkbook(buffer)
  if (!sheet) {
    throw new SpreadsheetParseError('empty_workbook')
  }

  const matrix = xlsxUtils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  })

  if (matrix.length === 0) {
    throw new SpreadsheetParseError('empty_sheet')
  }

  const headerRow = matrix[0].map((h) => String(h ?? '').trim())
  const used = new Set<string>()
  const renamedColumns: string[] = []

  const columns: ParsedColumn[] = headerRow.map((rawName) => {
    let name = rawName || 'Column'
    while (used.has(name)) {
      const m = name.match(/^(.*) \((\d+)\)$/)
      const n = m ? Number(m[2]) + 1 : 2
      name = `${m ? m[1] : name} (${n})`
    }
    used.add(name)
    if (name !== rawName) {
      renamedColumns.push(name)
    }
    return { id: randomId(), name, type: 'text' as const }
  })

  const rows: ParsedRow[] = matrix.slice(1).map((cells, idx) => {
    const values: Record<string, string> = {}
    columns.forEach((col, colIdx) => {
      values[col.id] = String(cells[colIdx] ?? '')
    })
    return { id: randomId(), num: idx + 1, values }
  })

  const typedColumns = columns.map((col, colIdx) => ({
    ...col,
    type: detectColumnType(rows.map((r) => r.values[col.id])),
  }))

  return { columns: typedColumns, rows, renamedColumns }
}
