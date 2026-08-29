'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import NewDocumentDialog from './newDocumentDialog'
import SettingsDialog from './settingsDialog'
import { t } from '@/lib/i18n/en'

export interface DocumentListItem {
  id: string
  name: string
}

export function SidebarClient({ docs }: { docs: DocumentListItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const filtered = useMemo(
    () => docs.filter((d) => d.name.toLowerCase().includes(query.toLowerCase())),
    [docs, query],
  )

  async function renameDocument(id: string) {
    const name = renameValue.trim()
    setRenamingId(null)
    if (!name) return
    await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    router.refresh()
  }

  async function deleteDocument(id: string) {
    if (!window.confirm(t.sidebar.deleteConfirm)) return
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-background">
      <div className="border-b p-3">
        <div className="mb-2 text-sm font-semibold tracking-tight">{t.appName}</div>
        <Input
          placeholder={t.sidebar.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8"
        />
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {docs.length === 0 ? t.sidebar.empty : t.sidebar.noResults}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((doc) => (
              <li key={doc.id} className="group relative">
                {renamingId === doc.id ? (
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void renameDocument(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void renameDocument(doc.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="h-7 text-sm"
                  />
                ) : (
                  <div className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-accent">
                    <Link href={`/documents/${doc.id}`} className="min-w-0 flex-1 truncate text-sm">
                      {doc.name}
                    </Link>
                    <span className="ml-1 hidden shrink-0 gap-1 group-hover:flex">
                      <button
                        title={t.sidebar.rename}
                        onClick={() => {
                          setRenamingId(doc.id)
                          setRenameValue(doc.name)
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✎
                      </button>
                      <button
                        title={t.sidebar.delete}
                        onClick={() => void deleteDocument(doc.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </nav>
      <div className="grid gap-2 border-t p-3">
        <NewDocumentDialog nextNumber={docs.length + 1} />
        <SettingsDialog />
      </div>
    </aside>
  )
}
