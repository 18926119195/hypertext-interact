/**
 * 轻量主路径：在 PDF 原页上圈强调、建联（同一套 page_norm 语义）。
 * 不进 3D；需要空间感 / 构建镜头时再切到球面。
 */

import { useCallback, useEffect, useMemo, useRef, type PointerEvent } from 'react'
import { PAGE_H, PAGE_W } from '../cvs/geometry'
import { useDocuverse } from '../cvs/store'
import {
  pagePointToLocal,
  polygonCentroid,
  type EmphasisEdge,
  type PagePoint,
} from '../data/emphasis'
import { PdfUploadPanel } from './PdfUploadPanel'

function pointInPolygon(pt: PagePoint, polygon: PagePoint[]): boolean {
  const [x, y] = pt
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const hit =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (hit) inside = !inside
  }
  return inside
}

function clientToPageNorm(
  clientX: number,
  clientY: number,
  el: HTMLElement,
): PagePoint {
  const r = el.getBoundingClientRect()
  const w = Math.max(r.width, 1)
  const h = Math.max(r.height, 1)
  return [
    Math.min(1000, Math.max(0, ((clientX - r.left) / w) * 1000)),
    Math.min(1000, Math.max(0, ((clientY - r.top) / h) * 1000)),
  ]
}

function polyToSvg(points: PagePoint[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
}

export function FlatPageWorkbench() {
  const surfaceRef = useRef<HTMLDivElement>(null)

  const pages = useDocuverse((s) => s.pages)
  const currentStrand = useDocuverse((s) => s.currentStrand)
  const emphasizeMode = useDocuverse((s) => s.emphasizeMode)
  const emphasisEdges = useDocuverse((s) => s.emphasisEdges)
  const emphasisLinks = useDocuverse((s) => s.emphasisLinks)
  const emphasisDraftPoints = useDocuverse((s) => s.emphasisDraftPoints)
  const selectedEmphasisId = useDocuverse((s) => s.selectedEmphasisId)
  const emphasisLinkFromId = useDocuverse((s) => s.emphasisLinkFromId)
  const corpus = useDocuverse((s) => s.corpus)
  const uploadLabel = useDocuverse((s) => s.uploadLabel)

  const setWorkspaceMode = useDocuverse((s) => s.setWorkspaceMode)
  const setCorpus = useDocuverse((s) => s.setCorpus)
  const stepPage = useDocuverse((s) => s.stepPage)
  const swoopToPage = useDocuverse((s) => s.swoopToPage)
  const aimEmphasizePage = useDocuverse((s) => s.aimEmphasizePage)
  const setEmphasizeMode = useDocuverse((s) => s.setEmphasizeMode)
  const clearEmphasisDraft = useDocuverse((s) => s.clearEmphasisDraft)
  const emphasisPointer = useDocuverse((s) => s.emphasisPointer)
  const selectEmphasis = useDocuverse((s) => s.selectEmphasis)
  const setEmphasisLinkFrom = useDocuverse((s) => s.setEmphasisLinkFrom)
  const createEmphasisLink = useDocuverse((s) => s.createEmphasisLink)
  const deleteEmphasis = useDocuverse((s) => s.deleteEmphasis)
  const deleteEmphasisLink = useDocuverse((s) => s.deleteEmphasisLink)
  const updateEmphasisLinkNote = useDocuverse((s) => s.updateEmphasisLinkNote)
  const enterConstructionLens = useDocuverse((s) => s.enterConstructionLens)

  const page = pages[currentStrand]
  const pageEdges = useMemo(
    () => emphasisEdges.filter((e) => e.strandIndex === currentStrand),
    [emphasisEdges, currentStrand],
  )

  useEffect(() => {
    document.body.classList.toggle('emphasize-pen-on', emphasizeMode)
    return () => {
      document.body.classList.remove('emphasize-pen-on')
    }
  }, [emphasizeMode])

  const selected = emphasisEdges.find((e) => e.id === selectedEmphasisId) ?? null
  const linkFrom = emphasisEdges.find((e) => e.id === emphasisLinkFromId) ?? null

  const emitPointer = useCallback(
    (e: PointerEvent, phase: 'down' | 'move' | 'up') => {
      const el = surfaceRef.current
      if (!el) return
      const norm = clientToPageNorm(e.clientX, e.clientY, el)
      const [lx, ly] = pagePointToLocal(norm, PAGE_W, PAGE_H)
      emphasisPointer(lx, ly, phase)
    },
    [emphasisPointer],
  )

  const hitEmphasis = useCallback(
    (pt: PagePoint): EmphasisEdge | null => {
      for (let i = pageEdges.length - 1; i >= 0; i--) {
        const edge = pageEdges[i]
        if (pointInPolygon(pt, edge.region.polygon)) return edge
      }
      return null
    },
    [pageEdges],
  )

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = surfaceRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)

    if (emphasizeMode) {
      aimEmphasizePage(currentStrand)
      emitPointer(e, 'down')
      return
    }

    const pt = clientToPageNorm(e.clientX, e.clientY, el)
    const hit = hitEmphasis(pt)
    if (!hit) {
      selectEmphasis(null)
      return
    }

    if (emphasisLinkFromId && emphasisLinkFromId !== hit.id) {
      createEmphasisLink(hit.id)
      return
    }

    selectEmphasis(hit.id)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!emphasizeMode) return
    if ((e.buttons & 1) === 0) return
    emitPointer(e, 'move')
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!emphasizeMode) return
    emitPointer(e, 'up')
  }

  const togglePen = () => {
    if (emphasizeMode) {
      clearEmphasisDraft()
      setEmphasizeMode(false)
    } else {
      aimEmphasizePage(currentStrand)
      setEmphasizeMode(true)
    }
  }

  const lockAsA = () => {
    if (!selectedEmphasisId || emphasizeMode) return
    if (emphasisLinkFromId === selectedEmphasisId) {
      setEmphasisLinkFrom(null)
    } else {
      setEmphasisLinkFrom(selectedEmphasisId)
    }
  }

  const openLinkInSphere = (linkId: string) => {
    setWorkspaceMode('sphere')
    // defer so sphere canvas mounts before lens
    window.setTimeout(() => {
      enterConstructionLens(linkId)
    }, 50)
  }

  return (
    <div className={`flat-root${emphasizeMode ? ' pen-on' : ''}`}>
      <header className="flat-top">
        <div className="flat-brand">
          <div className="brand-mark">DOCUMVERSE</div>
          <div className="brand-sub">轻量原页标注 · 语义与球面同源</div>
        </div>

        <div className="mode-toggle workspace">
          <button type="button" className="active">
            原页标注
          </button>
          <button type="button" onClick={() => setWorkspaceMode('sphere')}>
            球面探索
          </button>
        </div>

        <div className="mode-toggle corpus">
          <button
            type="button"
            className={corpus === 'pdf' ? 'active' : ''}
            onClick={() => setCorpus('pdf')}
          >
            专利 PDF
          </button>
          <button
            type="button"
            className={corpus === 'origins' ? 'active' : ''}
            onClick={() => setCorpus('origins')}
          >
            Origins
          </button>
          {uploadLabel && (
            <button
              type="button"
              className={corpus === 'upload' ? 'active' : ''}
              onClick={() => setCorpus('upload')}
            >
              我的 PDF
            </button>
          )}
        </div>

        <div className="flat-upload">
          <PdfUploadPanel />
        </div>
      </header>

      <div className="flat-body">
        <aside className="flat-pages">
          <div className="flat-aside-title">页面</div>
          <div className="flat-page-nav">
            <button type="button" onClick={() => stepPage(-1)}>
              ← [
            </button>
            <span>
              {currentStrand + 1}/{pages.length}
            </span>
            <button type="button" onClick={() => stepPage(1)}>
              ] →
            </button>
          </div>
          <ul className="flat-page-list">
            {pages.map((p) => (
              <li key={p.strandIndex}>
                <button
                  type="button"
                  className={
                    p.strandIndex === currentStrand ? 'active' : undefined
                  }
                  onClick={() => {
                    swoopToPage(p.strandIndex)
                    if (emphasizeMode) aimEmphasizePage(p.strandIndex)
                  }}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="flat-page-text-thumb">T</span>
                  )}
                  <span className="flat-page-label">
                    {p.sourcePage != null
                      ? `p.${p.sourcePage}`
                      : `#${p.strandIndex}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flat-stage">
          <div className="flat-toolbar">
            <button
              type="button"
              className={emphasizeMode ? 'active pen' : 'pen'}
              onClick={togglePen}
            >
              {emphasizeMode ? '强调笔 · 开（H）' : '强调笔（H）'}
            </button>
            <button
              type="button"
              disabled={!selectedEmphasisId || emphasizeMode}
              onClick={lockAsA}
            >
              {linkFrom ? '取消 A' : '锁定为 A（Enter）'}
            </button>
            <button
              type="button"
              disabled={!selectedEmphasisId}
              onClick={() => {
                if (selectedEmphasisId) deleteEmphasis(selectedEmphasisId)
              }}
            >
              删除强调
            </button>
            <span className="flat-hint">
              {emphasizeMode
                ? '在页上拖出闭环（回到起点或自交即封环）'
                : linkFrom
                  ? `A 已锁定 · 再点另一强调完成建联`
                  : '点选强调 → Enter 锁 A → 再点 B 建联'}
            </span>
          </div>

          <div className="flat-surface-shell">
            <div
              ref={surfaceRef}
              className="flat-surface"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {page?.imageUrl ? (
                <img
                  className="flat-page-img"
                  src={page.imageUrl}
                  alt={page.title}
                  draggable={false}
                />
              ) : (
                <pre className="flat-page-plaintext">
                  {page?.text ?? '无页面'}
                </pre>
              )}

              <svg
                className="flat-overlay"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
              >
                {pageEdges.map((edge) => {
                  const isSel = edge.id === selectedEmphasisId
                  const isA = edge.id === emphasisLinkFromId
                  return (
                    <polygon
                      key={edge.id}
                      points={polyToSvg(edge.region.polygon)}
                      className={
                        isA ? 'emph-a' : isSel ? 'emph-sel' : 'emph-idle'
                      }
                    />
                  )
                })}
                {emphasisDraftPoints.length > 1 && (
                  <polyline
                    points={polyToSvg(emphasisDraftPoints)}
                    className="emph-draft"
                  />
                )}
                {emphasisLinks.map((link) => {
                  const from = emphasisEdges.find(
                    (e) => e.id === link.fromEmphasisId,
                  )
                  const to = emphasisEdges.find(
                    (e) => e.id === link.toEmphasisId,
                  )
                  if (!from || !to) return null
                  if (
                    from.strandIndex !== currentStrand &&
                    to.strandIndex !== currentStrand
                  ) {
                    return null
                  }
                  if (
                    from.strandIndex !== currentStrand ||
                    to.strandIndex !== currentStrand
                  ) {
                    const here =
                      from.strandIndex === currentStrand
                        ? from
                        : to.strandIndex === currentStrand
                          ? to
                          : null
                    if (!here) return null
                    const [cx, cy] = polygonCentroid(here.region.polygon)
                    return (
                      <circle
                        key={link.id}
                        cx={cx}
                        cy={cy}
                        r={14}
                        className="link-endpoint"
                      />
                    )
                  }
                  const [ax, ay] = polygonCentroid(from.region.polygon)
                  const [bx, by] = polygonCentroid(to.region.polygon)
                  return (
                    <line
                      key={link.id}
                      x1={ax}
                      y1={ay}
                      x2={bx}
                      y2={by}
                      className="link-line"
                    />
                  )
                })}
              </svg>
            </div>
          </div>

          <div className="flat-page-meta">
            {page?.title}
            {page?.sourceDoc ? ` · ${page.sourceDoc}` : ''}
          </div>
        </section>

        <aside className="flat-side">
          <div className="flat-aside-title">本页强调</div>
          <ul className="flat-emph-list">
            {pageEdges.length === 0 && (
              <li className="empty">尚未圈注 — 开强调笔在原页画闭环</li>
            )}
            {pageEdges.map((edge, i) => (
              <li key={edge.id}>
                <button
                  type="button"
                  className={
                    edge.id === selectedEmphasisId
                      ? 'active'
                      : edge.id === emphasisLinkFromId
                        ? 'is-a'
                        : undefined
                  }
                  onClick={() => selectEmphasis(edge.id)}
                >
                  <span>#{i + 1}</span>
                  <span className="meta">
                    {edge.reading?.trim() || edge.id.slice(0, 10)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flat-aside-title">关系（全库）</div>
          <ul className="flat-link-list">
            {emphasisLinks.length === 0 && (
              <li className="empty">选 A → Enter → 点 B</li>
            )}
            {emphasisLinks.map((link) => {
              const from = emphasisEdges.find(
                (e) => e.id === link.fromEmphasisId,
              )
              const to = emphasisEdges.find((e) => e.id === link.toEmphasisId)
              return (
                <li key={link.id} className="flat-link-card">
                  <div className="flat-link-head">
                    s{from?.strandIndex ?? '?'} ↔ s{to?.strandIndex ?? '?'}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="关系注释…"
                    defaultValue={link.note}
                    onBlur={(e) => {
                      const v = e.target.value
                      if (v !== link.note) updateEmphasisLinkNote(link.id, v)
                    }}
                  />
                  <div className="flat-link-actions">
                    <button
                      type="button"
                      onClick={() => openLinkInSphere(link.id)}
                    >
                      球面构建
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEmphasisLink(link.id)}
                    >
                      删除
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {selected && (
            <div className="flat-selected-hint">
              已选强调 · strand {selected.strandIndex}
              {linkFrom && linkFrom.id === selected.id ? ' · 已是 A' : ''}
            </div>
          )}
        </aside>
      </div>

      <footer className="flat-footer">
        原页圈注是原子 · 右下微缩球找任意强调 · 大球面是探索视图
      </footer>
    </div>
  )
}
