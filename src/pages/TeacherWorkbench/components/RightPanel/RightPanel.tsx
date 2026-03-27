import { useWorkbenchStore } from '../../store/workbenchStore'
import { CalendarView } from './CalendarView'
import { InspireBar } from './InspireBar'
import { ChatView } from './ChatView'

export function RightPanel() {
  const rightTab = useWorkbenchStore((s) => s.rightTab)
  const setRightTab = useWorkbenchStore((s) => s.setRightTab)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end gap-6 border-b border-[var(--color-border)] px-6 pt-4">
        <button
          type="button"
          onClick={() => setRightTab('schedule')}
          className={[
            'pb-3 text-sm font-medium',
            rightTab === 'schedule'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)]',
          ].join(' ')}
        >
          日程安排
        </button>
        <button
          type="button"
          onClick={() => setRightTab('chat')}
          className={[
            'pb-3 text-sm font-medium',
            rightTab === 'chat'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)]',
          ].join(' ')}
        >
          聊天
        </button>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {rightTab === 'schedule' ? (
          <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]">
            <div className="flex-1 overflow-hidden">
              <CalendarView />
            </div>
            <InspireBar />
          </div>
        ) : (
          <ChatView />
        )}
      </div>
    </div>
  )
}

