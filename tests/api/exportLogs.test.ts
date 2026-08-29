import { describe, expect, it } from 'vitest'
import { DELETE, GET } from '../../src/app/api/documents/[id]/export-logs/route'
import { POST as CREATE_DOC } from '../../src/app/api/documents/route'
import { POST as RUN_PDF } from '../../src/app/api/documents/[id]/pdf/route'
import { PATCH } from '../../src/app/api/documents/[id]/route'
import { PUT as PUT_DS } from '../../src/app/api/datasets/[id]/route'
import { db } from '../../src/server/db'
import { exportLogs } from '../../src/server/schema'
import { eq } from 'drizzle-orm'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function createBrokenScenario() {
  const doc = (await (
    await CREATE_DOC(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ name: 'HealthDoc', formatType: 'blank' }),
      }),
    )
  ).json()) as { id: string; datasetId: string }

  await PATCH(
    new Request('http://x', {
      method: 'PATCH',
      body: JSON.stringify({
        contentHtml:
          '<span data-variable-id="c1" data-variable-name="Client"></span><span data-variable-id="ghost" data-variable-name="Ghost"></span>',
      }),
    }),
    ctx(doc.id),
  )
  await PUT_DS(
    new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({
        sheet: {
          columns: [{ id: 'c1', name: 'Client' }],
          rows: [
            { id: 'r1', num: 1, values: { c1: 'Acme' } },
            { id: 'r2', num: 2, values: { c1: '' } },
          ],
        },
      }),
    }),
    ctx(doc.datasetId),
  )

  await RUN_PDF(new Request('http://x', { method: 'POST', body: JSON.stringify({ all: true }) }), ctx(doc.id))
  return doc
}

describe('export logs API + health flow (T032)', () => {
  it('lists failures desc with reasons after a broken run', async () => {
    const doc = await createBrokenScenario()
    const res = await GET(new Request('http://x'), ctx(doc.id))
    const logs = (await res.json()) as { reasonCode: string; rowId: string | null; detail: string }[]

    expect(logs.length).toBeGreaterThanOrEqual(1)
    expect(logs.some((l) => l.reasonCode === 'UNBOUND_FIELD' && l.rowId === null)).toBe(true)
    expect(logs.filter((l) => l.reasonCode === 'UNBOUND_FIELD')).toHaveLength(1)
  })

  it('clears logs persistently', async () => {
    const doc = await createBrokenScenario()
    const del = await DELETE(new Request('http://x'), ctx(doc.id))
    expect(del.status).toBe(204)
    expect(await db.select().from(exportLogs).where(eq(exportLogs.documentId, doc.id))).toHaveLength(0)

    const again = await GET(new Request('http://x'), ctx(doc.id))
    expect((await again.json())).toHaveLength(0)
  })
})
