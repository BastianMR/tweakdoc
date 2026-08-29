import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import * as XLSXNamespace from 'xlsx'

type XlsxModule = typeof XLSXNamespace
const XLSX: XlsxModule =
  'default' in XLSXNamespace ? ((XLSXNamespace as unknown as { default: XlsxModule }).default as XlsxModule) : XLSXNamespace

export function createSampleXlsx(): string {
  const rows = [
    { Client: 'Acme SA', Amount: 1200, Date: '2026-08-23' },
    { Client: 'Globex', Amount: 800, Date: null },
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const dir = mkdtempSync(path.join(tmpdir(), 'tweakdoc-'))
  const filePath = path.join(dir, 'sample.xlsx')
  XLSX.writeFile(wb, filePath)
  return filePath
}

export function createCorruptXlsx(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'tweakdoc-'))
  const filePath = path.join(dir, 'corrupt.xlsx')
  writeFileSync(filePath, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x00]))
  return filePath
}
