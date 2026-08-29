import { writeFileSync } from 'node:fs'

const BASE = process.env.E2E_BASE ?? 'http://localhost:3100'
const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`)
}

async function j(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return res
}

async function main() {
  // S1: create doc with official letter preset
  const created = await j('POST', '/api/documents', { name: 'E2E Contract', formatType: 'official_letter' })
  const doc = await created.json()
  record('S1 create document + preset skeleton', created.status === 201 && doc.contentHtml.includes('Ref:'))

  const datasetId = doc.datasetId

  // S1b: import CSV
  const csv = 'Client,Amount,Date\nAcme SA,1200,2026-08-23\nGlobex,800,\nInitech,300,2026-09-01\n'
  const form = new FormData()
  form.append('file', new File([Buffer.from(csv)], 'data.csv', { type: 'text/csv' }))
  const imp = await fetch(`${BASE}/api/datasets/${datasetId}/import`, { method: 'POST', body: form })
  const impBody = await imp.json()
  record('S1 import CSV (3 rows)', imp.status === 201 && impBody.rowsAdded === 3)

  // S1c: template with fields incl one empty-bound usage
  const patch = await j('PATCH', `/api/documents/${doc.id}`, {
    contentHtml:
      '<p>Agreement between <span data-type="variableField" data-variable-id="' +
      impBody.columns[0].id + '" data-variable-name="Client"></span> for <span data-type="variableField" data-variable-id="' +
      impBody.columns[1].id + '" data-variable-name="Amount"></span> USD on <span data-type="variableField" data-variable-id="' +
      impBody.columns[2].id + '" data-variable-name="Date"></span>.</p>',
  })
  record('S1 template saved with chips', patch.status === 200)

  // S2: dashboard health reflects 1 incomplete row (Globex has no Date)
  const health = await (await j('GET', `/api/documents/${doc.id}/health`)).json()
  record(
    'S2 health readiness 2/3 + unresolved 0',
    health.readyRows === 2 && health.unresolvedFields.length === 0,
    JSON.stringify(health).slice(0, 120),
  )

  // S2b: batch export skips row without Date
  const batch = await fetch(`${BASE}/api/documents/${doc.id}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  })
  const zip = Buffer.from(await batch.arrayBuffer())
  const summary = JSON.parse(Buffer.from(batch.headers.get('x-export-summary') ?? '', 'base64url').toString() || '{}')
  record(
    'S2 strict export: ZIP generated=2 skipped=1',
    batch.headers.get('content-type')?.includes('zip') && summary.generated === 2 && summary.skipped === 1 && zip.subarray(0, 2).toString() === 'PK',
    `${zip.length} bytes`,
  )

  const logs = await (await j('GET', `/api/documents/${doc.id}/export-logs`)).json()
  const emptyLog = Array.isArray(logs) ? logs.find((l) => l.reasonCode === 'EMPTY_CELL') : null
  record('S2 skip logged with reason', !!emptyLog && emptyLog.detail.includes("'Date'"))

  // S3: single PDF for row 1
  const single = await fetch(`${BASE}/api/documents/${doc.id}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rowIds: [1] }),
  })
  const pdf = Buffer.from(await single.arrayBuffer())
  const disposition = single.headers.get('content-disposition') ?? ''
  record(
    'S3 single PDF E2E_Contract_1.pdf valid header',
    pdf.subarray(0, 4).toString() === '%PDF' && disposition.includes('E2E_Contract_1.pdf'),
    `${pdf.length} bytes`,
  )

  // S4: injection API valid + invalid
  const injOk = await j('POST', `/api/datasets/${datasetId}/rows`, {
    rows: [
      { Client: 'Umbrella', Amount: '999', Date: '2026-10-01' },
      { Client: 'Wayne', Amount: '50', Date: '2026-10-02' },
    ],
  })
  record('S4 injection adds 2 rows', injOk.ok)

  const injBad = await j('POST', `/api/datasets/${datasetId}/rows`, {
    rows: [{ Phone: '555' }],
  })
  const badBody = await injBad.json()
  record(
    'S4 unknown column rejected 422 listing Phone',
    injBad.status === 422 && badBody.unknownColumns?.includes('Phone'),
  )

  // S5: unbound field blocks all with single run-level entry
  await j('PATCH', `/api/documents/${doc.id}`, {
    contentHtml:
      '<p><span data-type="variableField" data-variable-id="ghost" data-variable-name="Ghost"></span></p>',
  })
  const blocked = await j('POST', `/api/documents/${doc.id}/pdf`, { all: true })
  const blockedBody = await blocked.json()
  record(
    'S5 unbound → 0 PDFs, blocked payload',
    blockedBody.generated === 0 && blockedBody.blocked?.code === 'UNBOUND_FIELD',
  )
  await j('PATCH', `/api/documents/${doc.id}`, {
    contentHtml:
      '<p>Agreement between <span data-type="variableField" data-variable-id="' +
      impBody.columns[0].id + '" data-variable-name="Client"></span>.</p>',
  })

  // S6: perf batch 100 rows via injection then timed generation
  const bigRows = []
  for (let i = 0; i < 100; i++) {
    bigRows.push({ Client: `Perf ${i}`, Amount: String(i), Date: '2026-01-01' })
  }
  const t0 = Date.now()
  await j('POST', `/api/datasets/${datasetId}/rows`, { rows: bigRows })
  const perf = await fetch(`${BASE}/api/documents/${doc.id}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  })
  const perfZip = Buffer.from(await perf.arrayBuffer())
  const seconds = (Date.now() - t0) / 1000
  const perfSummary = JSON.parse(
    Buffer.from(perf.headers.get('x-export-summary') ?? '', 'base64url').toString() || '{"generated":0,"skipped":0}',
  )
  record(
    'S6 SC-002 batch ~100 rows < 5 min',
    seconds < 300 && perfSummary.generated >= 100 && perfZip.subarray(0, 2).toString() === 'PK',
    `${seconds.toFixed(1)}s · generated=${perfSummary.generated}`,
  )

  // S7: settings masking
  const settings = await (await j('GET', '/api/settings')).json()
  record(
    'S7 settings never expose api key',
    !('aiApiKey' in settings) && typeof settings.aiConfigured === 'boolean',
    JSON.stringify(settings),
  )

  writeFileSync('e2e-results.json', JSON.stringify(results, null, 2))
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} scenarios passed`)
  if (failed.length > 0) process.exit(1)
}

main().catch((e) => {
  console.error('E2E crashed:', e)
  process.exit(1)
})
