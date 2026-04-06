import type { MessageTabKey } from '../../types'
import { useWorkbenchStore } from '../../store/workbenchStore'

const tabs: Array<{ key: MessageTabKey; label: string }> = [
  { key: 'yesterdayUnreplied', label: '昨日未回' },
  { key: 'abnormalUsers',      label: '异常用户' },
  { key: 'todayMessages',      label: '今日消息' },
  { key: 'complaints',         label: '投诉' },
]

export function MessageTabs() {
  const active = useWorkbenchStore((s) => s.leftMessageTab)
  const setTab = useWorkbenchStore((s) => s.setLeftMessageTab)

  return (
    <div className="flex items-center px-2 py-2.5">
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              'flex-1 px-1 py-1 text-xs font-medium transition-colors duration-150 border-b-2',
              isActive
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
