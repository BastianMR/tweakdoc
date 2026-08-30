import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { datasets } from '@/server/schema'

interface SheetShape {
  columns: { id: string; name: string }[]
  rows: { id: string; num: number; values: Record<string, string> }[]
}

type Ctx = { params: Promise<{ id: string }> }

function loadDataset(id: string) {
  return db.select().from(datasets).where(eq(datasets.id, id))
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params
  const [ds] = await loadDataset(id)
  if (!ds) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json({
    id: ds.id,
    documentId: ds.documentId,
    name: ds.name,
    sheet: JSON.parse(ds.sheetJson),
    nextRowNumber: ds.nextRowNumber,
  })
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    sheet?: SheetShape
    expectedNextRowNumber?: number
  } | null

  const sheet = body?.sheet
  if (!sheet || !Array.isArray(sheet.columns) || !Array.isArray(sheet.rows)) {
    return NextResponse.json({ error: 'invalid sheet' }, { status: 400 })
  }

  const [existing] = await loadDataset(id)
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  if (
    body?.expectedNextRowNumber !== undefined &&
    body.expectedNextRowNumber < existing.nextRowNumber
  ) {
    return NextResponse.json(
      { error: 'conflict', currentNextRowNumber: existing.nextRowNumber },
      { status: 409 },
    )
  }

  const savedAt = new Date().toISOString()
  const maxNum = sheet.rows.reduce((acc, r) => Math.max(acc, Number(r.num) || 0), 0)
  const nextRowNumber = Math.max(existing.nextRowNumber, maxNum + 1)

  await db
    .update(datasets)
    .set({ sheetJson: JSON.stringify(sheet), nextRowNumber })
    .where(eq(datasets.id, id))

  return NextResponse.json({ savedAt })
}
