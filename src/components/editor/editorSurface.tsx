'use client'

import { EditorContent, type Editor } from '@tiptap/react'

export default function EditorSurface({ editor }: { editor: Editor }) {
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
