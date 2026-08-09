import { useDocuverse } from '../cvs/store'
import { flinkColor } from '../cvs/geometry'
import { PdfUploadPanel } from './PdfUploadPanel'
import { OcrEditPanel } from './OcrEditPanel'

export function HUD() {
  const pages = useDocuverse((s) => s.pages)
  const currentStrand = useDocuverse((s) => s.currentStrand)
  const companionStrand = useDocuverse((s) => s.companionStrand)
  const connectionsOnCurrent = useDocuverse((s) => s.connectionsOnCurrent)
  const connectionCursor = useDocuverse((s) => s.connectionCursor)
  const currentConnectionId = useDocuverse((s) => s.currentConnectionId)
  const connections = useDocuverse((s) => s.connections)
  const corpus = useDocuverse((s) => s.corpus)
  const uploadLabel = useDocuverse((s) => s.uploadLabel)
  const setCorpus = useDocuverse((s) => s.setCorpus)
  const selectConnection = useDocuverse((s) => s.selectConnection)
  const stepConnection = useDocuverse((s) => s.stepConnection)
  const flipToCompanion = useDocuverse((s) => s.flipToCompanion)
  const swapPages = useDocuverse((s) => s.swapPages)
  const swoopToPage = useDocuverse((s) => s.swoopToPage)
  const stepPage = useDocuverse((s) => s.stepPage)
  const runOcrOnCurrentPage = useDocuverse((s) => s.runOcrOnCurrentPage)
  const closeOcrPanel = useDocuverse((s) => s.closeOcrPanel)
  const ocrOpen = useDocuverse((s) => s.ocrOpen)
  const ocrBusy = useDocuverse((s) => s.ocrBusy)
  const ocrError = useDocuverse((s) => s.ocrError)
  const ocrByStrand = useDocuverse((s) => s.ocrByStrand)
  const setWorkbenchOpen = useDocuverse((s) => s.setWorkbenchOpen)

  const current = pages[currentStrand]
  const companion = pages[companionStrand]
  const curConn = connections.find((c) => c.id === currentConnectionId)

  return (
    <div className="hud">
      <header className="hud-brand">
        <div className="brand-mark">DOCUMVERSE</div>
        <div className="brand-sub">Ted Nelson · CVS 连接宇宙</div>
        <div className="mode-toggle workspace">
          <button
            type="button"
            onClick={() => useDocuverse.getState().setWorkspaceMode('flat')}
          >
            原页标注
          </button>
          <button type="button" className="active">
            球面探索
          </button>
        </div>
        <button
          type="button"
          className="upload-btn hud-workbench-launch"
          onClick={() => setWorkbenchOpen(true)}
        >
          打开工作台（空格）
        </button>
        <div className="mode-toggle corpus">
          <button
            className={corpus === 'pdf' ? 'active' : ''}
            type="button"
            onClick={() => setCorpus('pdf')}
          >
            专利 PDF 页
          </button>
          <button
            className={corpus === 'origins' ? 'active' : ''}
            type="button"
            onClick={() => setCorpus('origins')}
          >
            Origins 文本
          </button>
          {uploadLabel && (
            <button
              className={corpus === 'upload' ? 'active' : ''}
              type="button"
              onClick={() => setCorpus('upload')}
            >
              我的 PDF
            </button>
          )}
        </div>
      </header>

      <PdfUploadPanel />

      <section className="hud-panel">
        <h2>阅读平面</h2>
        <p>
          <span className="tag current">Current</span>
          {current?.title}
        </p>
        <p>
          <span className="tag companion">Companion</span>
          {companion?.title}
        </p>
        <p className="meta">
          用户射线 {connectionCursor + 1}/{connectionsOnCurrent.length} · 全库{' '}
          {connections.length}
        </p>
        {curConn && (
          <p className="meta">
            {curConn.kind === 'transclusion'
              ? 'Transclusion'
              : `Flink:${curConn.flinkType}`}{' '}
            · strand {curConn.fromStrand}→{curConn.toStrand}
            {curConn.comment ? ` · ${curConn.comment}` : ''}
          </p>
        )}
        <div className="ocr-actions">
          <button
            type="button"
            className="upload-btn"
            disabled={ocrBusy || !current?.imageUrl}
            onClick={() => void runOcrOnCurrentPage()}
          >
            {ocrBusy
              ? 'OCR 识别中…'
              : ocrByStrand[currentStrand]
                ? '打开 OCR 对照'
                : '对本页 OCR（同平面对照）'}
          </button>
          {ocrByStrand[currentStrand] && (
            <button
              type="button"
              className="corpus-chip"
              disabled={ocrBusy || !current?.imageUrl}
              onClick={() => void runOcrOnCurrentPage({ force: true })}
            >
              重新识别（校准）
            </button>
          )}
          {ocrOpen && (
            <button type="button" className="corpus-chip" onClick={closeOcrPanel}>
              关闭 OCR 面板
            </button>
          )}
          {ocrError && <p className="upload-error">{ocrError}</p>}
          <p className="hint">
            OCR → 确认 → 密封绑定。紫线建联：空格工作台 · 先选 A 再选 B · 关联台观察候选。
          </p>
        </div>
      </section>

      <OcrEditPanel />

      <section className="hud-panel pages">
        <h2>全部页面 · 点击穿越</h2>
        <div className="page-step">
          <button type="button" onClick={() => stepPage(-1)}>
            [ · 上页
          </button>
          <button type="button" onClick={() => stepPage(1)}>
            ] · 下页
          </button>
        </div>
        <ul className="page-roster">
          {pages.map((p) => (
            <li key={p.strandIndex}>
              <button
                type="button"
                className={
                  p.strandIndex === currentStrand
                    ? 'active current'
                    : p.strandIndex === companionStrand
                      ? 'active companion'
                      : ''
                }
                onClick={() => swoopToPage(p.strandIndex)}
              >
                {p.strandIndex}. {p.title.replace(/\.txt$/i, '')}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="hud-panel links">
        <h2>本页用户射线</h2>
        {connectionsOnCurrent.length === 0 ? (
          <p className="hint">
            尚无用户射线。在「永久绑定 · 用户射线」中手动添加。
          </p>
        ) : (
          <ul>
            {connectionsOnCurrent.map((c, i) => {
              const other =
                c.fromStrand === currentStrand ? c.toStrand : c.fromStrand
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={c.id === currentConnectionId ? 'active' : ''}
                    onClick={() => selectConnection(c.id)}
                    onDoubleClick={() => {
                      selectConnection(c.id)
                      swoopToPage(other)
                    }}
                    style={{
                      borderLeftColor:
                        c.kind === 'transclusion'
                          ? '#ffd700'
                          : flinkColor(c.flinkType),
                    }}
                  >
                    {i + 1}.{' '}
                    {c.kind === 'transclusion' ? 'TX' : c.flinkType} → s{other}
                    {c.comment ? ` · ${c.comment.slice(0, 28)}` : ''}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="hint">单击高亮伴页 · 双击穿越到对端</p>
      </section>

      <section className="hud-panel keys">
        <h2>专利导航键</h2>
        <div className="key-grid">
          <button type="button" onClick={() => stepConnection(1)}>
            C · 下一连接
          </button>
          <button type="button" onClick={() => stepConnection(-1)}>
            E · 上一连接
          </button>
          <button type="button" onClick={flipToCompanion}>
            F · 穿越
          </button>
          <button type="button" onClick={swapPages}>
            S · 交换主伴
          </button>
        </div>
        <p className="hint">
          球面宇宙：右键滑外球写机位轴 · 滚轮改半径 · Enter
          锁强调为建联 A · 右下角星图点 B
        </p>
      </section>
    </div>
  )
}
