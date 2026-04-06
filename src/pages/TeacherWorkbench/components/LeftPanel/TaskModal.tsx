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
  const openTaskKey       = useWorkbenchStore((s) => s.openTaskKey)
  const close             = useWorkbenchStore((s) => s.closeTaskModal)
  const selectContact     = useWorkbenchStore((s) => s.selectContact)
  const openLinkUpload    = useWorkbenchStore((s) => s.openLinkUpload)
  const openHandoutUpload = useWorkbenchStore((s) => s.openHandoutUpload)
  const openReplayUpload  = useWorkbenchStore((s) => s.openReplayUpload)
  const openStudentProfile  = useWorkbenchStore((s) => s.openStudentProfile)
  const openAssignStudent   = useWorkbenchStore((s) => s.openAssignStudent)

  if (!openTaskKey || openTaskKey === 'pendingReview' || openTaskKey === 'abnormalUser') return null

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
        className="relative w-[min(680px,90vw)] max-h-[80vh] overflow-hidden rounded-[var(--radius-card)] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</div>
          <button
            type="button"
            onClick={close}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(80vh-52px)] overflow-auto p-2">
          {openTaskKey === 'pendingLink' ? (
            // 上课链接 + 分隔线 + 回放链接
            (['class', 'replay'] as const).map((type, groupIdx) => {
              const group = items.filter((it) => it.linkType === type)
              if (group.length === 0) return null
              return (
                <div key={type}>
                  {groupIdx > 0 && (
                    <div className="flex items-center gap-2 px-1 py-2">
                      <div className="h-px flex-1 bg-[var(--color-border)]" />
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {type === 'replay' ? '回放链接' : '上课链接'}
                      </span>
                      <div className="h-px flex-1 bg-[var(--color-border)]" />
                    </div>
                  )}
                  {groupIdx === 0 && (
                    <div className="flex items-center gap-2 px-1 pb-1.5">
                      <div className="h-px flex-1 bg-[var(--color-border)]" />
                      <span className="text-[10px] text-[var(--color-text-muted)]">上课链接</span>
                      <div className="h-px flex-1 bg-[var(--color-border)]" />
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.map((it) => (
                      <div key={it.id} className="flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2 hover:bg-[var(--color-bg-left)]">
                        <ItemAvatar avatar={it.avatar} color={it.color} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{it.name}</div>
                          <div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{it.subtitle}</div>
                        </div>
                        <button type="button"
                          className="shrink-0 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                          onClick={() => {
                            if (it.linkType === 'class') { close(); openLinkUpload(it) }
                            else { close(); openReplayUpload(it) }
                          }}>
                          {it.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="space-y-1">
              {items.map((it) => (
                <div
                  key={it.id}
                  role={openTaskKey === 'pendingClass' ? 'button' : undefined}
                  tabIndex={openTaskKey === 'pendingClass' ? 0 : undefined}
                  onClick={openTaskKey === 'pendingClass' && it.studentId ? () => { close(); openStudentProfile(it.studentId!) } : undefined}
                  onKeyDown={openTaskKey === 'pendingClass' && it.studentId ? (e) => { if (e.key === 'Enter') { close(); openStudentProfile(it.studentId!) } } : undefined}
                  className={[
                    'flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2 hover:bg-[var(--color-bg-left)]',
                    openTaskKey === 'pendingClass' ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  <ItemAvatar avatar={it.avatar} color={it.color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{it.name}</div>
                    <div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{it.subtitle}</div>
                  </div>
                  {openTaskKey !== 'pendingClass' && (
                    <button type="button"
                      className="shrink-0 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                      onClick={() => {
                        if (openTaskKey === 'pendingHandout') {
                          close(); openHandoutUpload(it)
                        } else if (openTaskKey === 'newStudent' && it.studentId) {
                          close(); openStudentProfile(it.studentId)
                        } else if (openTaskKey === 'pendingAssign') {
                          close(); openAssignStudent(it)
                        } else {
                          close()
                          if (it.contactId) selectContact(it.contactId)
                        }
                      }}>
                      {it.actionLabel}
                    </button>
                  )}
                  {openTaskKey === 'pendingClass' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-text-muted)]">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
