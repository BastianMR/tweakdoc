export type SpellLangState = SpellLang
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createSpellChecker, type SpellLang, type SpellingIssue } from '@/lib/spellcheck'
import { t } from '@/lib/i18n/en'

const browserProvider = {
  async get(lang: 'es' | 'en') {
    const file = lang === 'es' ? 'es_ES' : 'en_US'
    const [aff, dic] = await Promise.all([
      fetch(`/dictionaries/${file}.aff`).then((r) => r.text()),
      fetch(`/dictionaries/${file}.dic`).then((r) => r.text()),
    ])
    return { aff, dic }
  },
}

export function useSpellcheck(editor: Editor | null, lang: SpellLang) {
  const [issues, setIssues] = useState<SpellingIssue[]>([])
  const checkerRef = useRef<Awaited<ReturnType<typeof createSpellChecker>> | null>(null)

  useEffect(() => {
    let cancelled = false
    void createSpellChecker(browserProvider).then((c) => {
      if (!cancelled) checkerRef.current = c
    })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!editor || !checkerRef.current) return
    const text = editor.getText()
    const found = await checkerRef.current.check(text, lang)
    setIssues(found)

    const wordSet = new Set(found.map((i) => i.word))
    highlightInDom(editor.view.dom as HTMLElement, wordSet)
  }, [editor, lang])

  useEffect(() => {
    if (!editor) return
    const handler = () => {
      window.clearTimeout((handler as unknown as { t?: number }).t)
      ;(handler as unknown as { t?: number }).t = window.setTimeout(() => void refresh(), 800)
    }
    editor.on('update', handler)
    void refresh()
    return () => {
      editor.off('update', handler)
      window.clearTimeout((handler as unknown as { t?: number }).t)
    }
  }, [editor, refresh])

  return { issues, refresh }
}

function highlightInDom(dom: HTMLElement, words: Set<string>) {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return
  const ranges: Range[] = []
  const walker = document.createTreeWalker(dom, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode() as Text | null
  while (current) {
    const text = current.textContent ?? ''
    const re = /[A-Za-zÃÃ‰ÃÃ“ÃšÃ‘Ã¡Ã©Ã­Ã³ÃºÃ±Ã¼Ãœ]+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      if (words.has(m[0])) {
        const range = new Range()
        range.setStart(current, m.index)
        range.setEnd(current, m.index + m[0].length)
        ranges.push(range)
      }
    }
    current = walker.nextNode() as Text | null
  }
  const highlight = new (Highlight as unknown as new (...r: Range[]) => object)(...ranges)
  ;(CSS as unknown as { highlights: Map<string, unknown> }).highlights.set(
    'tweakdoc-spell',
    highlight,
  )
}

export function SpellToolbar({
  lang,
  onLangChange,
  issueCount,
  children,
}: {
  lang: SpellLang
  onLangChange: (l: SpellLang) => void
  issueCount: number
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1">
      <Select value={lang} onValueChange={(v) => onLangChange(v as SpellLang)}>
        <SelectTrigger className="h-7 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">{t.checks.langAuto}</SelectItem>
          <SelectItem value="es">{t.checks.langEs}</SelectItem>
          <SelectItem value="en">{t.checks.langEn}</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">
        {issueCount > 0 ? `${issueCount} ${t.checks.title.toLowerCase()} issues` : t.checks.noIssues}
      </span>
      <span className="ml-auto flex items-center gap-2">{children}</span>
    </div>
  )
}

export function ChecksList({
  issues,
  onApply,
}: {
  issues: SpellingIssue[]
  onApply: (original: string, suggestion: string) => void
}) {
  if (issues.length === 0) {
    return <p className="p-3 text-xs text-muted-foreground">{t.checks.noIssues}</p>
  }
  return (
    <ul className="divide-y overflow-y-auto p-1">
      {issues.slice(0, 50).map((issue) => (
        <li key={`${issue.word}-${issue.offset}`} className="px-2 py-2 text-xs">
          <div className="font-medium">{issue.word}</div>
          {issue.suggestions.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {issue.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onApply(issue.word, s)}
                  className="rounded border px-1.5 py-0.5 hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-muted-foreground">No suggestions</div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function replaceEverywhere(editor: Editor, original: string, replacement: string): boolean {
  const full = editor.state.doc.textBetween(0, editor.state.doc.content.size, ' ', ' ')
  if (!full.includes(original)) return false
  let replaced = false
  let from = 0
  let guard = 0
  while (guard++ < 200) {
    const haystack = editor.state.doc.textBetween(from, editor.state.doc.content.size, '\u0000', '\u0000')
    const idx = haystack.indexOf(original)
    if (idx === -1) break
    const absFrom = from + idx
    const absTo = absFrom + original.length
    const ok = editor.chain().focus().insertContentAt({ from: absFrom, to: absTo }, replacement).run()
    if (!ok) break
    replaced = true
    from = absFrom + replacement.length
  }
  return replaced
}

