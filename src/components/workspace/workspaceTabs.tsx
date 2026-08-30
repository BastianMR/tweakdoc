'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { t } from '@/lib/i18n/en'
import DocumentView from '@/components/editor/documentView'
import TableSection from '@/components/grid/tableSection'
import DashboardView from '@/components/dashboard/dashboardView'
import StylesForm from '@/components/styles-tab/stylesForm'
import type { StyleSettings } from '@/lib/styleTokens'
import type { ColumnRef } from '@/components/editor/variableField'

interface WorkspaceTabsProps {
  docId: string
  docName: string
  datasetId: string | null
  initialContent: string
  initialSettings: StyleSettings
  columns: ColumnRef[]
}

export default function WorkspaceTabs({
  docId,
  docName,
  datasetId,
  initialContent,
  initialSettings,
  columns,
}: WorkspaceTabsProps) {
  const [tab, setTab] = useState('document')
  const [settings, setSettings] = useState<StyleSettings>(initialSettings)
  const [cols, setCols] = useState<ColumnRef[]>(columns)
  const [savedContent, setSavedContent] = useState<string | null>(null)

  function handleGoToRow(num: number) {
    setTab('table')
    window.dispatchEvent(new CustomEvent('tweakdoc:focus-row', { detail: { num } }))
    toast.info(`Row ${num} selected in the table`)
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-2">
        <span className="text-sm font-semibold">{docName}</span>
        <TabsList>
          <TabsTrigger value="dashboard">{t.tabs.dashboard}</TabsTrigger>
          <TabsTrigger value="document">{t.tabs.document}</TabsTrigger>
          <TabsTrigger value="table">{t.tabs.table}</TabsTrigger>
          <TabsTrigger value="styles">{t.tabs.styles}</TabsTrigger>
        </TabsList>
      </header>
      <TabsContent value="dashboard" className="flex-1 overflow-y-auto">
        <DashboardView documentId={docId} onGoToRow={handleGoToRow} />
      </TabsContent>
      <TabsContent value="document" className="flex-1 overflow-hidden">
        <DocumentView
          documentId={docId}
          initialContent={savedContent ?? initialContent}
          columns={cols}
          settings={settings}
          onSaved={setSavedContent}
        />
      </TabsContent>
      <TabsContent value="table" className="flex-1 overflow-hidden">
        {datasetId ? (
          <TableSection
            datasetId={datasetId}
            documentId={docId}
            onColumnsChange={setCols}
          />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">No table linked to this document.</p>
        )}
      </TabsContent>
      <TabsContent value="styles" className="flex-1 overflow-y-auto">
        <StylesForm documentId={docId} settings={settings} onChange={setSettings} />
      </TabsContent>
    </Tabs>
  )
}
