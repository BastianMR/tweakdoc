import { describe, expect, it } from 'vitest'
import { GET as GET_DS, PUT as PUT_DS } from '../../src/app/api/datasets/[id]/route'
import { POST as IMPORT } from '../../src/app/api/datasets/[id]/import/route'
import { POST as CREATE } from '../../src/app/api/documents/route'
import { db } from '../../src/server/db'
import { datasets } from '../../src/server/schema'
import { eq } from 'drizzle-orm'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function createDocWithDataset() {
  const r = await CREATE(
    new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name: 'DS Doc', formatType: 'blank' }),
    }),
  )
  return (await r.json()) as { id: string; datasetId: string }
}

describe('dataset GET/PUT (T021)', () => {
  it('returns empty sheet initially', async () => {
    const { datasetId } = await createDocWithDataset()
    const res = await GET_DS(new Request('http://x'), ctx(datasetId))
    const body = await res.json()
    expect(body.sheet.columns).toEqual([])
    expect(body.sheet.rows).toEqual([])
    expect(body.nextRowNumber).toBe(1)
  })

  it('saves a sheet and returns savedAt', async () => {
    const { datasetId } = await createDocWithDataset()
    const sheet = {
      columns: [{ id: 'c1', name: 'Client' }],
      rows: [{ id: 'r1', num: 1, values: { c1: 'Acme' } }],
    }
    const res = await PUT_DS(
      new Request('http://x', {
        method: 'PUT',
        body: JSON.stringify({ sheet }),
      }),
      ctx(datasetId),
    )
    expect(res.status).toBe(200)
    const again = await (await GET_DS(new Request('http://x'), ctx(datasetId))).json()
    expect(again.sheet.rows[0].values.c1).toBe('Acme')
    expect(again.nextRowNumber).toBe(2)
  })

  it('rejects stale save with 409 when expectedNextRowNumber mismatches', async () => {
    const { datasetId } = await createDocWithDataset()
    const sheet = { columns: [], rows: [] }
    await PUT_DS(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ sheet, expectedNextRowNumber: 1 }) }),
      ctx(datasetId),
    )

    await db
      .update(datasets)
      .set({ nextRowNumber: 5 })
      .where(eq(datasets.id, datasetId))

    const stale = await PUT_DS(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ sheet, expectedNextRowNumber: 1 }) }),
      ctx(datasetId),
    )
    expect(stale.status).toBe(409)
    const body = await stale.json()
    expect(body.currentNextRowNumber).toBe(5)
  })
})

describe('import endpoint (T022)', () => {
  it('replaces sheet with CSV contents and continues numbering', async () => {
    const { id: docId, datasetId } = await createDocWithDataset()

    const csv = new File([Buffer.from('Client,Amount\nAcme SA,1200\n')], 'data.csv', {
      type: 'text/csv',
    })
    const form = new FormData()
    form.append('file', csv)

    const res = await IMPORT(new Request('http://x', { method: 'POST', body: form }), ctx(datasetId))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.rowsAdded).toBe(1)
    expect(body.renamedColumns).toEqual([])

    const ds = (
      await db.select().from(datasets).where(eq(datasets.id, datasetId))
    )[0]
    const sheet = JSON.parse(ds.sheetJson) as { rows: { num: number }[] }
    expect(sheet.rows[0].num).toBe(1)
    expect(docId).toBeTruthy()
  })

  it('rejects unsupported extensions with 415', async () => {
    const { datasetId } = await createDocWithDataset()
    const file = new File([Buffer.from('x')], 'data.pdf', { type: 'application/pdf' })
    const form = new FormData()
    form.append('file', file)
    const res = await IMPORT(new Request('http://x', { method: 'POST', body: form }), ctx(datasetId))
    expect(res.status).toBe(415)
  })
})
