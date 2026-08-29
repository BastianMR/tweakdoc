'use client'

import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import StarterKit from '@tiptap/starter-kit'
import VariableField, { type ColumnRef } from './variableField'

interface TemplateEditorProps {
  initialContent: string
  columns: ColumnRef[]
  onHtmlChange: (html: string) => void
}

export default function TemplateEditor({
  initialContent,
  columns,
  onHtmlChange,
}: TemplateEditorProps) {
  const columnsRef = useRef(columns)
  columnsRef.current = columns
  const changeRef = useRef(onHtmlChange)
  changeRef.current = onHtmlChange

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      VariableField,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base max-w-none min-h-[400px] px-8 py-6 focus:outline-none',
      },
      handleDrop: (_view, event) => {
        const dragEvent = event as DragEvent
        const raw = dragEvent.dataTransfer?.getData('text/x-tweakdoc-variable')
        if (!raw) return false
        try {
          const col = JSON.parse(raw) as ColumnRef
          const view = _view
          const { state } = view
          const pos = view.posAtCoords({ left: dragEvent.clientX, top: dragEvent.clientY })
          if (pos) {
            const node = state.schema.nodes.variableField
            if (node) {
              const tr = state.tr.insert(
                pos.pos,
                node.create({ variableId: col.id, variableName: col.name, unbound: false }),
              )
              view.dispatch(tr)
              return true
            }
          }
        } catch {
          return false
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      editor.commands.refreshVariableFieldBindings(columnsRef.current)
      changeRef.current(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor) {
      editor.commands.refreshVariableFieldBindings(columns)
    }
  }, [editor, columns])

  if (!editor) {
    return <div className="p-8 text-sm text-muted-foreground">Loading editor…</div>
  }

  return (
    <div className="flex h-full flex-col">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-0.5 text-xs ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-3 py-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
      >
        I
      </ToolbarButton>
      {[1, 2, 3].map((lvl) => (
        <ToolbarButton
          key={lvl}
          onClick={() => editor.chain().focus().toggleHeading({ level: lvl as 1 | 2 | 3 }).run()}
          active={editor.isActive('heading', { level: lvl })}
        >
          H{lvl}
        </ToolbarButton>
      ))}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
      >
        1. List
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>↺</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>↻</ToolbarButton>
    </div>
  )
}
