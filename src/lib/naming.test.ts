import { describe, expect, it } from 'vitest'
import { exportFileName } from './naming'

describe('exportFileName', () => {
  it('composes sanitized name + row number + .pdf', () => {
    expect(exportFileName('Contract A', 14)).toBe('Contract_A_14.pdf')
  })

  it('removes filesystem-invalid characters', () => {
    expect(exportFileName('Con/tra*ct?:"><|', 1)).toBe('Contract_1.pdf')
  })

  it('collapses whitespace and repeated underscores into single underscores', () => {
    expect(exportFileName('  My   Doc  ', 2)).toBe('My_Doc_2.pdf')
    expect(exportFileName('a__b', 3)).toBe('a_b_3.pdf')
  })

  it('caps length at 80 chars preserving the _{num}.pdf suffix', () => {
    const long = 'X'.repeat(120)
    const out = exportFileName(long, 7)
    expect(out.length).toBeLessThanOrEqual(80)
    expect(out.endsWith('_7.pdf')).toBe(true)
  })

  it('yields distinct names for distinct row numbers', () => {
    expect(exportFileName('Doc', 1)).not.toBe(exportFileName('Doc', 2))
  })
})
