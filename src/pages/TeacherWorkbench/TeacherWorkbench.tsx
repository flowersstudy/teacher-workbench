import { LeftPanel } from './components/LeftPanel/LeftPanel'
import { TaskModal } from './components/LeftPanel/TaskModal'
import { RightPanel } from './components/RightPanel/RightPanel'

export function TeacherWorkbench() {
  return (
    <div className="h-screen min-w-[1280px] overflow-hidden bg-white">
      <div className="flex h-full w-full">
        <aside className="h-full w-[var(--left-width)] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-left)]">
          <LeftPanel />
        </aside>
        <main className="h-full flex-1 bg-white">
          <RightPanel />
        </main>
      </div>
      <TaskModal />
    </div>
  )
}

