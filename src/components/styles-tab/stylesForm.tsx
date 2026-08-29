'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { documentPrintCss, type StyleSettings } from '@/lib/styleTokens'
import { t } from '@/lib/i18n/en'

interface StylesFormProps {
  documentId: string
  settings: StyleSettings
  onChange: (s: StyleSettings) => void
}

export default function StylesForm({ documentId, settings, onChange }: StylesFormProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(patch: Partial<StyleSettings>) {
    const next = { ...settings, ...patch } as StyleSettings
    onChange(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: next }),
      }).then((res) => {
        if (res.ok) toast.success(t.styles.saved, { duration: 1500 })
        else res.json().then((b) => toast.error(`Invalid styles: ${String((b as { detail?: string }).detail ?? '')}`))
      })
    }, 500)
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const typo = settings.typography

  return (
    <div className="mx-auto grid max-w-3xl gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.styles.pageSetup}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <Select value={settings.page.size} onValueChange={(v) => update({ page: { ...settings.page, size: v as 'A4' | 'Letter' } })}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="Letter">Letter</SelectItem>
            </SelectContent>
          </Select>
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <label key={side} className="flex items-center gap-1 text-xs">
              {side}
              <Input
                type="number"
                min={0}
                max={50}
                value={settings.page.marginMm[side]}
                onChange={(e) => update({ page: { ...settings.page, marginMm: { ...settings.page.marginMm, [side]: Number(e.target.value) } } })}
                className="h-7 w-16"
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.styles.headerFooter}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>{t.styles.enableHeader}</span>
            <Switch
              checked={settings.header.enabled}
              onCheckedChange={(v) => update({ header: { ...settings.header, enabled: v } })}
            />
          </div>
          {settings.header.enabled && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const form = new FormData()
                  form.append('file', file)
                  const res = await fetch('/api/uploads', { method: 'POST', body: form })
                  if (res.ok) {
                    const body = (await res.json()) as { path: string }
                    update({ header: { ...settings.header, logoPath: body.path } })
                  } else {
                    toast.error('Logo upload failed')
                  }
                }}
              />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                {t.styles.uploadLogo}
              </Button>
              {settings.header.logoPath && (
                <span className="text-xs text-muted-foreground">{settings.header.logoPath ?? ''}</span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>{t.styles.pageNumbers}</span>
            <Switch
              checked={settings.header.pageNumbers}
              onCheckedChange={(v) => update({ header: { ...settings.header, pageNumbers: v } })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.styles.typography}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <label className="grid gap-1">
            {t.styles.fontFamily}
            <Select value={typo.fontFamily ?? 'serif'} onValueChange={(v) => update({ typography: { ...typo, fontFamily: String(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="sans-serif">Sans-serif</SelectItem>
                <SelectItem value="monospace">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1">
            {t.styles.bodySize}
            <Input
              type="number" min={8} max={18} value={typo.bodySizePt}
              onChange={(e) => update({ typography: { ...typo, bodySizePt: Number(e.target.value) } })}
            />
          </label>
          <label className="grid gap-1">
            {t.styles.bodyAlign}
            <Select value={typo.bodyAlign} onValueChange={(v) => update({ typography: { ...typo, bodyAlign: v as StyleSettings['typography']['bodyAlign'] } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="justify">Justified</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="grid gap-1">
            {t.styles.headingScale}
            <div className="flex gap-2">
              {(['h1', 'h2', 'h3'] as const).map((h) => (
                <Input
                  key={h}
                  type="number" min={8} max={48} value={typo.headingScalePt[h]}
                  onChange={(e) =>
                    update({
                      typography: {
                        ...typo,
                        headingScalePt: { ...typo.headingScalePt, [h]: Number(e.target.value) },
                      },
                    })
                  }
                  className="w-20"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <details className="text-xs text-muted-foreground">
        <summary>Preview CSS tokens</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-2">{documentPrintCss(settings)}</pre>
      </details>
    </div>
  )
}
