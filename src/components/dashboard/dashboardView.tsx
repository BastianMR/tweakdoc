'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { t } from '@/lib/i18n/en'
import type { DocumentHealth } from '@/server/docHealth'

interface LogEntry {
  id: string
  rowId: string | null
  rowLabel: string
  reasonCode: string
  detail: string
  createdAt: string
}

interface DashboardViewProps {
  documentId: string
  onGoToRow: (num: number) => void
}

export default function DashboardView({ documentId, onGoToRow }: DashboardViewProps) {
  const [health, setHealth] = useState<DocumentHealth | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const refresh = useCallback(async () => {
    const [hRes, lRes] = await Promise.all([
      fetch(`/api/documents/${documentId}/health`),
      fetch(`/api/documents/${documentId}/export-logs`),
    ])
    if (hRes.ok) setHealth((await hRes.json()) as DocumentHealth)
    if (lRes.ok) setLogs((await lRes.json()) as LogEntry[])
  }, [documentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function clearLogs() {
    await fetch(`/api/documents/${documentId}/export-logs`, { method: 'DELETE' })
    setLogs([])
  }

  function rowNumberFromLabel(label: string): number {
    const m = label.match(/Row (\d+)/)
    return m ? Number(m[1]) : NaN
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.dashboard.datasetCard}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {health ? (
            health.datasetLinked ? (
              <span>✅ {t.dashboard.linked} · {t.dashboard.rowsCount.replace('{rows}', String(health.rowsCount)).replace('{columns}', String(health.columnsCount))}</span>
            ) : (
              <span className="text-muted-foreground">{t.dashboard.notLinked}</span>
            )
          ) : (
            '…'
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.dashboard.fieldsCard}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {health ? (
            <>
              <div>{t.dashboard.resolved.replace('{ok}', String(health.resolvedCount))}</div>
              <div className={health.unresolvedFields.length ? 'text-destructive' : 'text-muted-foreground'}>
                {t.dashboard.unresolved.replace('{bad}', String(health.unresolvedFields.length))}
                {health.unresolvedFields.length > 0 && `: ${health.unresolvedFields.join(', ')}`}
              </div>
              {health.unusedColumns.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {t.dashboard.unusedColumns}: {health.unusedColumns.join(', ')}
                </div>
              )}
            </>
          ) : (
            '…'
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t.dashboard.readiness}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {health ? (
            <>
              <div className="text-lg font-semibold">
                {t.dashboard.readyToGenerate
                  .replace('{ready}', String(health.readyRows))
                  .replace('{total}', String(health.rowsCount))}
              </div>
              {health.incompleteRows.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {t.dashboard.incompleteRows}: {health.incompleteRows.map((r) => `#${r.num}`).join(', ')}
                </div>
              )}
            </>
          ) : (
            '…'
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 xl:col-span-3">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">{t.dashboard.exportLogs}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => void clearLogs()} disabled={logs.length === 0}>
            {t.dashboard.clearLogs}
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.dashboard.noLogs}</p>
          ) : (
            <ul className="divide-y text-sm">
              {logs.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      <span
                        className={`mr-2 rounded px-1.5 py-0.5 text-[10px] uppercase ${
                          log.reasonCode === 'EMPTY_CELL'
                            ? 'bg-amber-100 text-amber-800'
                            : log.reasonCode === 'UNBOUND_FIELD'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {log.reasonCode}
                      </span>
                      {log.rowLabel}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {log.detail} · {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {log.rowId && !Number.isNaN(rowNumberFromLabel(log.rowLabel)) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onGoToRow(rowNumberFromLabel(log.rowLabel))}
                    >
                      {t.dashboard.goToRow}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
