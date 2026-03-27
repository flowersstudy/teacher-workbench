import { createPortal } from 'react-dom'
import { taskItemsByKey, taskMeta } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'

function ItemAvatar({ avatar, color }: { avatar: string; color: string }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {avatar}
    </div>
  )
}

export function TaskModal() {
  const openTaskKey = useWorkbenchStore((s) => s.openTaskKey)
  const close = useWorkbenchStore((s) => s.closeTaskModal)
  const selectContact = useWorkbenchStore((s) => s.selectContact)

  if (!openTaskKey) return null

  const title = taskMeta[openTaskKey].label
  const items = taskItemsByKey[openTaskKey]

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-[340px] max-h-[400px] overflow-hidden rounded-[var(--radius-card)] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {title}
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(400px-52px)] overflow-auto p-2">
          <div className="space-y-1">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2 hover:bg-[var(--color-bg-left)]"
              >
                <ItemAvatar avatar={it.avatar} color={it.color} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {it.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                    {it.subtitle}
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                  onClick={() => {
                    // UI-only: for now we jump to chat as a stand-in for "业务跳转"
                    close()
                    if (it.contactId) selectContact(it.contactId)
                  }}
                >
                  {it.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

