import type { MessageTabKey } from '../../types'
import { useWorkbenchStore } from '../../store/workbenchStore'

const tabs: Array<{ key: MessageTabKey; label: string }> = [
  { key: 'yesterdayUnreplied', label: '昨日未回' },
  { key: 'todayMessages', label: '今日消息' },
  { key: 'complaints', label: '投诉' },
]

export function MessageTabs() {
  const active = useWorkbenchStore((s) => s.leftMessageTab)
  const setTab = useWorkbenchStore((s) => s.setLeftMessageTab)

  return (
    <div className="flex items-end gap-4 px-4 pt-2">
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              'pb-2 text-xs font-semibold',
              isActive
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)]',
            ].join(' ')}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

