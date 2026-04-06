import type { TaskKey } from '../../types'

export function TaskCard({
  taskKey,
  label,
  count,
  tone,
  onClick,
}: {
  taskKey: TaskKey
  label: string
  count: number
  tone?: 'alert'
  onClick: (taskKey: TaskKey) => void
}) {
  const isAlert = tone === 'alert'

  return (
    <button
      type="button"
      onClick={() => onClick(taskKey)}
      className={[
        'flex h-[72px] w-full flex-col justify-between rounded-lg px-3 py-2.5 text-left',
        'border bg-white transition-colors duration-150 hover:bg-[var(--color-bg-left)]',
        isAlert ? 'border-[var(--color-badge-alert)]' : 'border-[var(--color-border)]',
      ].join(' ')}
    >
      <div className={[
        'text-lg font-bold leading-none',
        isAlert ? 'text-[var(--color-badge-alert)]' : 'text-[var(--color-primary)]',
      ].join(' ')}>
        {count > 0 ? count : '–'}
      </div>
      <div className="text-xs font-medium text-[var(--color-text-primary)] leading-tight">
        {label}
      </div>
    </button>
  )
}
