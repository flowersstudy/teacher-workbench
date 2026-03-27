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
  const badgeBg =
    tone === 'alert' ? 'bg-[var(--color-badge-alert)]' : 'bg-red-500'

  return (
    <button
      type="button"
      onClick={() => onClick(taskKey)}
      className="relative h-[68px] w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-3 py-2 text-left transition-colors hover:bg-[var(--color-primary-light)]"
    >
      {count > 0 && (
        <span
          className={[
            'absolute right-2 top-2 min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white',
            badgeBg,
          ].join(' ')}
        >
          {count}
        </span>
      )}
      <div className="absolute bottom-2 left-3 text-xs font-medium text-[var(--color-text-primary)]">
        {label}
      </div>
    </button>
  )
}

