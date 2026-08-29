import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { appSettings } from '@/server/schema'
import { reviewText } from '@/server/aiClient'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string } | null
  const text = typeof body?.text === 'string' ? body.text : ''
  if (text.trim() === '') {
    return NextResponse.json({ ok: false, error: 'empty text' }, { status: 400 })
  }

  const [baseUrlRow] = await db.select().from(appSettings).where(eq(appSettings.key, 'ai_base_url'))
  const [keyRow] = await db.select().from(appSettings).where(eq(appSettings.key, 'ai_api_key'))

  if (!keyRow?.value) {
    return NextResponse.json(
      { ok: false, error: 'AI provider not configured' },
      { status: 400 },
    )
  }

  const result = await reviewText(text, {
    baseUrl: baseUrlRow?.value ?? 'https://api.openai.com/v1',
    apiKey: keyRow.value,
  })

  return NextResponse.json(result)
}
