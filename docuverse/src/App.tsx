import { CvsScene } from './cvs/CvsScene'
import { useDocuverse } from './cvs/store'
import { HUD } from './ui/HUD'
import { KeyboardNav } from './ui/KeyboardNav'
import { WorkbenchPalette } from './ui/WorkbenchPalette'
import { OverviewLinkBoard } from './ui/OverviewLinkBoard'
import { LinkFocusControls } from './ui/LinkFocusControls'
import { ConstructionLensControls } from './ui/ConstructionLensControls'
import { ViewPathTimeline } from './ui/ViewPathTimeline'
import { EmphasisStarMap } from './ui/EmphasisStarMap'
import { FlatPageWorkbench } from './ui/FlatPageWorkbench'
import './App.css'

export default function App() {
  const workspaceMode = useDocuverse((s) => s.workspaceMode)

  if (workspaceMode === 'flat') {
    return (
      <div className="app-root">
        <KeyboardNav />
        <FlatPageWorkbench />
        {/* 轻量主路径常驻微缩球：线圈导航 / 跨页建联，非满血宇宙 */}
        <EmphasisStarMap />
      </div>
    )
  }

  return (
    <div className="app-root">
      <KeyboardNav />
      <main className="stage">
        <CvsScene />
      </main>
      <HUD />
      <EmphasisStarMap />
      <WorkbenchPalette />
      <OverviewLinkBoard />
      <LinkFocusControls />
      <ConstructionLensControls />
      <ViewPathTimeline />
      <footer className="patent-bar">
        <button
          type="button"
          className="sphere-to-flat"
          onClick={() => useDocuverse.getState().setWorkspaceMode('flat')}
        >
          ← 回原页标注
        </button>
        <span>球面宇宙 · 机位时间轴可剪 · 永朝球心</span>
      </footer>
    </div>
  )
}
