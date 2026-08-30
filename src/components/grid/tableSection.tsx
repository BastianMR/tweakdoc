'use client'

import 'react-data-grid/lib/styles.css'
import DataGrid, { type Column, type RowsChangeData } from 'react-data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import ImportDialog from './importDialog'
import ExportActions from './exportActions'
import { useDataset } from './useDataset'
import { t } from '@/lib/i18n/en'
import type { ColumnType } from '@/lib/formats'
import {
  GHOST_PREFIX,
  clearColumnValues,
  clearRowValues,
  deleteColumn,
  deleteRow,
  duplicateColumn,
  duplicateRow,
  insertColumnAt,
  insertRowAbove,
  insertRowBelow,
  isFillerId,
  isGhostId,
  materializeColumn,
  materializeRow,
  normalizeColumnTypes,
  planDisplay,
  renameColumn,
  sanitizeValue,
  setColumnType,
  type Sheet,
} from '@/lib/tableOps'

interface GridRow {
  __id: string
  __num: number
  __filler: boolean
  [colKey: string]: string | number | boolean
}

const TYPE_LABEL: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
}

const COLUMN_TYPE_ORDER: ColumnType[] = ['text', 'number', 'date']

export default function TableSection({
  datasetId,
  documentId,
}: {
  datasetId: string | null
  documentId: string
}) {
  const dataset = useDataset(datasetId)
  const gridRef = useRef<HTMLDivElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [renamingColId, setRenamingColId] = useState<string | null>(null)
  const [invalidCells, setInvalidCells] = useState<Set<string>>(new Set())

  const sheet = useMemo(() => normalizeColumnTypes(dataset.sheet), [dataset.sheet])
  const { ghostCount, fillerCount } = planDisplay(sheet)

  const commitSheet = useCallback((next: Sheet) => dataset.saveSheet(next), [dataset])

  const columns = useMemo<Column<GridRow>[]>(() => {
    const handle: Column<GridRow> = {
      key: '__handle',
      name: '',
      width: 44,
      frozen: true,
      resizable: false,
      renderCell: ({ row }) =>
        row.__filler ? (
          <span className="block h-full w-full text-center text-[10px] text-muted-foreground/40">
            new
          </span>
        ) : (
          <RowMenu
            rowId={row.__id}
            sheet={sheet}
            nextRowNumber={dataset.nextRowNumber}
            onSheet={(next, nn) => {
              if (nn !== undefined) dataset.setNextRowNumber(nn)
              commitSheet(next)
            }}
            onDeleted={(rid) => setSelectedIds((prev) => { const n2 = new Set(prev); n2.delete(rid); return n2 })}
          />
        ),
    }
    const num: Column<GridRow> = {
      key: '__num',
      name: '#',
      width: 52,
      frozen: true,
      resizable: false,
      cellClass: 'text-muted-foreground',
    }
    const select: Column<GridRow> = {
      key: '__sel',
      name: '',
      width: 40,
      frozen: true,
      resizable: false,
      renderCell: ({ row }) =>
        row.__filler ? null : (
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

    const dataColumns: Column<GridRow>[] = []
    for (let g = 0; g < ghostCount; g++) {
      dataColumns.push(makeGhostColumn(g, sheet, commitSheet))
    }
    for (const c of sheet.columns) {
      dataColumns.push(
        makeDataColumn(c.id, c.name, c.type ?? 'text', renamingColId, setRenamingColId, sheet, commitSheet, invalidCells),
      )
    }
    return [handle, num, select, ...dataColumns]
  }, [sheet, ghostCount, renamingColId, commitSheet, selectedIds, dataset.nextRowNumber, invalidCells])

  const gridRows = useMemo<GridRow[]>(() => {
    const real: GridRow[] = sheet.rows.map((r) => ({
      __id: r.id,
      __num: r.num,
      __filler: false,
      ...r.values,
    }))
    const fills: GridRow[] = []
    for (let i = 0; i < fillerCount; i++) {
      fills.push({
        __id: `__fill_${i}`,
        __num: dataset.nextRowNumber + i,
        __filler: true,
        ...Object.fromEntries(sheet.columns.map((c) => [c.id, ''])),
      })
    }
    return [...real, ...fills]
  }, [sheet.rows, sheet.columns, fillerCount, dataset.nextRowNumber])

  const onRowsChange = useCallback(
    (rows: readonly GridRow[], data: RowsChangeData<GridRow>) => {
      const columnKey = data.column?.key as string | undefined
      const changedRowIdx = data.indexes?.[0]
      if (columnKey === undefined || changedRowIdx === undefined) return

      const changed = rows[changedRowIdx]
      const before = gridRows[changedRowIdx]
      const newValue = String(changed[columnKey] ?? '')
      const oldValue = String(before?.[columnKey] ?? '')
      if (newValue === oldValue) return

      const colDef = sheet.columns.find((c) => c.id === columnKey)
      const type: ColumnType = colDef?.type ?? 'text'
      const { value, invalid } = sanitizeValue(newValue, type)
      const cellKey = `${changed.__id}:${columnKey}`
      setInvalidCells((prev) => {
        const next = new Set(prev)
        if (invalid) next.add(cellKey)
        else next.delete(cellKey)
        return next
      })
      if (invalid) return

      let working = sheet
      let finalRowId = changed.__id
      let finalColKey = columnKey

      if (isFillerId(changed.__id)) {
        const res = materializeRow(working, dataset.nextRowNumber)
        working = res.sheet
        dataset.setNextRowNumber(res.nextRowNumber)
        finalRowId = res.rowId
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(changed.__id)
          return next
        })
      }

      if (isGhostId(columnKey)) {
        const ghostIndex = Number(columnKey.slice(GHOST_PREFIX.length))
        const res = materializeColumn(
          working,
          `Untitled ${working.columns.length + ghostIndex + 1}`,
          'text',
          ghostIndex,
        )
        working = res.sheet
        finalColKey = res.columnId
      }

      const nextRows = working.rows.map((r) =>
        r.id === finalRowId ? { ...r, values: { ...r.values, [finalColKey]: value } } : r,
      )
      commitSheet({ ...working, rows: nextRows })
    },
    [sheet, gridRows, dataset, commitSheet],
  )

  function onCellKeyDown(args: { mode: 'SELECT' | 'EDIT'; event: React.KeyboardEvent }) {
    if (args.event.key !== 'Enter') return
    const dispatchDown = () => {
      gridRef.current
        ?.querySelector('.rdg')
        ?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
        )
    }
    if (args.mode === 'EDIT') {
      setTimeout(dispatchDown, 10)
    } else {
      args.event.preventDefault()
      dispatchDown()
    }
  }

  function addRowAtEnd() {
    const { sheet: next, nextRowNumber: nn } = materializeRow(sheet, dataset.nextRowNumber)
    dataset.setNextRowNumber(nn)
    commitSheet(next)
  }

  const selectedNums = sheet.rows.filter((r) => selectedIds.has(r.id)).map((r) => r.num)

  if (!datasetId) {
    return <p className="p-6 text-sm text-muted-foreground">No table linked to this document.</p>
  }

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImportDialog datasetId={datasetId} onImported={() => void dataset.reload()} />
          <span className="text-xs text-muted-foreground">
            {sheet.rows.length} rows · {sheet.columns.length} columns
            {selectedNums.length > 0 ? ` · ${selectedNums.length} selected` : ''}
          </span>
        </div>
        <ExportActions
          datasetId={datasetId}
          documentId={documentId}
          selectedNums={selectedNums}
          totalRows={sheet.rows.length}
          onExported={() => void dataset.reload()}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border" ref={gridRef}>
        <div className="min-h-0 flex-1">
          <DataGrid
            columns={columns}
            rows={gridRows}
            rowKeyGetter={(r: GridRow) => r.__id}
            onRowsChange={onRowsChange}
            onCellKeyDown={onCellKeyDown as never}
            className="rdg-light fill-grid"
            style={{ height: '100%' }}
          />
        </div>
        <button
          type="button"
          onClick={addRowAtEnd}
          className="w-full border-t bg-muted/30 px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
        >
          + {t.grid.addRow}
        </button>
      </div>
    </div>
  )
}

function RowMenu({
  rowId,
  sheet,
  nextRowNumber,
  onSheet,
  onDeleted,
}: {
  rowId: string
  sheet: Sheet
  nextRowNumber: number
  onSheet: (sheet: Sheet, nextRowNumber?: number) => void
  onDeleted: (rowId: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-full w-full text-center text-[11px] text-muted-foreground hover:bg-accent" title="Row actions" onClick={(e) => e.stopPropagation()}>
        ⋮⋮
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem
          onClick={() => {
            const r = insertRowAbove(sheet, rowId, nextRowNumber)
            onSheet(r.sheet, r.nextRowNumber)
          }}
        >
          Insert above
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const r = insertRowBelow(sheet, rowId, nextRowNumber)
            onSheet(r.sheet, r.nextRowNumber)
          }}
        >
          Insert below
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const r = duplicateRow(sheet, rowId, nextRowNumber)
            onSheet(r.sheet, r.nextRowNumber)
          }}
        >
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSheet(clearRowValues(sheet, rowId))}>
          Clear values
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            onSheet(deleteRow(sheet, rowId))
            onDeleted(rowId)
          }}
        >
          Delete row
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ghostName(sheet: Sheet, ghostIndex: number): string {
  return `Untitled ${sheet.columns.length + ghostIndex + 1}`
}

function makeGhostColumn(
  ghostIndex: number,
  sheet: Sheet,
  commitSheet: (s: Sheet) => void,
): Column<GridRow> {
  const key = `${GHOST_PREFIX}${ghostIndex}`
  const name = ghostName(sheet, ghostIndex)
  return {
    key,
    name,
    width: 170,
    editable: true,
    cellClass: 'italic text-muted-foreground/50',
    renderHeaderCell: () => (
      <div className="flex items-center justify-between gap-1 px-1">
        <span className="truncate italic text-muted-foreground/70">{name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground">▾</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {COLUMN_TYPE_ORDER.map((tp) => (
                  <DropdownMenuItem
                    key={tp}
                    onClick={() => {
                      const res = materializeColumn(sheet, name, tp, ghostIndex)
                      commitSheet(res.sheet)
                    }}
                  >
                    {TYPE_LABEL[tp]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              onClick={() => {
                const typed = window.prompt('Column name', name)
                if (typed && typed.trim()) {
                  const res = materializeColumn(sheet, typed.trim(), 'text', ghostIndex)
                  commitSheet(res.sheet)
                }
              }}
            >
              Rename & create
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  }
}

function makeDataColumn(
  id: string,
  name: string,
  type: ColumnType,
  renamingColId: string | null,
  setRenamingColId: (id: string | null) => void,
  sheet: Sheet,
  commitSheet: (s: Sheet) => void,
  invalidCells: Set<string>,
): Column<GridRow> {
  return {
    key: id,
    name,
    width: 170,
    editable: true,
    renderHeaderCell: () => (
      <DataHeader
        columnId={id}
        name={name}
        type={type}
        renaming={renamingColId === id}
        setRenaming={setRenamingColId}
        sheet={sheet}
        commitSheet={commitSheet}
      />
    ),
    cellClass: (row: GridRow) =>
      `${type === 'number' ? 'text-right' : ''} ${
        invalidCells.has(`${row.__id}:${id}`) ? 'bg-red-50 dark:bg-red-950/40' : ''
      }`,
    renderEditCell: type === 'date' ? DateEditor : undefined,
  }
}

function DataHeader({
  columnId,
  name,
  type,
  renaming,
  setRenaming,
  sheet,
  commitSheet,
}: {
  columnId: string
  name: string
  type: ColumnType
  renaming: boolean
  setRenaming: (id: string | null) => void
  sheet: Sheet
  commitSheet: (s: Sheet) => void
}) {
  const [value, setValue] = useState(name)

  function commitName() {
    const trimmed = value.trim()
    setRenaming(null)
    if (trimmed && trimmed !== name) commitSheet(renameColumn(sheet, columnId, trimmed))
  }

  if (renaming) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitName()
          if (e.key === 'Escape') setRenaming(null)
        }}
        className="h-6 text-xs"
      />
    )
  }

  return (
    <div
      className="flex items-center justify-between gap-1 px-1"
      onDoubleClick={() => setRenaming(columnId)}
    >
      <span className="truncate font-medium">{name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground">▾</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => {
              setValue(name)
              setRenaming(columnId)
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Type · {TYPE_LABEL[type]}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {COLUMN_TYPE_ORDER.map((tp) => (
                <DropdownMenuItem key={tp} onClick={() => commitSheet(setColumnType(sheet, columnId, tp))}>
                  {TYPE_LABEL[tp]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onClick={() => {
              const r = insertColumnAt(sheet, columnId, -1)
              commitSheet(r.sheet)
            }}
          >
            Insert left
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const r = insertColumnAt(sheet, columnId, 1)
              commitSheet(r.sheet)
            }}
          >
            Insert right
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const r = duplicateColumn(sheet, columnId)
              commitSheet(r.sheet)
            }}
          >
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => commitSheet(clearColumnValues(sheet, columnId))}>
            Clear values
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => commitSheet(deleteColumn(sheet, columnId))}
          >
            Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function DateEditor({
  row,
  column,
  onRowChange,
}: {
  row: GridRow
  column: Column<GridRow>
  onRowChange: (row: GridRow, commit?: boolean) => void
}) {
  const value = String(row[column.key] ?? '')
  return (
    <input
      autoFocus
      type="date"
      value={value}
      onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value }, true)}
      className="h-full w-full bg-transparent px-1 text-xs outline-none"
    />
  )
}
