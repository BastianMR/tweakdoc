import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { appSettings } from '@/server/schema'

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key))
  return row?.value ?? null
}

export async function GET() {
  return NextResponse.json({
    aiBaseUrl: (await getSetting('ai_base_url')) ?? 'https://api.openai.com/v1',
    aiConfigured: !!(await getSetting('ai_api_key')),
  })
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    aiBaseUrl?: string
    aiApiKey?: string
  } | null

  if (!body) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  for (const [key, value] of Object.entries(body) as [string, string][]) {
    if (value === undefined || value === null || value === '') continue
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } })
  }

  return NextResponse.json({
    aiBaseUrl: (await getSetting('ai_base_url')) ?? 'https://api.openai.com/v1',
    aiConfigured: !!(await getSetting('ai_api_key')),
  })
}
