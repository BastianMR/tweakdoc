// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import VariableField, { collectUsedColumnIds } from './variableField'

function createEditor(html = '<p></p>') {
  return new Editor({
    extensions: [StarterKit, VariableField],
    content: html,
  })
}

describe('VariableField extension', () => {
  it('renders canonical chip markup from inserted attrs', () => {
    const editor = createEditor()
    editor.commands.insertVariableField({ variableId: 'c1', variableName: 'Client' })
    const html = editor.getHTML()
    expect(html).toContain('data-variable-id="c1"')
    expect(html).toContain('data-variable-name="Client"')
    expect(html).toContain('{{Client}}')
  })

  it('parses saved chip HTML back into the node (roundtrip)', () => {
    const saved =
      '<p>Hello <span data-type="variableField" data-variable-id="c2" data-variable-name="Amount"></span> USD.</p>'
    const editor = createEditor(saved)
    const doc = editor.getHTML()
    expect(doc).toContain('data-variable-id="c2"')
    expect(doc).toContain('{{Amount}}')
  })

  it('marks chips unbound when column disappears and re-binds by id when back', () => {
    const editor = createEditor(
      '<p><span data-type="variableField" data-variable-id="gone" data-variable-name="Ghost"></span></p>',
    )
    editor.commands.refreshVariableFieldBindings([{ id: 'c9', name: 'Ghost' }])
    expect(editor.getHTML()).toContain('data-variable-id="c9"')
    expect(editor.getHTML()).not.toContain('data-unbound="true"')

    editor.commands.refreshVariableFieldBindings([{ id: 'other', name: 'Other' }])
    expect(editor.getHTML()).toContain('data-unbound="true"')
  })

  it('binds typed-by-name-only chips once the column appears', () => {
    const editor = createEditor(
      '<p><span data-type="variableField" data-variable-id="" data-variable-name="Fresh" data-unbound="true"></span></p>',
    )
    expect(editor.getHTML()).toContain('data-unbound="true"')
    editor.commands.refreshVariableFieldBindings([{ id: 'c5', name: 'Fresh' }])
    expect(editor.getHTML()).toContain('data-variable-id="c5"')
    expect(editor.getHTML()).not.toContain('data-unbound="true"')
  })

  it('collectUsedColumnIds extracts id+name pairs', () => {
    const html =
      '<p><span data-variable-id="a" data-variable-name="A"></span><span data-variable-id="b" data-variable-name="B"></span></p>'
    expect(collectUsedColumnIds(html)).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ])
  })
})
