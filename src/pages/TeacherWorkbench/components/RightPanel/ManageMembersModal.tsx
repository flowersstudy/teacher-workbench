import { useState } from 'react'
import { createPortal } from 'react-dom'
import { staffRoster } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'

const roleColor: Record<string, string> = {
  带教老师: '#e8845a',
  诊断老师: '#4a90d9',
  学管:     '#4caf74',
  校长:     '#9c6fcc',
  学生:     '#888888',
}

export function ManageMembersModal() {
  const contactId = useWorkbenchStore((s) => s.manageMembersContactId)
  const close     = useWorkbenchStore((s) => s.closeManageMembers)
  const membersMap     = useWorkbenchStore((s) => s.groupMembersMap)
  const addGroupMember    = useWorkbenchStore((s) => s.addGroupMember)
  const removeGroupMember = useWorkbenchStore((s) => s.removeGroupMember)

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'current' | 'add'>('current')

  if (!contactId) return null

  const members = membersMap[contactId] ?? []

  // Staff that are not already in the group
  const available = staffRoster.filter(
    (s) => !members.some((m) => m.name === s.name && m.role === s.role)
  ).filter((s) =>
    search === '' || s.name.includes(search) || s.role.includes(search)
  )

  const tabCls = (active: boolean) =>
    ['flex-1 py-1.5 text-xs font-medium rounded-full transition-colors',
      active ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]',
    ].join(' ')

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-[360px] max-h-[500px] flex flex-col rounded-[var(--radius-card)] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 shrink-0">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">管理群成员</div>
          <button type="button" onClick={close}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[var(--color-border)] px-4 py-2.5 shrink-0">
          <button type="button" className={tabCls(tab === 'current')} onClick={() => setTab('current')}>
            当前成员 {members.length}
          </button>
          <button type="button" className={tabCls(tab === 'add')} onClick={() => setTab('add')}>
            拉人进群
          </button>
        </div>

        {/* Current members */}
        {tab === 'current' && (
          <div className="flex-1 overflow-auto p-3 space-y-1.5">
            {members.map((m) => (
              <div key={`${m.role}-${m.name}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] px-3 py-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: roleColor[m.role] ?? '#888' }}
                >
                  {m.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--color-text-primary)]">{m.name}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">{m.role}</div>
                </div>
                {m.role !== '学生' && (
                  <button
                    type="button"
                    onClick={() => removeGroupMember(contactId, m.name)}
                    className="shrink-0 rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-500 hover:bg-red-50 transition-colors"
                  >
                    移出
                  </button>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">群内暂无成员</div>
            )}
          </div>
        )}

        {/* Add members */}
        {tab === 'add' && (
          <>
            <div className="shrink-0 px-4 pt-3 pb-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索姓名或角色…"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex-1 overflow-auto px-3 pb-3 space-y-1.5">
              {available.map((s) => (
                <div key={`${s.role}-${s.name}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] px-3 py-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: roleColor[s.role] ?? '#888' }}
                  >
                    {s.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[var(--color-text-primary)]">{s.name}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">{s.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addGroupMember(contactId, s)}
                    className="shrink-0 rounded-full border border-[var(--color-primary)] px-2 py-0.5 text-[10px] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
                  >
                    + 加入
                  </button>
                </div>
              ))}
              {available.length === 0 && (
                <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                  {search ? '没有匹配的成员' : '所有可邀请成员已在群内'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
