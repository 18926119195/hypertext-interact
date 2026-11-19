import { useRef, useState } from 'react'
import { importPdfFile } from '../data/pdfImport'
import { loadDualModelConfig } from '../reasoning/modelRuntimeConfig'
import { useIndexGate } from '../reasoning/indexGate'
import { useDocuverse } from '../cvs/store'

export function PdfUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const applyUploadedUniverse = useDocuverse((s) => s.applyUploadedUniverse)
  const clearWorkspaceAnnotations = useDocuverse((s) => s.clearWorkspaceAnnotations)
  const setUploadProgress = useDocuverse((s) => s.setUploadProgress)
  const uploadProgress = useDocuverse((s) => s.uploadProgress)
  const corpus = useDocuverse((s) => s.corpus)
  const uploadLabel = useDocuverse((s) => s.uploadLabel)
  const runOcrOnPagesLackingText = useDocuverse(
    (s) => s.runOcrOnPagesLackingText,
  )
  const setImporting = useIndexGate((s) => s.setImporting)
  const finalizeIndex = useIndexGate((s) => s.finalizeIndex)
  const setIndexError = useIndexGate((s) => s.setError)
  const resetIndex = useIndexGate((s) => s.reset)
  const indexPhase = useIndexGate((s) => s.phase)
  const indexMessage = useIndexGate((s) => s.message)
  const indexReady = useIndexGate((s) => s.ready)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('请选择 PDF 文件')
      return
    }
    setError(null)
    setBusy(true)
    resetIndex()
    setImporting('正在渲染 PDF…')
    try {
      const result = await importPdfFile(file, (p) => {
        setUploadProgress({
          current: p.current,
          total: p.total,
          message: p.message,
        })
      })
      applyUploadedUniverse(result)
      setUploadProgress(null)

      const cfg = loadDualModelConfig()
      const docId = `upload:${result.label}`
      // Always OCR pages without text layer (user pipeline: import → OCR → embed → ask)
      const shouldOcr = cfg.autoOcrOnUpload !== false
      if (shouldOcr) {
        useIndexGate.setState({
          phase: 'ocr',
          message: '正在 OCR 无文字页…',
          ready: false,
        })
        setUploadProgress({
          current: 0,
          total: 1,
          message: '上传完成 · 自动 OCR…',
        })
        const pageCount = useDocuverse.getState().pages.length
        const { done, failed } = await runOcrOnPagesLackingText({
          maxPages: Math.max(pageCount, 1),
          onProgress: (d, t, strand) => {
            setUploadProgress({
              current: d,
              total: t,
              message: `OCR ${d}/${t}（页 s${strand}）`,
            })
            useIndexGate.setState({
              phase: 'ocr',
              message: `OCR ${d}/${t}（页 s${strand}）`,
            })
          },
        })
        setUploadProgress(null)
        if (failed > 0) {
          setError(
            `OCR 完成 ${done} 页，失败 ${failed} 页；将继续用已有结果建索引`,
          )
        }
      }

      setUploadProgress({
        current: 0,
        total: 1,
        message: '正在 Embedding（审计）…',
      })
      const { pages, ocrByStrand } = useDocuverse.getState()
      await finalizeIndex({ docId, pages, ocrByStrand })
      setUploadProgress(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导入失败'
      setError(msg)
      setIndexError(msg)
      setUploadProgress(null)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="hud-panel upload">
      <h2>上传 PDF</h2>
      <p className="meta">
        流水线：导入 → OCR（无字页）→ Embedding → 就绪后才可 V_q 提问
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        className="upload-btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? '处理中…' : '选择 PDF 文件'}
      </button>
      <button
        type="button"
        className="corpus-chip"
        disabled={busy}
        title="清除强调圈、紫线、OCR 粘结与本地缓存；页面保留"
        onClick={() => {
          if (
            !window.confirm(
              '清除全部强调 / 连线 / 粘结标注？页面会保留，可继续导入或重画。',
            )
          ) {
            return
          }
          clearWorkspaceAnnotations()
          resetIndex()
        }}
      >
        清空标注
      </button>
      {(busy || indexPhase === 'ocr' || indexPhase === 'embedding') && (
        <p className="meta">{indexMessage}</p>
      )}
      {indexReady && (
        <p className="meta" style={{ color: '#5cffb1' }}>
          ✓ {indexMessage} · 可在右侧提问
        </p>
      )}
      {uploadProgress && (
        <div className="upload-progress">
          <div className="bar">
            <span
              style={{
                width:
                  uploadProgress.total > 0
                    ? `${Math.min(100, (100 * uploadProgress.current) / uploadProgress.total)}%`
                    : '30%',
              }}
            />
          </div>
          <p className="meta">{uploadProgress.message}</p>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {corpus === 'upload' && uploadLabel && (
        <p className="meta">当前：{uploadLabel}</p>
      )}
    </section>
  )
}
