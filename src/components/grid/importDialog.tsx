'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { t } from '@/lib/i18n/en'

export default function ImportDialog({
  datasetId,
  onImported,
}: {
  datasetId: string
  onImported: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function submit() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/datasets/${datasetId}/import`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(`Import failed: ${body.error ?? res.status}`)
        return
      }
      const body = (await res.json()) as {
        rowsAdded: number
        columnsCreated: number
        renamedColumns: string[]
      }
      toast.success(
        t.grid.importSuccess
          .replace('{rows}', String(body.rowsAdded))
          .replace('{columns}', String(body.columnsCreated)),
      )
      if (body.renamedColumns.length > 0) {
        toast.info(t.grid.importRenamed.replace('{names}', body.renamedColumns.join(', ')))
      }
      setOpen(false)
      onImported()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-8 items-center justify-center gap-2 rounded-md border bg-background px-3 text-xs font-medium hover:bg-accent">
        ⬆ {t.grid.import}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.grid.import}</DialogTitle>
        </DialogHeader>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="text-sm" />
        <DialogFooter>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? '…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
