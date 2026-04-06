import { TeacherInfo } from './TeacherInfo'
import { TaskGrid } from './TaskGrid'
import { MessageTabs } from './MessageTabs'
import { ChatList } from './ChatList'

export function LeftPanel({ onLogout }: { onLogout?: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--color-border)]">
        <TeacherInfo onLogout={onLogout} />
      </div>

      <div className="shrink-0">
        <TaskGrid />
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)]">
        <MessageTabs />
      </div>

      <ChatList />
    </div>
  )
}

