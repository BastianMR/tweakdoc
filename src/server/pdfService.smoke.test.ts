import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import puppeteer from 'puppeteer'

async function resolveChromePath(): Promise<string | null> {
  try {
    const fn = puppeteer.executablePath as unknown as () => string | Promise<string>
    const p = fn()
    const resolved = typeof p === 'string' ? p : await p
    return resolved && existsSync(resolved) ? resolved : null
  } catch {
    return null
  }
}

const chromePath = await resolveChromePath()

describe.skipIf(!chromePath)('pdfService smoke (real Chromium)', () => {
  it('renders a minimal document to a valid PDF buffer', async () => {
    const { renderHtmlToPdf, wrapDocumentForPrint, closeBrowser } = await import(
      './pdfService'
    )
    const { defaultStyleSettings } = await import('@/lib/styleTokens')

    const full = wrapDocumentForPrint('<h1>Hola</h1><p>Mundo</p>', defaultStyleSettings)
    const buf = await renderHtmlToPdf(full)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    expect(buf.length).toBeGreaterThan(1000)
    void chromePath
    await closeBrowser()
  })
})
