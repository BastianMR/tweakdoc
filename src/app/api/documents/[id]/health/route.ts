import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { datasets, documents } from '@/server/schema'
import { computeDocumentHealth } from '@/server/docHealth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params
  const [doc] = await db.select().from(documents).where(eq(documents.id, id))
  if (!doc) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const [dataset] = await db.select().from(datasets).where(eq(datasets.documentId, id))
  const sheet = dataset
    ? (JSON.parse(dataset.sheetJson) as Parameters<typeof computeDocumentHealth>[1])
    : { columns: [], rows: [] }

  return NextResponse.json(computeDocumentHealth(doc.contentHtml, sheet))
}
