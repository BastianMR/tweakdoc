import { describe, expect, it } from 'vitest'
import { POST as INJECT } from '../../src/app/api/datasets/[id]/rows/route'
import { GET as GET_DS, PUT as PUT_DS } from '../../src/app/api/datasets/[id]/route'
import { POST as CREATE_DOC } from '../../src/app/api/documents/route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function setup() {
  const doc = (await (
    await CREATE_DOC(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ name: 'InjectDoc', formatType: 'blank' }),
      }),
    )
  ).json()) as { datasetId: string }

  await PUT_DS(
    new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({
        sheet: {
          columns: [
            { id: 'c1', name: 'Client' },
            { id: 'c2', name: 'Email' },
          ],
          rows: [],
        },
      }),
    }),
    ctx(doc.datasetId),
  )

  return doc.datasetId
}

describe('row injection API (T036)', () => {
  it('appends valid rows with monotonic numbers', async () => {
    const dsId = await setup()
    const res = await INJECT(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({
          rows: [
            { Client: 'Acme', Email: 'a@x.com' },
            { Client: 'Globex', Email: 'g@x.com' },
          ],
        }),
      }),
      ctx(dsId),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.added).toBe(2)
    expect(body.totalRows).toBe(2)

    const ds = await (await GET_DS(new Request('http://x'), ctx(dsId))).json()
    expect(ds.sheet.rows[0].num).toBe(1)
    expect(ds.sheet.rows[1].num).toBe(2)
    expect(ds.nextRowNumber).toBe(3)
  })

  it('rejects entirely when any row references an unknown column', async () => {
    const dsId = await setup()

    await INJECT(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ rows: [{ Client: 'Seed' }] }),
      }),
      ctx(dsId),
    )

    const bad = await INJECT(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({
          rows: [{ Client: 'B' }, { Phone: '555' }],
        }),
      }),
      ctx(dsId),
    )
    expect(bad.status).toBe(422)
    const body = await bad.json()
    expect(body.unknownColumns).toEqual(['Phone'])

    const ds = await (await GET_DS(new Request('http://x'), ctx(dsId))).json()
    expect(ds.sheet.rows).toHaveLength(1)
  })
})
