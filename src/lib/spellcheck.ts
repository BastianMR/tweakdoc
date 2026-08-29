import nspellFactory from 'nspell'

interface NspellInstance {
  correct(word: string): boolean
  suggest(word: string): string[]
}

export type SpellLang = 'es' | 'en' | 'auto'

export interface SpellingIssue {
  word: string
  offset: number
  suggestions: string[]
}

export interface DictionaryProvider {
  get(lang: 'es' | 'en'): Promise<{ aff: string; dic: string }>
}

const WORD_RE = /[A-Za-zÁÉÍÓÚÑáéíóúñüÜ]+/g

export async function createSpellChecker(provider: DictionaryProvider) {
  const cache = new Map<'es' | 'en', NspellInstance>()

  async function instance(lang: 'es' | 'en'): Promise<NspellInstance> {
    const hit = cache.get(lang)
    if (hit) return hit
    const dicts = await provider.get(lang)
    const spell = nspellFactory(dicts.aff, dicts.dic)
    cache.set(lang, spell)
    return spell
  }

  return {
    async check(text: string, lang: SpellLang): Promise<SpellingIssue[]> {
      if (!text) return []
      const es = lang === 'es' || lang === 'auto' ? await instance('es') : null
      const en = lang === 'en' || lang === 'auto' ? await instance('en') : null

      const issues: SpellingIssue[] = []
      for (const match of text.matchAll(WORD_RE)) {
        const word = match[0]
        if (/^\d+$/.test(word)) continue
        if (word.length < 2) continue

        let valid = false
        let suggestions: string[] = []

        if (lang === 'es' && es) {
          if (es.correct(word)) valid = true
          else suggestions = es.suggest(word).slice(0, 4)
        } else if (lang === 'en' && en) {
          if (en.correct(word)) valid = true
          else suggestions = en.suggest(word).slice(0, 4)
        } else {
          const esOk = es ? es.correct(word) : false
          const enOk = en ? en.correct(word) : false
          if (esOk || enOk) {
            valid = true
          } else {
            suggestions = [
              ...(es ? es.suggest(word).slice(0, 2) : []),
              ...(en ? en.suggest(word).slice(0, 2) : []),
            ].slice(0, 4)
          }
        }

        if (!valid) {
          issues.push({ word, offset: match.index ?? 0, suggestions })
        }
      }
      return issues
    },
  }
}
