import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { datasets, documents, exportLogs } from '@/server/schema'
import { interpolate } from '@/lib/interpolation'
import { exportFileName } from '@/lib/naming'
import { parseStyleSettings } from '@/lib/styleTokens'
import { collectUsedColumnIds } from '@/components/editor/variableField'
import { renderHtmlToPdf, wrapDocumentForPrint } from '@/server/pdfService'
import { buildZip } from '@/server/zipService'

const now = () => new Date().toISOString()
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')

interface SheetShape {
  columns?: { id: string; name: string }[]
  rows?: { id: string; num: number; values: Record<string, string> }[]
}

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    rowIds?: number[]
    all?: boolean
  } | null

  const [doc] = await db.select().from(documents).where(eq(documents.id, id))
  if (!doc) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const [dataset] = await db.select().from(datasets).where(eq(datasets.documentId, id))
  const sheet = dataset ? (JSON.parse(dataset.sheetJson) as Required<SheetShape>) : { columns: [], rows: [] }

  if (!sheet.rows.length) {
    return NextResponse.json({ generated: 0, skipped: 0, blocked: null })
  }

  const used = collectUsedColumnIds(doc.contentHtml)
  const columnById = new Map(sheet.columns.map((c) => [c.id, c]))

  const unbound = used.filter((u) => !columnById.has(u.id))
  if (unbound.length > 0) {
    await db.insert(exportLogs).values({
      id: crypto.randomUUID(),
      documentId: id,
      rowId: null,
      rowLabel: 'run',
      reasonCode: 'UNBOUND_FIELD',
      detail: `Unresolved fields without a column: ${unbound.map((u) => u.name).join(', ')}`,
      createdAt: now(),
    })
    return NextResponse.json({
      generated: 0,
      skipped: sheet.rows.length,
      blocked: {
        code: 'UNBOUND_FIELD' as const,
        fields: unbound.map((u) => u.name),
      },
    })
  }

  let targets = sheet.rows
  if (!body?.all && Array.isArray(body?.rowIds)) {
    targets = sheet.rows.filter((r) => body!.rowIds!.includes(r.num))
  }

  let settings
  try {
    settings = parseStyleSettings(doc.settingsJson)
  } catch {
    settings = null
  }

  const files: { name: string; buffer: Buffer }[] = []
  const skips: number[] = []

  for (const row of targets) {
    const valuesByColumnId: Record<string, string> = {}
    for (const u of used) {
      valuesByColumnId[u.id] = row.values[u.id] ?? ''
    }

    if (used.some((u) => valuesByColumnId[u.id] === '')) {
      const emptyCols = used.filter((u) => valuesByColumnId[u.id] === '').map((u) => columnById.get(u.id)?.name ?? u.id)
      skips.push(row.num)
      await db.insert(exportLogs).values({
        id: crypto.randomUUID(),
        documentId: id,
        rowId: row.id,
        rowLabel: `Row ${row.num}`,
        reasonCode: 'EMPTY_CELL',
        detail: `Empty cell in column '${emptyCols.join("', '")}'`,
        createdAt: now(),
      })
      continue
    }

    const { html } = interpolate(doc.contentHtml, valuesByColumnId)
    const full = wrapDocumentForPrint(html, settings ?? JSON.parse(doc.settingsJson))
    try {
      const buffer = await renderHtmlToPdf(full, {
        pageNumbers: settings?.header.pageNumbers,
      })
      files.push({ name: exportFileName(doc.name, row.num), buffer })
    } catch {
      try {
        const buffer = await renderHtmlToPdf(full, { pageNumbers: settings?.header.pageNumbers })
        files.push({ name: exportFileName(doc.name, row.num), buffer })
      } catch (err2) {
        await db.insert(exportLogs).values({
          id: crypto.randomUUID(),
          documentId: id,
          rowId: row.id,
          rowLabel: `Row ${row.num}`,
          reasonCode: 'RENDER_ERROR',
          detail: err2 instanceof Error ? err2.message : String(err2),
          createdAt: now(),
        })
        skips.push(row.num)
      }
    }
  }

  const summary = { generated: files.length, skipped: skips.length }

  if (files.length === 1 && !body?.all) {
    return new NextResponse(files[0].buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${files[0].name}"`,
        'X-Export-Summary': b64url(summary),
      },
    })
  }

  if (files.length === 0) {
    return NextResponse.json({ ...summary, blocked: null })
  }

  const zipStream = await buildZip(files)
  return new NextResponse(zipStream as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${exportFileName(doc.name, Date.now()).replace(/\.pdf$/, '.zip')}"`,
      'X-Export-Summary': b64url(summary),
    },
  })
}
