import type { ColumnType } from './formats'

export interface SheetColumn {
  id: string
  name: string
  type?: ColumnType
}

export interface SheetRow {
  id: string
  num: number
  values: Record<string, string>
}

export interface Sheet {
  columns: SheetColumn[]
  rows: SheetRow[]
}

export const MIN_ROWS = 3
export const MIN_COLUMNS = 3
export const GHOST_PREFIX = '__ghost_'
export const FILLER_PREFIX = '__fill_'

export function randomId(): string {
  return globalThis.crypto.randomUUID()
}

export function normalizeColumnTypes(sheet: Sheet): Sheet {
  return {
    ...sheet,
    columns: sheet.columns.map((c) => ({ type: 'text' as const, ...c })),
  }
}

function newId(prefix: string, index: number): string {
  return `${prefix}${index}`
}

export function planDisplay(sheet: Sheet): {
  ghostCount: number
  fillerCount: number
} {
  const ghostCount = Math.max(0, MIN_COLUMNS - sheet.columns.length)
  const fillerCount = Math.max(0, MIN_ROWS - sheet.rows.length)
  return {
    ghostCount,
    fillerCount,
  }
}

export function materializeRow(
  sheet: Sheet,
  nextRowNumber: number,
): { sheet: Sheet; nextRowNumber: number; rowId: string } {
  const rowId = randomId()
  const values: Record<string, string> = {}
  for (const c of sheet.columns) values[c.id] = ''
  return {
    sheet: {
      ...sheet,
      rows: [...sheet.rows, { id: rowId, num: nextRowNumber, values }],
    },
    nextRowNumber: nextRowNumber + 1,
    rowId,
  }
}

export function materializeColumn(
  sheet: Sheet,
  name: string,
  type: ColumnType,
  ghostIndex: number,
): { sheet: Sheet; columnId: string } {
  const col = { id: randomId(), name, type }
  const insertAt = sheet.columns.length + ghostIndex
  const columns = [...sheet.columns]
  columns.splice(Math.min(insertAt, columns.length), 0, col)
  const rows = sheet.rows.map((r) => ({ ...r, values: { ...r.values, [col.id]: '' } }))
  return { sheet: { ...sheet, columns, rows }, columnId: col.id }
}

export function insertRowAbove(sheet: Sheet, rowId: string, nextRowNumber: number) {
  return insertRowAtIndex(sheet, sheet.rows.findIndex((r) => r.id === rowId), nextRowNumber)
}

export function insertRowBelow(sheet: Sheet, rowId: string, nextRowNumber: number) {
  return insertRowAtIndex(sheet, sheet.rows.findIndex((r) => r.id === rowId) + 1, nextRowNumber)
}

function insertRowAtIndex(
  sheet: Sheet,
  index: number,
  nextRowNumber: number,
): { sheet: Sheet; nextRowNumber: number; rowId: string } {
  const rowId = randomId()
  const values: Record<string, string> = {}
  for (const c of sheet.columns) values[c.id] = ''
  const rows = [...sheet.rows]
  rows.splice(Math.max(0, index), 0, { id: rowId, num: nextRowNumber, values })
  return { sheet: { ...sheet, rows }, nextRowNumber: nextRowNumber + 1, rowId }
}

export function duplicateRow(sheet: Sheet, rowId: string, nextRowNumber: number) {
  const index = sheet.rows.findIndex((r) => r.id === rowId)
  if (index === -1) return { sheet, nextRowNumber, rowId: null }
  const source = sheet.rows[index]
  const copy: SheetRow = {
    id: randomId(),
    num: nextRowNumber,
    values: { ...source.values },
  }
  const rows = [...sheet.rows]
  rows.splice(index + 1, 0, copy)
  return { sheet: { ...sheet, rows }, nextRowNumber: nextRowNumber + 1, rowId: copy.id }
}

export function clearRowValues(sheet: Sheet, rowId: string): Sheet {
  return {
    ...sheet,
    rows: sheet.rows.map((r) =>
      r.id === rowId
        ? { ...r, values: Object.fromEntries(Object.keys(r.values).map((k) => [k, ''])) }
        : r,
    ),
  }
}

export function deleteRow(sheet: Sheet, rowId: string): Sheet {
  return { ...sheet, rows: sheet.rows.filter((r) => r.id !== rowId) }
}

function columnIndex(sheet: Sheet, columnId: string): number {
  return sheet.columns.findIndex((c) => c.id === columnId)
}

export function insertColumnAt(
  sheet: Sheet,
  columnId: string,
  offset: -1 | 1,
): { sheet: Sheet; columnId: string } {
  const idx = columnIndex(sheet, columnId)
  const col = { id: randomId(), name: `Untitled ${sheet.columns.length + 1}`, type: 'text' as const }
  const columns = [...sheet.columns]
  columns.splice(Math.max(0, idx + (offset === 1 ? 1 : 0)), 0, col)
  const rows = sheet.rows.map((r) => ({ ...r, values: { ...r.values, [col.id]: '' } }))
  return { sheet: { ...sheet, columns, rows }, columnId: col.id }
}

export function duplicateColumn(sheet: Sheet, columnId: string): { sheet: Sheet; columnId: string } {
  const idx = columnIndex(sheet, columnId)
  if (idx === -1) return { sheet, columnId }
  const source = sheet.columns[idx]
  const col = { ...source, id: randomId(), name: `${source.name} copy` }
  const columns = [...sheet.columns]
  columns.splice(idx + 1, 0, col)
  const rows = sheet.rows.map((r) => ({
    ...r,
    values: { ...r.values, [col.id]: r.values[source.id] ?? '' },
  }))
  return { sheet: { ...sheet, columns, rows }, columnId: col.id }
}

export function renameColumn(sheet: Sheet, columnId: string, name: string): Sheet {
  return {
    ...sheet,
    columns: sheet.columns.map((c) => (c.id === columnId ? { ...c, name } : c)),
  }
}

export function setColumnType(sheet: Sheet, columnId: string, type: ColumnType): Sheet {
  return {
    ...sheet,
    columns: sheet.columns.map((c) => (c.id === columnId ? { ...c, type } : c)),
  }
}

export function clearColumnValues(sheet: Sheet, columnId: string): Sheet {
  return {
    ...sheet,
    rows: sheet.rows.map((r) => ({ ...r, values: { ...r.values, [columnId]: '' } })),
  }
}

export function deleteColumn(sheet: Sheet, columnId: string): Sheet {
  return {
    columns: sheet.columns.filter((c) => c.id !== columnId),
    rows: sheet.rows.map((r) => {
      const values = { ...r.values }
      delete values[columnId]
      return { ...r, values }
    }),
  }
}

export function sanitizeValue(
  value: string,
  type: ColumnType | undefined,
): { value: string; invalid: boolean } {
  if (type === 'number') {
    const v = value.trim().replace(',', '.')
    if (v === '') return { value: '', invalid: false }
    if (!/^-?\d+(\.\d+)?$/.test(v)) return { value: '', invalid: true }
    return { value: v, invalid: false }
  }
  if (type === 'date') {
    if (value === '') return { value: '', invalid: false }
    return { value: value, invalid: !ISO_DATE_RE.test(value) }
  }
  return { value, invalid: false }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isFillerId(id: string): boolean {
  return id.startsWith(FILLER_PREFIX)
}

export function isGhostId(id: string): boolean {
  return id.startsWith(GHOST_PREFIX)
}

export { newId as makeLocalId }
