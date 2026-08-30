'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n/en'

interface ExportActionsProps {
  datasetId: string
  documentId: string
  selectedNums: number[]
  totalRows: number
  onExported: () => void
}

function decodeSummary(res: Response): { generated: number; skipped: number } | null {
  const raw = res.headers.get('x-export-summary')
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString())
  } catch {
    return null
  }
}

async function runExport(
  documentId: string,
  payload: { all?: boolean; rowIds?: number[] },
  onExported: () => void,
) {
  const res = await fetch(`/api/documents/${documentId}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = (await res.json()) as {
      generated: number
      skipped: number
      blocked?: { code: string; fields?: string[] } | null
    }
    if (body.blocked?.code === 'UNBOUND_FIELD') {
      toast.error(`Cannot generate: unresolved fields (${body.blocked.fields?.join(', ')})`)
    } else if (body.generated === 0 && body.skipped === 0) {
      toast.info(t.grid.nothingToGenerate)
    } else {
      toast.warning(
        t.grid.exportSummary
          .replace('{generated}', String(body.generated))
          .replace('{skipped}', String(body.skipped)),
      )
    }
    onExported()
    return
  }

  const summary = decodeSummary(res)
  const blob = await res.blob()
  const disposition = res.headers.get('content-disposition') ?? ''
  const filename = disposition.match(/filename="(.+)"/)?.[1] ?? 'export.zip'

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  if (summary) {
    toast.success(
      t.grid.exportSummary
        .replace('{generated}', String(summary.generated))
        .replace('{skipped}', String(summary.skipped)),
    )
  }
  onExported()
}

export default function ExportActions({
  datasetId,
  documentId,
  selectedNums,
  totalRows,
  onExported,
}: ExportActionsProps) {
  void datasetId

  if (totalRows === 0) {
    return (
      <Button size="sm" className="h-7 px-2 text-xs" disabled title={t.grid.nothingToGenerate}>
        ⬇ Generate
      </Button>
    )
  }

  return (
    <>
      <Button
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => void runExport(documentId, { rowIds: selectedNums }, onExported)}
        disabled={selectedNums.length === 0}
      >
        ⬇ {t.grid.generateSelected} ({selectedNums.length})
      </Button>
      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => void runExport(documentId, { all: true }, onExported)}>
        ⬇ {t.grid.generateAll}
      </Button>
    </>
  )
}
