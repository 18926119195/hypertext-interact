import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const app = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({
  root: app,
  configFile: false,
  envFile: false,
  logLevel: 'silent',
  server: { middlewareMode: true, watch: null, ws: false },
})
const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
})
const fetches = []
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body)
  fetches.push({ url: String(url), body })
  const content = body.temperature === 0
    ? '{"terms":["retrieval", "closure"]}'
    : '推理路径：审查切片\n结论：保留出处'
  return Response.json({ choices: [{ message: { content } }] })
}

try {
  const [a1, store, bundleModule, llm, runtime, slotExport, ocr] = await Promise.all(
    ['pipelineA', 'closureStore', 'bundle', 'llmClient', 'modelRuntimeConfig', 'slotDatasetExport']
      .map((module) => server.ssrLoadModule(`/src/reasoning/${module}.ts`))
      .concat(server.ssrLoadModule('/src/data/ocrService.ts')),
  )
  const docId = 'smoke-book'
  const pages = [
    { strandIndex: 0, title: 'Page A', text: '', imageUrl: 'fixture/page-a.png' },
    { strandIndex: 1, title: 'Page B', text: '', imageUrl: 'fixture/page-b.png', textChunks: [
      { id: 'pdf', content: 'Completely separate content about cell division.', bbox: [20, 30, 950, 200] },
    ] },
    { strandIndex: 2, title: 'Page C', text: '', imageUrl: 'fixture/page-c.png' },
  ]
  const createBlock = (id, index, label, content, bbox) => ({
    id, index, slotK: index, label, content, sourceContent: content, bbox, cutBound: true, confirmed: false,
  })
  const ocrByStrand = { 0: { strandIndex: 0, blocks: [
    createBlock('ocr-chart', 0, 'chart', 'Publication trend visualization', [30, 35, 350, 200]),
    createBlock('ocr-body', 1, 'text', 'Retrieval closure evidence book context.', [40, 250, 700, 430]),
  ] } }
  const index = a1.buildBookIndex({ docId, pages, ocrByStrand })
  const box = index.chunks.find((chunk) => chunk.id === 'ocr-body')
  assert.deepEqual(box.bbox, [40, 250, 700, 430])
  assert.equal(index.chunks.filter((chunk) => chunk.source === 'pdf_text').length, 1)
  assert.deepEqual(index.chunks.find((chunk) => chunk.page === 2).bbox, [0, 0, 1000, 1000])
  const pixelBbox = ocr.normalizeBboxToThousand([20, 30, 200, 250], 2000, 1000)
  assert.deepEqual(pixelBbox, [10, 30, 100, 250])
  const exportRows = slotExport.collectPageSlotRows({ experimentId: 'audit', docId, page: 0, ocr: ocrByStrand[0], bookIndex: index })
  const exported = exportRows.find((row) => row.T === box.content)
  console.log(`OBSERVED mixed OCR page: export=${exported.slotId} A1=${box.key}`)
  assert.notEqual(exported.slotId, box.key)

  const candidateList = await a1.resolveVqToCandidates(index, 'retrieval closure', 4)
  const candidate = candidateList.candidates[0]
  assert.equal(candidate.R.key, box.key)
  assert.equal(candidateList.usedEmbedApi, false)
  assert.deepEqual(candidate.boxes[0].bbox, box.bbox)
  assert.equal(fetches.length, 0)
  const circled = a1.resolveCircleToR({ id: 'fixture-circle', strandIndex: 0, region: { polygon: [], aabb: box.bbox } }, index)
  assert.equal(circled.chosen.R.key, box.key)

  const state = () => store.useReasoning.getState()
  state().setCorpus(docId)
  state().activateResolved({ chosen: candidate, candidates: candidateList.candidates })
  const question = 'retrieval closure'
  const buildBundle = (forbid = []) => bundleModule.buildInferBundle({
    R: candidate.R, sourceExcerpt: candidate.excerpt, question, forbid,
  })
  const promptBundle = buildBundle()
  const mock = await llm.callLlmWithBundle(promptBundle)
  assert.equal(mock.usedMock, true)
  assert.equal(fetches.length, 0)
  state().rememberInferResult({ bundle: promptBundle, question, path: mock.path, conclusion: mock.conclusion })
  const matches = state().runLocalMatch(question)
  assert.equal(matches.length, 1)
  const { direction } = matches[0]
  state().chooseReuse(direction.directionId)
  assert.equal(state().lastConclusion, mock.conclusion)
  assert.equal(fetches.length, 0)
  state().toggleForbid(direction.directionId)
  assert.equal(state().consumePendingInferStay(), true)
  assert.equal(state().consumePendingInferStay(), false)
  const forbidBundle = buildBundle([direction])
  assert.equal(forbidBundle.forbidDirections.length, 1)
  assert.ok(bundleModule.bundleToPrompt(forbidBundle).includes(`勿沿此方向：问「${question}」`))
  state().toggleForbid(direction.directionId)
  assert.equal(state().consumePendingInferStay(), false)

  const config = runtime.defaultDualModelConfig()
  config.reason = { baseUrl: 'https://example.invalid/v1', apiKey: 'fixture-only', model: 'fixture' }
  runtime.saveDualModelConfig(config)
  const expanded = await a1.resolveVqToCandidates(index, '如何检索？', 4)
  assert.equal(expanded.candidates[0].R.key, box.key)
  assert.equal(fetches.length, 1)
  assert.equal(fetches[0].url, 'https://example.invalid/v1/chat/completions')
  assert.equal(fetches[0].body.temperature, 0)
  assert.equal(await llm.callLlmWithBundle(forbidBundle).then((result) => result.conclusion), '保留出处')
  assert.equal(fetches.length, 2)
  assert.equal(typeof fetches[1].body.messages[1].content, 'string')
  console.log('PASS A1 geometry, PDF/figure fallback, local hybrid recall, circle lock, mock infer, zero-fetch reuse, forbid bundle, query expansion and text-only API payload')
} finally {
  await server.close()
}
