import { describe, expect, it } from 'vitest'
import {
  materializeRow,
  materializeColumn,
  insertRowBelow,
  insertRowAbove,
  duplicateRow,
  clearRowValues,
  deleteRow,
  insertColumnAt,
  duplicateColumn,
  renameColumn,
  setColumnType,
  clearColumnValues,
  deleteColumn,
  planDisplay,
  normalizeColumnTypes,
  sanitizeValue,
} from './tableOps'

const base = {
  columns: [
    { id: 'c1', name: 'Client', type: 'text' as const },
    { id: 'c2', name: 'Amount', type: 'number' as const },
  ],
  rows: [{ id: 'r1', num: 1, values: { c1: 'Acme', c2: '10' } }],
}

describe('tableOps', () => {
  it('planDisplay computes ghost/filler counts to reach 3x3', () => {
    expect(planDisplay(base)).toEqual({ ghostCount: 1, fillerCount: 2 })
    expect(planDisplay({ columns: [], rows: [] })).toEqual({ ghostCount: 3, fillerCount: 3 })
  })

  it('materializeRow appends with next number and bumps counter', () => {
    const { sheet, nextRowNumber, rowId } = materializeRow(base, 5)
    expect(sheet.rows).toHaveLength(2)
    expect(sheet.rows[1].num).toBe(5)
    expect(nextRowNumber).toBe(6)
    expect(sheet.rows[1].values.c1).toBe('')
    void rowId
  })

  it('materializeColumn inserts after existing ghosts position and fills empty values', () => {
    const { sheet, columnId } = materializeColumn(base, 'Untitled 3', 'text', 0)
    expect(sheet.columns).toHaveLength(3)
    expect(sheet.columns[2].id).toBe(columnId)
    expect(sheet.rows[0].values[columnId]).toBe('')
  })

  it('insertRowBelow places row after target with next number', () => {
    const { sheet, nextRowNumber } = insertRowBelow(base, 'r1', 4)
    expect(sheet.rows).toHaveLength(2)
    expect(sheet.rows[1].num).toBe(4)
    expect(nextRowNumber).toBe(5)
  })

  it('insertRowAbove places row before target', () => {
    const { sheet } = insertRowAbove(base, 'r1', 9)
    expect(sheet.rows[0].id).not.toBe('r1')
    expect(sheet.rows[1].id).toBe('r1')
  })

  it('duplicateRow copies values and renumbers', () => {
    const { sheet, nextRowNumber } = duplicateRow(base, 'r1', 7)
    expect(sheet.rows[1].values.c1).toBe('Acme')
    expect(sheet.rows[1].num).toBe(7)
    expect(nextRowNumber).toBe(8)
  })

  it('clearRowValues empties every column of the row', () => {
    const sheet = clearRowValues(base, 'r1')
    expect(sheet.rows[0].values).toEqual({ c1: '', c2: '' })
  })

  it('deleteRow removes only the target row', () => {
    const sheet = deleteRow(base, 'r1')
    expect(sheet.rows).toHaveLength(0)
  })

  it('insertColumnAt respects offset left/right', () => {
    const left = insertColumnAt(base, 'c2', -1)
    expect(left.sheet.columns[1].id).toBe(left.columnId)
    const right = insertColumnAt(base, 'c2', 1)
    expect(right.sheet.columns[2].id).toBe(right.columnId)
  })

  it('duplicateColumn copies name/values with copy suffix', () => {
    const { sheet, columnId } = duplicateColumn(base, 'c1')
    expect(sheet.columns[1].name).toBe('Client copy')
    expect(sheet.rows[0].values[columnId]).toBe('Acme')
  })

  it('rename/setType/clear/delete operate on the target column only', () => {
    expect(renameColumn(base, 'c1', 'Customer').columns[0].name).toBe('Customer')
    expect(setColumnType(base, 'c1', 'date').columns[0].type).toBe('date')
    expect(clearColumnValues(base, 'c1').rows[0].values.c1).toBe('')
    const gone = deleteColumn(base, 'c2')
    expect(gone.columns).toHaveLength(1)
    expect('c2' in gone.rows[0].values).toBe(false)
  })

  it('sanitizeValue enforces number and date shapes', () => {
    expect(sanitizeValue('1.200,5', 'number')).toEqual({ value: '', invalid: true })
    expect(sanitizeValue('1200.5', 'number')).toEqual({ value: '1200.5', invalid: false })
    expect(sanitizeValue('2026-08-23', 'date')).toEqual({ value: '2026-08-23', invalid: false })
    expect(sanitizeValue('23-08-2026', 'date').invalid).toBe(true)
    expect(sanitizeValue('plain', 'text')).toEqual({ value: 'plain', invalid: false })
  })

  it('normalizeColumnTypes backfills missing types', () => {
    const sheet = { columns: [{ id: 'x', name: 'X' }], rows: [] }
    expect(normalizeColumnTypes(sheet).columns[0].type).toBe('text')
  })
})
