import { describe, expect, it } from 'vitest'
import { computeDocumentHealth } from './docHealth'

const html =
  '<p><span data-variable-id="c1" data-variable-name="Client"></span> — <span data-variable-id="ghost" data-variable-name="Ghost"></span></p>'

const sheet = {
  columns: [
    { id: 'c1', name: 'Client' },
    { id: 'c2', name: 'Never Used' },
  ],
  rows: [
    { id: 'r1', num: 1, values: { c1: 'Acme', c2: 'x' } },
    { id: 'r2', num: 2, values: { c1: '', c2: '' } },
    { id: 'r3', num: 3, values: { c1: 'Globex', c2: '' } },
  ],
}

describe('computeDocumentHealth (T031)', () => {
  it('computes full health summary', () => {
    const h = computeDocumentHealth(html, sheet)
    expect(h.datasetLinked).toBe(true)
    expect(h.rowsCount).toBe(3)
    expect(h.columnsCount).toBe(2)
    expect(h.fieldsUsedCount).toBe(2)
    expect(h.resolvedCount).toBe(1)
    expect(h.unresolvedFields).toEqual(['Ghost'])
    expect(h.unusedColumns).toEqual(['Never Used'])
    expect(h.incompleteRows.map((r) => r.num)).toEqual([2])
    expect(h.readyRows).toBe(2)
  })

  it('reports not-linked when sheet is empty and zero readiness', () => {
    const h = computeDocumentHealth(html, { columns: [], rows: [] })
    expect(h.datasetLinked).toBe(false)
    expect(h.readyRows).toBe(0)
  })

  it('readiness ignores unresolved fields (they surface in their own card and block exports)', () => {
    const ghostOnly = '<span data-variable-id="gone" data-variable-name="G"></span>'
    const h = computeDocumentHealth(ghostOnly, {
      columns: [{ id: 'other', name: 'Other' }],
      rows: [
        { id: 'r1', num: 1, values: { other: 'a' } },
        { id: 'r2', num: 2, values: { other: 'b' } },
      ],
    })
    expect(h.unresolvedFields).toEqual(['G'])
    expect(h.incompleteRows).toHaveLength(0)
    expect(h.readyRows).toBe(2)
  })
})
