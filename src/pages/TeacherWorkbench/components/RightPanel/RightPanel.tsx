import { AppTabs } from '../../../../components/ui/AppTabs'
import { ENABLE_OVERVIEW_TAB, ENABLE_SCHEDULING_TAB } from '../../config/launch'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { CalendarView } from './CalendarView'
import { ChatView } from './ChatView'
import { InspireBar } from './InspireBar'
import { MailboxView } from './MailboxView'
import { SchedulingView } from './SchedulingView'
import { StudentsView } from './StudentsView'

function DisabledFeature({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
      {name} 模块暂未开放
    </div>
  )
}

const navItems = [
  { key: 'schedule', label: '日程安排' },
  { key: 'chat', label: '聊天' },
  { key: 'chatOverview', label: '聊天总览' },
  { key: 'students', label: '我的学生' },
  { key: 'mailbox', label: '校长信箱' },
  ...(ENABLE_OVERVIEW_TAB ? [{ key: 'overview', label: '总览' as const }] : []),
  ...(ENABLE_SCHEDULING_TAB ? [{ key: 'scheduling', label: '去排课' as const }] : []),
] as const

export function RightPanel() {
  const rightTab = useWorkbenchStore((state) => state.rightTab)
  const setRightTab = useWorkbenchStore((state) => state.setRightTab)
  const selectedContactId = useWorkbenchStore((state) => state.selectedContactId)
  const clearSelectedContact = useWorkbenchStore((state) => state.clearSelectedContact)
  const restoreLastChat = useWorkbenchStore((state) => state.restoreLastChat)

  const navValue =
    rightTab === 'schedule' ? 'schedule'
    : rightTab === 'students' ? 'students'
    : rightTab === 'mailbox' ? 'mailbox'
    : rightTab === 'overview' && ENABLE_OVERVIEW_TAB ? 'overview'
    : rightTab === 'scheduling' && ENABLE_SCHEDULING_TAB ? 'scheduling'
    : selectedContactId ? 'chat'
    : 'chatOverview'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-left)] px-6 pt-4">
        <AppTabs
          items={navItems}
          value={navValue}
          variant="line"
          size="md"
          onChange={(value) => {
            if (value === 'chat') {
              restoreLastChat()
              return
            }

            if (value === 'chatOverview') {
              clearSelectedContact()
              return
            }

            if (
              value === 'schedule'
              || value === 'students'
              || value === 'mailbox'
              || value === 'overview'
              || value === 'scheduling'
            ) {
              setRightTab(value)
            }
          }}
        />
      </div>

      <div className="flex-1 overflow-hidden p-5">
        {rightTab === 'schedule' ? (
          <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]">
            <div className="flex-1 overflow-hidden">
              <CalendarView />
            </div>
            <InspireBar />
          </div>
        ) : rightTab === 'students' ? (
          <StudentsView />
        ) : rightTab === 'mailbox' ? (
          <MailboxView />
        ) : rightTab === 'overview' && ENABLE_OVERVIEW_TAB ? (
          <DisabledFeature name="总览" />
        ) : rightTab === 'scheduling' && ENABLE_SCHEDULING_TAB ? (
          <SchedulingView />
        ) : (
          <ChatView />
        )}
      </div>
    </div>
  )
}
