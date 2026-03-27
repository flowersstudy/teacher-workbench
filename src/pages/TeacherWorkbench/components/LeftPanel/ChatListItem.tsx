import type { ContactItem } from '../../types'

function ContactAvatar({
  avatar,
  color,
}: {
  avatar: string
  color: string
}) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {avatar}
    </div>
  )
}

export function ChatListItem({
  item,
  selected,
  onClick,
}: {
  item: ContactItem
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-3 rounded-[var(--radius-card)] px-3 py-2 text-left transition-colors',
        selected ? 'bg-[var(--color-primary-light)]' : 'hover:bg-[var(--color-bg-left)]',
      ].join(' ')}
    >
      <ContactAvatar avatar={item.avatar} color={item.color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {item.name}
          </div>
          {item.tag === 'complaint' && (
            <span className="rounded bg-[var(--color-badge-alert)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              投诉
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
          {item.preview}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="text-[10px] text-[var(--color-text-muted)]">
          {item.time}
        </div>
        {item.unreadCount > 0 && (
          <div className="min-w-5 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
            {item.unreadCount}
          </div>
        )}
      </div>
    </button>
  )
}

