import { describe, expect, it, vi, afterEach } from 'vitest'
import { reviewText } from '../../src/server/aiClient'

afterEach(() => vi.unstubAllGlobals())

const okResponse = (content: string) =>
  new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200 },
  )

describe('aiClient (T046)', () => {
  it('returns parsed observations from a compliant provider', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      okResponse('```json\n[{"original":"teh cat","suggestion":"the cat","reason":"typo"}]\n```'),
    ))

    const res = await reviewText('teh cat', {
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-test',
    })
    expect(res).toEqual({
      ok: true,
      observations: [{ original: 'teh cat', suggestion: 'the cat', reason: 'typo' }],
    })
  })

  it('never leaks the api key in error messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('denied', { status: 401 })))
    const res = await reviewText('x', { baseUrl: 'https://x/v1', apiKey: 'sk-SUPERSECRET' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).not.toContain('sk-SUPERSECRET')
  })

  it('maps network failures to a friendly error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    }))
    const res = await reviewText('x', { baseUrl: 'https://x/v1', apiKey: 'k' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('ECONNREFUSED')
  })

  it('sends the bearer token to the configured base url only', async () => {
    const fetchMock = vi.fn(async () => okResponse('[]'))
    vi.stubGlobal('fetch', fetchMock)
    await reviewText('hola', { baseUrl: 'http://localhost:11434/v1', apiKey: 'local-key' })
    const [url, init] = (fetchMock.mock.calls[0] ?? []) as unknown as [string, RequestInit]
    expect(url).toBe('http://localhost:11434/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer local-key')
  })
})
