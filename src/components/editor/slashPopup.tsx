'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import type { SuggestionProps } from '@tiptap/suggestion'
import { setSlashBridge, type SlashItem } from './slashMenu'

interface PopupState {
  rect: { top: number; left: number }
  items: SlashItem[]
  query: string
}

export function useSlashPopup(editor: Editor | null) {
  const [state, setState] = useState<PopupState | null>(null)
  const propsRef = useRef<SuggestionProps | null>(null)
  const indexRef = useRef(0)

  const syncFromProps = useCallback(() => {
    const props = propsRef.current
    if (!props) return
    const rect = props.clientRect?.()
    if (!rect) return
    setState({
      rect: { top: (rect as DOMRect).top, left: (rect as DOMRect).left },
      items: props.items as SlashItem[],
      query: props.query,
    })
  }, [])

  useEffect(() => {
    if (!editor) return

    setSlashBridge({
      open: (props) => {
        propsRef.current = props
        indexRef.current = 0
        syncFromProps()
      },
      update: (props) => {
        propsRef.current = props
        indexRef.current = Math.min(indexRef.current, Math.max(0, props.items.length - 1))
        syncFromProps()
      },
      close: () => {
        propsRef.current = null
        setState(null)
      },
      keydown: (event: KeyboardEvent) => {
        const props = propsRef.current
        if (!props) return false
        const items = props.items as SlashItem[]
        if (event.key === 'ArrowDown') {
          indexRef.current = (indexRef.current + 1) % Math.max(1, items.length)
          syncFromProps()
          return true
        }
        if (event.key === 'ArrowUp') {
          indexRef.current = (indexRef.current - 1 + items.length) % Math.max(1, items.length)
          syncFromProps()
          return true
        }
        if (event.key === 'Enter') {
          const item = items[indexRef.current]
          if (item) props.command(item)
          return true
        }
        if (event.key === 'Escape') {
          propsRef.current = null
          setState(null)
          return true
        }
        return false
      },
    })

    return () => setSlashBridge(null)
  }, [editor, syncFromProps])

  const select = useCallback(
    (item: SlashItem) => {
      const props = propsRef.current
      if (props) props.command(item)
    },
    [],
  )

  return { state, indexRef, select }
}

export default function SlashPopup({
  state,
  indexRef,
  onSelect,
}: {
  state: PopupState | null
  indexRef: React.MutableRefObject<number>
  onSelect: (item: SlashItem) => void
}) {
  if (!state) return null

  const flipUp = state.rect.top > window.innerHeight - 320
  const left = Math.min(state.rect.left, window.innerWidth - 300)

  return (
    <div
      className="fixed z-50 max-h-72 w-72 overflow-y-auto rounded-lg border bg-popover p-1 shadow-xl"
      style={{ top: flipUp ? undefined : state.rect.top + 20, bottom: flipUp ? window.innerHeight - state.rect.top + 12 : undefined, left }}
    >
      {state.items.length === 0 ? (
        <p className="p-2 text-xs text-muted-foreground">No results</p>
      ) : (
        <ul>
          {state.items.map((item, idx) => (
            <li key={item.key}>
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                  idx === indexRef.current ? 'bg-accent' : 'hover:bg-accent/60'
                }`}
                onClick={() => onSelect(item)}
              >
                <span className="truncate">{item.label}</span>
                {item.hint && <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{item.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
