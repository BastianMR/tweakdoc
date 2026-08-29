import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads')
const ALLOWED = /\.(png|jpe?g|gif|webp|svg)$/i

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!ALLOWED.test(file.name)) {
    return NextResponse.json(
      { error: 'unsupported_file_type', allowed: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
      { status: 415 },
    )
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
  const filename = `${crypto.randomUUID()}${path.extname(file.name)}`
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer)

  return NextResponse.json({ path: `data/uploads/${filename}` }, { status: 201 })
}
