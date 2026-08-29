import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { exportLogs } from '@/server/schema'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params
  const logs = await db
    .select()
    .from(exportLogs)
    .where(eq(exportLogs.documentId, id))
    .orderBy(desc(exportLogs.createdAt))
  return NextResponse.json(logs)
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params
  await db.delete(exportLogs).where(eq(exportLogs.documentId, id))
  return new NextResponse(null, { status: 204 })
}
