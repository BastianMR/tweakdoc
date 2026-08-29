'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor } from '@tiptap/react'
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

interface DocumentViewProps {
  documentId: string
  initialContent: string
  columns: ColumnRef[]
  settings: StyleSettings
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
}: DocumentViewProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spellTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const columnsRef = useRef(columns)
  columnsRef.current = columns

  const [lang, setLang] = useState<SpellLangState>('auto')
  const [rightPanel, setRightPanel] = useState<'none' | 'spell' | 'ai'>('none')
  const [reviewing, setReviewing] = useState(false)
  const [observations, setObservations] = useState<
    { original: string; suggestion: string; reason: string }[]
  >([])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), VariableField],
    content: initialContent,
    editorProps: {
      attributes: { class: 'variable-doc min-h-[400px] px-8 py-6 focus:outline-none' },
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
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void fetch(`/api/documents/${documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentHtml: editor.getHTML() }),
        })
      }, 600)
    },
  })

  useEffect(() => {
    if (editor) editor.commands.refreshVariableFieldBindings(columns)
  }, [editor, columns])

  function handleInsert(col: ColumnRef) {
    if (!editor) return
    editor.chain().focus().insertVariableField({ variableId: col.id, variableName: col.name }).run()
    editor.commands.refreshVariableFieldBindings(columnsRef.current)
  }

  function applyReplacement(original: string, suggestion: string) {
    if (!editor) return
    replaceEverywhere(editor, original, suggestion)
    if (spellTimer.current) clearTimeout(spellTimer.current)
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
            {reviewing ? 'â€¦' : 'âœ¨ Review with AI'}
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
              <PageCanvas editor={editor} settings={settings} />
            ) : (
              <div className="p-8 text-sm text-muted-foreground">Loading editorâ€¦</div>
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
                  {reviewing && <li className="p-3 text-muted-foreground">Reviewingâ€¦</li>}
                  {observations.map((o, i) => (
                    <li key={`${i}-${o.original}`} className="space-y-1 px-2 py-2">
                      <div>
                        <span className="text-destructive line-through">{o.original}</span>
                        {' â†’ '}
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
