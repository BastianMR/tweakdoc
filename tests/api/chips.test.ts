import { describe, expect, it } from 'vitest'
import { GET, PATCH } from '../../src/app/api/documents/[id]/route'
import { POST as CREATE } from '../../src/app/api/documents/route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

const CHIP_HTML =
  '<p>Agreement between <span data-type="variableField" data-variable-id="col-1" data-variable-name="Client"></span> and <span data-type="variableField" data-variable-id="" data-variable-name="Future" data-unbound="true"></span>.</p>'

describe('chip persistence (T020)', () => {
  it('saves and returns document HTML containing canonical chips', async () => {
    const created = (
      await (
        await CREATE(
          new Request('http://x', {
            method: 'POST',
            body: JSON.stringify({ name: 'ChipDoc', formatType: 'blank' }),
          }),
        )
      ).json()
    ) as { id: string }

    const patched = await PATCH(
      new Request('http://x', {
        method: 'PATCH',
        body: JSON.stringify({ contentHtml: CHIP_HTML }),
      }),
      ctx(created.id),
    )
    expect(patched.status).toBe(200)

    const fetched = (await (await GET(new Request('http://x'), ctx(created.id))).json()) as {
      contentHtml: string
    }
    expect(fetched.contentHtml).toContain('data-variable-id="col-1"')
    expect(fetched.contentHtml).toContain('data-variable-name="Client"')
    expect(fetched.contentHtml).toContain('data-unbound="true"')
  })
})
