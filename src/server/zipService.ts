import type { Readable } from 'node:stream'
import type { Archiver } from 'archiver'

type ArchiverFactory = (
  format: 'zip',
  options?: Record<string, unknown>,
) => Archiver

export interface ZipEntry {
  name: string
  buffer: Buffer
}

export async function buildZip(entries: ZipEntry[]): Promise<Readable> {
  const mod = (await import('archiver')) as unknown as Record<string, unknown>
  const archive = (mod.default ?? mod) as unknown as Archiver
  const factory = (typeof archive === 'function' ? archive : (archive as unknown as { default: ArchiverFactory }).default) as unknown as ArchiverFactory

  const zipper = factory('zip')
  for (const entry of entries) {
    zipper.append(entry.buffer, { name: entry.name })
  }
  void zipper.finalize()
  return zipper as unknown as Readable
}
