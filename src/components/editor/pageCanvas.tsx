'use client'

import { useEffect, useRef, useState } from 'react'
import { EditorContent, type Editor } from '@tiptap/react'
import type { StyleSettings } from '@/lib/styleTokens'

const MM_TO_PX = 96 / 25.4

const PAGE_SIZE_MM: Record<'A4' | 'Letter', { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
}

export default function PageCanvas({
  editor,
  settings,
}: {
  editor: Editor
  settings: StyleSettings
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [breaks, setBreaks] = useState<number[]>([])

  const size = PAGE_SIZE_MM[settings.page.size]
  const sheetWidthPx = Math.round(size.w * MM_TO_PX)
  const sheetHeightPx = size.h * MM_TO_PX
  const marginPx = {
    top: settings.page.marginMm.top * MM_TO_PX,
    right: settings.page.marginMm.right * MM_TO_PX,
    bottom: settings.page.marginMm.bottom * MM_TO_PX,
    left: settings.page.marginMm.left * MM_TO_PX,
  }
  const usableHeightPx = sheetHeightPx - marginPx.top - marginPx.bottom

  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    let raf = 0
    function measure() {
      raf = 0
      const doc = container?.querySelector('.variable-doc') as HTMLElement | null
      if (!doc) return

      const next: number[] = []
      let used = 0
      for (const child of Array.from(doc.children) as HTMLElement[]) {
        const h = child.offsetHeight
        if (h === 0) continue
        if (used > 0 && used + h > usableHeightPx) {
          next.push(child.offsetTop)
          used = h
        } else {
          used += h
        }
      }
      setBreaks((prev) =>
        prev.length === next.length && prev.every((v, i) => Math.abs(v - next[i]) < 2)
          ? prev
          : next,
      )
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }

    const ro = new ResizeObserver(schedule)
    ro.observe(container)
    const inner = container.querySelector('.variable-doc')
    if (inner) ro.observe(inner)
    const mo = new MutationObserver(schedule)
    if (inner) mo.observe(inner, { childList: true, subtree: true, characterData: true })
    measure()

    return () => {
      ro.disconnect()
      mo.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [usableHeightPx, settings])

  const pageCount = breaks.length + 1

  return (
    <div className="flex-1 overflow-auto bg-zinc-200/70 p-6">
      <div
        className="relative mx-auto bg-white shadow-lg ring-1 ring-black/10"
        style={{
          width: sheetWidthPx,
          minHeight: sheetHeightPx,
          paddingTop: marginPx.top,
          paddingRight: marginPx.right,
          paddingBottom: marginPx.bottom,
          paddingLeft: marginPx.left,
          boxSizing: 'border-box',
        }}
      >
        <div ref={contentRef} className="relative">
          <EditorContent editor={editor} />

          {breaks.map((y, i) => (
            <div
              key={`${y}-${i}`}
              className="pointer-events-none absolute left-0 right-0"
              style={{ top: y }}
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-zinc-300/90 px-1.5 py-0.5 text-[10px] text-zinc-600">
                  Page {i + 2}
                </span>
                <div className="h-0 flex-1 border-t-2 border-dashed border-blue-300" />
              </div>
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute"
          style={{
            top: marginPx.top,
            left: marginPx.left,
            right: marginPx.right,
            bottom: marginPx.bottom,
            borderLeft: '2px dashed rgb(147 197 253 / 0.5)',
            borderRight: '2px dashed rgb(147 197 253 / 0.5)',
          }}
        />

        {settings.header.enabled && settings.header.logoPath && (
          <div className="pointer-events-none absolute left-0 right-0 top-2 flex justify-end pr-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.header.logoPath} alt="" className="max-h-14 object-contain" />
          </div>
        )}

        <div className="pointer-events-none absolute -bottom-6 left-0 right-0 text-center text-[10px] text-zinc-500">
          {settings.page.size} · Page 1–{pageCount}
        </div>
      </div>
    </div>
  )
}
