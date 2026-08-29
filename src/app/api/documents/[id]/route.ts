import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { documents } from '@/server/schema'
import { validateStyleSettings } from '@/lib/styleTokens'
import type { FormatType } from '@/lib/presets'

const FORMAT_TYPES: FormatType[] = ['blank', 'letter', 'official_letter']

const now = () => new Date().toISOString()

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params
  const [doc] = await db.select().from(documents).where(eq(documents.id, id))
  if (!doc) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json(doc)
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const body = await request.json().catch(() => null) as Record<string, unknown> | null

  const updates: Partial<typeof documents.$inferInsert> = { updatedAt: now() }

  if (typeof body?.name === 'string') {
    if (body.name.trim() === '') {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    updates.name = body.name.trim()
  }
  if (typeof body?.formatType === 'string') {
    if (!FORMAT_TYPES.includes(body.formatType as FormatType)) {
      return NextResponse.json({ error: 'invalid formatType' }, { status: 400 })
    }
    updates.formatType = body.formatType as FormatType
  }
  if (typeof body?.contentHtml === 'string') {
    updates.contentHtml = body.contentHtml
  }
  if (body?.settings !== undefined && body?.settings !== null) {
    try {
      updates.settingsJson = JSON.stringify(validateStyleSettings(body.settings as never))
    } catch (e) {
      return NextResponse.json(
        { error: 'invalid settings', detail: e instanceof Error ? e.message : String(e) },
        { status: 400 },
      )
    }
  }

  const [updated] = await db.update(documents).set(updates).where(eq(documents.id, id)).returning()
  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params
  await db.delete(documents).where(eq(documents.id, id))
  return new NextResponse(null, { status: 204 })
}
