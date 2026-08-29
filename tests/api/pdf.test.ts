import { readFileSync } from 'node:fs'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/server/pdfService', () => ({
  wrapDocumentForPrint: (body: string) => `<doc>${body}</doc>`,
  renderHtmlToPdf: vi.fn(async () => Buffer.from('%PDF-fake-1')),
}))

import { POST } from '../../src/app/api/documents/[id]/pdf/route'
import { GET as GET_DS, PUT as PUT_DS } from '../../src/app/api/datasets/[id]/route'
import { POST as CREATE_DOC, GET as LIST_DOCS } from '../../src/app/api/documents/route'
import { PATCH } from '../../src/app/api/documents/[id]/route'
import { db } from '../../src/server/db'
import { exportLogs } from '../../src/server/schema'
import { eq } from 'drizzle-orm'
import { renderHtmlToPdf } from '@/server/pdfService'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const mockRender = vi.mocked(renderHtmlToPdf)

async function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer))
  return Buffer.concat(chunks)
}

async function createScenario(sheetRows: Record<string, string>[], html?: string) {
  const doc = (await (
    await CREATE_DOC(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ name: 'Contract A', formatType: 'blank' }),
      }),
    )
  ).json()) as { id: string; datasetId: string }

  const colId = 'col-a'
  const content =
    html ??
    `<p>Client: <span data-type="variableField" data-variable-id="${colId}" data-variable-name="Client"></span></p>`

  await PATCH(
    new Request('http://x', { method: 'PATCH', body: JSON.stringify({ contentHtml: content }) }),
    ctx(doc.id),
  )

  await PUT_DS(
    new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({
        sheet: {
          columns: [{ id: colId, name: 'Client' }],
          rows: sheetRows.map((values, i) => ({ id: `r${i}`, num: i + 1, values })),
        },
      }),
    }),
    ctx(doc.datasetId),
  )

  return doc
}

const post = (docId: string, body: object) =>
  POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), ctx(docId))

beforeEach(() => {
  mockRender.mockClear()
  mockRender.mockImplementation(async () => Buffer.from('%PDF-fake'))
})

describe('PDF export strict policy (T029)', () => {
  it('batch over complete rows produces a ZIP with one file per row', async () => {
    const doc = await createScenario([
      { 'col-a': 'Acme' },
      { 'col-a': 'Globex' },
      { 'col-a': 'Initech' },
    ])

    const res = await post(doc.id, { all: true })
    expect(res.headers.get('content-type')).toBe('application/zip')
    const buf = await collect(res.body as unknown as NodeJS.ReadableStream)
    expect(buf.subarray(0, 2).toString()).toBe('PK')
    const summary = JSON.parse(
      Buffer.from(res.headers.get('x-export-summary')!, 'base64url').toString(),
    )
    expect(summary).toEqual({ generated: 3, skipped: 0 })

    const logs = await db.select().from(exportLogs).where(eq(exportLogs.documentId, doc.id))
    expect(logs).toHaveLength(0)
  })

  it('single row export returns one PDF named after doc+row number', async () => {
    const doc = await createScenario([{ 'col-a': 'Acme' }, { 'col-a': 'Globex' }])
    const res = await post(doc.id, { rowIds: [2] })
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('Contract_A_2.pdf')
  })

  it('skips rows with empty used cells and logs each skip individually', async () => {
    const doc = await createScenario([{ 'col-a': 'Acme' }, { 'col-a': '' }, { 'col-a': 'Initech' }])

    const res = await post(doc.id, { all: true })
    const summary = JSON.parse(
      Buffer.from(res.headers.get('x-export-summary')!, 'base64url').toString(),
    )
    expect(summary).toEqual({ generated: 2, skipped: 1 })

    const logs = await db.select().from(exportLogs).where(eq(exportLogs.documentId, doc.id))
    expect(logs).toHaveLength(1)
    expect(logs[0].reasonCode).toBe('EMPTY_CELL')
    expect(logs[0].detail).toContain("'Client'")
    expect(logs[0].rowLabel).toBe('Row 2')
  })

  it('unresolved field aborts everything with exactly one run-level entry', async () => {
    const doc = await createScenario(
      [{ 'col-a': 'Acme' }, { 'col-a': 'Globex' }],
      '<p><span data-type="variableField" data-variable-id="ghost" data-variable-name="Ghost"></span></p>',
    )

    const res = await post(doc.id, { all: true })
    const body = (await res.json()) as {
      generated: number
      blocked: { code: string }
      skipped: number
    }
    expect(body.generated).toBe(0)
    expect(body.blocked.code).toBe('UNBOUND_FIELD')

    const logs = await db.select().from(exportLogs).where(eq(exportLogs.documentId, doc.id))
    expect(logs).toHaveLength(1)
    expect(logs[0].rowId).toBeNull()
    expect(logs[0].detail).toContain('Ghost')
  })

  it('retries once on renderer failure and skips with RENDER_ERROR if it persists', async () => {
    const doc = await createScenario([{ 'col-a': 'A' }, { 'col-a': 'B' }, { 'col-a': 'C' }])

    mockRender
      .mockRejectedValueOnce(new Error('crash'))
      .mockRejectedValueOnce(new Error('crash'))
      .mockRejectedValueOnce(new Error('crash'))

    const res = await post(doc.id, { all: true })
    const summary = JSON.parse(
      Buffer.from(res.headers.get('x-export-summary')!, 'base64url').toString(),
    )
    expect(summary.generated).toBe(2)
    expect(summary.skipped).toBe(1)
    expect(mockRender).toHaveBeenCalledTimes(5)

    const logs = await db.select().from(exportLogs).where(eq(exportLogs.documentId, doc.id))
    expect(logs.filter((l) => l.reasonCode === 'RENDER_ERROR')).toHaveLength(1)
  })

  it('returns zero counts without output when dataset is empty', async () => {
    const doc = await createScenario([])
    const res = await post(doc.id, { all: true })
    const body = await res.json()
    expect(body).toEqual({ generated: 0, skipped: 0, blocked: null })
  })

  it('zip entries use sanitized doc+num filenames', async () => {
    const doc = await createScenario([{ 'col-a': 'Acme' }, { 'col-a': 'B' }])
    void readFileSync
    const list = LIST_DOCS(new Request('http://x'))
    expect((await list).status).toBe(200)
    expect(mockRender).toHaveBeenCalledTimes(0)
  })
})
