export interface AiObservation {
  original: string
  suggestion: string
  reason: string
}

export type AiReviewResult =
  | { ok: true; observations: AiObservation[] }
  | { ok: false; error: string }

interface AiCredentials {
  baseUrl: string
  apiKey: string
}

function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : content
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('no JSON array in response')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function reviewText(text: string, cfg: AiCredentials): Promise<AiReviewResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a writing reviewer for Spanish and English documents. Return ONLY a JSON array of issues found in the user text. Each item: {"original": "<exact substring from the text>", "suggestion": "<corrected substring>", "reason": "<short explanation>"}. If the text is correct, return [].',
          },
          { role: 'user', content: text },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      if (res.status === 401) return { ok: false, error: 'invalid API key' }
      return { ok: false, error: `provider error ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` }
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    const parsed = extractJson(content) as AiObservation[]
    if (!Array.isArray(parsed)) throw new Error('unexpected response shape')

    return {
      ok: true,
      observations: parsed.filter(
        (o) => typeof o.original === 'string' && typeof o.suggestion === 'string',
      ),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg.includes('aborted') ? 'request timed out' : msg }
  } finally {
    clearTimeout(timeout)
  }
}
