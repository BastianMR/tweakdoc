'use client'

import { useEffect, useMemo, useState } from 'react'
import 'react-data-grid/lib/styles.css'
import DataGrid, { type Column, type RowsChangeData } from 'react-data-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ImportDialog from './importDialog'
import ExportActions from './exportActions'
import { useDataset, type SheetRow } from './useDataset'
import { t } from '@/lib/i18n/en'

interface GridRow {
  __id: string
  __num: number
  [colId: string]: string | number
}

export default function TableSection({
  datasetId,
  documentId,
}: {
  datasetId: string | null
  documentId: string
}) {
  const dataset = useDataset(datasetId)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newColName, setNewColName] = useState('')

  const columns = useMemo<Column<GridRow>[]>(() => {
    const num: Column<GridRow> = {
      key: '__num',
      name: t.grid.rowNumberColumn,
      width: 56,
      frozen: true,
      editable: false,
      cellClass: 'text-muted-foreground',
    }
    const dataCols = dataset.sheet.columns.map<Column<GridRow>>((c) => ({
      key: c.id,
      name: c.name,
      editable: true,
      width: 180,
    }))
    const select: Column<GridRow> = {
      key: '__sel',
      name: '',
      width: 44,
      renderCell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.__id)}
          onChange={(e) => {
            setSelectedIds((prev) => {
              const next = new Set(prev)
              if (e.target.checked) next.add(row.__id)
              else next.delete(row.__id)
              return next
            })
          }}
        />
      ),
    }
    return [num, select, ...dataCols]
  }, [dataset.sheet.columns, selectedIds])

  const gridRows = useMemo<GridRow[]>(
    () =>
      dataset.sheet.rows.map((r) => ({
        __id: r.id,
        __num: r.num,
        ...r.values,
      })),
    [dataset.sheet.rows],
  )

  function commitRows(updated: readonly GridRow[]) {
    const sheet = {
      columns: dataset.sheet.columns,
      rows: updated.map<SheetRow>((gr) => {
        const existing = dataset.sheet.rows.find((sr) => sr.id === gr.__id)
        const values: Record<string, string> = {}
        for (const c of dataset.sheet.columns) {
          values[c.id] = String(gr[c.id] ?? '')
        }
        return { id: gr.__id, num: existing?.num ?? gr.__num, values }
      }),
    }
    dataset.saveSheet(sheet)
  }

  function onRowsChange(rows: readonly GridRow[], data: RowsChangeData<GridRow>) {
    if (data.indexes.length === 1) {
      commitRows([...rows])
    } else {
      commitRows([...rows])
    }
  }

  function addRow() {
    const num = dataset.nextRowNumber
    const row: SheetRow = {
      id: crypto.randomUUID(),
      num,
      values: Object.fromEntries(dataset.sheet.columns.map((c) => [c.id, ''])),
    }
    dataset.setNextRowNumber(num + 1)
    commitRows([...gridRows, { __id: row.id, __num: row.num, ...row.values }])
  }

  function removeSelected() {
    if (selectedIds.size === 0) return
    const remaining = gridRows.filter((r) => !selectedIds.has(r.__id))
    setSelectedIds(new Set())
    commitRows(remaining)
  }

  function addColumn() {
    const name =
      newColName.trim() || `Column ${dataset.sheet.columns.length + 1}`
    const col = { id: crypto.randomUUID(), name }
    setNewColName('')
    dataset.saveSheet({
      columns: [...dataset.sheet.columns, col],
      rows: dataset.sheet.rows.map((r) => ({ ...r, values: { ...r.values, [col.id]: '' } })),
    })
  }

  function removeColumn(colId: string) {
    dataset.saveSheet({
      columns: dataset.sheet.columns.filter((c) => c.id !== colId),
      rows: dataset.sheet.rows.map((r) => {
        const values = { ...r.values }
        delete values[colId]
        return { ...r, values }
      }),
    })
  }

  useEffect(() => {
    setSelectedIds(new Set())
  }, [datasetId])

  useEffect(() => {
    function onFocusRow(e: Event) {
      const num = (e as CustomEvent<{ num: number }>).detail?.num
      if (typeof num !== 'number') return
      const row = dataset.sheet.rows.find((r) => r.num === num)
      if (row) setSelectedIds(new Set([row.id]))
    }
    window.addEventListener('tweakdoc:focus-row', onFocusRow)
    return () => window.removeEventListener('tweakdoc:focus-row', onFocusRow)
  }, [dataset.sheet.rows])

  if (!datasetId) {
    return <p className="p-6 text-sm text-muted-foreground">No table linked to this document.</p>
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ImportDialog datasetId={datasetId} onImported={() => void dataset.reload()} />
        <ExportActions
          datasetId={datasetId}
          documentId={documentId}
          selectedNums={dataset.sheet.rows
            .filter((r) => selectedIds.has(r.id))
            .map((r) => r.num)}
          totalRows={dataset.sheet.rows.length}
          onExported={() => void dataset.reload()}
        />
        <Button size="sm" variant="outline" onClick={addRow}>
          + {t.grid.addRow}
        </Button>
        <Input
          value={newColName}
          onChange={(e) => setNewColName(e.target.value)}
          placeholder="New column name"
          className="h-8 w-40"
        />
        <Button size="sm" variant="outline" onClick={addColumn}>
          + {t.grid.addColumn}
        </Button>
        <Button size="sm" variant="outline" onClick={removeSelected} disabled={selectedIds.size === 0}>
          âˆ’ Remove selected ({selectedIds.size})
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {dataset.sheet.columns.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[11px]"
          >
            {c.name}
            <button
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeColumn(c.id)}
              aria-label={`Remove ${c.name}`}
            >
              Ã—
            </button>
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-auto rounded-md border">
        <DataGrid
          columns={columns}
          rows={gridRows}
          rowKeyGetter={(r: GridRow) => r.__id}
          onRowsChange={onRowsChange}
          className="rdg-light fill-grid"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  )
}
