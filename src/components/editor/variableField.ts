import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core'

export interface ColumnRef {
  id: string
  name: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variableField: {
      insertVariableField: (attrs: { variableId: string; variableName: string }) => ReturnType
      refreshVariableFieldBindings: (columns: ColumnRef[]) => ReturnType
    }
  }
}

const VariableField = Node.create({
  name: 'variableField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      variableId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-variable-id'),
        renderHTML: (attrs) => ({ 'data-variable-id': attrs.variableId }),
      },
      variableName: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-variable-name') ?? '',
        renderHTML: (attrs) => ({ 'data-variable-name': attrs.variableName }),
      },
      unbound: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-unbound') === 'true',
        renderHTML: (attrs) => ({
          'data-unbound': attrs.unbound ? 'true' : null,
          class: attrs.unbound ? 'variable-chip variable-chip-unbound' : 'variable-chip',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable-id]' }]
  },

  renderHTML({ node }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': this.name,
        'data-variable-id': node.attrs.variableId,
        'data-variable-name': node.attrs.variableName,
        'data-unbound': node.attrs.unbound ? 'true' : null,
        class: node.attrs.unbound ? 'variable-chip variable-chip-unbound' : 'variable-chip',
      }),
      `{{${String(node.attrs.variableName)}}}`,
    ]
  },

  renderText({ node }) {
    return `{{${String(node.attrs.variableName)}}}`
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /(?:\{\{)([^{}]+)\}\}$/,
        type: this.type,
        getAttributes: (match) => ({
          variableId: null,
          variableName: match[1].trim(),
          unbound: true,
        }),
      }),
    ]
  },

  addCommands() {
    return {
      insertVariableField:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { ...attrs, unbound: false },
            })
            .run()
        },
      refreshVariableFieldBindings:
        (columns) =>
        ({ tr, state }) => {
          const byName = new Map(columns.map((c) => [c.name, c.id]))
          const knownIds = new Set(columns.map((c) => c.id))
          let changed = false

          state.doc.descendants((node, pos) => {
            if (node.type.name !== this.name) return
            const { variableId, variableName } = node.attrs as {
              variableId: string | null
              variableName: string
            }

            const resolvedId = byName.get(variableName)
            if (resolvedId) {
              if (variableId !== resolvedId || node.attrs.unbound) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  variableId: resolvedId,
                  unbound: false,
                })
                changed = true
              }
              return
            }

            if (variableId && knownIds.has(variableId)) {
              if (node.attrs.unbound) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, unbound: false })
                changed = true
              }
              return
            }

            if (!node.attrs.unbound) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, unbound: true })
              changed = true
            }
          })

          return changed
        },
    }
  },
})

export default VariableField

export function collectUsedColumnIds(html: string): { id: string; name: string }[] {
  const used: { id: string; name: string }[] = []
  const re = /<span[^>]*data-variable-id="([^"]*)"[^>]*data-variable-name="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    used.push({ id: m[1], name: m[2] })
  }
  return used
}
