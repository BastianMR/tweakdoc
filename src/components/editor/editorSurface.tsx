'use client'

import type { Editor } from '@tiptap/react'
import { useEffect, useReducer } from 'react'

function useToolbarState(editor: Editor) {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const handler = () => force()
    editor.on('transaction', handler)
    return () => {
      editor.off('transaction', handler)
    }
  }, [editor])
}

function TBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded border px-1.5 py-0.5 text-xs ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
      }`}
    >
      {children}
    </button>
  )
}

const Sep = () => <span className="mx-1 h-4 w-px bg-border" />

export function EditorToolbar({ editor }: { editor: Editor }) {
  useToolbarState(editor)
  const chain = () => editor.chain().focus()

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-3 py-1.5">
      <TBtn title="Undo" onClick={() => chain().undo().run()}>↺</TBtn>
      <TBtn title="Redo" onClick={() => chain().redo().run()}>↻</TBtn>
      <Sep />
      <TBtn title="Bold" onClick={() => chain().toggleBold().run()} active={editor.isActive('bold')}><b>B</b></TBtn>
      <TBtn title="Italic" onClick={() => chain().toggleItalic().run()} active={editor.isActive('italic')}><i>I</i></TBtn>
      <TBtn title="Underline" onClick={() => chain().toggleUnderline().run()} active={editor.isActive('underline')}><u>U</u></TBtn>
      <TBtn title="Strikethrough" onClick={() => chain().toggleStrike().run()} active={editor.isActive('strike')}><s>S</s></TBtn>
      <Sep />
      {[1, 2, 3].map((lvl) => (
        <TBtn
          key={lvl}
          title={`Heading ${lvl}`}
          onClick={() => chain().toggleHeading({ level: lvl as 1 | 2 | 3 }).run()}
          active={editor.isActive('heading', { level: lvl })}
        >
          H{lvl}
        </TBtn>
      ))}
      <Sep />
      {(['left', 'center', 'right', 'justify'] as const).map((a) => (
        <TBtn
          key={a}
          title={`Align ${a}`}
          onClick={() => chain().setTextAlign(a).run()}
          active={editor.isActive({ textAlign: a })}
        >
          {a === 'left' ? '⇤' : a === 'center' ? '↔' : a === 'right' ? '⇥' : '≡'}
        </TBtn>
      ))}
      <Sep />
      <select
        title="Font family"
        className="h-6 rounded border bg-background text-xs"
        onChange={(e) => {
          const v = e.target.value
          if (v) chain().setFontFamily(v).run()
          else chain().unsetFontFamily().run()
        }}
        value={(editor.getAttributes('textStyle').fontFamily as string | undefined) ?? ''}
      >
        <option value="">Font…</option>
        <option value="serif">Serif</option>
        <option value="sans-serif">Sans</option>
        <option value="monospace">Mono</option>
        <option value="Georgia">Georgia</option>
        <option value="Arial">Arial</option>
      </select>
      <select
        title="Font size"
        className="h-6 rounded border bg-background text-xs"
        onChange={(e) => {
          const v = e.target.value
          if (v) chain().setFontSize(v).run()
          else chain().unsetFontSize().run()
        }}
        value={(editor.getAttributes('textStyle').fontSize as string | undefined) ?? ''}
      >
        <option value="">Size…</option>
        {['9pt', '10pt', '11pt', '12pt', '14pt', '18pt', '24pt'].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <Sep />
      <TBtn title="Bullet list" onClick={() => chain().toggleBulletList().run()} active={editor.isActive('bulletList')}>•≡</TBtn>
      <TBtn title="Numbered list" onClick={() => chain().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1≡</TBtn>
      <TBtn title="Quote" onClick={() => chain().toggleBlockquote().run()} active={editor.isActive('blockquote')}>❝</TBtn>
      <TBtn title="Insert table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦</TBtn>
      <TBtn
        title="Add link"
        onClick={() => {
          const url = window.prompt('Link URL')
          if (url === null) return
          if (url === '') chain().unsetLink().run()
          else chain().setLink({ href: url }).run()
        }}
        active={editor.isActive('link')}
      >🔗</TBtn>
      <TBtn title="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}>⌫</TBtn>
    </div>
  )
}

export function EditorStatusBar({
  editor,
  saving = 'idle',
}: {
  editor: Editor
  saving?: 'idle' | 'saving' | 'saved'
}) {
  useToolbarState(editor)
  const storage = editor.storage as unknown as Record<string, { words?: () => number }>
  const words = storage.characterCount?.words?.() ?? 0

  return (
    <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground">
      <span>{words} words</span>
      <span>
        {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved ✓' : ''}
      </span>
    </div>
  )
}
