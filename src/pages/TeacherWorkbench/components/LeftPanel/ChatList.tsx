import { contactsByTab, myDiagnosisStudents, myTeachingStudents } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { ChatListItem } from './ChatListItem'

const allContactsFlat = [
  ...contactsByTab.todayMessages,
  ...contactsByTab.yesterdayUnreplied,
  ...contactsByTab.complaints,
]

export function ChatList() {
  const tab               = useWorkbenchStore((s) => s.leftMessageTab)
  const selectedContactId = useWorkbenchStore((s) => s.selectedContactId)
  const selectContact     = useWorkbenchStore((s) => s.selectContact)

  const warningDiagnosis = myDiagnosisStudents.filter((s) => s.status === 'warning')
  const warningTeaching  = myTeachingStudents.filter((s) => s.status === 'warning')

  // 异常用户 tab
  if (tab === 'abnormalUsers') {
    const groups = [
      { label: '诊断课', students: warningDiagnosis },
      { label: '卡点课', students: warningTeaching },
    ]
    const total = warningDiagnosis.length + warningTeaching.length
    return (
      <div className="mt-2 flex-1 overflow-auto px-4 pb-3">
        {total === 0 ? (
          <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">暂无异常用户</div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => g.students.length > 0 && (
              <div key={g.label}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{g.label}</span>
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-500">{g.students.length} 人</span>
                </div>
                <div className="space-y-1">
                  {g.students.map((s) => {
                    const c = s.contactId ? allContactsFlat.find((ct) => ct.id === s.contactId) : null
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => c && selectContact(c.id)}
                        disabled={!c}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-red-100 bg-red-50 px-3 py-2 text-left hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: s.color }}>
                          {s.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[var(--color-text-primary)]">{s.name}</div>
                          <div className="truncate text-[10px] text-[var(--color-text-muted)]">{s.grade} · {s.subject}</div>
                        </div>
                        <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-500">异常</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const contacts = contactsByTab[tab] ?? []
  return (
    <div className="mt-2 flex-1 overflow-auto px-2 pb-3">
      <div className="space-y-1 px-2">
        {contacts.map((c) => (
          <ChatListItem
            key={c.id}
            item={c}
            selected={c.id === selectedContactId}
            onClick={() => selectContact(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

