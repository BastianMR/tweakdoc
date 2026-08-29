import { describe, expect, it } from 'vitest'
import { documentPrintCss, styleTokensToCss, type StyleSettings } from './styleTokens'

const settings: StyleSettings = {
  page: { size: 'Letter', marginMm: { top: 15, right: 18, bottom: 20, left: 12 } },
  header: { enabled: true, logoPath: null, pageNumbers: true },
  typography: {
    fontFamily: 'sans-serif',
    bodySizePt: 12,
    bodyAlign: 'left',
    headingScalePt: { h1: 22, h2: 17, h3: 14 },
  },
}

describe('style token consistency preview↔print (T042)', () => {
  it('documentPrintCss embeds the exact same token vars as styleTokensToCss', () => {
    const tokens = styleTokensToCss(settings)
    const print = documentPrintCss(settings)
    expect(print).toContain(tokens)
    expect(print).toContain('@page { size: Letter; margin: 0; }')
  })

  it('is deterministic for identical settings', () => {
    expect(documentPrintCss(settings)).toBe(documentPrintCss(settings))
  })

  it('reflects every user-facing knob', () => {
    const css = documentPrintCss(settings)
    expect(css).toContain('--page-size:Letter')
    expect(css).toContain('--margin-left-mm:12')
    expect(css).toContain('--font-family:sans-serif')
    expect(css).toContain('--body-align:left')
    expect(css).toContain('--h2-pt:17')
  })
})
