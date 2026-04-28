import { useEffect } from 'react'
import { LeftPanel } from './components/LeftPanel/LeftPanel'
import { TaskModal } from './components/LeftPanel/TaskModal'
import { ReviewModal } from './components/LeftPanel/ReviewModal'
import { AbnormalModal } from './components/LeftPanel/AbnormalModal'
import { AssignStudentModal } from './components/LeftPanel/AssignStudentModal'
import { LiveDrillModal } from './components/LeftPanel/LiveDrillModal'
import { UploadLinkModal } from './components/LeftPanel/UploadLinkModal'
import { UploadHandoutModal } from './components/LeftPanel/UploadHandoutModal'
import { UploadReplayModal } from './components/LeftPanel/UploadReplayModal'
import { StudentFeedbackModal } from './components/LeftPanel/StudentFeedbackModal'
import { RightPanel } from './components/RightPanel/RightPanel'
import { useWorkbenchStore } from './store/workbenchStore'

export function TeacherWorkbench({ onLogout }: { onLogout?: () => void }) {
  const loadCalendarEvents = useWorkbenchStore((s) => s.loadCalendarEvents)
  const loadTaskCounts     = useWorkbenchStore((s) => s.loadTaskCounts)
  const loadTaskItems      = useWorkbenchStore((s) => s.loadTaskItems)
  const loadStudents       = useWorkbenchStore((s) => s.loadStudents)
  const loadAbnormalStudents = useWorkbenchStore((s) => s.loadAbnormalStudents)
  const loadChatContacts   = useWorkbenchStore((s) => s.loadChatContacts)
  const loadComplaints     = useWorkbenchStore((s) => s.loadComplaints)

  useEffect(() => {
    void loadCalendarEvents()
    void loadTaskCounts()
    void loadTaskItems()
    void loadStudents()
    void loadAbnormalStudents()
    void loadChatContacts()
    void loadComplaints()
    const interval = setInterval(() => {
      void loadCalendarEvents()
      void loadTaskCounts()
      void loadTaskItems()
      void loadStudents()
      void loadAbnormalStudents()
      void loadChatContacts()
      void loadComplaints()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadAbnormalStudents, loadCalendarEvents, loadComplaints, loadTaskCounts, loadTaskItems, loadStudents, loadChatContacts])

  return (
    <div className="h-screen min-w-[1280px] overflow-hidden bg-[var(--color-page-bg)]">
      <div className="flex h-full w-full">
        <aside className="h-full w-[var(--left-width)] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-left)] shadow-[var(--shadow-xs)]">
          <LeftPanel onLogout={onLogout} />
        </aside>
        <main className="h-full flex-1 bg-[var(--color-page-bg)]">
          <RightPanel />
        </main>
      </div>
      <TaskModal />
      <ReviewModal />
      <AbnormalModal />
      <AssignStudentModal />
      <LiveDrillModal />
      <UploadLinkModal />
      <UploadHandoutModal />
      <UploadReplayModal />
      <StudentFeedbackModal />
    </div>
  )
}

