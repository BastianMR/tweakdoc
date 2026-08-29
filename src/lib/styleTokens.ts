export type PageSize = 'A4' | 'Letter'

export interface StyleSettings {
  page: {
    size: PageSize
    marginMm: { top: number; right: number; bottom: number; left: number }
  }
  header: { enabled: boolean; logoPath: string | null; pageNumbers: boolean }
  typography: {
    fontFamily: string
    bodySizePt: number
    bodyAlign: 'left' | 'center' | 'right' | 'justify'
    headingScalePt: { h1: number; h2: number; h3: number }
  }
}

export class StyleValidationError extends Error {}

function clampCheck(n: unknown, min: number, max: number): number {
  const v = Number(n)
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new StyleValidationError(`value ${String(n)} out of range [${min}, ${max}]`)
  }
  return v
}

export function validateStyleSettings(input: StyleSettings): StyleSettings {
  if (input.page.size !== 'A4' && input.page.size !== 'Letter') {
    throw new StyleValidationError('invalid page size')
  }
  for (const m of Object.values(input.page.marginMm)) {
    clampCheck(m, 0, 50)
  }
  clampCheck(input.typography.bodySizePt, 8, 18)
  const { h1, h2, h3 } = input.typography.headingScalePt
  if (!(h1 > h2 && h2 > h3)) {
    throw new StyleValidationError('heading scale must be hierarchical h1 > h2 > h3')
  }
  for (const h of [h1, h2, h3]) {
    clampCheck(h, 8, 48)
  }
  return input
}

export function parseStyleSettings(json: string): StyleSettings {
  return validateStyleSettings(JSON.parse(json) as StyleSettings)
}

export function styleTokensToCss(s: StyleSettings): string {
  const m = s.page.marginMm
  const hs = s.typography.headingScalePt
  return [
    `--page-size:${s.page.size}`,
    `--margin-top-mm:${m.top}`,
    `--margin-right-mm:${m.right}`,
    `--margin-bottom-mm:${m.bottom}`,
    `--margin-left-mm:${m.left}`,
    `--font-family:${s.typography.fontFamily}`,
    `--body-size-pt:${s.typography.bodySizePt}`,
    `--body-align:${s.typography.bodyAlign}`,
    `--h1-pt:${hs.h1}`,
    `--h2-pt:${hs.h2}`,
    `--h3-pt:${hs.h3}`,
  ].join(';')
}

export const DOCUMENT_SHEET_CLASS = 'doc-sheet'

export function documentPrintCss(s: StyleSettings): string {
  return `@page { size: ${s.page.size === 'A4' ? 'A4' : 'Letter'}; margin: 0; }
.${DOCUMENT_SHEET_CLASS}{
  ${styleTokensToCss(s)};
  font-family: var(--font-family), Georgia, serif;
  font-size: var(--body-size-pt)pt;
  text-align: var(--body-align);
}
.${DOCUMENT_SHEET_CLASS} h1{font-size:var(--h1-pt)pt;}
.${DOCUMENT_SHEET_CLASS} h2{font-size:var(--h2-pt)pt;}
.${DOCUMENT_SHEET_CLASS} h3{font-size:var(--h3-pt)pt;}
.doc-page{padding:${s.page.marginMm.top}mm ${s.page.marginMm.right}mm ${s.page.marginMm.bottom}mm ${s.page.marginMm.left}mm;}
.doc-header{display:flex;justify-content:flex-end;margin-bottom:8mm;}
.doc-header .logo{max-height:22mm;max-width:60mm;object-fit:contain;}`
}

export const defaultStyleSettings: StyleSettings = {
  page: { size: 'A4', marginMm: { top: 20, right: 20, bottom: 20, left: 20 } },
  header: { enabled: false, logoPath: null, pageNumbers: false },
  typography: {
    fontFamily: 'serif',
    bodySizePt: 11,
    bodyAlign: 'justify',
    headingScalePt: { h1: 20, h2: 16, h3: 13 },
  },
}
