import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { calendarEvents } from '../../mock/workbenchMock'

type ViewMode = 'month' | 'week' | 'day'

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (v: ViewMode) => void
}) {
  const base = 'px-3 py-1 text-xs font-semibold'
  const active = 'bg-[var(--color-primary)] text-white'
  const idle = 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]'

  return (
    <div className="flex overflow-hidden rounded-full border border-[var(--color-border)]">
      {(['month', 'week', 'day'] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={[
            base,
            value === k ? active : idle,
            k !== 'day' ? 'border-r border-[var(--color-border)]' : '',
          ].join(' ')}
        >
          {k === 'month' ? '月' : k === 'week' ? '周' : '日'}
        </button>
      ))}
    </div>
  )
}

function EventPill({ title, type }: { title: string; type: 'class' | 'meeting' }) {
  const cls =
    type === 'class'
      ? 'bg-[var(--color-event-class-bg)] text-[var(--color-event-class-text)]'
      : 'bg-[var(--color-event-meet-bg)] text-[var(--color-event-meet-text)]'
  return (
    <div className={['truncate rounded-full px-2 py-0.5 text-[10px] font-semibold', cls].join(' ')}>
      {title}
    </div>
  )
}

export function CalendarView() {
  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(new Date()))
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  const today = useMemo(() => new Date(), [])

  const monthGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursorMonth), { weekStartsOn: 0 })
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i))
  }, [cursorMonth])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursorMonth((d) => subMonths(d, 1))}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]"
            aria-label="上月"
          >
            ‹
          </button>
          <div className="min-w-[120px] text-sm font-semibold text-[var(--color-text-primary)]">
            {format(cursorMonth, 'yyyy年M月', { locale: zhCN })}
          </div>
          <button
            type="button"
            onClick={() => setCursorMonth((d) => addMonths(d, 1))}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]"
            aria-label="下月"
          >
            ›
          </button>
        </div>

        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      <div className="mt-4 flex-1 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
        {viewMode !== 'month' ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
            {viewMode === 'week' ? '周视图（占位）' : '日视图（占位）'}
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-bg-left)] text-[10px] font-semibold text-[var(--color-text-secondary)]">
              {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
                <div key={w} className="px-2 py-2">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid flex-1 grid-cols-7">
              {monthGrid.map((day) => {
                const inMonth = isSameMonth(day, cursorMonth)
                const isToday = isSameDay(day, today)
                const dayKey = format(day, 'yyyy-MM-dd')
                const events = calendarEvents.filter((e) => e.date === dayKey)
                const shown = events.slice(0, 2)
                const hiddenCount = Math.max(0, events.length - shown.length)

                return (
                  <div
                    key={dayKey}
                    className={[
                      'min-h-0 border-r border-b border-[var(--color-border)] p-2',
                      isToday ? 'outline outline-1 outline-[var(--color-primary)] outline-offset-[-1px]' : '',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'text-xs font-semibold',
                        inMonth ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]',
                      ].join(' ')}
                    >
                      {format(day, 'd')}
                    </div>

                    <div className="mt-1 space-y-1">
                      {shown.map((ev) => (
                        <EventPill key={ev.id} title={ev.title} type={ev.type} />
                      ))}
                      {hiddenCount > 0 && (
                        <div className="text-[10px] font-semibold text-[var(--color-text-muted)]">…</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

