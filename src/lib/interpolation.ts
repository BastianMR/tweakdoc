export type ChipIssue =
  | { type: 'EMPTY_CELL'; columnId: string }
  | { type: 'UNBOUND_FIELD'; columnId: null; columnName: string }

export interface InterpolationResult {
  html: string
  issues: ChipIssue[]
}

const CHIP_PATTERN =
  /<span([^>]*)data-variable-id="([^"]*)"([^>]*)>([\s\S]*?)<\/span>/g

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function extractAttr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`${name}="([^"]*)"`))
  return m ? m[1] : null
}

export function interpolate(
  html: string,
  valuesByColumnId: Record<string, string>,
): InterpolationResult {
  const issues: ChipIssue[] = []

  const out = html.replace(CHIP_PATTERN, (full, pre: string, colId: string, post: string, inner: string) => {
    if (!(colId in valuesByColumnId)) {
      issues.push({
        type: 'UNBOUND_FIELD',
        columnId: null,
        columnName: extractAttr(pre + post, 'data-variable-name') ?? colId,
      })
      const cleanedPre = pre.replace(/\s*data-unbound="true"/, '')
      return `<span${cleanedPre} data-unbound="true"${post}>${inner}</span>`
    }

    const value = valuesByColumnId[colId]
    if (value === '') {
      issues.push({ type: 'EMPTY_CELL', columnId: colId })
    }
    void post
    void inner
    return escapeHtml(value)
  })

  return { html: out, issues }
}
