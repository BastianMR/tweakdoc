import { describe, expect, it } from 'vitest'
import { POST as CREATE } from '../../src/app/api/documents/route'
import { GET as GET_DOC, PATCH } from '../../src/app/api/documents/[id]/route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function create(formatType: string) {
  const res = await CREATE(
    new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: `Preset ${formatType}`, formatType }),
    }),
  )
  return (await res.json()) as { id: string; contentHtml: string }
}

describe('structure presets (T039)', () => {
  it('official letter skeleton contains reference/subject/signature and stays editable', async () => {
    const doc = await create('official_letter')
    expect(doc.contentHtml.toLowerCase()).toContain('ref:')
    expect(doc.contentHtml.toLowerCase()).toContain('subject:')
    expect(doc.contentHtml.toLowerCase()).toContain('signature')

    const patched = await PATCH(
      new Request('http://x', {
        method: 'PATCH',
        body: JSON.stringify({ contentHtml: '<p>custom body</p>' }),
      }),
      ctx(doc.id),
    )
    const saved = (await patched.json()) as { contentHtml: string }
    expect(saved.contentHtml).toBe('<p>custom body</p>')
  })

  it('each format yields its distinct skeleton; blank starts empty', async () => {
    const blank = await create('blank')
    const letter = await create('letter')
    expect(blank.contentHtml).toBe('')
    expect(letter.contentHtml).toContain('<h1>')
    expect(letter.contentHtml).not.toBe(blank.contentHtml)

    const fetched = (await (
      await GET_DOC(new Request('http://x'), ctx(letter.id))
    ).json()) as { contentHtml: string }
    expect(fetched.contentHtml).toContain('<h1>')
  })
})
