'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const TYPE_LABEL: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
}
const COLUMN_TYPE_ORDER: ColumnType[] = ['text', 'number', 'date']
const NAV_COLUMNS_OFFSET = 3

interface EffectiveColumn {
  key: string
  name: string
  type: ColumnType
  ghostIndex: number | null
}

interface EffectiveRow {
  rowId: string
  num: number
  filler: boolean
  fillerIndex: number | null
  values: Record<string, string>
}

export interface SheetGridProps {
  sheet: Sheet
  nextRowNumber: number
  invalidCells: Set<string>
  selectedIds: Set<string>
  onSheet: (next: Sheet, nextRowNumber?: number) => void
  onInvalidate: (cellKey: string, invalid: boolean) => void
  onToggleSelect: (rowId: string, checked: boolean) => void
}

interface ActiveCell {
  rowIdx: number
  colIdx: number
}

export default function SheetGrid({
  sheet,
  nextRowNumber,
  invalidCells,
  selectedIds,
  onSheet,
  onInvalidate,
  onToggleSelect,
}: SheetGridProps) {
  const normalized = useMemo(() => normalizeColumnTypes(sheet), [sheet])
  const { ghostCount, fillerCount } = planDisplay(normalized)
  const containerRef = useRef<HTMLDivElement>(null)
  const editingRef = useRef<HTMLInputElement | null>(null)

  const columns = useMemo<EffectiveColumn[]>(() => {
    const ghosts: EffectiveColumn[] = []
    for (let g = 0; g < ghostCount; g++) {
      ghosts.push({
        key: `${GHOST_PREFIX}${g}`,
        name: `Untitled ${normalized.columns.length + g + 1}`,
        type: 'text',
        ghostIndex: g,
      })
    }
    return [
      ...ghosts,
      ...normalized.columns.map((c) => ({
        key: c.id,
        name: c.name,
        type: c.type ?? 'text',
        ghostIndex: null,
      })),
    ]
  }, [normalized, ghostCount])

  const rows = useMemo<EffectiveRow[]>(() => {
    const real: EffectiveRow[] = normalized.rows.map((r) => ({
      rowId: r.id,
      num: r.num,
      filler: false,
      fillerIndex: null,
      values: r.values,
    }))
    const fills: EffectiveRow[] = []
    for (let i = 0; i < fillerCount; i++) {
      const values: Record<string, string> = {}
      for (const c of columns) values[c.key] = ''
      fills.push({
        rowId: `__fill_${i}`,
        num: nextRowNumber + i,
        filler: true,
        fillerIndex: i,
        values,
      })
    }
    return [...real, ...fills]
  }, [normalized, fillerCount, columns, nextRowNumber])

  const [active, setActive] = useState<ActiveCell | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [renamingColKey, setRenamingColKey] = useState<string | null>(null)

  const focusContainer = useCallback(() => {
    containerRef.current?.focus({ preventScroll: false })
  }, [])

  useEffect(() => {
    if (!editing) focusContainer()
  }, [active, editing, focusContainer])

  const startEdit = useCallback(
    (initial?: string) => {
      if (!active) return
      const col = columns[active.colIdx]
      const row = rows[active.rowIdx]
      if (!col || !row) return
      setDraft(initial ?? row.values[col.key] ?? '')
      setEditing(true)
      requestAnimationFrame(() => editingRef.current?.select())
    },
    [active, columns, rows],
  )

  const commit = useCallback(
    (move: 'down' | 'right' | 'left' | null) => {
      if (!active) return
      const col = columns[active.colIdx]
      const row = rows[active.rowIdx]
      if (!col || !row) return

      const { value, invalid } = sanitizeValue(draft, col.type)
      const cellKey = `${row.rowId}:${col.key}`
      onInvalidate(cellKey, invalid)
      if (invalid) {
        setEditing(false)
        return
      }

      let working = normalized
      let finalRowId = row.rowId
      let finalColKey = col.key
      let nn = nextRowNumber

      if (row.filler) {
        for (let k = 0; k <= (row.fillerIndex ?? 0); k++) {
          const res = materializeRow(working, nn)
          working = res.sheet
          nn = res.nextRowNumber
          finalRowId = res.rowId
        }
      }

      if (col.ghostIndex !== null) {
        const res = materializeColumn(working, col.name, col.type, col.ghostIndex)
        working = res.sheet
        finalColKey = res.columnId
      }

      const next: Sheet = {
        ...working,
        rows: working.rows.map((r) =>
          r.id === finalRowId ? { ...r, values: { ...r.values, [finalColKey]: value } } : r,
        ),
      }
      onSheet(next, nn !== nextRowNumber ? nn : undefined)
      setEditing(false)

      if (move === 'down') {
        const nextIdx = Math.min(active.rowIdx + 1, rows.length - 1)
        setActive({ rowIdx: nextIdx, colIdx: active.colIdx })
      } else if (move === 'right') {
        setActive({ rowIdx: active.rowIdx, colIdx: Math.min(active.colIdx + 1, columns.length - 1) })
      } else if (move === 'left') {
        setActive({ rowIdx: active.rowIdx, colIdx: Math.max(active.colIdx - 1, 0) })
      }
    },
    [active, columns, rows, draft, normalized, nextRowNumber, onSheet, onInvalidate],
  )

  const clearActiveCell = useCallback(() => {
    if (!active) return
    const col = columns[active.colIdx]
    const row = rows[active.rowIdx]
    if (!col || !row || row.filler) return
    const next: Sheet = {
      ...normalized,
      rows: normalized.rows.map((r) =>
        r.id === row.rowId ? { ...r, values: { ...r.values, [col.key]: '' } } : r,
      ),
    }
    onSheet(next)
  }, [active, columns, rows, normalized, onSheet])

  function onKeyDownContainer(event: React.KeyboardEvent<HTMLDivElement>) {
    if (editing) return
    if (!active) {
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
        event.preventDefault()
        setActive({ rowIdx: 0, colIdx: 0 })
      }
      return
    }

    const maxRow = rows.length - 1
    const maxCol = columns.length - 1
    const move = (dr: number, dc: number) => {
      event.preventDefault()
      setActive({
        rowIdx: Math.min(maxRow, Math.max(0, active.rowIdx + dr)),
        colIdx: Math.min(maxCol, Math.max(0, active.colIdx + dc)),
      })
    }

    switch (event.key) {
      case 'ArrowDown': return move(1, 0)
      case 'ArrowUp': return move(-1, 0)
      case 'ArrowLeft': return move(0, -1)
      case 'ArrowRight': return move(0, 1)
      case 'Enter':
      case 'F2':
        event.preventDefault()
        startEdit()
        return
      case 'Tab':
        event.preventDefault()
        return move(0, event.shiftKey ? -1 : 1)
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        return clearActiveCell()
      default:
        break
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      setActive(active)
      setDraft(event.key)
      setEditing(true)
      requestAnimationFrame(() => {
        if (editingRef.current) editingRef.current.value = event.key
      })
    }
  }

  function onKeyDownEditor(event: React.KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation()
    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        commit('down')
        return
      case 'Tab':
        event.preventDefault()
        commit(event.shiftKey ? 'left' : 'right')
        return
      case 'Escape':
        event.preventDefault()
        setEditing(false)
        return
      default:
        break
    }
  }

  const startColResize = useCallback(
    (colKey: string, startX: number) => {
      const startWidth = widths[colKey] ?? 170
      function onMove(e: MouseEvent) {
        const w = Math.max(80, startWidth + e.clientX - startX)
        setWidths((prev) => ({ ...prev, [colKey]: w }))
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [widths],
  )

  const showRowMenuFor = (row: EffectiveRow) => !row.filler

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="sheetgrid-wrap min-h-0 flex-1 outline-none"
      onKeyDown={onKeyDownContainer}
    >
      <table className="sheetgrid" role="grid">
        <colgroup>
          <col style={{ width: widths.__handle ?? 44 }} />
          <col style={{ width: widths.__num ?? 52 }} />
          <col style={{ width: widths.__sel ?? 40 }} />
          {columns.map((c) => (
            <col key={c.key} style={{ width: widths[c.key] ?? 170 }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sg-cell sg-head" />
            <th className="sg-cell sg-head">#</th>
            <th className="sg-cell sg-head" />
            {columns.map((c) => (
              <th key={c.key} className="sg-cell sg-head">
                {renamingColKey === c.key ? (
                  <HeaderRenameInput
                    initial={c.name}
                    onCommit={(name) => {
                      setRenamingColKey(null)
                      if (name && name !== c.name) {
                        if (c.ghostIndex !== null) {
                          const res = materializeColumn(normalized, name, c.type, c.ghostIndex)
                          onSheet(res.sheet)
                        } else {
                          onSheet(renameColumn(normalized, c.key, name))
                        }
                      }
                    }}
                    onCancel={() => setRenamingColKey(null)}
                  />
                ) : (
                  <div
                    className="flex items-center justify-between gap-1 px-1"
                    onDoubleClick={() => setRenamingColKey(c.key)}
                  >
                    <span className={`truncate text-xs ${c.ghostIndex !== null ? 'italic text-muted-foreground/70' : 'font-medium'}`}>
                      {c.name}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground">▾</DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setRenamingColKey(c.key)}>Rename</DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Type · {TYPE_LABEL[c.type]}</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {COLUMN_TYPE_ORDER.map((tp) => (
                              <DropdownMenuItem
                                key={tp}
                                onClick={() => {
                                  if (c.ghostIndex !== null) {
                                    const res = materializeColumn(normalized, c.name, tp, c.ghostIndex)
                                    onSheet(res.sheet)
                                  } else {
                                    onSheet(setColumnType(normalized, c.key, tp))
                                  }
                                }}
                              >
                                {TYPE_LABEL[tp]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {c.ghostIndex === null && (
                          <>
                            <DropdownMenuItem onClick={() => { const r = insertColumnAt(normalized, c.key, -1); onSheet(r.sheet) }}>
                              Insert left
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const r = insertColumnAt(normalized, c.key, 1); onSheet(r.sheet) }}>
                              Insert right
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { const r = duplicateColumn(normalized, c.key); onSheet(r.sheet) }}>
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSheet(clearColumnValues(normalized, c.key))}>
                              Clear values
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => onSheet(deleteColumn(normalized, c.key))}>
                              Delete column
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                <span
                  className="sg-resize"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    startColResize(c.key, e.clientX)
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={row.rowId} className={row.filler ? 'sg-filler' : ''}>
              <td className="sg-cell sg-handle">
                {showRowMenuFor(row) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="sg-handle-btn" title="Row actions" onClick={(e) => e.stopPropagation()}>
                      ⋮⋮
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => { const r = insertRowAbove(normalized, row.rowId, nextRowNumber); onSheet(r.sheet, r.nextRowNumber) }}>
                        Insert above
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const r = insertRowBelow(normalized, row.rowId, nextRowNumber); onSheet(r.sheet, r.nextRowNumber) }}>
                        Insert below
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { const r = duplicateRow(normalized, row.rowId, nextRowNumber); onSheet(r.sheet, r.nextRowNumber) }}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSheet(clearRowValues(normalized, row.rowId))}>
                        Clear values
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          onSheet(deleteRow(normalized, row.rowId))
                          onToggleSelect(row.rowId, false)
                        }}
                      >
                        Delete row
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40">new</span>
                )}
              </td>
              <td className="sg-cell sg-num">{row.num}</td>
              <td className="sg-cell sg-sel">
                {!row.filler && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.rowId)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onToggleSelect(row.rowId, e.target.checked)}
                  />
                )}
              </td>
              {columns.map((col, cIdx) => {
                const isActive = active?.rowIdx === rIdx && active?.colIdx === cIdx
                const isEditing = isActive && editing
                const invalid = invalidCells.has(`${row.rowId}:${col.key}`)
                const raw = isGhostId(col.key) || isFillerId(row.rowId) ? '' : (row.values[col.key] ?? '')
                return (
                  <td
                    key={col.key}
                    role="gridcell"
                    className={`sg-cell ${isActive ? 'is-active' : ''} ${invalid ? 'is-invalid' : ''} ${
                      col.type === 'number' ? 'sg-number' : ''
                    } ${isGhostId(col.key) || row.filler ? 'sg-ghost' : ''}`}
                    onClick={() => {
                      if (active?.rowIdx === rIdx && active?.colIdx === cIdx && !editing) startEdit()
                      else {
                        setEditing(false)
                        setActive({ rowIdx: rIdx, colIdx: cIdx })
                      }
                    }}
                    onDoubleClick={() => {
                      setActive({ rowIdx: rIdx, colIdx: cIdx })
                      startEdit()
                    }}
                  >
                    {isEditing ? (
                      col.type === 'date' ? (
                        <input
                          ref={editingRef}
                          autoFocus
                          type="date"
                          value={draft}
                          onKeyDown={onKeyDownEditor}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commit(null)}
                          className="sg-input"
                        />
                      ) : (
                        <input
                          ref={editingRef}
                          autoFocus
                          type="text"
                          inputMode={col.type === 'number' ? 'decimal' : undefined}
                          value={draft}
                          onKeyDown={onKeyDownEditor}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commit(null)}
                          className="sg-input"
                        />
                      )
                    ) : (
                      <span className="sg-value">{raw}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  function HeaderRenameInput({
    initial,
    onCommit,
    onCancel,
  }: {
    initial: string
    onCommit: (name: string) => void
    onCancel: () => void
  }) {
    const [v, setV] = useState(initial)
    return (
      <Input
        autoFocus
        value={v}
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit(v.trim())
          }
          if (e.key === 'Escape') onCancel()
        }}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onCommit(v.trim())}
        className="h-6 text-xs"
      />
    )
  }
}
