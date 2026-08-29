'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  async function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const body = (await res.json()) as { aiBaseUrl: string; aiConfigured: boolean }
        setBaseUrl(body.aiBaseUrl)
        setConfigured(body.aiConfigured)
      }
    }
  }

  async function save() {
    setBusy(true)
    try {
      const payload: Record<string, string> = {}
      if (baseUrl.trim()) payload.aiBaseUrl = baseUrl.trim()
      if (apiKey.trim()) payload.aiApiKey = apiKey.trim()
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const body = (await res.json()) as { aiConfigured: boolean }
        setConfigured(body.aiConfigured)
        setApiKey('')
        toast.success('Settings saved')
        setOpen(false)
      } else {
        toast.error('Could not save settings')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => void onOpenChange(v)}>
      <DialogTrigger
        title="Settings"
        className="inline-flex h-8 w-full items-center justify-center rounded-md border text-sm text-muted-foreground hover:bg-accent"
      >
        ⚙ Settings{configured === true ? ' ✓' : ''}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <label className="grid gap-1 text-sm">
            AI base URL (OpenAI-compatible)
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
          </label>
          <label className="grid gap-1 text-sm">
            API key
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-… (stored locally only)"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {configured === null ? '' : configured ? '✓ Configured' : 'Not configured'}
            {' '}— the key never leaves this machine except to call your provider.
          </p>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => void save()} disabled={busy}>
            {busy ? '…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
