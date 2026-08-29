import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { datasets } from '@/server/schema'

interface SheetShape {
  columns: { id: string; name: string }[]
  rows: { id: string; num: number; values: Record<string, string> }[]
}

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    rows?: Record<string, unknown>[]
  } | null

  const incoming = body?.rows
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 })
  }

  const [ds] = await db.select().from(datasets).where(eq(datasets.id, id))
  if (!ds) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const sheet = JSON.parse(ds.sheetJson) as SheetShape
  const columnByName = new Map(sheet.columns.map((c) => [c.name, c.id]))

  const unknown = new Set<string>()
  for (const row of incoming) {
    for (const key of Object.keys(row)) {
      if (!columnByName.has(key)) unknown.add(key)
    }
  }
  if (unknown.size > 0) {
    return NextResponse.json(
      { error: 'unknown_columns', unknownColumns: [...unknown] },
      { status: 422 },
    )
  }

  let next = ds.nextRowNumber
  for (const row of incoming) {
    const values: Record<string, string> = {}
    for (const [name, value] of Object.entries(row)) {
      values[columnByName.get(name)!] = String(value ?? '')
    }
    for (const c of sheet.columns) {
      if (!(c.id in values)) values[c.id] = ''
    }
    sheet.rows.push({ id: crypto.randomUUID(), num: next++, values })
  }

  await db
    .update(datasets)
    .set({ sheetJson: JSON.stringify(sheet), nextRowNumber: next })
    .where(eq(datasets.id, id))

  return NextResponse.json({ added: incoming.length, totalRows: sheet.rows.length })
}
