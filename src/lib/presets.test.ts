import { describe, expect, it } from 'vitest'
import { getPresetHtml } from './presets'

describe('getPresetHtml', () => {
  it('returns empty content for blank', () => {
    expect(getPresetHtml('blank')).toBe('')
  })

  it('letter preset contains salutation and signature blocks', () => {
    const html = getPresetHtml('letter')
    expect(html).toContain('<h1>')
    expect(html.toLowerCase()).toContain('dear')
    expect(html.toLowerCase()).toContain('sincerely')
  })

  it('official letter preset contains reference and subject blocks', () => {
    const html = getPresetHtml('official_letter')
    expect(html).toContain('<h1>')
    expect(html.toLowerCase()).toContain('ref:')
    expect(html.toLowerCase()).toContain('subject:')
    expect(html.toLowerCase()).toContain('signature')
  })

  it('presets are distinct', () => {
    expect(getPresetHtml('letter')).not.toBe(getPresetHtml('official_letter'))
  })
})
