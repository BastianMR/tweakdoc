'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import ImportDialog from './importDialog'
import ExportActions from './exportActions'
import SheetGrid from './sheetGrid'
import { useDataset } from './useDataset'
import { t } from '@/lib/i18n/en'
import type { Sheet } from '@/lib/tableOps'

export default function TableSection({
  datasetId,
  documentId,
}: {
  datasetId: string | null
  documentId: string
}) {
  const dataset = useDataset(datasetId)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [invalidCells, setInvalidCells] = useState<Set<string>>(new Set())

  const onSheet = useCallback(
    (next: Sheet, nextRowNumber?: number) => {
      if (nextRowNumber !== undefined) dataset.setNextRowNumber(nextRowNumber)
      dataset.saveSheet(next)
    },
    [dataset],
  )

  const onInvalidate = useCallback((cellKey: string, invalid: boolean) => {
    setInvalidCells((prev) => {
      const next = new Set(prev)
      if (invalid) next.add(cellKey)
      else next.delete(cellKey)
      return next
    })
  }, [])

  const onToggleSelect = useCallback((rowId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(rowId)
      else next.delete(rowId)
      return next
    })
  }, [])

  const selectedNums = dataset.sheet.rows
    .filter((r) => selectedIds.has(r.id))
    .map((r) => r.num)

  if (!datasetId) {
    return <p className="p-6 text-sm text-muted-foreground">No table linked to this document.</p>
  }

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImportDialog datasetId={datasetId} onImported={() => void dataset.reload()} />
          <span className="text-xs text-muted-foreground">
            {dataset.sheet.rows.length} rows · {dataset.sheet.columns.length} columns
            {selectedNums.length > 0 ? ` · ${selectedNums.length} selected` : ''}
          </span>
        </div>
        <ExportActions
          datasetId={datasetId}
          documentId={documentId}
          selectedNums={selectedNums}
          totalRows={dataset.sheet.rows.length}
          onExported={() => void dataset.reload()}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
        <SheetGrid
          sheet={dataset.sheet}
          nextRowNumber={dataset.nextRowNumber}
          invalidCells={invalidCells}
          selectedIds={selectedIds}
          onSheet={onSheet}
          onInvalidate={onInvalidate}
          onToggleSelect={onToggleSelect}
        />
        <button
          type="button"
          onClick={() => {
            const rows = [...dataset.sheet.rows]
            const values: Record<string, string> = {}
            for (const c of dataset.sheet.columns) values[c.id] = ''
            rows.push({ id: crypto.randomUUID(), num: dataset.nextRowNumber, values })
            onSheet({ columns: dataset.sheet.columns, rows }, dataset.nextRowNumber + 1)
            toast.success(t.grid.addRow)
          }}
          className="w-full border-t bg-muted/30 px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
        >
          + {t.grid.addRow}
        </button>
      </div>
    </div>
  )
}
