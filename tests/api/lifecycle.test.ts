import { describe, expect, it } from 'vitest'
import { GET as LIST, POST as CREATE } from '../../src/app/api/documents/route'
import { DELETE } from '../../src/app/api/documents/[id]/route'
import { PUT as PATCH_DS } from '../../src/app/api/datasets/[id]/route'
import { db } from '../../src/server/db'
import { datasets, exportLogs } from '../../src/server/schema'
import { eq } from 'drizzle-orm'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function create(name: string) {
  const res = await CREATE(
    new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ name, formatType: 'blank' }),
    }),
  )
  return (await res.json()) as { id: string; datasetId: string }
}

describe('multi-document lifecycle (T035)', () => {
  it('creates three, deletes one with full cascade, lists the rest', async () => {
    const a = await create('Contract A')
    const b = await create('Invoice B')
    const c = await create('Letter C')

    await db.insert(exportLogs).values({
      id: crypto.randomUUID(),
      documentId: c.id,
      rowId: null,
      rowLabel: 'run',
      reasonCode: 'UNBOUND_FIELD',
      detail: 'seed',
      createdAt: new Date().toISOString(),
    })

    await PATCH_DS(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ sheet: { columns: [{ id: 'x', name: 'X' }], rows: [] } }) }),
      ctx(b.datasetId),
    )

    const del = await DELETE(new Request('http://x'), ctx(c.id))
    expect(del.status).toBe(204)

    const list = (await (await LIST(new Request('http://x'))).json()) as { id: string; name: string }[]
    expect(list.some((d) => d.id === c.id)).toBe(false)
    expect(list.some((d) => d.id === a.id)).toBe(true)
    expect(list.some((d) => d.id === b.id)).toBe(true)
    expect(list.find((d) => d.name === 'Letter C')).toBeUndefined()

    expect(await db.select().from(datasets).where(eq(datasets.documentId, c.id))).toHaveLength(0)
    expect(await db.select().from(exportLogs).where(eq(exportLogs.documentId, c.id))).toHaveLength(0)

    void ctx
  })
})
