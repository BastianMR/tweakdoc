import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/server/db'
import { documents, datasets } from '@/server/schema'
import { getPresetHtml, type FormatType } from '@/lib/presets'

const FORMAT_TYPES: FormatType[] = ['blank', 'letter', 'official_letter']
const now = () => new Date().toISOString()

export async function GET(_request: Request) {
  const rows = await db
    .select({
      id: documents.id,
      name: documents.name,
      formatType: documents.formatType,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .orderBy(desc(documents.updatedAt))
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const formatType = body?.formatType

  if (name === '') {
    return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
  }
  if (typeof formatType !== 'string' || !FORMAT_TYPES.includes(formatType as FormatType)) {
    return NextResponse.json({ error: 'invalid formatType' }, { status: 400 })
  }

  const docId = crypto.randomUUID()
  const datasetId = crypto.randomUUID()
  const timestamp = now()
  const fmt = formatType as FormatType

  const [doc] = await db
    .insert(documents)
    .values({
      id: docId,
      name,
      formatType: fmt,
      contentHtml: getPresetHtml(fmt),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning()

  await db.insert(datasets).values({ id: datasetId, documentId: docId, name: `${name} data` })

  return NextResponse.json(
    {
      id: doc.id,
      name: doc.name,
      formatType: doc.formatType,
      contentHtml: doc.contentHtml,
      datasetId,
    },
    { status: 201 },
  )
}
