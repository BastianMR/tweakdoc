'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import PageCanvas from './pageCanvas'
import FieldsPanel from './fieldsPanel'
import {
  SpellToolbar,
  ChecksList,
  useSpellcheck,
  replaceEverywhere,
  type SpellLangState,
} from './qualityPanels'
import VariableField, { type ColumnRef } from './variableField'
import { styleTokensToCss, type StyleSettings } from '@/lib/styleTokens'
import { BubbleMenu } from '@tiptap/react/menus'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { SlashMenu, setSlashColumns } from './slashMenu'
import SlashPopup, { useSlashPopup } from './slashPopup'

interface DocumentViewProps {
  documentId: string
  initialContent: string
  columns: ColumnRef[]
  settings: StyleSettings
  onSaved?: (html: string) => void
}

function liveCssFor(settings: StyleSettings): string {
  const vars = styleTokensToCss(settings)
  return (
    `.variable-doc{${vars};font-family:var(--font-family),Georgia,serif;font-size:var(--body-size-pt)pt;text-align:var(--body-align);}` +
    `.variable-doc h1{font-size:var(--h1-pt)pt;}` +
    `.variable-doc h2{font-size:var(--h2-pt)pt;}` +
    `.variable-doc h3{font-size:var(--h3-pt)pt;}`
  )
}

export default function DocumentView({
  documentId,
  initialContent,
  columns,
  settings,
  onSaved,
}: DocumentViewProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

  function persistNow(html: string) {
    dirtyRef.current = false
    setSaving('saving')
    void fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentHtml: html }),
      keepalive: true,
    }).then(() => {
      onSavedRef.current?.(html)
      setSaving('saved')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaving('idle'), 1500)
    })
  }
  const persistRef = useRef(persistNow)
  persistRef.current = persistNow
  const columnsRef = useRef(columns)
  columnsRef.current = columns

  const [lang, setLang] = useState<SpellLangState>('auto')
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [rightPanel, setRightPanel] = useState<'none' | 'spell' | 'ai'>('none')
  const [reviewing, setReviewing] = useState(false)
  const [observations, setObservations] = useState<
    { original: string; suggestion: string; reason: string }[]
  >([])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      VariableField,
      Placeholder.configure({
        placeholder: 'Type / for commands or drag a field from the left…',
      }),
      CharacterCount,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontFamily,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      SlashMenu,
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: 'variable-doc min-h-[400px] focus:outline-none' },
      handleDrop: (_view, event) => {
        const dragEvent = event as DragEvent
        const raw = dragEvent.dataTransfer?.getData('text/x-tweakdoc-variable')
        if (!raw) return false
        try {
          const col = JSON.parse(raw) as ColumnRef
          const pos = _view.posAtCoords({ left: dragEvent.clientX, top: dragEvent.clientY })
          const nodeType = _view.state.schema.nodes.variableField
          if (!pos || !nodeType) return false
          _view.dispatch(
            _view.state.tr.insert(
              pos.pos,
              nodeType.create({ variableId: col.id, variableName: col.name, unbound: false }),
            ),
          )
          return true
        } catch {
          return false
        }
      },
    },
    onUpdate: ({ editor }) => {
      editor.commands.refreshVariableFieldBindings(columnsRef.current)
      dirtyRef.current = true
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => persistNow(editor.getHTML()), 600)
    },
  })

  const editorRef = useRef<Editor | null>(null)
  editorRef.current = editor

  const { state: slashState, indexRef: slashIndex, select: slashSelect } = useSlashPopup(editor)

  useEffect(() => {
    if (editor) editor.commands.refreshVariableFieldBindings(columns)
    setSlashColumns(() => columnsRef.current)
  }, [editor, columns])

  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      const ed = editorRef.current
      if (dirtyRef.current && ed) persistRef.current(ed.getHTML())
    }
    const onBeforeUnload = () => flush()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      flush()
      if (savedTimer.current) clearTimeout(savedTimer.current)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [])

  function handleInsert(col: ColumnRef) {
    if (!editor) return
    editor.chain().focus().insertVariableField({ variableId: col.id, variableName: col.name }).run()
    editor.commands.refreshVariableFieldBindings(columnsRef.current)
  }

  function applyReplacement(original: string, suggestion: string) {
    if (!editor) return
    replaceEverywhere(editor, original, suggestion)
  }

  async function runAiReview() {
    if (!editor) return
    setRightPanel('ai')
    setReviewing(true)
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editor.getText() }),
      })
      const body = (await res.json()) as {
        ok?: boolean
        observations?: { original: string; suggestion: string; reason: string }[]
        error?: string
      }
      if (body.ok && body.observations) setObservations(body.observations)
      else toast.error(`AI review failed: ${body.error ?? 'unknown error'}`)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="flex h-full">
      <style>{liveCssFor(settings)}</style>
      <FieldsPanel columns={columns} onInsert={handleInsert} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SpellToolbar lang={lang} onLangChange={setLang} issueCount={0}>
          <Button size="sm" variant="outline" onClick={() => void runAiReview()} disabled={reviewing}>
            {reviewing ? 'Reviewing…' : '✨ Review with AI'}
          </Button>
          <Button
            size="sm"
            variant={rightPanel === 'spell' ? 'default' : 'outline'}
            onClick={() => setRightPanel(rightPanel === 'spell' ? 'none' : 'spell')}
          >
            Spelling
          </Button>
        </SpellToolbar>
        <div className="flex min-h-0 flex-1">
          <div className="flex-1 overflow-hidden bg-white">
            {editor ? (
              <PageCanvas editor={editor} settings={settings} saving={saving} />
            ) : (
              <div className="p-8 text-sm text-muted-foreground">Loading editor…</div>
            )}
          </div>
          {rightPanel !== 'none' && (
            <aside className="w-64 shrink-0 overflow-y-auto border-l bg-background">
              {rightPanel === 'spell' && editor ? (
                <SpellPanelLazy editor={editor} lang={lang} onApply={applyReplacement} />
              ) : (
                <ul className="divide-y p-1 text-xs">
                  {observations.length === 0 && !reviewing && (
                    <li className="p-3 text-muted-foreground">No writing issues found</li>
                  )}
                  {reviewing && <li className="p-3 text-muted-foreground">Reviewing…</li>}
                  {observations.map((o, i) => (
                    <li key={`${i}-${o.original}`} className="space-y-1 px-2 py-2">
                      <div>
                        <span className="text-destructive line-through">{o.original}</span>
                        {' → '}
                        <span className="font-medium">{o.suggestion}</span>
                      </div>
                      <div className="text-muted-foreground">{o.reason}</div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            applyReplacement(o.original, o.suggestion)
                            setObservations((prev) => prev.filter((_, idx) => idx !== i))
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setObservations((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          Reject
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}
        </div>
      </div>

      {editor && (
        <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }}>
          <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-xl">
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().toggleBold().run()}>
              <b>B</b>
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().toggleItalic().run()}>
              <i>I</i>
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <u>U</u>
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().toggleStrike().run()}>
              <s>S</s>
            </Button>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
              ⇤
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
              ↔
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
              ⇥
            </Button>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => {
                const url = window.prompt('Link URL')
                if (url === null) return
                if (url === '') editor.chain().focus().unsetLink().run()
                else editor.chain().focus().setLink({ href: url }).run()
              }}
            >
              🔗
            </Button>
          </div>
        </BubbleMenu>
      )}

      <SlashPopup state={slashState} indexRef={slashIndex} onSelect={slashSelect} />
    </div>
  )
}

function SpellPanelLazy({
  editor,
  lang,
  onApply,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>
  lang: SpellLangState
  onApply: (original: string, suggestion: string) => void
}) {
  const { issues, refresh } = useSpellcheck(editor, lang)

  useEffect(() => {
    const handler = () => {
      if (spellTimerShared.current) clearTimeout(spellTimerShared.current)
      spellTimerShared.current = setTimeout(() => void refresh(), 900)
    }
    editor.on('update', handler)
    return () => {
      editor.off('update', handler)
    }
  }, [editor, refresh])

  return (
    <ChecksList
      issues={issues}
      onApply={(o, s) => {
        onApply(o, s)
        setTimeout(() => void refresh(), 100)
      }}
    />
  )
}

const spellTimerShared: { current: ReturnType<typeof setTimeout> | null } = { current: null }
