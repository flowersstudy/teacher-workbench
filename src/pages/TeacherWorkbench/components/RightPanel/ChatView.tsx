import { format } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { contactSubtitleById, contactsByTab, messagesByContactId } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'
import type { ChatMessage, ContactItem } from '../../types'

function findContact(contactId: string): ContactItem | null {
  const all = [
    ...contactsByTab.todayMessages,
    ...contactsByTab.yesterdayUnreplied,
    ...contactsByTab.complaints,
  ]
  return all.find((c) => c.id === contactId) ?? null
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isTeacher = msg.sender === 'teacher'
  return (
    <div className={['flex flex-col', isTeacher ? 'items-end' : 'items-start'].join(' ')}>
      <div
        className={[
          'max-w-[72%] whitespace-pre-wrap rounded-[var(--radius-bubble)] px-3 py-2 text-sm',
          isTeacher
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-gray-100 text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        {msg.text}
      </div>
      <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">{msg.time}</div>
    </div>
  )
}

export function ChatView() {
  const selectedContactId = useWorkbenchStore((s) => s.selectedContactId)

  const contact = useMemo(() => {
    if (!selectedContactId) return null
    return findContact(selectedContactId)
  }, [selectedContactId])

  const [messageMap, setMessageMap] = useState<Record<string, ChatMessage[]>>(
    () => messagesByContactId,
  )
  const messages = contact ? messageMap[contact.id] ?? [] : []

  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // scroll to bottom when switching contact
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [contact?.id])

  const [draft, setDraft] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)

  function prependHistory(contactId: string) {
    setMessageMap((m) => {
      const prev = m[contactId] ?? []
      const next: ChatMessage = {
        id: `h_${Date.now()}`,
        contactId,
        sender: 'student',
        text: '（历史消息）老师我上次也遇到类似问题…',
        time: '更早',
      }
      return { ...m, [contactId]: [next, ...prev] }
    })
  }

  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
        请选择左侧联系人开始聊天
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: contact.color }}
        >
          {contact.avatar}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {contact.name}
          </div>
          <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {contactSubtitleById[contact.id] ?? '课程信息'}
          </div>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-auto px-4 py-3"
        onScroll={(e) => {
          const el = e.currentTarget
          if (el.scrollTop <= 0 && !loadingHistory) {
            setLoadingHistory(true)
            window.setTimeout(() => {
              prependHistory(contact.id)
              setLoadingHistory(false)
            }, 250)
          }
        }}
      >
        {loadingHistory && (
          <div className="mb-3 text-center text-[10px] text-[var(--color-text-muted)]">
            加载历史…
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="输入消息…"
            className="h-10 flex-1 rounded-[var(--radius-card)] bg-gray-100 px-3 text-sm outline-none placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
          <button
            type="button"
            onClick={() => {
              const text = draft.trim()
              if (!text) return
              const t = format(new Date(), 'HH:mm')
              setMessageMap((m) => {
                const prev = m[contact.id] ?? []
                const next: ChatMessage = {
                  id: `s_${Date.now()}`,
                  contactId: contact.id,
                  sender: 'teacher',
                  text,
                  time: t,
                }
                return { ...m, [contact.id]: [...prev, next] }
              })
              setDraft('')
              window.setTimeout(() => {
                const el = listRef.current
                if (el) el.scrollTop = el.scrollHeight
              }, 0)
            }}
            className="h-10 shrink-0 rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

