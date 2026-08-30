import { Extension } from '@tiptap/core'
import type { Editor, Range } from '@tiptap/core'
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion'
import type { ColumnRef } from './variableField'

export interface SlashItem {
  key: string
  label: string
  hint?: string
  run: (editor: Editor, range: Range) => void
}

export interface SlashBridge {
  open: (props: SuggestionProps) => void
  update: (props: SuggestionProps) => void
  close: () => void
  keydown: (event: KeyboardEvent) => boolean
}

let columnsProvider: () => ColumnRef[] = () => []
export function setSlashColumns(provider: () => ColumnRef[]) {
  columnsProvider = provider
}

let bridge: SlashBridge | null = null
export function setSlashBridge(b: SlashBridge | null) {
  bridge = b
}

function buildItems(editor: Editor, query: string): SlashItem[] {
  const staticItems: SlashItem[] = [
    { key: 'h1', label: 'Heading 1', hint: 'Ctrl+Alt+1', run: (ed, r) => ed.chain().focus().deleteRange(r).setHeading({ level: 1 }).run() },
    { key: 'h2', label: 'Heading 2', hint: 'Ctrl+Alt+2', run: (ed, r) => ed.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
    { key: 'h3', label: 'Heading 3', hint: 'Ctrl+Alt+3', run: (ed, r) => ed.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
    { key: 'ul', label: 'Bullet list', run: (ed, r) => ed.chain().focus().deleteRange(r).toggleBulletList().run() },
    { key: 'ol', label: 'Numbered list', run: (ed, r) => ed.chain().focus().deleteRange(r).toggleOrderedList().run() },
    { key: 'quote', label: 'Quote', run: (ed, r) => ed.chain().focus().deleteRange(r).toggleBlockquote().run() },
    { key: 'code', label: 'Code block', run: (ed, r) => ed.chain().focus().deleteRange(r).toggleCodeBlock().run() },
    { key: 'hr', label: 'Divider', run: (ed, r) => ed.chain().focus().deleteRange(r).setHorizontalRule().run() },
    { key: 'table', label: 'Table 3×3', run: (ed, r) => ed.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  ]

  const variableItems: SlashItem[] = columnsProvider().map((col) => ({
    key: `var-${col.id}`,
    label: `Variable: ${col.name}`,
    hint: 'insert field',
    run: (ed, r) => ed.chain().focus().deleteRange(r).insertVariableField({ variableId: col.id, variableName: col.name }).run(),
  }))

  const all = [...staticItems, ...variableItems]
  if (!query) return all
  return all.filter((it) => it.label.toLowerCase().includes(query.toLowerCase()))
}

export const SlashMenu = Extension.create({
  name: 'slashMenu',

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      Suggestion({
        editor,
        char: '/',
        startOfLine: false,
        items: ({ query }) => buildItems(editor, query),
        command: ({ editor: ed, range, props }) => {
          ;(props as SlashItem).run(ed, range)
        },
        render: () => ({
          onStart: (props) => bridge?.open(props),
          onUpdate: (props) => bridge?.update(props),
          onKeyDown: (props) => bridge?.keydown(props.event) ?? false,
          onExit: () => bridge?.close(),
        }),
      }),
    ]
  },
})
