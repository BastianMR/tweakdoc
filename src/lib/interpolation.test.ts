import { describe, expect, it } from 'vitest'
import { interpolate } from './interpolation'

const chip = (colId: string, name: string, inner = '') =>
  `<span data-variable-id="${colId}" data-variable-name="${name}">${inner}</span>`

describe('interpolate', () => {
  it('replaces bound chips with row values preserving surrounding markup', () => {
    const html = `<p>Hello ${chip('c1', 'Client')}, total ${chip('c2', 'Amount')}.</p>`
    const res = interpolate(html, { c1: 'Acme SA', c2: '1200' })
    expect(res.html).toBe('<p>Hello Acme SA, total 1200.</p>')
    expect(res.issues).toHaveLength(0)
  })

  it('escapes html-special characters in substituted values', () => {
    const res = interpolate(chip('c1', 'X'), { c1: '<img src=x onerror=alert(1)>' })
    expect(res.html).not.toContain('<img')
    expect(res.html).toContain('&lt;img')
  })

  it('reports EMPTY_CELL per occurrence when value is empty string', () => {
    const html = `${chip('c1', 'Date')} and ${chip('c1', 'Date')}`
    const res = interpolate(html, { c1: '' })
    expect(res.issues.filter((i) => i.type === 'EMPTY_CELL')).toHaveLength(2)
  })

  it('marks unbound chips and reports UNBOUND_FIELD without replacing', () => {
    const html = chip('ghost', 'Deleted')
    const res = interpolate(html, {})
    expect(res.issues).toEqual([
      { type: 'UNBOUND_FIELD', columnId: null, columnName: 'Deleted' },
    ])
    expect(res.html).toContain('data-unbound="true"')
  })

  it('re-binds by column id so renames propagate via data-variable-name update', () => {
    const res = interpolate(chip('c1', 'OldName'), { c1: 'v' })
    expect(res.html).toBe('v')
  })

  it('leaves malformed or foreign spans untouched', () => {
    const foreign = '<span class="x">keep me</span>'
    const res = interpolate(foreign, { x: 'v' })
    expect(res.html).toBe(foreign)
    expect(res.issues).toHaveLength(0)
  })

  it('handles documents with no chips at all', () => {
    const res = interpolate('<p>plain</p>', { c1: 'v' })
    expect(res.html).toBe('<p>plain</p>')
    expect(res.issues).toHaveLength(0)
  })
})
