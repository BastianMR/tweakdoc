import fs from 'node:fs'
import path from 'node:path'
import puppeteer, { type Browser } from 'puppeteer'
import { DOCUMENT_SHEET_CLASS, documentPrintCss, type StyleSettings } from '@/lib/styleTokens'

let browserPromise: Promise<Browser> | null = null

function resolveExecutable(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    (() => {
      try {
        return puppeteer.executablePath() as unknown as string
      } catch {
        return null
      }
    })(),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return undefined
}

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      executablePath: resolveExecutable(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--disable-extensions',
      ],
    })
  }
  return browserPromise
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise
    await browser.close()
    browserPromise = null
  }
}

function logoToDataUrl(logoPath: string | null): string | null {
  if (!logoPath) return null
  try {
    const abs = path.isAbsolute(logoPath)
      ? logoPath
      : path.join(process.cwd(), logoPath)
    if (!fs.existsSync(abs)) return null
    const ext = path.extname(abs).slice(1) || 'png'
    return `data:image/${ext};base64,${fs.readFileSync(abs).toString('base64')}`
  } catch {
    return null
  }
}

export function wrapDocumentForPrint(
  bodyHtml: string,
  settings: StyleSettings,
): string {
  const logo = settings.header.enabled ? logoToDataUrl(settings.header.logoPath) : null
  const headerHtml = settings.header.enabled
    ? `<div class="doc-header">${logo ? `<img class="logo" src="${logo}" alt="logo" />` : ''}</div>`
    : ''

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${documentPrintCss(settings)}</style></head>
<body><div class="doc-page">
${headerHtml}
<div class="${DOCUMENT_SHEET_CLASS}">${bodyHtml}</div>
</div></body></html>`
}

export async function renderHtmlToPdf(
  fullHtml: string,
  opts: { pageNumbers?: boolean } = {},
): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(fullHtml, { waitUntil: 'load' })
    const pdfBytes = await page.pdf({
      printBackground: true,
      displayHeaderFooter: !!opts.pageNumbers,
      footerTemplate: opts.pageNumbers
        ? '<div style="width:100%;text-align:center;font-size:9pt;color:#555;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
        : undefined,
      headerTemplate: opts.pageNumbers ? '<div></div>' : undefined,
    })
    return Buffer.from(pdfBytes)
  } finally {
    await page.close()
  }
}
