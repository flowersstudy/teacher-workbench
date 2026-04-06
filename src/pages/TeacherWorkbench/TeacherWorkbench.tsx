import { useEffect } from 'react'
import { LeftPanel } from './components/LeftPanel/LeftPanel'
import { TaskModal } from './components/LeftPanel/TaskModal'
import { ReviewModal } from './components/LeftPanel/ReviewModal'
import { AbnormalModal } from './components/LeftPanel/AbnormalModal'
import { UploadLinkModal } from './components/LeftPanel/UploadLinkModal'
import { UploadHandoutModal } from './components/LeftPanel/UploadHandoutModal'
import { UploadReplayModal } from './components/LeftPanel/UploadReplayModal'
import { AssignStudentModal } from './components/LeftPanel/AssignStudentModal'
import { RightPanel } from './components/RightPanel/RightPanel'
import { useWorkbenchStore } from './store/workbenchStore'

export function TeacherWorkbench({ onLogout }: { onLogout?: () => void }) {
  const loadCalendarEvents = useWorkbenchStore((s) => s.loadCalendarEvents)
  const loadTaskCounts     = useWorkbenchStore((s) => s.loadTaskCounts)
  const loadStudents       = useWorkbenchStore((s) => s.loadStudents)

  useEffect(() => {
    void loadCalendarEvents()
    void loadTaskCounts()
    void loadStudents()
    const interval = setInterval(() => {
      void loadCalendarEvents()
      void loadTaskCounts()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadCalendarEvents, loadTaskCounts, loadStudents])

  return (
    <div className="h-screen min-w-[1280px] overflow-hidden bg-white">
      <div className="flex h-full w-full">
        <aside className="h-full w-[var(--left-width)] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-left)]">
          <LeftPanel onLogout={onLogout} />
        </aside>
        <main className="h-full flex-1 bg-white">
          <RightPanel />
        </main>
      </div>
      <TaskModal />
      <ReviewModal />
      <AbnormalModal />
      <UploadLinkModal />
      <UploadHandoutModal />
      <UploadReplayModal />
      <AssignStudentModal />
    </div>
  )
}

