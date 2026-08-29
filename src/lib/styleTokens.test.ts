import { describe, expect, it } from 'vitest'
import { styleTokensToCss, validateStyleSettings } from './styleTokens'

const valid = {
  page: { size: 'A4' as const, marginMm: { top: 20, right: 20, bottom: 20, left: 20 } },
  header: { enabled: false, logoPath: null, pageNumbers: false },
  typography: {
    fontFamily: 'serif',
    bodySizePt: 11,
    bodyAlign: 'justify' as const,
    headingScalePt: { h1: 20, h2: 16, h3: 13 },
  },
}

describe('validateStyleSettings', () => {
  it('accepts the default settings', () => {
    expect(validateStyleSettings(valid)).toEqual(valid)
  })

  it('rejects unknown page size', () => {
    expect(() =>
      validateStyleSettings({ ...valid, page: { ...valid.page, size: 'B5' as never } }),
    ).toThrow()
  })

  it('rejects margins outside 0-50mm', () => {
    expect(() =>
      validateStyleSettings({
        ...valid,
        page: { ...valid.page, marginMm: { ...valid.page.marginMm, top: 51 } },
      }),
    ).toThrow()
  })

  it('rejects body size outside 8-18pt', () => {
    expect(() =>
      validateStyleSettings({
        ...valid,
        typography: { ...valid.typography, bodySizePt: 25 },
      }),
    ).toThrow()
  })

  it('rejects non-hierarchical heading scale (h2 >= h1)', () => {
    expect(() =>
      validateStyleSettings({
        ...valid,
        typography: {
          ...valid.typography,
          headingScalePt: { h1: 14, h2: 16, h3: 13 },
        },
      }),
    ).toThrow()
  })
})

describe('styleTokensToCss', () => {
  it('emits deterministic css custom properties for editor and print', () => {
    const a = styleTokensToCss(valid)
    const b = styleTokensToCss(valid)
    expect(a).toBe(b)
    expect(a).toContain('--page-size:A4')
    expect(a).toContain('--body-size-pt:11')
    expect(a).toContain('--h1-pt:20')
    expect(a).toContain('--margin-top-mm:20')
  })
})
