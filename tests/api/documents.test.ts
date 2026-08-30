import { describe, expect, it } from 'vitest'
import { DELETE, GET, PATCH } from '../../src/app/api/documents/[id]/route'
import { GET as LIST, POST as CREATE } from '../../src/app/api/documents/route'
import { db } from '../../src/server/db'
import { datasets } from '../../src/server/schema'
import { eq } from 'drizzle-orm'

const json = async (r: Response) => ({ status: r.status, body: await r.json() })
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function createDoc(name = 'Contract A', formatType = 'blank') {
  const r = await CREATE(
    new Request('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({ name, formatType }),
    }),
  )
  return json(r)
}

describe('documents API', () => {
  it('creates a document with linked dataset and preset content', async () => {
    const created = await createDoc('Contract A', 'letter')
    expect(created.status).toBe(201)
    expect(created.body.name).toBe('Contract A')
    expect(created.body.datasetId).toBeTruthy()
    expect(created.body.contentHtml).toBe('')

    const ds = await db.select().from(datasets).where(eq(datasets.id, created.body.datasetId))
    expect(ds).toHaveLength(1)
    expect(ds[0].documentId).toBe(created.body.id)
  })

  it('rejects invalid payloads with 400', async () => {
    const emptyName = await json(
      await CREATE(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ name: '', formatType: 'blank' }),
        }),
      ),
    )
    expect(emptyName.status).toBe(400)

    const unknownFormat = await json(
      await CREATE(
        new Request('http://x', {
          method: 'POST',
          body: JSON.stringify({ name: 'X', formatType: 'resume' }),
        }),
      ),
    )
    expect(unknownFormat.status).toBe(201)
    expect(unknownFormat.body.formatType).toBe('blank')
    expect(unknownFormat.body.contentHtml).toBe('')
  })


  it('lists documents ordered by updatedAt desc', async () => {
    await createDoc('Older')
    await createDoc('Newer')
    const list = await json(await LIST(new Request('http://x')))
    expect(list.status).toBe(200)
    const names = list.body.map((d: { name: string }) => d.name)
    expect(names.indexOf('Newer')).toBeLessThan(names.indexOf('Older'))
  })

  it('patches name and content; validates settings', async () => {
    const doc = (await createDoc('ToRename')).body
    const ok = await json(await PATCH(new Request('http://x', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Renamed',
        contentHtml: '<p>x</p>',
        settings: {
          page: { size: 'Letter', marginMm: { top: 10, right: 10, bottom: 10, left: 10 } },
          header: { enabled: false, logoPath: null, pageNumbers: false },
          typography: { fontFamily: 'serif', bodySizePt: 12, bodyAlign: 'left', headingScalePt: { h1: 18, h2: 15, h3: 12 } },
        },
      }),
    }), ctx(doc.id)))
    expect(ok.status).toBe(200)
    expect(ok.body.name).toBe('Renamed')

    const bad = await json(await PATCH(new Request('http://x', {
      method: 'PATCH',
      body: JSON.stringify({ settings: { page: { size: 'B5' } } }),
    }), ctx(doc.id)))
    expect(bad.status).toBe(400)
  })

  it('deletes with cascade to dataset', async () => {
    const doc = (await createDoc('Doomed')).body
    const del = await DELETE(new Request('http://x'), ctx(doc.id))
    expect(del.status).toBe(204)
    expect((await db.select().from(datasets).where(eq(datasets.documentId, doc.id)))).toHaveLength(0)
    const gone = await json(await GET(new Request('http://x'), ctx(doc.id)))
    expect(gone.status).toBe(404)
  })

  it('returns 404 for unknown id', async () => {
    const r = await GET(new Request('http://x'), ctx('missing-id'))
    expect(r.status).toBe(404)
  })
})
