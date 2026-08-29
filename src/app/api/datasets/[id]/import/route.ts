import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { datasets } from '@/server/schema'
import { parseSpreadsheet } from '@/lib/formats'

const ALLOWED = /\.(csv|xlsx|xls)$/i

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const [ds] = await db.select().from(datasets).where(eq(datasets.id, id))
  if (!ds) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!ALLOWED.test(file.name)) {
    return NextResponse.json(
      { error: 'unsupported_file_type', allowed: ['csv', 'xlsx', 'xls'] },
      { status: 415 },
    )
  }

  let parsed
  try {
    parsed = parseSpreadsheet(Buffer.from(await file.arrayBuffer()))
  } catch (e) {
    return NextResponse.json(
      {
        error: 'unreadable_import',
        detail: e instanceof Error ? e.message : String(e),
        location: null,
      },
      { status: 422 },
    )
  }

  const prev = JSON.parse(ds.sheetJson) as { columns?: unknown[]; rows?: unknown[] }
  void prev

  const baseNum = ds.nextRowNumber === 1 ? 1 : ds.nextRowNumber
  const rows = parsed.rows.map((r, idx) => ({ ...r, num: baseNum + idx }))
  const nextRowNumber = baseNum + rows.length

  await db
    .update(datasets)
    .set({
      sheetJson: JSON.stringify({ columns: parsed.columns, rows }),
      nextRowNumber,
    })
    .where(eq(datasets.id, id))

  return NextResponse.json(
    {
      columnsCreated: parsed.columns.length,
      rowsAdded: rows.length,
      renamedColumns: parsed.renamedColumns,
      columns: parsed.columns,
    },
    { status: 201 },
  )
}
