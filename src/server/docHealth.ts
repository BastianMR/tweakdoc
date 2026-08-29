import { collectUsedColumnIds } from '@/components/editor/variableField'

export interface SheetLike {
  columns: { id: string; name: string }[]
  rows: { id: string; num: number; values: Record<string, string> }[]
}

export interface DocumentHealth {
  datasetLinked: boolean
  rowsCount: number
  columnsCount: number
  fieldsUsedCount: number
  resolvedCount: number
  unresolvedFields: string[]
  unusedColumns: string[]
  incompleteRows: { num: number; label: string; missingIn: string[] }[]
  readyRows: number
}

function labelFor(num: number, values: Record<string, string>, fallbackColId?: string): string {
  const firstMeaningful = Object.values(values).find((v) => v.trim() !== '')
  return firstMeaningful ?? (fallbackColId ? `Row ${num}` : `Row ${num}`)
}

export function computeDocumentHealth(contentHtml: string, sheet: SheetLike): DocumentHealth {
  const used = collectUsedColumnIds(contentHtml)
  const columnById = new Map(sheet.columns.map((c) => [c.id, c]))

  const unresolved = used
    .filter((u) => !columnById.has(u.id))
    .map((u) => u.name || u.id)
  const resolvedCount = used.length - unresolved.length

  const usedIds = new Set(used.map((u) => u.id))
  const unusedColumns = sheet.columns.filter((c) => !usedIds.has(c.id)).map((c) => c.name)

  const incompleteRows: DocumentHealth['incompleteRows'] = []
  const resolvable = used.filter((u) => columnById.has(u.id))
  for (const row of sheet.rows) {
    const missingIn = resolvable
      .filter((u) => (row.values[u.id] ?? '') === '')
      .map((u) => columnById.get(u.id)?.name ?? u.name)
    if (missingIn.length > 0) {
      incompleteRows.push({ num: row.num, label: labelFor(row.num, row.values), missingIn })
    }
  }

  const readyRows = sheet.rows.length - incompleteRows.length

  return {
    datasetLinked: sheet.columns.length > 0 || sheet.rows.length > 0,
    rowsCount: sheet.rows.length,
    columnsCount: sheet.columns.length,
    fieldsUsedCount: used.length,
    resolvedCount,
    unresolvedFields: [...new Set(unresolved)],
    unusedColumns,
    incompleteRows,
    readyRows,
  }
}
