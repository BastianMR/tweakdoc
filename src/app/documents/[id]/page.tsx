import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { db } from '@/server/db'
import { datasets, documents } from '@/server/schema'
import WorkspaceTabs from '@/components/workspace/workspaceTabs'
import type { ColumnRef } from '@/components/editor/variableField'
import { parseStyleSettings } from '@/lib/styleTokens'

interface SheetShape {
  columns?: { id: string; name: string }[]
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [doc] = await db.select().from(documents).where(eq(documents.id, id))

  if (!doc) {
    notFound()
  }

  const [dataset] = await db.select().from(datasets).where(eq(datasets.documentId, id))
  let columns: ColumnRef[] = []
  if (dataset) {
    try {
      columns = ((JSON.parse(dataset.sheetJson) as SheetShape).columns ?? []).map((c) => ({
        id: c.id,
        name: c.name,
      }))
    } catch {
      columns = []
    }
  }

  let settings
  try {
    settings = parseStyleSettings(doc.settingsJson)
  } catch {
    settings = undefined
  }

  return (
    <WorkspaceTabs
      key={doc.id}
      docId={doc.id}
      docName={doc.name}
      datasetId={dataset?.id ?? null}
      initialContent={doc.contentHtml}
      initialSettings={
        settings ?? {
          page: { size: 'A4', marginMm: { top: 20, right: 20, bottom: 20, left: 20 } },
          header: { enabled: false, logoPath: null, pageNumbers: false },
          typography: {
            fontFamily: 'serif',
            bodySizePt: 11,
            bodyAlign: 'justify',
            headingScalePt: { h1: 20, h2: 16, h3: 13 },
          },
        }
      }
      columns={columns}
    />
  )
}
