const MAX_LENGTH = 80

export function exportFileName(documentName: string, rowNum: number): string {
  const sanitized = documentName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[/\\:*?:"<>|]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  const suffix = `_${rowNum}.pdf`
  const base =
    sanitized.length + suffix.length > MAX_LENGTH
      ? sanitized.slice(0, MAX_LENGTH - suffix.length).replace(/_+$/, '')
      : sanitized

  return `${base || 'document'}${suffix}`
}
