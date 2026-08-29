'use client'

import type { DragEvent } from 'react'
import { t } from '@/lib/i18n/en'
import type { ColumnRef } from './variableField'

interface FieldsPanelProps {
  columns: ColumnRef[]
  onInsert: (col: ColumnRef) => void
}

export default function FieldsPanel({ columns, onInsert }: FieldsPanelProps) {
  function handleDragStart(e: DragEvent<HTMLLIElement>, col: ColumnRef) {
    e.dataTransfer.setData('text/x-tweakdoc-variable', JSON.stringify(col))
    e.dataTransfer.setData('text/plain', `{{${col.name}}}`)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r">
      <div className="border-b px-3 py-2">
        <p className="text-xs font-semibold">{t.editor.fieldsPanelTitle}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t.editor.fieldsPanelHint}</p>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {columns.length === 0 ? (
          <li className="px-2 py-4 text-center text-[11px] text-muted-foreground">
            Import data in the Table tab to create fields.
          </li>
        ) : (
          columns.map((col) => (
            <li
              key={col.id}
              draggable
              onDragStart={(e) => handleDragStart(e, col)}
              onClick={() => onInsert(col)}
              className="cursor-grab truncate rounded-md border border-dashed px-2 py-1 text-xs hover:bg-accent"
              title={col.name}
            >
              {col.name}
            </li>
          ))
        )}
      </ul>
    </aside>
  )
}
