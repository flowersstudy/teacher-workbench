import { useWorkbenchStore } from '../../store/workbenchStore'
import { CalendarView } from './CalendarView'
import { InspireBar } from './InspireBar'
import { ChatView } from './ChatView'
import { StudentsView } from './StudentsView'
import { OverviewView } from './OverviewView'
import { SchedulingView } from './SchedulingView'

export function RightPanel() {
  const rightTab = useWorkbenchStore((s) => s.rightTab)
  const setRightTab = useWorkbenchStore((s) => s.setRightTab)
  const selectedContactId = useWorkbenchStore((s) => s.selectedContactId)
  const clearSelectedContact = useWorkbenchStore((s) => s.clearSelectedContact)
  const restoreLastChat = useWorkbenchStore((s) => s.restoreLastChat)

  const isChatActive = rightTab === 'chat' && selectedContactId !== null
  const isOverviewActive = rightTab === 'chat' && selectedContactId === null

  const tabCls = (active: boolean) =>
    [
      'pb-3 text-sm font-medium whitespace-nowrap',
      active
        ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
        : 'text-[var(--color-text-secondary)]',
    ].join(' ')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end gap-6 border-b border-[var(--color-border)] px-6 pt-4">
        <button type="button" onClick={() => setRightTab('overview')} className={tabCls(rightTab === 'overview')}>
          总览
        </button>
        <button type="button" onClick={() => setRightTab('schedule')} className={tabCls(rightTab === 'schedule')}>
          日程安排
        </button>
        <button type="button" onClick={restoreLastChat} className={tabCls(isChatActive)}>
          聊天
        </button>
        <button type="button" onClick={() => clearSelectedContact()} className={tabCls(isOverviewActive)}>
          聊天总览
        </button>
        <button type="button" onClick={() => setRightTab('students')} className={tabCls(rightTab === 'students')}>
          我的学生
        </button>
        <button type="button" onClick={() => setRightTab('scheduling')} className={tabCls(rightTab === 'scheduling')}>
          去排课
        </button>
      </div>

      <div className={['flex-1 overflow-hidden', rightTab === 'scheduling' ? 'p-3' : 'p-6'].join(' ')}>
        {rightTab === 'schedule' ? (
          <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]">
            <div className="flex-1 overflow-hidden">
              <CalendarView />
            </div>
            <InspireBar />
          </div>
        ) : rightTab === 'students' ? (
          <StudentsView />
        ) : rightTab === 'overview' ? (
          <OverviewView />
        ) : rightTab === 'scheduling' ? (
          <SchedulingView />
        ) : (
          <ChatView />
        )}
      </div>
    </div>
  )
}
