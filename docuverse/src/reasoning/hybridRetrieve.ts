/**
 * Lightweight hybrid retrieval over A1 atoms: BM25 (sparse) + dense cosine.
 * Results still map 1:1 to existing place atoms / key* — never invent locks.
 */

interface SearchAtom {
  kind: string
  content: string
  faces: {
    text?: { content: string }
    fig?: { note: string }
  }
}

export function atomSearchText(input: SearchAtom): string {
  const text = input.faces.text?.content?.trim()
  if (text && text.length >= 8) return text
  // Prefer stream content over fig boilerplate
  const raw = input.content.trim()
  if (raw && !raw.startsWith('[FIG:') && raw.length >= 8) return raw
  if (text) return text
  const note = input.faces.fig?.note?.trim() ?? ''
  // Strip generic template lines that create hub attractors
  return note
    .replace(/请依据可见版面回答[^。]*。?/g, '')
    .replace(/勿编造未提供的文字[^。]*。?/g, '')
    .replace(/无文字层\/未OCR[^。]*。?/g, '')
    .trim()
}

/** CJK unigrams/bigrams + latin/number tokens */
export function tokenizeQuery(text: string): string[] {
  const norm = text.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!norm) return []
  const out: string[] = []
  const latin = norm.match(/[a-z0-9]{2,}/g)
  if (latin) out.push(...latin)
  const cjk = norm.replace(/[a-z0-9\s.,;:!?'"()[\]{}<>/\\|_+=\-@#$%^&*`~]+/g, '')
  for (let i = 0; i < cjk.length; i++) {
    out.push(cjk[i])
    if (i + 1 < cjk.length) out.push(cjk.slice(i, i + 2))
  }
  return out
}

function tokenizeDoc(text: string): string[] {
  return tokenizeQuery(text)
}

export function isRetrievableAtom(input: SearchAtom): boolean {
  const t = atomSearchText(input)
  if (t.length < 4) return false
  // Drop near-empty fig placeholders
  if (input.kind === 'fig' && t.length < 24 && !input.faces.text) return false
  return true
}

function bm25Scores(
  queryTokens: string[],
  docs: string[],
): number[] {
  const N = docs.length
  if (N === 0 || queryTokens.length === 0) return docs.map(() => 0)

  const tokenized = docs.map(tokenizeDoc)
  const df = new Map<string, number>()
  for (const toks of tokenized) {
    const uniq = new Set(toks)
    for (const t of uniq) df.set(t, (df.get(t) ?? 0) + 1)
  }

  let avgdl = 0
  for (const toks of tokenized) avgdl += toks.length
  avgdl = avgdl / N || 1

  const k1 = 1.2
  const b = 0.75
  const qSet = [...new Set(queryTokens)]

  return tokenized.map((toks) => {
    const tf = new Map<string, number>()
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1)
    const dl = toks.length || 1
    let score = 0
    for (const term of qSet) {
      const f = tf.get(term) ?? 0
      if (f === 0) continue
      const n = df.get(term) ?? 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      const denom = f + k1 * (1 - b + (b * dl) / avgdl)
      score += idf * ((f * (k1 + 1)) / denom)
    }
    return score
  })
}

function minMaxNorm(xs: number[]): number[] {
  let lo = Infinity
  let hi = -Infinity
  for (const x of xs) {
    if (x < lo) lo = x
    if (x > hi) hi = x
  }
  const span = hi - lo
  if (!(span > 1e-12)) return xs.map(() => 0)
  return xs.map((x) => (x - lo) / span)
}

export interface HybridHit {
  index: number
  dense: number
  sparse: number
  fused: number
}

/**
 * Fuse dense cosine + BM25 over the same candidate pool (by index into arrays).
 */
export function hybridRank(input: {
  denseScores: number[]
  docTexts: string[]
  query: string
  /** weight on dense in [0,1]; sparse gets 1-denseWeight */
  denseWeight?: number
  topK: number
}): HybridHit[] {
  const denseWeight = input.denseWeight ?? 0.55
  const sparseRaw = bm25Scores(tokenizeQuery(input.query), input.docTexts)
  const denseN = minMaxNorm(input.denseScores)
  const sparseN = minMaxNorm(sparseRaw)
  const hits: HybridHit[] = []
  for (let i = 0; i < input.docTexts.length; i++) {
    const dense = denseN[i] ?? 0
    const sparse = sparseN[i] ?? 0
    const fused = denseWeight * dense + (1 - denseWeight) * sparse
    hits.push({
      index: i,
      dense: input.denseScores[i] ?? 0,
      sparse: sparseRaw[i] ?? 0,
      fused,
    })
  }
  hits.sort((a, b) => b.fused - a.fused)
  return hits.slice(0, input.topK)
}

/** True when top-1 is clearly ahead of top-2 (safe auto-suggest only). */
export function scoreGapAllowsAutoLock(
  scores: number[],
  minGap = 0.08,
  minTop = 0.42,
): boolean {
  if (scores.length === 0) return false
  const top = scores[0]
  if (top < minTop) return false
  if (scores.length === 1) return top >= minTop + 0.1
  return top - scores[1] >= minGap
}
