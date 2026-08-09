import { useEffect } from 'react'
import { useDocuverse } from '../cvs/store'
import { isTextEditingTarget } from './textEditing'

export function KeyboardNav() {
  const stepConnection = useDocuverse((s) => s.stepConnection)
  const flipToCompanion = useDocuverse((s) => s.flipToCompanion)
  const swapPages = useDocuverse((s) => s.swapPages)
  const setCameraDistance = useDocuverse((s) => s.setCameraDistance)
  const cameraDistance = useDocuverse((s) => s.cameraDistance)
  const orbit = useDocuverse((s) => s.orbit)
  const stepPage = useDocuverse((s) => s.stepPage)
  const swoopToPage = useDocuverse((s) => s.swoopToPage)
  const pages = useDocuverse((s) => s.pages)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 输入文本时：不拦截 H / G 及其他快捷键
      if (isTextEditingTarget(e.target)) return

      const k = e.key.toLowerCase()
      const mode = useDocuverse.getState().workspaceMode

      // V：原页标注 ↔ 球面探索
      if (k === 'v' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        const s = useDocuverse.getState()
        s.setWorkspaceMode(s.workspaceMode === 'flat' ? 'sphere' : 'flat')
        return
      }

      // H：强调笔开关（再按关闭）
      if (k === 'h' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        const s = useDocuverse.getState()
        if (s.emphasizeMode) {
          s.clearEmphasisDraft()
          s.setEmphasizeMode(false)
        } else {
          if (mode === 'flat') s.aimEmphasizePage(s.currentStrand)
          s.setEmphasizeMode(true)
        }
        return
      }

      if (k === 'c') {
        if (mode === 'flat') return
        e.preventDefault()
        stepConnection(1)
      } else if (k === 'e') {
        if (mode === 'flat') return
        e.preventDefault()
        stepConnection(-1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        // 建联：当前强调 → 端点 A，再点 B
        const s = useDocuverse.getState()
        if (s.selectedEmphasisId && !s.emphasizeMode) {
          if (s.emphasisLinkFromId === s.selectedEmphasisId) {
            s.setEmphasisLinkFrom(null)
          } else {
            s.setEmphasisLinkFrom(s.selectedEmphasisId)
          }
          return
        }
        if (mode === 'sphere') flipToCompanion()
      } else if (k === 'f') {
        if (mode === 'flat') return
        e.preventDefault()
        flipToCompanion()
      } else if (k === 's' && !e.metaKey && !e.ctrlKey) {
        if (mode === 'flat') return
        e.preventDefault()
        swapPages()
      } else if (e.key === '[') {
        e.preventDefault()
        stepPage(-1)
      } else if (e.key === ']') {
        e.preventDefault()
        stepPage(1)
      } else if (e.key >= '0' && e.key <= '9') {
        if (mode === 'flat') return
        const idx = Number(e.key)
        if (idx < pages.length) {
          e.preventDefault()
          swoopToPage(idx)
        }
      } else if (e.key === 'ArrowUp') {
        if (mode === 'flat') {
          e.preventDefault()
          stepPage(-1)
          return
        }
        e.preventDefault()
        setCameraDistance(cameraDistance * 0.82)
      } else if (e.key === 'ArrowDown') {
        if (mode === 'flat') {
          e.preventDefault()
          stepPage(1)
          return
        }
        e.preventDefault()
        setCameraDistance(cameraDistance * 1.22)
      } else if (e.key === 'Home') {
        if (mode === 'flat') return
        e.preventDefault()
        setCameraDistance(18)
      } else if (e.key === 'ArrowLeft') {
        if (mode === 'flat') {
          e.preventDefault()
          stepPage(-1)
          return
        }
        e.preventDefault()
        orbit(0.12, 0)
      } else if (e.key === 'ArrowRight') {
        if (mode === 'flat') {
          e.preventDefault()
          stepPage(1)
          return
        }
        e.preventDefault()
        orbit(-0.12, 0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    stepConnection,
    flipToCompanion,
    swapPages,
    setCameraDistance,
    cameraDistance,
    orbit,
    stepPage,
    swoopToPage,
    pages.length,
  ])

  return null
}
