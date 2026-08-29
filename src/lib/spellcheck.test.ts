import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSpellChecker } from './spellcheck'

const fsProvider = {
  async get(lang: 'es' | 'en') {
    const dir = path.join(process.cwd(), 'public', 'dictionaries')
    const file = lang === 'es' ? 'es_ES' : 'en_US'
    return {
      aff: readFileSync(path.join(dir, `${file}.aff`), 'utf-8'),
      dic: readFileSync(path.join(dir, `${file}.dic`), 'utf-8'),
    }
  },
}

describe('offline spellcheck (T043)', () => {
  it('flags Spanish misspellings and suggests corrections', async () => {
    const checker = await createSpellChecker(fsProvider)
    const issues = await checker.check('La caza del gato en la messa', 'es')
    const words = issues.map((i) => i.word)
    expect(words).toContain('messa')
    expect((issues.find((i) => i.word === 'messa')?.suggestions ?? []).join(',')).toContain('mesa')
  })

  it('flags English misspellings with suggestions', async () => {
    const checker = await createSpellChecker(fsProvider)
    const issues = await checker.check('the quick brown fox jumpd over', 'en')
    expect(issues.map((i) => i.word)).toContain('jumpd')
    expect((issues.find((i) => i.word === 'jumpd')?.suggestions ?? []).join(',').toLowerCase()).toContain('jump')
  })

  it('auto mode only flags words invalid in BOTH dictionaries', async () => {
    const checker = await createSpellChecker(fsProvider)
    const issues = await checker.check('hola world color colór', 'auto')
    const flagged = issues.map((i) => i.word)
    expect(flagged).not.toContain('hola')
    expect(flagged).not.toContain('world')
    expect(flagged).not.toContain('color')
  })

  it('reports offsets matching word positions', async () => {
    const checker = await createSpellChecker(fsProvider)
    const text = 'ok jumpd end'
    const issues = await checker.check(text, 'en')
    const target = issues.find((i) => i.word === 'jumpd')
    expect(text.slice(target!.offset, target!.offset + 5)).toBe('jumpd')
  })
})
