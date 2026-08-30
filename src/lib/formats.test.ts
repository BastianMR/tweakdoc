import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSpreadsheet } from './formats'
import { createCorruptXlsx, createSampleXlsx } from '../../tests/fixtures/xlsxFactory'

const csvPath = path.join(__dirname, '../../tests/fixtures/sample.csv')

describe('parseSpreadsheet', () => {
  it('parses CSV with first row as headers and stable ids', () => {
    const res = parseSpreadsheet(readFileSync(csvPath))
    expect(res.columns.map((c) => c.name)).toEqual(['Client', 'Amount', 'Date'])
    expect(new Set(res.columns.map((c) => c.id)).size).toBe(3)
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0].num).toBe(1)
    expect(res.rows[1].num).toBe(2)
    const clientCol = res.columns[0]
    expect(res.rows[0].values[clientCol.id]).toBe('Acme SA')
  })

  it('auto-suffixes duplicated headers with (2) and reports them', () => {
    const csv = Buffer.from('A,A\n1,2\n')
    const res = parseSpreadsheet(csv)
    expect(res.columns.map((c) => c.name)).toEqual(['A', 'A (2)'])
    expect(res.renamedColumns).toEqual(['A (2)'])
  })

  it('parses a real xlsx file', () => {
    const res = parseSpreadsheet(readFileSync(createSampleXlsx()))
    expect(res.columns.map((c) => c.name)).toEqual(['Client', 'Amount', 'Date'])
    expect(res.rows).toHaveLength(2)
  })

  it('rejects unreadable xlsx as a whole', () => {
    expect(() => parseSpreadsheet(readFileSync(createCorruptXlsx()))).toThrow()
  })
})

describe('detectColumnType + typed import', () => {
  it('infers number and date columns from CSV content', () => {
    const csv = Buffer.from('Name,Amount,When\nAcme,1200,2026-08-23\nGlobex,800,2026-09-01\n')
    const res = parseSpreadsheet(csv)
    expect(res.columns.map((c) => c.type)).toEqual(['text', 'number', 'date'])
  })

  it('defaults to text when mixed', () => {
    const csv = Buffer.from('V\nabc\n12\n')
    const res = parseSpreadsheet(csv)
    expect(res.columns[0].type).toBe('text')
  })
})