import { createPortal } from 'react-dom'
import { useState } from 'react'
import { abnormalUsers } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'
import type { AbnormalUser } from '../../mock/workbenchMock'

const severityCfg = {
  high:   { label: '高风险', badge: 'bg-red-50 text-red-600 border-red-200',    dot: 'bg-red-500' },
  medium: { label: '关注中', badge: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-400' },
}

const reasonIcon: Record<string, string> = {
  连续缺课:     '🚫',
  长期未提交作业: '📋',
  情绪异常:     '⚠️',
  家长投诉:     '📢',
  退费风险:     '💸',
}

function UserCard({
  user,
  transferred,
  onTransfer,
  onContact,
}: {
  user: AbnormalUser
  transferred: boolean
  onTransfer: () => void
  onContact: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const scfg = severityCfg[user.severity]

  return (
    <div className={[
      'rounded-[var(--radius-card)] border transition-colors',
      transferred ? 'border-[var(--color-border)] opacity-60' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]',
    ].join(' ')}>
      {/* Card header */}
      <div className="flex items-center gap-3 p-3">
        <div className={['mt-0.5 h-2 w-2 shrink-0 self-start rounded-full', scfg.dot].join(' ')} />
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: user.color }}
        >
          {user.avatar}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{user.name}</span>
            <span className={['rounded-full border px-1.5 py-0.5 text-[9px] font-medium', scfg.badge].join(' ')}>
              {scfg.label}
            </span>
            {transferred && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] text-gray-400">
                已移交学管
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
            {reasonIcon[user.reason]} {user.reason} · {user.checkpoint} · 共 {user.events.length} 次异常
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {/* Timeline */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <div className="mb-2 text-[10px] font-semibold text-[var(--color-text-muted)]">异常记录</div>
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-1.5 bottom-1.5 w-px bg-[var(--color-border)]" />
            {user.events.map((ev, i) => (
              <div key={i} className="relative mb-3 last:mb-0">
                <div className="absolute -left-[11px] top-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <div className="text-[10px] text-[var(--color-text-muted)]">{ev.date}</div>
                <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{ev.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {!transferred && (
        <div className="flex gap-2 border-t border-[var(--color-border)] px-3 py-2.5">
          <button
            type="button"
            onClick={onContact}
            className="flex-1 rounded-lg border border-[var(--color-border)] py-1.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            联系跟进
          </button>
          <button
            type="button"
            onClick={onTransfer}
            className="flex-1 rounded-lg bg-orange-500 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            移交学管处理
          </button>
        </div>
      )}
    </div>
  )
}

// ── confirm dialog ─────────────────────────────────────────────────────────────
function ConfirmTransfer({
  user,
  onConfirm,
  onCancel,
}: {
  user: AbnormalUser
  onConfirm: () => void
  onCancel: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-72 rounded-[var(--radius-card)] bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">确认移交学管？</div>
        <p className="mb-4 text-xs text-[var(--color-text-secondary)] leading-relaxed">
          将把 <span className="font-semibold text-[var(--color-text-primary)]">{user.name}</span> 的异常情况（{user.reason}，共 {user.events.length} 次）移交给学管跟进处理。移交后你仍可继续联系该学员。
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-lg border border-[var(--color-border)] py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]">
            取消
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 rounded-lg bg-orange-500 py-2 text-xs font-semibold text-white hover:bg-orange-600">
            确认移交
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── AbnormalModal ─────────────────────────────────────────────────────────────
export function AbnormalModal() {
  const openTaskKey   = useWorkbenchStore((s) => s.openTaskKey)
  const close         = useWorkbenchStore((s) => s.closeTaskModal)
  const selectContact = useWorkbenchStore((s) => s.selectContact)

  const [transferred, setTransferred] = useState<Set<string>>(new Set())
  const [confirmUser, setConfirmUser] = useState<AbnormalUser | null>(null)

  if (openTaskKey !== 'abnormalUser') return null

  function doTransfer(user: AbnormalUser) {
    setTransferred((prev) => new Set([...prev, user.id]))
    setConfirmUser(null)
  }

  const pending   = abnormalUsers.filter((u) => !transferred.has(u.id))
  const done      = abnormalUsers.filter((u) => transferred.has(u.id))

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative flex w-[min(680px,90vw)] max-h-[80vh] flex-col overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-bg-left)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-white px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">异常用户</div>
            <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              {pending.length} 待处理 · {done.length} 已移交
            </div>
          </div>
          <button type="button" onClick={close}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]">
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto space-y-2 p-3">
          {pending.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              transferred={false}
              onTransfer={() => setConfirmUser(u)}
              onContact={() => { close(); selectContact(u.contactId) }}
            />
          ))}

          {done.length > 0 && (
            <>
              <div className="pt-1 text-[10px] font-semibold text-[var(--color-text-muted)]">已移交</div>
              {done.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  transferred={true}
                  onTransfer={() => {}}
                  onContact={() => { close(); selectContact(u.contactId) }}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {confirmUser && (
        <ConfirmTransfer
          user={confirmUser}
          onConfirm={() => doTransfer(confirmUser)}
          onCancel={() => setConfirmUser(null)}
        />
      )}
    </div>,
    document.body,
  )
}
