'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Input } from '@/components/ui/input'
import { t } from '@/lib/i18n/en'

const FORMATS = [
  { value: 'blank', label: 'Blank', hint: 'Start from an empty page' },
  { value: 'letter', label: 'Letter', hint: 'Date, recipient, salutation, signature' },
  { value: 'official_letter', label: 'Official letter', hint: 'Ref number, subject block, signature' },
] as const

export default function NewDocumentDialog({ nextNumber }: { nextNumber: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [format, setFormat] = useState<(typeof FORMATS)[number]['value']>('blank')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const finalName = name.trim() || `Document ${nextNumber}`
    setBusy(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: finalName, formatType: format }),
      })
      if (!res.ok) {
        toast.error('Could not create the document')
        return
      }
      const doc = (await res.json()) as { id: string }
      setOpen(false)
      setName('')
      router.push(`/documents/${doc.id}`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-8 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
        + {t.sidebar.newDocument}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.sidebar.newDocument}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder={`Name (default: Document ${nextNumber})`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
        <div className="grid gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                format === f.value ? 'border-primary bg-accent' : 'hover:bg-muted/50'
              }`}
            >
              <div className="font-medium">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.hint}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => void submit()} disabled={busy}>
            {busy ? '…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
